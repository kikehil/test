const pool = require('./connection');

/**
 * Inicializa la base de datos: ejecuta migraciones y seeders
 * Útil para Railway y despliegues automáticos
 */
async function initDatabase() {
  let connection;
  try {
    console.log('🔄 Inicializando base de datos...');
    
    // Ejecutar migraciones directamente (migrate maneja su propia conexión)
    const migrate = require('./migrate');
    await migrate();
    
    // Ejecutar seeders solo si no hay datos
    connection = await pool.getConnection();
    const [usuarios] = await connection.query('SELECT COUNT(*) as count FROM usuarios');
    connection.release();
    
    if (usuarios[0].count === 0) {
      console.log('🌱 Ejecutando seeders...');
      const seed = require('./seed');
      await seed();
    } else {
      console.log('✅ Base de datos ya tiene datos, omitiendo seeders');
    }
    
    console.log('✅ Base de datos inicializada correctamente');
  } catch (error) {
    console.error('❌ Error inicializando base de datos:', error.message);
    if (connection) connection.release();
    // No lanzar error para que el servidor pueda iniciar
    // En producción, Railway puede tener la BD ya configurada
  }
}

module.exports = initDatabase;

