const express = require('express');
const { body, param, query, validationResult } = require('express-validator');
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

// POST /api/contacto/enviar - Enviar mensaje de contacto
router.post('/enviar', [
  body('nombre').trim().isLength({ min: 2, max: 100 }).withMessage('Nombre debe tener entre 2 y 100 caracteres'),
  body('email').isEmail().normalizeEmail().withMessage('Email válido es requerido'),
  body('telefono').optional().trim().matches(/^[\d\s\-\+\(\)]+$/).withMessage('Formato de teléfono inválido'),
  body('asunto').trim().isLength({ min: 3, max: 100 }).withMessage('Asunto debe tener entre 3 y 100 caracteres'),
  body('mensaje').trim().isLength({ min: 10, max: 2000 }).withMessage('Mensaje debe tener entre 10 y 2000 caracteres')
], handleValidationErrors, async (req, res) => {
  try {
    const { nombre, email, telefono, asunto, mensaje } = req.body;

    // Verificar si el email ya envió muchos mensajes recientemente (spam protection)
    const mensajesRecientes = await db.fetchOne(`
            SELECT COUNT(*) as total 
            FROM contactos 
            WHERE email = ? AND fecha_envio > DATE_SUB(NOW(), INTERVAL 1 HOUR)
        `, [email]);

    if (mensajesRecientes.total >= 3) {
      return res.status(429).json({
        success: false,
        message: 'Has enviado muchos mensajes recientemente. Intenta de nuevo en una hora.'
      });
    }

    // Insertar mensaje de contacto
    const contactoId = await db.query(`
            INSERT INTO contactos (nombre, email, telefono, asunto, mensaje, estado)
            VALUES (?, ?, ?, ?, ?, 'nuevo')
        `, [nombre, email, telefono || null, asunto, mensaje]);

    // Simular envío de email de confirmación (en producción usar nodemailer)
    console.log(`📧 Nuevo mensaje de contacto recibido:
        ID: ${contactoId.insertId}
        De: ${nombre} (${email})
        Asunto: ${asunto}
        Mensaje: ${mensaje.substring(0, 100)}...`);

    res.json({
      success: true,
      message: 'Tu mensaje ha sido enviado exitosamente. Te responderemos pronto.',
      id: contactoId.insertId
    });

  } catch (error) {
    console.error('Error enviando mensaje de contacto:', error);
    res.status(500).json({
      success: false,
      message: 'Error enviando mensaje. Intenta de nuevo más tarde.'
    });
  }
});

// GET /api/contacto - Obtener mensajes de contacto (para admin)
router.get('/', [
  query('estado').optional().isIn(['nuevo', 'leido', 'respondido', 'cerrado']).withMessage('Estado inválido'),
  query('limite').optional().isInt({ min: 1, max: 100 }).withMessage('Límite debe estar entre 1 y 100'),
  query('pagina').optional().isInt({ min: 1 }).withMessage('Página debe ser mayor a 0')
], handleValidationErrors, async (req, res) => {
  try {
    const { estado, limite = 20, pagina = 1, busqueda } = req.query;
    const offset = (pagina - 1) * limite;

    let sql = `
            SELECT 
                id, nombre, email, telefono, asunto, 
                mensaje, estado, fecha_envio, fecha_respuesta
            FROM contactos
        `;
    const params = [];
    const conditions = [];

    if (estado) {
      conditions.push('estado = ?');
      params.push(estado);
    }

    if (busqueda) {
      conditions.push('(nombre LIKE ? OR email LIKE ? OR asunto LIKE ? OR mensaje LIKE ?)');
      const searchTerm = `%${busqueda}%`;
      params.push(searchTerm, searchTerm, searchTerm, searchTerm);
    }

    if (conditions.length > 0) {
      sql += ' WHERE ' + conditions.join(' AND ');
    }

    sql += ' ORDER BY fecha_envio DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limite), parseInt(offset));

    const mensajes = await db.query(sql, params);

    // Contar total
    let countSql = 'SELECT COUNT(*) as total FROM contactos';
    const countParams = [];
    if (conditions.length > 0) {
      countSql += ' WHERE ' + conditions.join(' AND ');
      // Usar los mismos parámetros excepto límite y offset
      countParams.push(...params.slice(0, -2));
    }

    const total = await db.fetchOne(countSql, countParams);

    res.json({
      success: true,
      mensajes,
      total: total.total,
      pagina: parseInt(pagina),
      limite: parseInt(limite)
    });

  } catch (error) {
    console.error('Error obteniendo mensajes de contacto:', error);
    res.status(500).json({
      success: false,
      message: 'Error obteniendo mensajes de contacto'
    });
  }
});

