const express = require('express');
const db = require('../config/database');

const router = express.Router();

// GET /api/dashboard/estadisticas - Get sales statistics
router.get('/estadisticas', async (req, res) => {
  try {
    // Get total sales
    const totalVentas = await db.fetchOne(`
      SELECT COALESCE(SUM(total), 0) as total_ventas 
      FROM pedidos 
      WHERE estado != 'cancelado'
    `);

    // Get total orders
    const totalPedidos = await db.fetchOne(`
      SELECT COUNT(*) as total_pedidos 
      FROM pedidos 
      WHERE estado != 'cancelado'
    `);

    // Calculate average order value
    const promedioPedido = totalPedidos.total_pedidos > 0
      ? totalVentas.total_ventas / totalPedidos.total_pedidos
      : 0;

    res.json({
      success: true,
      estadisticas: {
        total_ventas: parseFloat(totalVentas.total_ventas || 0),
        total_pedidos: parseInt(totalPedidos.total_pedidos || 0),
        promedio_pedido: parseFloat(promedioPedido.toFixed(2))
      }
    });

  } catch (error) {
    console.error('Error getting statistics:', error);
    res.status(500).json({
      success: false,
      message: 'Error obteniendo estadísticas'
    });
  }
});

// GET /api/dashboard/graficos - Get chart data
router.get('/graficos', async (req, res) => {
  try {
    // Sales by month (last 6 months)
    const ventasPorMes = await db.query(`
      SELECT 
        DATE_FORMAT(fecha_pedido, '%Y-%m') as mes,
        MONTHNAME(fecha_pedido) as nombre_mes,
        SUM(total) as total
      FROM pedidos 
      WHERE fecha_pedido >= DATE_SUB(NOW(), INTERVAL 6 MONTH)
        AND estado != 'cancelado'
      GROUP BY DATE_FORMAT(fecha_pedido, '%Y-%m'), MONTHNAME(fecha_pedido)
      ORDER BY mes ASC
    `);

    // Top 5 most sold products
    const productosMasVendidos = await db.query(`
      SELECT 
        pi.nombre_producto as nombre,
        SUM(pi.cantidad) as cantidad
      FROM pedido_items pi
      JOIN pedidos p ON pi.pedido_id = p.id
      WHERE p.estado != 'cancelado'
      GROUP BY pi.producto_id, pi.nombre_producto
      ORDER BY cantidad DESC
      LIMIT 5
    `);

    // Order status distribution
    const estadosPedidos = await db.query(`
      SELECT 
        estado,
        COUNT(*) as cantidad
      FROM pedidos
      GROUP BY estado
      ORDER BY cantidad DESC
    `);

    // Delivery methods
    const metodosEntrega = await db.query(`
      SELECT 
        CASE 
          WHEN metodo_entrega = 'estandar' THEN 'Estándar'
          WHEN metodo_entrega = 'expres' THEN 'Exprés'
          WHEN metodo_entrega = 'tienda' THEN 'Tienda'
          ELSE metodo_entrega
        END as metodo,
        COUNT(*) as cantidad
      FROM pedidos
      WHERE estado != 'cancelado'
      GROUP BY metodo_entrega
      ORDER BY cantidad DESC
    `);

    res.json({
      success: true,
      datos: {
        ventas_por_mes: ventasPorMes.map(item => ({
          mes: item.nombre_mes || item.mes,
          total: parseFloat(item.total || 0)
        })),
        productos_mas_vendidos: productosMasVendidos.map(item => ({
          nombre: item.nombre,
          cantidad: parseInt(item.cantidad)
        })),
        estados_pedidos: estadosPedidos.map(item => ({
          estado: item.estado.charAt(0).toUpperCase() + item.estado.slice(1),
          cantidad: parseInt(item.cantidad)
        })),
        metodos_entrega: metodosEntrega.map(item => ({
          metodo: item.metodo,
          cantidad: parseInt(item.cantidad)
        }))
      }
    });

  } catch (error) {
    console.error('Error getting chart data:', error);
    res.status(500).json({
      success: false,
      message: 'Error obteniendo datos de gráficos'
    });
  }
});

// GET /api/dashboard/ventas-recientes - Get recent sales
router.get('/ventas-recientes', async (req, res) => {
  try {
    const { limite = 10 } = req.query;

    const ventasRecientes = await db.query(`
      SELECT 
        numero_pedido,
        nombre_cliente,
        email_cliente,
        fecha_pedido,
        total,
        estado,
        metodo_entrega
      FROM pedidos
      ORDER BY fecha_pedido DESC
      LIMIT ?
    `, [parseInt(limite)]);

    res.json({
      success: true,
      ventas: ventasRecientes.map(venta => ({
        ...venta,
        total: parseFloat(venta.total)
      }))
    });

  } catch (error) {
    console.error('Error getting recent sales:', error);
    res.status(500).json({
      success: false,
      message: 'Error obteniendo ventas recientes'
    });
  }
});

// GET /api/dashboard/productos-stock-bajo - Get low stock products
router.get('/productos-stock-bajo', async (req, res) => {
  try {
    const { limite = 10 } = req.query;

    const productosStockBajo = await db.query(`
      SELECT 
        p.id,
        p.nombre,
        p.stock,
        c.nombre as categoria
      FROM productos p
      LEFT JOIN categorias c ON p.categoria_id = c.id
      WHERE p.stock <= 5 AND p.activo = 1
      ORDER BY p.stock ASC
      LIMIT ?
    `, [parseInt(limite)]);

    res.json({
      success: true,
      productos: productosStockBajo
    });

  } catch (error) {
    console.error('Error getting low stock products:', error);
    res.status(500).json({
      success: false,
      message: 'Error obteniendo productos con stock bajo'
    });
  }
});

module.exports = router;
