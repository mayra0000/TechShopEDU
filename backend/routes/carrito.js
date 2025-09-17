// routes/carrito.js
const express = require('express');
const { body, param, query, validationResult } = require('express-validator');
const { v4: uuidv4 } = require('uuid');
const db = require('../config/database');

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

// Función helper para obtener o crear carrito
async function obtenerOCrearCarrito(sessionId) {
  let carrito = await db.fetchOne(
    'SELECT * FROM carritos WHERE session_id = ? AND estado = "activo"',
    [sessionId]
  );

  if (!carrito) {
    const result = await db.query(
      'INSERT INTO carritos (session_id, estado) VALUES (?, "activo")',
      [sessionId]
    );

    carrito = await db.fetchOne('SELECT * FROM carritos WHERE id = ?', [result.insertId]);
  }

  return carrito;
}

// Función helper para calcular precio con variantes
function calcularPrecioConVariantes(precioBase, variantes) {
  let precioTotal = parseFloat(precioBase);

  if (variantes && typeof variantes === 'object') {
    Object.values(variantes).forEach(variante => {
      if (variante.precioExtra) {
        precioTotal += parseFloat(variante.precioExtra);
      }
    });
  }

  return precioTotal;
}

// GET /api/carrito/:sessionId - Obtener carrito
router.get('/:sessionId', [
  param('sessionId').trim().notEmpty().withMessage('Session ID es requerido')
], handleValidationErrors, async (req, res) => {
  try {
    const { sessionId } = req.params;

    const carrito = await db.fetchOne(
      'SELECT * FROM carritos WHERE session_id = ? AND estado = "activo"',
      [sessionId]
    );

    if (!carrito) {
      return res.json({
        success: true,
        carrito: {
          items: [],
          total: 0,
          subtotal: 0,
          impuestos: 0,
          cantidad_items: 0
        }
      });
    }

    // Obtener items del carrito con información del producto
    const items = await db.query(`
            SELECT 
                ci.*,
                p.nombre,
                p.descripcion,
                p.imagen,
                p.stock
            FROM carrito_items ci
            JOIN productos p ON ci.producto_id = p.id
            WHERE ci.carrito_id = ?
            ORDER BY ci.fecha_agregado DESC
        `, [carrito.id]);

    // Calcular totales
    let subtotal = 0;
    let cantidadItems = 0;

    items.forEach(item => {
      const precioConVariantes = calcularPrecioConVariantes(
        item.precio_unitario,
        typeof item.variantes === 'string' ? JSON.parse(item.variantes) : item.variantes
      );
      item.precio_unitario = precioConVariantes;
      subtotal += precioConVariantes * item.cantidad;
      cantidadItems += item.cantidad;

      // Parsear variantes si es string
      if (typeof item.variantes === 'string') {
        try {
          item.variantes = JSON.parse(item.variantes);
        } catch (e) {
          item.variantes = {};
        }
      }
    });

    const impuestos = subtotal * 0.16; // 16% IVA
    const total = subtotal + impuestos;

    res.json({
      success: true,
      carrito: {
        id: carrito.id,
        session_id: carrito.session_id,
        items,
        subtotal: parseFloat(subtotal.toFixed(2)),
        impuestos: parseFloat(impuestos.toFixed(2)),
        total: parseFloat(total.toFixed(2)),
        cantidad_items: cantidadItems,
        fecha_actualizacion: carrito.fecha_actualizacion
      }
    });

  } catch (error) {
    console.error('Error obteniendo carrito:', error);
    res.status(500).json({
      success: false,
      message: 'Error obteniendo carrito'
    });
  }
});

// POST /api/carrito/agregar - Agregar item al carrito
router.post('/agregar', [
  body('session_id').trim().notEmpty().withMessage('Session ID es requerido'),
  body('producto_id').isInt({ min: 1 }).withMessage('ID de producto inválido'),
  body('cantidad').optional().isInt({ min: 1 }).withMessage('Cantidad debe ser un número positivo'),
  body('variantes').optional().isObject().withMessage('Variantes deben ser un objeto')
], handleValidationErrors, async (req, res) => {
  try {
    const { session_id, producto_id, cantidad = 1, variantes = {} } = req.body;

    // Verificar que el producto existe y está activo
    const producto = await db.fetchOne(
      'SELECT * FROM productos WHERE id = ? AND activo = 1',
      [producto_id]
    );

    if (!producto) {
      return res.status(404).json({
        success: false,
        message: 'Producto no encontrado'
      });
    }

    // Verificar stock
    if (producto.stock < cantidad) {
      return res.status(400).json({
        success: false,
        message: 'Stock insuficiente'
      });
    }

    // Obtener o crear carrito
    const carrito = await obtenerOCrearCarrito(session_id);

    // Verificar si el item ya existe con las mismas variantes
    const variantesString = JSON.stringify(variantes);
    const itemExistente = await db.fetchOne(
      'SELECT * FROM carrito_items WHERE carrito_id = ? AND producto_id = ? AND variantes = ?',
      [carrito.id, producto_id, variantesString]
    );

    const precioConVariantes = calcularPrecioConVariantes(producto.precio, variantes);

    if (itemExistente) {
      // Actualizar cantidad del item existente
      const nuevaCantidad = itemExistente.cantidad + cantidad;

      if (producto.stock < nuevaCantidad) {
        return res.status(400).json({
          success: false,
          message: 'Stock insuficiente para la cantidad solicitada'
        });
      }

      await db.query(
        'UPDATE carrito_items SET cantidad = ?, precio_unitario = ? WHERE id = ?',
        [nuevaCantidad, precioConVariantes, itemExistente.id]
      );

    } else {
      // Crear nuevo item en el carrito
      await db.query(
        'INSERT INTO carrito_items (carrito_id, producto_id, variantes, precio_unitario, cantidad) VALUES (?, ?, ?, ?, ?)',
        [carrito.id, producto_id, variantesString, precioConVariantes, cantidad]
      );
    }

    // Actualizar fecha de modificación del carrito
    await db.query(
      'UPDATE carritos SET fecha_actualizacion = CURRENT_TIMESTAMP WHERE id = ?',
      [carrito.id]
    );

    res.json({
      success: true,
      message: 'Producto agregado al carrito exitosamente'
    });

  } catch (error) {
    console.error('Error agregando al carrito:', error);
    res.status(500).json({
      success: false,
      message: 'Error agregando producto al carrito'
    });
  }
});