// GET /api/contacto/:id - Obtener mensaje específico (para admin)
router.get('/:id', [
  param('id').isInt({ min: 1 }).withMessage('ID inválido')
], handleValidationErrors, async (req, res) => {
  try {
    const { id } = req.params;

    const mensaje = await db.fetchOne(
      'SELECT * FROM contactos WHERE id = ?',
      [id]
    );

    if (!mensaje) {
      return res.status(404).json({
        success: false,
        message: 'Mensaje no encontrado'
      });
    }

    // Marcar como leído si estaba como nuevo
    if (mensaje.estado === 'nuevo') {
      await db.query(
        'UPDATE contactos SET estado = "leido" WHERE id = ?',
        [id]
      );
      mensaje.estado = 'leido';
    }

    res.json({
      success: true,
      mensaje
    });

  } catch (error) {
    console.error('Error obteniendo mensaje:', error);
    res.status(500).json({
      success: false,
      message: 'Error obteniendo mensaje'
    });
  }
});

// PUT /api/contacto/:id/estado - Actualizar estado del mensaje (para admin)
router.put('/:id/estado', [
  param('id').isInt({ min: 1 }).withMessage('ID inválido'),
  body('estado').isIn(['nuevo', 'leido', 'respondido', 'cerrado']).withMessage('Estado inválido'),
  body('notas_internas').optional().trim().isLength({ max: 1000 }).withMessage('Notas muy largas')
], handleValidationErrors, async (req, res) => {
  try {
    const { id } = req.params;
    const { estado, notas_internas } = req.body;

    let sql = 'UPDATE contactos SET estado = ?';
    const params = [estado];

    if (estado === 'respondido' || estado === 'cerrado') {
      sql += ', fecha_respuesta = CURRENT_TIMESTAMP';
    }

    if (notas_internas) {
      sql += ', notas_internas = ?';
      params.push(notas_internas);
    }

    sql += ' WHERE id = ?';
    params.push(id);

    const resultado = await db.query(sql, params);

    if (resultado.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: 'Mensaje no encontrado'
      });
    }

    res.json({
      success: true,
      message: 'Estado actualizado exitosamente'
    });

  } catch (error) {
    console.error('Error actualizando estado:', error);
    res.status(500).json({
      success: false,
      message: 'Error actualizando estado'
    });
  }
});

// GET /api/contacto/stats/resumen - Obtener estadísticas de contacto (para admin)
router.get('/stats/resumen', async (req, res) => {
  try {
    const stats = await db.query(`
            SELECT 
                estado,
                COUNT(*) as cantidad
            FROM contactos
            WHERE fecha_envio >= DATE_SUB(NOW(), INTERVAL 30 DAY)
            GROUP BY estado
        `);

    const total = await db.fetchOne(`
            SELECT COUNT(*) as total 
            FROM contactos 
            WHERE fecha_envio >= DATE_SUB(NOW(), INTERVAL 30 DAY)
        `);

    const porAsunto = await db.query(`
            SELECT 
                asunto,
                COUNT(*) as cantidad
            FROM contactos
            WHERE fecha_envio >= DATE_SUB(NOW(), INTERVAL 30 DAY)
            GROUP BY asunto
            ORDER BY cantidad DESC
            LIMIT 5
        `);

    res.json({
      success: true,
      stats: {
        total: total.total,
        por_estado: stats,
        por_asunto: porAsunto
      }
    });

  } catch (error) {
    console.error('Error obteniendo estadísticas:', error);
    res.status(500).json({
      success: false,
      message: 'Error obteniendo estadísticas'
    });
  }
});

module.exports = router;
