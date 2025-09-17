const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
require('dotenv').config();

const db = require('./config/database');


const productosRoutes = require('./routes/productos');
const carritoRoutes = require('./routes/carrito');
const pedidosRoutes = require('./routes/pedidos');
const contactoRoutes = require('./routes/contacto');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware basico
app.use(helmet());

// Configuracion CORS
app.use(cors({
  origin: true, // Allow all origins for development
  credentials: true,
  optionsSuccessStatus: 200
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Endpoint para verificar que funcione
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    environment: 'development'
  });
});

// Rutas api
app.use('/api/productos', productosRoutes);
app.use('/api/carrito', carritoRoutes);
app.use('/api/pedidos', pedidosRoutes);
app.use('/api/contacto', contactoRoutes);

// Manejador 404
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Endpoint no encontrado'
  });
});

app.use((err, req, res, next) => {
  console.error('Error:', err);

  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Error interno del servidor',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

async function startServer() {
  try {
    const dbConnected = await db.testConnection();
    if (!dbConnected) {
      console.error('No se pudo conectar a la base de datos');
      process.exit(1);
    }

    app.listen(PORT, () => {
      console.log(`Servidor TechShop EDU corriendo en puerto ${PORT}`);
      console.log(`Entorno: ${process.env.NODE_ENV || 'development'}`);
      console.log(`Health check: http://localhost:${PORT}/health`);
      console.log(`API: http://localhost:${PORT}/api`);
    });

  } catch (error) {
    console.error('Error al inicializar el servidor:', error);
    process.exit(1);
  }
}

process.on('SIGTERM', async () => {
  console.log('Cerrando servidor...');
  await db.close();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('Cerrando servidor...');
  await db.close();
  process.exit(0);
});

startServer();

module.exports = app;
