const express = require('express');
const { body, param, query, validationResult } = require('express-validator');
const db = require('../config/database');
const emailService = require('../services/emailService');

const router = express.Router();

// Middleware para manejar errores de validación
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Errores de validación',
      errors: errors.array()
    });
  }
  next();
};

// Función para generar número de pedido único
function generarNumeroPedido() {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return `ORD-${new Date().getFullYear()}${(new Date().getMonth() + 1).toString().padStart(2, '0')}${new Date().getDate().toString().padStart(2, '0')}-${random}`;
}

// POST /api/pedidos/crear - Crear nuevo pedido
router.post('/crear', [
  body('session_id').trim().notEmpty().withMessage('Session ID es requerido'),
  body('datos_cliente.nombre').trim().isLength({ min: 2 }).withMessage('Nombre es requerido (mínimo 2 caracteres)'),
  body('datos_cliente.email').isEmail().withMessage('Email válido es requerido'),
  body('datos_cliente.direccion').trim().notEmpty().withMessage('Dirección es requerida'),
  body('datos_cliente.ciudad').trim().notEmpty().withMessage('Ciudad es requerida'),
  body('datos_cliente.codigo_postal').matches(/^\d{5}$/).withMessage('Código postal debe tener 5 dígitos'),
  body('metodo_entrega').isIn(['estandar', 'expres', 'tienda']).withMessage('Método de entrega inválido')
], handleValidationErrors, async (req, res) => {
  try {
    const { session_id, datos_cliente, metodo_entrega } = req.body;

    // Obtener carrito con items
    const carrito = await db.fetchOne(
      'SELECT * FROM carritos WHERE session_id = ? AND estado = "activo"',
      [session_id]
    );

    if (!carrito) {
      return res.status(404).json({
        success: false,
        message: 'Carrito no encontrado'
      });
    }

    // Obtener items del carrito
    const items = await db.query(`
            SELECT 
                ci.*,
                p.nombre,
                p.descripcion,
                p.stock
            FROM carrito_items ci
            JOIN productos p ON ci.producto_id = p.id
            WHERE ci.carrito_id = ?
        `, [carrito.id]);

    if (items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'El carrito está vacío'
      });
    }

    // Verificar stock de todos los productos
    for (let item of items) {
      if (item.stock < item.cantidad) {
        return res.status(400).json({
          success: false,
          message: `Stock insuficiente para ${item.nombre}. Stock disponible: ${item.stock}`
        });
      }
    }

    // Calcular totales
    let subtotal = 0;
    items.forEach(item => {
      subtotal += item.precio_unitario * item.cantidad;
    });

    const impuestos = subtotal * 0.16; // 16% IVA
    let costoEnvio = 0;

    switch (metodo_entrega) {
      case 'expres':
        costoEnvio = 150;
        break;
      case 'estandar':
      case 'tienda':
        costoEnvio = 0;
        break;
    }

    const total = subtotal + impuestos + costoEnvio;
    const numeroPedido = generarNumeroPedido();

    // Usar transacción para crear el pedido
    const resultado = await db.transaction(async (connection) => {
      // Crear pedido
      const [pedidoResult] = await connection.execute(`
                INSERT INTO pedidos (
                    numero_pedido, nombre_cliente, email_cliente, 
                    telefono_cliente, direccion_envio, ciudad_envio, codigo_postal_envio,
                    metodo_entrega, subtotal, costo_envio, impuestos, total, estado
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pendiente')
            `, [
        numeroPedido, datos_cliente.nombre, datos_cliente.email,
        datos_cliente.telefono || null, datos_cliente.direccion, datos_cliente.ciudad,
        datos_cliente.codigo_postal, metodo_entrega, subtotal, costoEnvio, impuestos, total
      ]);

      const pedidoId = pedidoResult.insertId;

      // Crear items del pedido y actualizar stock
      const pedidoItems = [];
      for (let item of items) {
        // Preparar descripción de variantes
        let descripcionVariantes = null;
        if (item.variantes) {
          if (typeof item.variantes === 'string') {
            descripcionVariantes = item.variantes;
          } else if (typeof item.variantes === 'object') {
            descripcionVariantes = JSON.stringify(item.variantes);
          }
        }

        // Insertar item del pedido
        await connection.execute(`
                    INSERT INTO pedido_items (
                        pedido_id, producto_id, nombre_producto, descripcion_variantes,
                        precio_unitario, cantidad, subtotal
                    ) VALUES (?, ?, ?, ?, ?, ?, ?)
                `, [
          pedidoId, item.producto_id, item.nombre,
          descripcionVariantes,
          item.precio_unitario, item.cantidad, item.precio_unitario * item.cantidad
        ]);

        // Guardar para el email
        pedidoItems.push({
          nombre_producto: item.nombre,
          descripcion_variantes: descripcionVariantes,
          precio_unitario: item.precio_unitario,
          cantidad: item.cantidad,
          subtotal: item.precio_unitario * item.cantidad
        });

        // Actualizar stock del producto
        await connection.execute(
          'UPDATE productos SET stock = stock - ? WHERE id = ?',
          [item.cantidad, item.producto_id]
        );
      }

      // Marcar carrito como convertido
      await connection.execute(
        'UPDATE carritos SET estado = "convertido" WHERE id = ?',
        [carrito.id]
      );

      return { pedidoId, numeroPedido, pedidoItems };
    });

    // Preparar datos del pedido para el email
    const pedidoParaEmail = {
      numero_pedido: resultado.numeroPedido,
      nombre_cliente: datos_cliente.nombre,
      email_cliente: datos_cliente.email,
      telefono_cliente: datos_cliente.telefono || null,
      direccion_envio: datos_cliente.direccion,
      ciudad_envio: datos_cliente.ciudad,
      codigo_postal_envio: datos_cliente.codigo_postal,
      metodo_entrega,
      subtotal,
      costo_envio: costoEnvio,
      impuestos,
      total,
      estado: 'pendiente',
      fecha_pedido: new Date()
    };

    // Enviar email de confirmación (no bloquear la respuesta)
    emailService.enviarConfirmacionPedido(pedidoParaEmail, resultado.pedidoItems)
      .then(emailResult => {
        if (emailResult.success) {
          console.log('Email de confirmación enviado exitosamente');
        } else {
          console.error('Error enviando email de confirmación:', emailResult.error);
        }
      })
      .catch(error => {
        console.error('Error enviando email de confirmación:', error);
      });

    res.json({
      success: true,
      message: 'Pedido creado exitosamente',
      pedido: {
        id: resultado.pedidoId,
        numero_pedido: resultado.numeroPedido,
        total,
        estado: 'pendiente'
      }
    });

  } catch (error) {
    console.error('Error creando pedido:', error);
    res.status(500).json({
      success: false,
      message: 'Error creando pedido'
    });
  }
});

