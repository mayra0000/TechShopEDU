const mysql = require('mysql2/promise');
const fs = require('fs').promises;
const path = require('path');
require('dotenv').config();

async function setupDatabase() {
  let connection;

  try {
    console.log('Configurando base de datos TechShop EDU...');

    // Conectar sin especificar la base de datos
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 3306,
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      multipleStatements: true
    });

    console.log('Conexión a MySQL exitosa');

    // Crear esquema de base de datos
    const sqlSchema = `
        -- Crear la base de datos
        CREATE DATABASE IF NOT EXISTS techshop_edu CHARACTER SET utf8mb4 COLLATE utf8mb4_spanish_ci;
        USE techshop_edu;

        -- Tabla de categorías de productos
        CREATE TABLE IF NOT EXISTS categorias (
            id INT PRIMARY KEY AUTO_INCREMENT,
            nombre VARCHAR(50) NOT NULL,
            descripcion TEXT,
            activo BOOLEAN DEFAULT TRUE
        );

        -- Tabla de productos
        CREATE TABLE IF NOT EXISTS productos (
            id INT PRIMARY KEY AUTO_INCREMENT,
            nombre VARCHAR(100) NOT NULL,
            descripcion TEXT,
            precio DECIMAL(10,2) NOT NULL,
            imagen VARCHAR(255),
            categoria_id INT,
            stock INT DEFAULT 0,
            activo BOOLEAN DEFAULT TRUE,
            fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (categoria_id) REFERENCES categorias(id)
        );

        -- Tabla de variantes de productos
        CREATE TABLE IF NOT EXISTS variantes_productos (
            id INT PRIMARY KEY AUTO_INCREMENT,
            producto_id INT NOT NULL,
            tipo VARCHAR(50) NOT NULL,
            valor VARCHAR(100) NOT NULL,
            precio_extra DECIMAL(10,2) DEFAULT 0,
            stock INT DEFAULT 0,
            activo BOOLEAN DEFAULT TRUE,
            FOREIGN KEY (producto_id) REFERENCES productos(id) ON DELETE CASCADE
        );

        -- Tabla de carritos
        CREATE TABLE IF NOT EXISTS carritos (
            id INT PRIMARY KEY AUTO_INCREMENT,
            session_id VARCHAR(255) NOT NULL,
            fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            estado ENUM('activo', 'abandonado', 'convertido') DEFAULT 'activo',
            INDEX idx_session (session_id)
        );

        -- Tabla de items del carrito
        CREATE TABLE IF NOT EXISTS carrito_items (
            id INT PRIMARY KEY AUTO_INCREMENT,
            carrito_id INT NOT NULL,
            producto_id INT NOT NULL,
            variantes JSON,
            precio_unitario DECIMAL(10,2) NOT NULL,
            cantidad INT NOT NULL DEFAULT 1,
            fecha_agregado TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (carrito_id) REFERENCES carritos(id) ON DELETE CASCADE,
            FOREIGN KEY (producto_id) REFERENCES productos(id) ON DELETE CASCADE
        );

        -- Tabla de pedidos
        CREATE TABLE IF NOT EXISTS pedidos (
            id INT PRIMARY KEY AUTO_INCREMENT,
            numero_pedido VARCHAR(50) UNIQUE NOT NULL,
            nombre_cliente VARCHAR(100) NOT NULL,
            email_cliente VARCHAR(100) NOT NULL,
            telefono_cliente VARCHAR(20),
            direccion_envio TEXT NOT NULL,
            ciudad_envio VARCHAR(50) NOT NULL,
            codigo_postal_envio VARCHAR(10) NOT NULL,
            metodo_entrega ENUM('estandar', 'expres', 'tienda') NOT NULL,
            subtotal DECIMAL(10,2) NOT NULL,
            costo_envio DECIMAL(10,2) NOT NULL DEFAULT 0,
            impuestos DECIMAL(10,2) NOT NULL,
            total DECIMAL(10,2) NOT NULL,
            estado ENUM('pendiente', 'procesando', 'enviado', 'entregado', 'cancelado') DEFAULT 'pendiente',
            fecha_pedido TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        );

        -- Tabla de items del pedido
        CREATE TABLE IF NOT EXISTS pedido_items (
            id INT PRIMARY KEY AUTO_INCREMENT,
            pedido_id INT NOT NULL,
            producto_id INT NOT NULL,
            nombre_producto VARCHAR(100) NOT NULL,
            descripcion_variantes TEXT,
            precio_unitario DECIMAL(10,2) NOT NULL,
            cantidad INT NOT NULL,
            subtotal DECIMAL(10,2) NOT NULL,
            FOREIGN KEY (pedido_id) REFERENCES pedidos(id) ON DELETE CASCADE,
            FOREIGN KEY (producto_id) REFERENCES productos(id) ON DELETE RESTRICT
        );

        -- Tabla de contactos/mensajes
        CREATE TABLE IF NOT EXISTS contactos (
            id INT PRIMARY KEY AUTO_INCREMENT,
            nombre VARCHAR(100) NOT NULL,
            email VARCHAR(100) NOT NULL,
            telefono VARCHAR(20),
            asunto VARCHAR(100) NOT NULL,
            mensaje TEXT NOT NULL,
            estado ENUM('nuevo', 'leido', 'respondido', 'cerrado') DEFAULT 'nuevo',
            fecha_envio TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            fecha_respuesta TIMESTAMP NULL,
            notas_internas TEXT
        );
        `;

    console.log('Ejecutando esquema de base de datos...');
    await connection.query(sqlSchema);
    console.log('Esquema de base de datos creado exitosamente');

    // Insertar datos iniciales
    console.log('Insertando datos iniciales...');

    // Verificar si ya existen categorías
    const [existingCategories] = await connection.query('SELECT COUNT(*) as count FROM categorias');

    if (existingCategories[0].count === 0) {
      const categorias = [
        ['electrónicos', 'Dispositivos electrónicos educativos'],
        ['robótica', 'Kits y componentes de robótica'],
        ['impresión', 'Impresoras 3D y accesorios'],
        ['ciencias', 'Equipos para experimentos científicos'],
        ['accesorios', 'Accesorios diversos para tecnología'],
        ['smarthome', 'Dispositivos para hogar inteligente'],
        ['display', 'Pantallas y dispositivos de visualización'],
        ['matemáticas', 'Herramientas para matemáticas'],
        ['herramientas', 'Herramientas técnicas y de construcción']
      ];

      for (const [nombre, descripcion] of categorias) {
        await connection.query(
          'INSERT INTO categorias (nombre, descripcion) VALUES (?, ?)',
          [nombre, descripcion]
        );
      }
      console.log('Categorías insertadas');
    }

    // Verificar si ya existen productos
    const [existingProducts] = await connection.query('SELECT COUNT(*) as count FROM productos');

    if (existingProducts[0].count === 0) {
      const productos = [
        ['Tablet Educativa Pro', 'Tablet de 10 pulgadas diseñada para estudiantes', 5999.00, 'img/producto1.jpg', 1, 50],
        ['Kit de Robótica', 'Kit completo para aprender programación y robótica', 2499.00, 'img/producto2.jpg', 2, 30],
        ['Impresora 3D', 'Impresora 3D segura y fácil de usar para centros educativos', 12999.00, 'img/producto3.jpeg', 3, 15],
        ['Monitor', 'Pantalla de 21,45" con frecuencia de actualización de 100 Hz', 3099.00, 'img/producto4.jpg', 4, 25],
        ['Teclado', 'Teclado mecánico con teclas programables RGB', 1899.00, 'img/producto5.jpg', 5, 40],
        ['Dron', 'Dron programable para aprender principios de vuelo', 4599.00, 'img/producto6.jpg', 2, 20],
        ['Cámara de Seguridad', 'Cámara marca Steren, modelo CCTV-233 con ranura para memoria', 999.00, 'img/producto7.jpg', 6, 60],
        ['SAMSUNG Celular Galaxy a35', 'Smartphone marca Samsung Galaxy a35 5G.', 6299.00, 'img/producto8.jpg', 7, 35],
        ['Calculadora Gráfica', 'Calculadora científica con pantalla a color', 899.00, 'img/producto9.png', 8, 45],
        ['Auriculares con Micrófono', 'Auriculares cómodos para clases virtuales', 599.00, 'img/producto10.jpg', 5, 55],
        ['Proyector Portátil', 'Proyector LED compacto para presentaciones', 7999.00, 'img/producto11.jpg', 7, 12],
        ['Kit para Soldar', 'Kit de soldadura seguro para estudiantes', 1299.00, 'img/producto12.png', 9, 30]
      ];

      for (const [nombre, descripcion, precio, imagen, categoria_id, stock] of productos) {
        await connection.query(
          'INSERT INTO productos (nombre, descripcion, precio, imagen, categoria_id, stock) VALUES (?, ?, ?, ?, ?, ?)',
          [nombre, descripcion, precio, imagen, categoria_id, stock]
        );
      }
      console.log('Productos insertados');
    }

    // Verificar si ya existen variantes
    const [existingVariants] = await connection.query('SELECT COUNT(*) as count FROM variantes_productos');

    if (existingVariants[0].count === 0) {
      const variantes = [
        // Tablet Educativa Pro
        [1, 'capacidad', '64GB', 0, 30],
        [1, 'capacidad', '128GB', 500, 20],
        [1, 'color', 'Azul', 0, 25],
        [1, 'color', 'Gris', 0, 15],
        [1, 'color', 'Negro', 0, 10],

        // Kit de Robótica
        [2, 'nivel', 'Básico', 0, 20],
        [2, 'nivel', 'Intermedio', 800, 8],
        [2, 'nivel', 'Avanzado', 1500, 2],

        // Impresora 3D
        [3, 'tamaño', 'Mini', 0, 10],
        [3, 'tamaño', 'Estándar', 3000, 5],
        [3, 'color', 'Blanco', 0, 8],
        [3, 'color', 'Negro', 0, 7],

        // Monitor
        [4, 'resolucion', 'HD', 0, 15],
        [4, 'resolucion', 'FULL HD', 600, 8],
        [4, 'resolucion', '4K', 1200, 2],

        // Teclado
        [5, 'idioma', 'Español', 0, 25],
        [5, 'idioma', 'Inglés', 0, 15],
        [5, 'switch', 'Azul', 0, 20],
        [5, 'switch', 'Rojo', 200, 20]
      ];

      for (const [producto_id, tipo, valor, precio_extra, stock] of variantes) {
        await connection.query(
          'INSERT INTO variantes_productos (producto_id, tipo, valor, precio_extra, stock) VALUES (?, ?, ?, ?, ?)',
          [producto_id, tipo, valor, precio_extra, stock]
        );
      }
      console.log('Variantes de productos insertadas');
    }

    console.log('Base de datos configurada exitosamente!');
    console.log('Resumen:');

    // Mostrar estadísticas
    const [categoriesCount] = await connection.query('SELECT COUNT(*) as count FROM categorias');
    const [productsCount] = await connection.query('SELECT COUNT(*) as count FROM productos');
    const [variantsCount] = await connection.query('SELECT COUNT(*) as count FROM variantes_productos');

    console.log(`   - Categorías: ${categoriesCount[0].count}`);
    console.log(`   - Productos: ${productsCount[0].count}`);
    console.log(`   - Variantes: ${variantsCount[0].count}`);

  } catch (error) {
    console.error('Error configurando la base de datos:', error);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  setupDatabase();
}

module.exports = setupDatabase;