// PUT /api/carrito/actualizar - Actualizar cantidad de item
router.put('/actualizar', [
  body('session_id').trim().notEmpty().withMessage('Session ID es requerido'),
  body('item_id').isInt({ min: 1 }).withMessage('ID de item inválido'),
  body('cantidad').isInt({ min: 1 }).withMessage('Cantidad debe ser un número positivo')
], handleValidationErrors, async (req, res) => {
  try {
    const { session_id, item_id, cantidad } = req.body;

    // Verificar que el item pertenece al carrito de la sesión
    const item = await db.fetchOne(`
            SELECT ci.*, p.stock, c.session_id
            FROM carrito_items ci
            JOIN carritos c ON ci.carrito_id = c.id
            JOIN productos p ON ci.producto_id = p.id
            WHERE ci.id = ? AND c.session_id = ? AND c.estado = "activo"
        `, [item_id, session_id]);

    if (!item) {
      return res.status(404).json({
        success: false,
        message: 'Item no encontrado en el carrito'
      });
    }

    // Verificar stock
    if (item.stock < cantidad) {
      return res.status(400).json({
        success: false,
        message: 'Stock insuficiente'
      });
    }

    // Actualizar cantidad
    await db.query(
      'UPDATE carrito_items SET cantidad = ? WHERE id = ?',
      [cantidad, item_id]
    );

    // Actualizar fecha de modificación del carrito
    await db.query(
      'UPDATE carritos SET fecha_actualizacion = CURRENT_TIMESTAMP WHERE session_id = ?',
      [session_id]
    );

    res.json({
      success: true,
      message: 'Cantidad actualizada exitosamente'
    });

  } catch (error) {
    console.error('Error actualizando item del carrito:', error);
    res.status(500).json({
      success: false,
      message: 'Error actualizando item del carrito'
    });
  }
});

// DELETE /api/carrito/eliminar/:sessionId/:itemId - Eliminar item del carrito
router.delete('/eliminar/:sessionId/:itemId', [
  param('sessionId').trim().notEmpty().withMessage('Session ID es requerido'),
  param('itemId').isInt({ min: 1 }).withMessage('ID de item inválido')
], handleValidationErrors, async (req, res) => {
  try {
    const { sessionId, itemId } = req.params;

    // Verificar que el item pertenece al carrito de la sesión
    const item = await db.fetchOne(`
            SELECT ci.id, c.session_id
            FROM carrito_items ci
            JOIN carritos c ON ci.carrito_id = c.id
            WHERE ci.id = ? AND c.session_id = ? AND c.estado = "activo"
        `, [itemId, sessionId]);

    if (!item) {
      return res.status(404).json({
        success: false,
        message: 'Item no encontrado en el carrito'
      });
    }

    // Eliminar item
    await db.query('DELETE FROM carrito_items WHERE id = ?', [itemId]);

    // Actualizar fecha de modificación del carrito
    await db.query(
      'UPDATE carritos SET fecha_actualizacion = CURRENT_TIMESTAMP WHERE session_id = ?',
      [sessionId]
    );

    res.json({
      success: true,
      message: 'Item eliminado del carrito exitosamente'
    });

  } catch (error) {
    console.error('Error eliminando item del carrito:', error);
    res.status(500).json({
      success: false,
      message: 'Error eliminando item del carrito'
    });
  }
});

// DELETE /api/carrito/limpiar/:sessionId - Limpiar todo el carrito
router.delete('/limpiar/:sessionId', [
  param('sessionId').trim().notEmpty().withMessage('Session ID es requerido')
], handleValidationErrors, async (req, res) => {
  try {
    const { sessionId } = req.params;

    const carrito = await db.fetchOne(
      'SELECT id FROM carritos WHERE session_id = ? AND estado = "activo"',
      [sessionId]
    );

    if (!carrito) {
      return res.json({
        success: true,
        message: 'Carrito ya está vacío'
      });
    }

    // Eliminar todos los items del carrito
    await db.query('DELETE FROM carrito_items WHERE carrito_id = ?', [carrito.id]);

    res.json({
      success: true,
      message: 'Carrito limpiado exitosamente'
    });

  } catch (error) {
    console.error('Error limpiando carrito:', error);
    res.status(500).json({
      success: false,
      message: 'Error limpiando carrito'
    });
  }
});

// POST /api/carrito/nuevo - Crear nuevo carrito (generar session_id)
router.post('/nuevo', async (req, res) => {
  try {
    const sessionId = `sess_${Date.now()}_${uuidv4().substring(0, 8)}`;

    await db.query(
      'INSERT INTO carritos (session_id, estado) VALUES (?, "activo")',
      [sessionId]
    );

    res.json({
      success: true,
      session_id: sessionId
    });

  } catch (error) {
    console.error('Error creando carrito:', error);
    res.status(500).json({
      success: false,
      message: 'Error creando carrito'
    });
  }
});

module.exports = router;
