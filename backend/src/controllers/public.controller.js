const pool = require('../database/connection');
const { generarPDFCotizacion } = require('../utils/pdf.utils');
const { enviarNotificacionAceptacionRechazo } = require('../utils/email.utils');

/**
 * Ver cotización pública (sin autenticación)
 */
const verCotizacion = async (req, res) => {
  try {
    const { token } = req.params;

    // Buscar por token público o ID
    let cotizacion;
    if (token.match(/^\d+$/)) {
      // Es un ID numérico
      const [cotizaciones] = await pool.query(
        `SELECT 
          c.*,
          cl.nombre_razon_social as cliente_nombre,
          cl.rfc as cliente_rfc,
          cl.direccion as cliente_direccion,
          cl.telefono as cliente_telefono,
          cl.email as cliente_email,
          ec.nombre as empresa_nombre,
          ec.rfc as empresa_rfc,
          ec.direccion as empresa_direccion,
          ec.telefono as empresa_telefono,
          ec.email as empresa_email,
          ec.web as empresa_web
        FROM cotizaciones c
        INNER JOIN clientes cl ON c.cliente_id = cl.id
        INNER JOIN empresas e ON c.empresa_id = e.id
        LEFT JOIN empresa_config ec ON e.id = ec.empresa_id
        WHERE c.id = ?`,
        [token]
      );
      cotizacion = cotizaciones[0];
    } else {
      // Es un token público
      const [cotizaciones] = await pool.query(
        `SELECT 
          c.*,
          cl.nombre_razon_social as cliente_nombre,
          cl.rfc as cliente_rfc,
          cl.direccion as cliente_direccion,
          cl.telefono as cliente_telefono,
          cl.email as cliente_email,
          ec.nombre as empresa_nombre,
          ec.rfc as empresa_rfc,
          ec.direccion as empresa_direccion,
          ec.telefono as empresa_telefono,
          ec.email as empresa_email,
          ec.web as empresa_web
        FROM cotizaciones c
        INNER JOIN clientes cl ON c.cliente_id = cl.id
        INNER JOIN empresas e ON c.empresa_id = e.id
        LEFT JOIN empresa_config ec ON e.id = ec.empresa_id
        WHERE c.token_publico = ?`,
        [token]
      );
      cotizacion = cotizaciones[0];
    }

    if (!cotizacion) {
      return res.status(404).json({ error: 'Cotización no encontrada' });
    }

    // Obtener partidas
    const [partidas] = await pool.query(
      'SELECT * FROM cotizacion_partidas WHERE cotizacion_id = ? ORDER BY orden ASC',
      [cotizacion.id]
    );

    res.json({
      cotizacion: {
        ...cotizacion,
        partidas
      }
    });
  } catch (error) {
    console.error('Error obteniendo cotización pública:', error);
    res.status(500).json({ error: 'Error al obtener cotización' });
  }
};

/**
 * Generar PDF público
 */