// GET /api/pedidos/:numeroPedido - Obtener pedido por número
router.get('/:numeroPedido', [
  param('numeroPedido').trim().notEmpty().withMessage('Número de pedido es requerido')
], handleValidationErrors, async (req, res) => {
  try {
    const { numeroPedido } = req.params;

    // Obtener pedido
    const pedido = await db.fetchOne(
      'SELECT * FROM pedidos WHERE numero_pedido = ?',
      [numeroPedido]
    );

    if (!pedido) {
      return res.status(404).json({
        success: false,
        message: 'Pedido no encontrado'
      });
    }

    // Obtener items del pedido
    const items = await db.query(
      'SELECT * FROM pedido_items WHERE pedido_id = ? ORDER BY id',
      [pedido.id]
    );

    // Parsear descripción de variantes
    items.forEach(item => {
      if (item.descripcion_variantes) {
        try {
          item.variantes = JSON.parse(item.descripcion_variantes);
        } catch (e) {
          // Si no se puede parsear, dejar como string
          item.variantes = item.descripcion_variantes;
        }
      }
    });

    pedido.items = items;

    res.json({
      success: true,
      pedido
    });

  } catch (error) {
    console.error('Error obteniendo pedido:', error);
    res.status(500).json({
      success: false,
      message: 'Error obteniendo pedido'
    });
  }
});

// GET /api/pedidos/email/:email - Obtener pedidos por email
router.get('/email/:email', [
  param('email').isEmail().withMessage('Email válido es requerido')
], handleValidationErrors, async (req, res) => {
  try {
    const { email } = req.params;
    const { limite = 10, pagina = 1 } = req.query;

    const offset = (pagina - 1) * limite;

    const pedidos = await db.query(`
            SELECT 
                numero_pedido, fecha_pedido, estado, total, metodo_entrega
            FROM pedidos 
            WHERE email_cliente = ? 
            ORDER BY fecha_pedido DESC
            LIMIT ? OFFSET ?
        `, [email, parseInt(limite), parseInt(offset)]);

    const total = await db.fetchOne(
      'SELECT COUNT(*) as total FROM pedidos WHERE email_cliente = ?',
      [email]
    );

    res.json({
      success: true,
      pedidos,
      total: total.total,
      pagina: parseInt(pagina),
      limite: parseInt(limite)
    });

  } catch (error) {
    console.error('Error obteniendo pedidos por email:', error);
    res.status(500).json({
      success: false,
      message: 'Error obteniendo pedidos'
    });
  }
});

