const pool = require('./connection');

/**
 * Inicializa la base de datos: ejecuta migraciones y seeders
 * Útil para Railway y despliegues automáticos
 */
async function initDatabase() {
  let connection;
  try {
    console.log('🔄 Inicializando base de datos...');
    connection = await pool.getConnection();
    
    // Ejecutar migraciones directamente
    const migrate = require('./migrate');
    await migrate();
    
    // Ejecutar seeders solo si no hay datos
    const [usuarios] = await pool.query('SELECT COUNT(*) as count FROM usuarios');
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
    // No lanzar error para que el servidor pueda iniciar
    // En producción, Railway puede tener la BD ya configurada
  } finally {
    if (connection) connection.release();
  }
}

module.exports = initDatabase;

