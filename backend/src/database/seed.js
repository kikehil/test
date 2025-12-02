const pool = require('./connection');
const bcrypt = require('bcryptjs');
require('dotenv').config();

async function seed() {
  let connection;
  let shouldRelease = true;
  
  try {
    // Intentar obtener conexión del pool
    try {
      connection = await pool.getConnection();
    } catch (e) {
      // Si no hay pool disponible, crear uno temporal
      const mysql = require('mysql2/promise');
      connection = await mysql.createConnection({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'crm_cotizaciones',
        port: process.env.DB_PORT || 3306
      });
      shouldRelease = false;
    }
    
    console.log('🌱 Iniciando seeders...');

    // Crear empresa por defecto
    const [empresas] = await connection.query(`
      SELECT id FROM empresas WHERE nombre = 'Empresa Demo' LIMIT 1
    `);

    let empresaId;
    if (empresas.length === 0) {
      const [result] = await connection.query(`
        INSERT INTO empresas (nombre, rfc, direccion, telefono, email, web)
        VALUES (?, ?, ?, ?, ?, ?)
      `, [
        'Empresa Demo',
        'DEM123456789',
        'Calle Principal 123, Ciudad, Estado',
        '+52 55 1234 5678',
        'contacto@empresademo.com',
        'www.empresademo.com'
      ]);
      empresaId = result.insertId;
      console.log('✅ Empresa demo creada');
    } else {
      empresaId = empresas[0].id;
      console.log('✅ Empresa demo ya existe');
    }

    // Configuración de empresa
    await connection.query(`
      INSERT INTO empresa_config (empresa_id, nombre, rfc, direccion, telefono, email, web, iva_porcentaje)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        nombre = VALUES(nombre),
        rfc = VALUES(rfc),
        direccion = VALUES(direccion),
        telefono = VALUES(telefono),
        email = VALUES(email),
        web = VALUES(web)
    `, [
      empresaId,
      'Empresa Demo',
      'DEM123456789',
      'Calle Principal 123, Ciudad, Estado',
      '+52 55 1234 5678',
      'contacto@empresademo.com',
      'www.empresademo.com',
      16.00
    ]);
    console.log('✅ Configuración de empresa creada');

    // Crear usuarios de ejemplo
    const passwordHash = await bcrypt.hash('password123', 10);
    
    const usuarios = [
      { email: 'admin@test.com', nombre: 'Administrador', rol: 'ADMIN' },
      { email: 'ventas@test.com', nombre: 'Usuario Ventas', rol: 'VENTAS' },
      { email: 'lectura@test.com', nombre: 'Usuario Lectura', rol: 'LECTURA' }
    ];

    for (const usuario of usuarios) {
      await connection.query(`
        INSERT INTO usuarios (empresa_id, nombre, email, password, rol)
        VALUES (?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE nombre = VALUES(nombre), rol = VALUES(rol)
      `, [empresaId, usuario.nombre, usuario.email, passwordHash, usuario.rol]);
    }
    console.log('✅ Usuarios de ejemplo creados');

    // Crear clientes de ejemplo
    const clientes = [
      {
        nombre_razon_social: 'Cliente A S.A. de C.V.',
        rfc: 'CLA123456789',
        telefono: '+52 55 1111 1111',
        email: 'contacto@clientea.com',
        direccion: 'Av. Principal 100, CDMX',
        giro: 'Comercio',
        contacto_principal: 'Juan Pérez'
      },
      {
        nombre_razon_social: 'Cliente B S.A. de C.V.',
        rfc: 'CLB987654321',
        telefono: '+52 55 2222 2222',
        email: 'ventas@clienteb.com',
        direccion: 'Calle Secundaria 200, Guadalajara',
        giro: 'Servicios',
        contacto_principal: 'María García'
      },
      {
        nombre_razon_social: 'Cliente C',
        rfc: null,
        telefono: '+52 55 3333 3333',
        email: 'info@clientec.com',
        direccion: 'Boulevard Norte 300, Monterrey',
        giro: 'Manufactura',
        contacto_principal: 'Carlos López'
      }
    ];

    for (const cliente of clientes) {
      await connection.query(`
        INSERT INTO clientes (empresa_id, nombre_razon_social, rfc, telefono, email, direccion, giro, contacto_principal)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        empresaId,
        cliente.nombre_razon_social,
        cliente.rfc,
        cliente.telefono,
        cliente.email,
        cliente.direccion,
        cliente.giro,
        cliente.contacto_principal
      ]);
    }
    console.log('✅ Clientes de ejemplo creados');

    // Crear productos de ejemplo
    const productos = [
      { nombre: 'Producto A', descripcion: 'Descripción del producto A', precio_unitario: 1000.00, unidad: 'PZA', categoria: 'Productos' },
      { nombre: 'Producto B', descripcion: 'Descripción del producto B', precio_unitario: 2500.50, unidad: 'PZA', categoria: 'Productos' },
      { nombre: 'Servicio de Consultoría', descripcion: 'Servicio de consultoría especializada', precio_unitario: 5000.00, unidad: 'HRS', categoria: 'Servicios' },
      { nombre: 'Mantenimiento Mensual', descripcion: 'Servicio de mantenimiento mensual', precio_unitario: 15000.00, unidad: 'MES', categoria: 'Servicios' },
      { nombre: 'Instalación', descripcion: 'Servicio de instalación', precio_unitario: 3000.00, unidad: 'SERV', categoria: 'Servicios' }
    ];

    for (const producto of productos) {
      await connection.query(`
        INSERT INTO productos (empresa_id, nombre, descripcion, precio_unitario, unidad, categoria)
        VALUES (?, ?, ?, ?, ?, ?)
      `, [
        empresaId,
        producto.nombre,
        producto.descripcion,
        producto.precio_unitario,
        producto.unidad,
        producto.categoria
      ]);
    }
    console.log('✅ Productos de ejemplo creados');

    // Obtener IDs para crear cotizaciones de ejemplo
    const [clientesRows] = await connection.query('SELECT id FROM clientes WHERE empresa_id = ? LIMIT 3', [empresaId]);
    const [productosRows] = await connection.query('SELECT id FROM productos WHERE empresa_id = ? LIMIT 3', [empresaId]);
    const [usuariosRows] = await connection.query('SELECT id FROM usuarios WHERE empresa_id = ? AND rol = ? LIMIT 1', [empresaId, 'VENTAS']);

    if (clientesRows.length > 0 && productosRows.length > 0 && usuariosRows.length > 0) {
      const clienteId = clientesRows[0].id;
      const usuarioId = usuariosRows[0].id;

      // Crear cotización de ejemplo
      const [cotizacionResult] = await connection.query(`
        INSERT INTO cotizaciones (
          empresa_id, folio, fecha, fecha_vencimiento, cliente_id, contacto_cliente,
          condiciones_pago, validez, notas, estado, subtotal, iva, total, created_by
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        empresaId,
        'Q-0001',
        new Date(),
        new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 días
        clienteId,
        'Juan Pérez',
        '30 días',
        '30 días',
        'Cotización de ejemplo',
        'Pendiente',
        5000.00,
        800.00,
        5800.00,
        usuarioId
      ]);

      const cotizacionId = cotizacionResult.insertId;

      // Crear partidas
      await connection.query(`
        INSERT INTO cotizacion_partidas (cotizacion_id, cantidad, unidad, descripcion, precio_unitario, subtotal, orden)
        VALUES
        (?, 2, 'PZA', 'Producto A', 1000.00, 2000.00, 1),
        (?, 1, 'HRS', 'Servicio de Consultoría', 3000.00, 3000.00, 2)
      `, [cotizacionId, cotizacionId]);

      console.log('✅ Cotización de ejemplo creada');
    }

    console.log('\n✨ Seeders completados exitosamente');
    console.log('\n📋 Credenciales de acceso:');
    console.log('   Admin: admin@test.com / password123');
    console.log('   Ventas: ventas@test.com / password123');
    console.log('   Lectura: lectura@test.com / password123');
    
  } catch (error) {
    console.error('❌ Error en seeders:', error);
    throw error;
  } finally {
    if (connection && shouldRelease) {
      connection.release();
    } else if (connection && !shouldRelease) {
      await connection.end();
    }
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  seed()
    .then(() => {
      console.log('✅ Proceso completado');
      process.exit(0);
    })
    .catch(err => {
      console.error('❌ Error:', err);
      process.exit(1);
    });
}

module.exports = seed;

