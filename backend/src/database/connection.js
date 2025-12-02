const mysql = require('mysql2/promise');
require('dotenv').config();

// Pool de conexiones
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'crm_cotizaciones',
  port: process.env.DB_PORT || 3306,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0
});

// Probar conexión
pool.getConnection()
  .then(connection => {
    console.log('✅ Conexión a MySQL establecida');
    connection.release();
  })
  .catch(err => {
    console.error('❌ Error conectando a MySQL:', err.message);
    if (process.env.NODE_ENV !== 'production') {
      console.error('Asegúrate de que MySQL esté corriendo y las credenciales sean correctas');
    }
  });

module.exports = pool;