// PUT /api/pedidos/:numeroPedido/estado - Actualizar estado del pedido (para admin)
router.put('/:numeroPedido/estado', [
  param('numeroPedido').trim().notEmpty().withMessage('Número de pedido es requerido'),
  body('estado').isIn(['pendiente', 'procesando', 'enviado', 'entregado', 'cancelado']).withMessage('Estado inválido')
], handleValidationErrors, async (req, res) => {
  try {
    const { numeroPedido } = req.params;
    const { estado } = req.body;

    // Obtener pedido actual
    const pedido = await db.fetchOne(
      'SELECT * FROM pedidos WHERE numero_pedido = ?',
      [numeroPedido]
    );

    if (!pedido) {
      return res.status(404).json({
        success: false,
        message: 'Pedido no encontrado'
      });
    }

    // Actualizar estado
    const resultado = await db.query(
      'UPDATE pedidos SET estado = ?, fecha_actualizacion = CURRENT_TIMESTAMP WHERE numero_pedido = ?',
      [estado, numeroPedido]
    );

    if (resultado.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: 'Pedido no encontrado'
      });
    }

    // Enviar email de actualización (no bloquear la respuesta)
    emailService.enviarActualizacionEstado(pedido, estado)
      .then(emailResult => {
        if (emailResult.success) {
          console.log('Email de actualización enviado exitosamente');
        } else {
          console.error('Error enviando email de actualización:', emailResult.error);
        }
      })
      .catch(error => {
        console.error('Error enviando email de actualización:', error);
      });

    res.json({
      success: true,
      message: 'Estado del pedido actualizado exitosamente'
    });

  } catch (error) {
    console.error('Error actualizando estado del pedido:', error);
    res.status(500).json({
      success: false,
      message: 'Error actualizando estado del pedido'
    });
  }
});

// GET /api/pedidos - Obtener todos los pedidos (para admin)
router.get('/', [
  query('estado').optional().isIn(['pendiente', 'procesando', 'enviado', 'entregado', 'cancelado']).withMessage('Estado inválido'),
  query('limite').optional().isInt({ min: 1, max: 100 }).withMessage('Límite debe estar entre 1 y 100'),
  query('pagina').optional().isInt({ min: 1 }).withMessage('Página debe ser mayor a 0')
], handleValidationErrors, async (req, res) => {
  try {
    const { estado, limite = 20, pagina = 1 } = req.query;
    const offset = (pagina - 1) * limite;

    let sql = `
            SELECT 
                numero_pedido, nombre_cliente, email_cliente, 
                fecha_pedido, estado, total, metodo_entrega
            FROM pedidos
        `;
    const params = [];

    if (estado) {
      sql += ' WHERE estado = ?';
      params.push(estado);
    }

    sql += ' ORDER BY fecha_pedido DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limite), parseInt(offset));

    const pedidos = await db.query(sql, params);

    // Contar total
    let countSql = 'SELECT COUNT(*) as total FROM pedidos';
    const countParams = [];
    if (estado) {
      countSql += ' WHERE estado = ?';
      countParams.push(estado);
    }

    const total = await db.fetchOne(countSql, countParams);

    res.json({
      success: true,
      pedidos,
      total: total.total,
      pagina: parseInt(pagina),
      limite: parseInt(limite)
    });

  } catch (error) {
    console.error('Error obteniendo pedidos:', error);
    res.status(500).json({
      success: false,
      message: 'Error obteniendo pedidos'
    });
  }
});

// POST /api/pedidos/:numeroPedido/reenviar-email - Reenviar email de confirmación
router.post('/:numeroPedido/reenviar-email', [
  param('numeroPedido').trim().notEmpty().withMessage('Número de pedido es requerido')
], handleValidationErrors, async (req, res) => {
  try {
    const { numeroPedido } = req.params;

    // Obtener pedido con items
    const pedido = await db.fetchOne(
      'SELECT * FROM pedidos WHERE numero_pedido = ?',
      [numeroPedido]
    );

    if (!pedido) {
      return res.status(404).json({
        success: false,
        message: 'Pedido no encontrado'
      });
    }

    // Obtener items del pedido
    const items = await db.query(
      'SELECT * FROM pedido_items WHERE pedido_id = ? ORDER BY id',
      [pedido.id]
    );

    // Enviar email
    const emailResult = await emailService.enviarConfirmacionPedido(pedido, items);

    if (emailResult.success) {
      res.json({
        success: true,
        message: 'Email reenviado exitosamente'
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Error reenviando email',
        error: emailResult.error
      });
    }

  } catch (error) {
    console.error('Error reenviando email:', error);
    res.status(500).json({
      success: false,
      message: 'Error reenviando email'
    });
  }
});

module.exports = router;
