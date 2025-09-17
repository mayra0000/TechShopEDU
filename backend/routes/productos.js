// routes/productos.js - Fixed version
const express = require('express');
const { body, param, validationResult } = require('express-validator');
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

// GET /api/productos - Obtener todos los productos (simplified)
router.get('/', async (req, res) => {
  try {
    console.log('Obteniendo productos...');

    // Simple query without pagination for now
    const sql = `
            SELECT 
                p.id,
                p.nombre,
                p.descripcion,
                p.precio,
                p.imagen,
                p.stock,
                c.nombre as categoria
            FROM productos p
            LEFT JOIN categorias c ON p.categoria_id = c.id
            WHERE p.activo = 1
            ORDER BY p.id
        `;

    const productos = await db.query(sql);
    console.log(`Encontrados ${productos.length} productos`);

    // Obtener variantes para cada producto
    for (let producto of productos) {
      const variantes = await db.query(
        'SELECT * FROM variantes_productos WHERE producto_id = ? AND activo = 1',
        [producto.id]
      );
      producto.variantes = variantes;
    }

    res.json({
      success: true,
      productos
    });

  } catch (error) {
    console.error('Error obteniendo productos:', error);
    res.status(500).json({
      success: false,
      message: 'Error obteniendo productos'
    });
  }
});

// GET /api/productos/:id - Obtener un producto específico
router.get('/:id', [
  param('id').isInt({ min: 1 }).withMessage('ID debe ser un número entero positivo')
], handleValidationErrors, async (req, res) => {
  try {
    const { id } = req.params;

    const producto = await db.fetchOne(`
            SELECT 
                p.id,
                p.nombre,
                p.descripcion,
                p.precio,
                p.imagen,
                p.stock,
                c.nombre as categoria
            FROM productos p
            LEFT JOIN categorias c ON p.categoria_id = c.id
            WHERE p.id = ? AND p.activo = 1
        `, [id]);

    if (!producto) {
      return res.status(404).json({
        success: false,
        message: 'Producto no encontrado'
      });
    }

    // Obtener variantes del producto
    const variantes = await db.query(
      'SELECT * FROM variantes_productos WHERE producto_id = ? AND activo = 1',
      [id]
    );

    producto.variantes = variantes;

    res.json({
      success: true,
      producto
    });

  } catch (error) {
    console.error('Error obteniendo producto:', error);
    res.status(500).json({
      success: false,
      message: 'Error obteniendo producto'
    });
  }
});

// GET /api/productos/categoria/:categoria - Obtener productos por categoría
router.get('/categoria/:categoria', [
  param('categoria').trim().notEmpty().withMessage('Categoría es requerida')
], handleValidationErrors, async (req, res) => {
  try {
    const { categoria } = req.params;

    const productos = await db.query(`
            SELECT 
                p.id,
                p.nombre,
                p.descripcion,
                p.precio,
                p.imagen,
                p.stock,
                c.nombre as categoria
            FROM productos p
            LEFT JOIN categorias c ON p.categoria_id = c.id
            WHERE p.activo = 1 AND c.nombre = ?
            ORDER BY p.nombre
        `, [categoria]);

    // Obtener variantes para cada producto
    for (let producto of productos) {
      const variantes = await db.query(
        'SELECT * FROM variantes_productos WHERE producto_id = ? AND activo = 1',
        [producto.id]
      );
      producto.variantes = variantes;
    }

    res.json({
      success: true,
      productos,
      categoria
    });

  } catch (error) {
    console.error('Error obteniendo productos por categoría:', error);
    res.status(500).json({
      success: false,
      message: 'Error obteniendo productos por categoría'
    });
  }
});

// GET /api/productos/buscar/:termino - Búsqueda de productos
router.get('/buscar/:termino', [
  param('termino').trim().isLength({ min: 2 }).withMessage('Término de búsqueda debe tener al menos 2 caracteres')
], handleValidationErrors, async (req, res) => {
  try {
    const { termino } = req.params;

    const productos = await db.query(`
            SELECT 
                p.id,
                p.nombre,
                p.descripcion,
                p.precio,
                p.imagen,
                p.stock,
                c.nombre as categoria
            FROM productos p
            LEFT JOIN categorias c ON p.categoria_id = c.id
            WHERE p.activo = 1 
            AND (p.nombre LIKE ? OR p.descripcion LIKE ? OR c.nombre LIKE ?)
            ORDER BY 
                CASE 
                    WHEN p.nombre LIKE ? THEN 1
                    WHEN p.descripcion LIKE ? THEN 2
                    ELSE 3
                END,
                p.nombre
        `, [
      `%${termino}%`, `%${termino}%`, `%${termino}%`,
      `%${termino}%`, `%${termino}%`
    ]);

    // Obtener variantes para cada producto
    for (let producto of productos) {
      const variantes = await db.query(
        'SELECT * FROM variantes_productos WHERE producto_id = ? AND activo = 1',
        [producto.id]
      );
      producto.variantes = variantes;
    }

    res.json({
      success: true,
      productos,
      termino,
      total: productos.length
    });

  } catch (error) {
    console.error('Error buscando productos:', error);
    res.status(500).json({
      success: false,
      message: 'Error buscando productos'
    });
  }
});

// GET /api/productos/meta/categorias - Obtener todas las categorías
router.get('/meta/categorias', async (req, res) => {
  try {
    const categorias = await db.query(`
            SELECT 
                c.id,
                c.nombre,
                c.descripcion,
                COUNT(p.id) as total_productos
            FROM categorias c
            LEFT JOIN productos p ON c.id = p.categoria_id AND p.activo = 1
            WHERE c.activo = 1
            GROUP BY c.id, c.nombre, c.descripcion
            ORDER BY c.nombre
        `);

    res.json({
      success: true,
      categorias
    });

  } catch (error) {
    console.error('Error obteniendo categorías:', error);
    res.status(500).json({
      success: false,
      message: 'Error obteniendo categorías'
    });
  }
});

module.exports = router;