const generarPDFPublico = async (req, res) => {
  try {
    const { token } = req.params;

    // Buscar cotización
    let cotizacionId;
    if (token.match(/^\d+$/)) {
      cotizacionId = token;
    } else {
      const [cotizaciones] = await pool.query(
        'SELECT id FROM cotizaciones WHERE token_publico = ?',
        [token]
      );
      if (cotizaciones.length === 0) {
        return res.status(404).json({ error: 'Cotización no encontrada' });
      }
      cotizacionId = cotizaciones[0].id;
    }

    const [cotizaciones] = await pool.query(
      'SELECT empresa_id FROM cotizaciones WHERE id = ?',
      [cotizacionId]
    );

    if (cotizaciones.length === 0) {
      return res.status(404).json({ error: 'Cotización no encontrada' });
    }

    const empresaId = cotizaciones[0].empresa_id;
    const pdfBuffer = await generarPDFCotizacion(cotizacionId, empresaId);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="cotizacion.pdf"`);
    res.send(pdfBuffer);
  } catch (error) {
    console.error('Error generando PDF público:', error);
    res.status(500).json({ error: 'Error al generar PDF' });
  }
};

/**
 * Aceptar cotización
 */
const aceptarCotizacion = async (req, res) => {
  try {
    const { token } = req.params;
    const { comentarios } = req.body;

    // Buscar cotización
    let cotizacionId;
    let empresaId;
    
    if (token.match(/^\d+$/)) {
      cotizacionId = token;
      const [cotizaciones] = await pool.query(
        'SELECT id, empresa_id FROM cotizaciones WHERE id = ?',
        [cotizacionId]
      );
      if (cotizaciones.length === 0) {
        return res.status(404).json({ error: 'Cotización no encontrada' });
      }
      empresaId = cotizaciones[0].empresa_id;
    } else {
      const [cotizaciones] = await pool.query(
        'SELECT id, empresa_id FROM cotizaciones WHERE token_publico = ?',
        [token]
      );
      if (cotizaciones.length === 0) {
        return res.status(404).json({ error: 'Cotización no encontrada' });
      }
      cotizacionId = cotizaciones[0].id;
      empresaId = cotizaciones[0].empresa_id;
    }

    // Actualizar estado
    await pool.query(
      `UPDATE cotizaciones SET 
        estado = 'Aceptada',
        fecha_aceptacion = NOW(),
        comentarios_cliente = ?
      WHERE id = ?`,
      [comentarios || null, cotizacionId]
    );

    // Registrar evento
    await pool.query(
      'INSERT INTO eventos_cotizacion (cotizacion_id, tipo_evento, descripcion) VALUES (?, ?, ?)',
      [cotizacionId, 'Aceptación', `Aceptada por cliente${comentarios ? ': ' + comentarios : ''}`]
    );

    // Enviar notificación
    await enviarNotificacionAceptacionRechazo(cotizacionId, empresaId, 'Aceptada', comentarios);

    res.json({ message: 'Cotización aceptada exitosamente' });
  } catch (error) {
    console.error('Error aceptando cotización:', error);
    res.status(500).json({ error: 'Error al aceptar cotización' });
  }
};

/**
 * Rechazar cotización
 */
const rechazarCotizacion = async (req, res) => {
  try {
    const { token } = req.params;
    const { comentarios } = req.body;

    if (!comentarios) {
      return res.status(400).json({ error: 'Los comentarios son requeridos para rechazar' });
    }

    // Buscar cotización
    let cotizacionId;
    let empresaId;
    
    if (token.match(/^\d+$/)) {
      cotizacionId = token;
      const [cotizaciones] = await pool.query(
        'SELECT id, empresa_id FROM cotizaciones WHERE id = ?',
        [cotizacionId]
      );
      if (cotizaciones.length === 0) {
        return res.status(404).json({ error: 'Cotización no encontrada' });
      }
      empresaId = cotizaciones[0].empresa_id;
    } else {
      const [cotizaciones] = await pool.query(
        'SELECT id, empresa_id FROM cotizaciones WHERE token_publico = ?',
        [token]
      );
      if (cotizaciones.length === 0) {
        return res.status(404).json({ error: 'Cotización no encontrada' });
      }
      cotizacionId = cotizaciones[0].id;
      empresaId = cotizaciones[0].empresa_id;
    }

    // Actualizar estado
    await pool.query(
      `UPDATE cotizaciones SET 
        estado = 'Rechazada',
        comentarios_cliente = ?
      WHERE id = ?`,
      [comentarios, cotizacionId]
    );

    // Registrar evento
    await pool.query(
      'INSERT INTO eventos_cotizacion (cotizacion_id, tipo_evento, descripcion) VALUES (?, ?, ?)',
      [cotizacionId, 'Rechazo', `Rechazada por cliente: ${comentarios}`]
    );

    // Enviar notificación
    await enviarNotificacionAceptacionRechazo(cotizacionId, empresaId, 'Rechazada', comentarios);

    res.json({ message: 'Cotización rechazada exitosamente' });
  } catch (error) {
    console.error('Error rechazando cotización:', error);
    res.status(500).json({ error: 'Error al rechazar cotización' });
  }
};

module.exports = {
  verCotizacion,
  generarPDFPublico,
  aceptarCotizacion,
  rechazarCotizacion
};

