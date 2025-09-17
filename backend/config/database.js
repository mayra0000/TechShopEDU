const mysql = require('mysql2/promise');
require('dotenv').config()

class Database {
  constructor() {
    this.pool = mysql.createPool({
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || '3306',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'techshop_edu',
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
      charset: 'utf8mb4'
    })
  }

  // Metodo para ejecutar consultas
  async query(sql, params = []) {
    try {
      const [rows] = await this.pool.execute(sql, params);
      return rows;
    } catch (error) {
      console.error('Error en funcion query: ', error);
      throw error
    }
  }

  // Metodo para obtener una sola fila
  async fetchOne(sql, params = []) {
    try {
      const [rows] = await this.pool.execute(sql, params);
      return rows[0] || null;
    } catch (error) {
      console.error('Error en funcion fetchOne:', error);
      throw error
    }
  }

  // Metodo para transacciones
  async transaction(callback) {
    const connection = await this.pool.getConnection();
    try {
      await connection.beginTransaction();
      const result = await callback(connection);
      await connection.commit();
      return result;
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  // Cerrar el pool de conexiones
  async close() {
    await this.pool.end();
  }

  // Verificar conexion
  async testConnection() {
    try {
      const connection = await this.pool.getConnection();
      console.log('Conexion a base de datos exitosa');
      connection.release();
      return true;
    } catch (error) {
      console.error('Error en conexion a la base de datos', error.message);
      return false;
    }
  }
}

// Crear instancia singleton
const db = new Database();

module.exports = db;
