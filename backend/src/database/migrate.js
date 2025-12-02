const pool = require('./connection');
require('dotenv').config();

async function migrate() {
  let connection;
  
  try {
    connection = await pool.getConnection();
    console.log('🔄 Iniciando migraciones...');

    // Tabla de empresas (multi-empresa)
    await connection.query(`
      CREATE TABLE IF NOT EXISTS empresas (
        id INT AUTO_INCREMENT PRIMARY KEY,
        nombre VARCHAR(255) NOT NULL,
        rfc VARCHAR(20),
        direccion TEXT,
        telefono VARCHAR(50),
        email VARCHAR(255),
        web VARCHAR(255),
        logo_url VARCHAR(500),
        activo BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
    console.log('✅ Tabla empresas creada');

    // Tabla de usuarios
    await connection.query(`
      CREATE TABLE IF NOT EXISTS usuarios (
        id INT AUTO_INCREMENT PRIMARY KEY,
        empresa_id INT NOT NULL,
        nombre VARCHAR(255) NOT NULL,
        email VARCHAR(255) NOT NULL UNIQUE,
        password VARCHAR(255) NOT NULL,
        rol ENUM('ADMIN', 'VENTAS', 'LECTURA') DEFAULT 'LECTURA',
        activo BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (empresa_id) REFERENCES empresas(id) ON DELETE CASCADE,
        INDEX idx_empresa (empresa_id),
        INDEX idx_email (email)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
    console.log('✅ Tabla usuarios creada');

    // Tabla de clientes
    await connection.query(`
      CREATE TABLE IF NOT EXISTS clientes (
        id INT AUTO_INCREMENT PRIMARY KEY,
        empresa_id INT NOT NULL,
        nombre_razon_social VARCHAR(255) NOT NULL,
        rfc VARCHAR(20),
        telefono VARCHAR(50),
        email VARCHAR(255),
        direccion TEXT,
        giro VARCHAR(255),
        contacto_principal VARCHAR(255),
        notas_internas TEXT,
        fecha_alta DATE DEFAULT (CURRENT_DATE),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (empresa_id) REFERENCES empresas(id) ON DELETE CASCADE,
        INDEX idx_empresa (empresa_id),
        INDEX idx_nombre (nombre_razon_social)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
    console.log('✅ Tabla clientes creada');

    // Tabla de productos
    await connection.query(`
      CREATE TABLE IF NOT EXISTS productos (
        id INT AUTO_INCREMENT PRIMARY KEY,
        empresa_id INT NOT NULL,
        nombre VARCHAR(255) NOT NULL,
        descripcion TEXT,
        precio_unitario DECIMAL(10, 2) NOT NULL DEFAULT 0,
        unidad VARCHAR(50) DEFAULT 'PZA',
        categoria VARCHAR(100),
        activo BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (empresa_id) REFERENCES empresas(id) ON DELETE CASCADE,
        INDEX idx_empresa (empresa_id),
        INDEX idx_nombre (nombre),
        INDEX idx_categoria (categoria)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
    console.log('✅ Tabla productos creada');

    // Tabla de cotizaciones
    await connection.query(`
      CREATE TABLE IF NOT EXISTS cotizaciones (
        id INT AUTO_INCREMENT PRIMARY KEY,
        empresa_id INT NOT NULL,
        folio VARCHAR(50) UNIQUE,
        fecha DATE NOT NULL,
        fecha_vencimiento DATE,
        cliente_id INT NOT NULL,
        contacto_cliente VARCHAR(255),
        condiciones_pago VARCHAR(255),
        validez VARCHAR(100),
        notas TEXT,
        estado ENUM('Pendiente', 'Enviada', 'Aceptada', 'Rechazada', 'Vencida') DEFAULT 'Pendiente',
        subtotal DECIMAL(10, 2) DEFAULT 0,
        iva DECIMAL(10, 2) DEFAULT 0,
        total DECIMAL(10, 2) DEFAULT 0,
        fecha_envio DATETIME,
        fecha_aceptacion DATETIME,
        comentarios_cliente TEXT,
        token_publico VARCHAR(255) UNIQUE,
        created_by INT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (empresa_id) REFERENCES empresas(id) ON DELETE CASCADE,
        FOREIGN KEY (cliente_id) REFERENCES clientes(id) ON DELETE RESTRICT,
        FOREIGN KEY (created_by) REFERENCES usuarios(id) ON SET NULL,
        INDEX idx_empresa (empresa_id),
        INDEX idx_cliente (cliente_id),
        INDEX idx_folio (folio),
        INDEX idx_estado (estado),
        INDEX idx_fecha (fecha)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
    console.log('✅ Tabla cotizaciones creada');

    // Tabla de partidas de cotización
    await connection.query(`
      CREATE TABLE IF NOT EXISTS cotizacion_partidas (
        id INT AUTO_INCREMENT PRIMARY KEY,
        cotizacion_id INT NOT NULL,
        cantidad DECIMAL(10, 2) NOT NULL DEFAULT 1,
        unidad VARCHAR(50) DEFAULT 'PZA',
        descripcion TEXT NOT NULL,
        precio_unitario DECIMAL(10, 2) NOT NULL DEFAULT 0,
        subtotal DECIMAL(10, 2) NOT NULL DEFAULT 0,
        orden INT DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (cotizacion_id) REFERENCES cotizaciones(id) ON DELETE CASCADE,
        INDEX idx_cotizacion (cotizacion_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
    console.log('✅ Tabla cotizacion_partidas creada');

    // Tabla de pagos
    await connection.query(`
      CREATE TABLE IF NOT EXISTS pagos (
        id INT AUTO_INCREMENT PRIMARY KEY,
        empresa_id INT NOT NULL,
        cotizacion_id INT NOT NULL,
        monto DECIMAL(10, 2) NOT NULL,
        fecha_pago DATE NOT NULL,
        metodo_pago VARCHAR(100),
        referencia VARCHAR(255),
        archivo_comprobante VARCHAR(500),
        estatus ENUM('parcial', 'completo') DEFAULT 'parcial',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (empresa_id) REFERENCES empresas(id) ON DELETE CASCADE,
        FOREIGN KEY (cotizacion_id) REFERENCES cotizaciones(id) ON DELETE RESTRICT,
        INDEX idx_empresa (empresa_id),
        INDEX idx_cotizacion (cotizacion_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
    console.log('✅ Tabla pagos creada');

    // Tabla de facturas
    await connection.query(`
      CREATE TABLE IF NOT EXISTS facturas (
        id INT AUTO_INCREMENT PRIMARY KEY,
        empresa_id INT NOT NULL,
        cotizacion_id INT NOT NULL,
        numero_factura VARCHAR(100) UNIQUE,
        fecha_factura DATE NOT NULL,
        xml_url VARCHAR(500),
        pdf_url VARCHAR(500),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (empresa_id) REFERENCES empresas(id) ON DELETE CASCADE,
        FOREIGN KEY (cotizacion_id) REFERENCES cotizaciones(id) ON DELETE RESTRICT,
        INDEX idx_empresa (empresa_id),
        INDEX idx_cotizacion (cotizacion_id),
        INDEX idx_numero (numero_factura)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
    console.log('✅ Tabla facturas creada');

    // Tabla de eventos/historial de cotizaciones
    await connection.query(`
      CREATE TABLE IF NOT EXISTS eventos_cotizacion (
        id INT AUTO_INCREMENT PRIMARY KEY,
        cotizacion_id INT NOT NULL,
        tipo_evento VARCHAR(100) NOT NULL,
        descripcion TEXT,
        usuario_id INT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (cotizacion_id) REFERENCES cotizaciones(id) ON DELETE CASCADE,
        FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON SET NULL,
        INDEX idx_cotizacion (cotizacion_id),
        INDEX idx_tipo (tipo_evento)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
    console.log('✅ Tabla eventos_cotizacion creada');

    // Tabla de configuración de empresa
    await connection.query(`
      CREATE TABLE IF NOT EXISTS empresa_config (
        id INT AUTO_INCREMENT PRIMARY KEY,
        empresa_id INT NOT NULL UNIQUE,
        nombre VARCHAR(255),
        rfc VARCHAR(20),
        direccion TEXT,
        telefono VARCHAR(50),
        email VARCHAR(255),
        web VARCHAR(255),
        logo_url VARCHAR(500),
        iva_porcentaje DECIMAL(5, 2) DEFAULT 16.00,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (empresa_id) REFERENCES empresas(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
    console.log('✅ Tabla empresa_config creada');

    console.log('\n✨ Migraciones completadas exitosamente');
    
  } catch (error) {
    console.error('❌ Error en migraciones:', error);
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
  migrate()
    .then(() => {
      console.log('✅ Proceso completado');
      process.exit(0);
    })
    .catch(err => {
      console.error('❌ Error:', err);
      process.exit(1);
    });
}

module.exports = migrate;

