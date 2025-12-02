const nodemailer = require('nodemailer');
const pool = require('../database/connection');

// Configurar transporter de Nodemailer
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: false, // true para 465, false para otros puertos
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

/**
 * Envía una cotización por correo electrónico
 */
async function enviarCotizacionPorEmail(cotizacionId, empresaId, pdfBuffer) {
  try {
    // Obtener datos de la cotización
    const [cotizaciones] = await pool.query(`
      SELECT 
        c.*,
        cl.nombre_razon_social as cliente_nombre,
        cl.email as cliente_email,
        ec.nombre as empresa_nombre,
        ec.email as empresa_email
      FROM cotizaciones c
      INNER JOIN clientes cl ON c.cliente_id = cl.id
      INNER JOIN empresas e ON c.empresa_id = e.id
      LEFT JOIN empresa_config ec ON e.id = ec.empresa_id
      WHERE c.id = ? AND c.empresa_id = ?
    `, [cotizacionId, empresaId]);

    if (cotizaciones.length === 0) {
      throw new Error('Cotización no encontrada');
    }

    const cotizacion = cotizaciones[0];
    const emailDestino = cotizacion.cliente_email || cotizacion.contacto_cliente;

    if (!emailDestino) {
      throw new Error('No se encontró email del cliente');
    }

    // HTML del correo
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #3b82f6; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background-color: #f9fafb; }
          .footer { text-align: center; padding: 20px; font-size: 12px; color: #666; }
          .button { display: inline-block; padding: 12px 24px; background-color: #3b82f6; color: white; text-decoration: none; border-radius: 5px; margin: 10px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Nueva Cotización</h1>
          </div>
          <div class="content">
            <p>Estimado/a ${cotizacion.cliente_nombre},</p>
            <p>Le enviamos la cotización <strong>${cotizacion.folio}</strong> con fecha ${new Date(cotizacion.fecha).toLocaleDateString('es-MX')}.</p>
            <p><strong>Total: $${parseFloat(cotizacion.total).toFixed(2)}</strong></p>
            <p>Puede revisar los detalles en el PDF adjunto o hacer clic en el siguiente enlace:</p>
            <p style="text-align: center;">
              <a href="${process.env.APP_URL || 'http://localhost:3000'}/cotizacion/${cotizacion.token_publico || cotizacionId}/public" class="button">
                Ver Cotización en Línea
              </a>
            </p>
            <p>Si tiene alguna pregunta, no dude en contactarnos.</p>
            <p>Saludos cordiales,<br>${cotizacion.empresa_nombre || 'Equipo de Ventas'}</p>
          </div>
          <div class="footer">
            <p>Este es un correo automático, por favor no responda directamente.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    // Enviar correo
    const info = await transporter.sendMail({
      from: process.env.SMTP_FROM || `"${cotizacion.empresa_nombre || 'CRM'}" <${process.env.SMTP_USER}>`,
      to: emailDestino,
      subject: `Cotización ${cotizacion.folio} - ${cotizacion.empresa_nombre || 'Mi Empresa'}`,
      html: htmlContent,
      attachments: [
        {
          filename: `Cotizacion_${cotizacion.folio}.pdf`,
          content: pdfBuffer,
        },
      ],
    });

    // Actualizar fecha de envío
    await pool.query(
      'UPDATE cotizaciones SET fecha_envio = NOW() WHERE id = ?',
      [cotizacionId]
    );

    // Registrar evento
    await pool.query(
      'INSERT INTO eventos_cotizacion (cotizacion_id, tipo_evento, descripcion) VALUES (?, ?, ?)',
      [cotizacionId, 'Envío por correo', `Enviada a ${emailDestino}`]
    );

    return info;
  } catch (error) {
    console.error('Error enviando correo:', error);
    throw error;
  }
}

/**
 * Envía notificación cuando el cliente acepta/rechaza una cotización
 */
async function enviarNotificacionAceptacionRechazo(cotizacionId, empresaId, accion, comentarios) {
  try {
    const [cotizaciones] = await pool.query(`
      SELECT 
        c.*,
        cl.nombre_razon_social as cliente_nombre,
        ec.email as empresa_email,
        ec.nombre as empresa_nombre
      FROM cotizaciones c
      INNER JOIN clientes cl ON c.cliente_id = cl.id
      INNER JOIN empresas e ON c.empresa_id = e.id
      LEFT JOIN empresa_config ec ON e.id = ec.empresa_id
      WHERE c.id = ? AND c.empresa_id = ?
    `, [cotizacionId, empresaId]);

    if (cotizaciones.length === 0) {
      throw new Error('Cotización no encontrada');
    }

    const cotizacion = cotizaciones[0];
    const emailDestino = cotizacion.empresa_email || process.env.SMTP_USER;

    if (!emailDestino) {
      return; // No hay email de destino configurado
    }

    const accionTexto = accion === 'Aceptada' ? 'aceptada' : 'rechazada';
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: ${accion === 'Aceptada' ? '#10b981' : '#ef4444'}; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background-color: #f9fafb; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Cotización ${accionTexto.toUpperCase()}</h1>
          </div>
          <div class="content">
            <p>La cotización <strong>${cotizacion.folio}</strong> ha sido <strong>${accionTexto}</strong> por el cliente:</p>
            <p><strong>${cotizacion.cliente_nombre}</strong></p>
            ${comentarios ? `<p><strong>Comentarios del cliente:</strong><br>${comentarios}</p>` : ''}
            <p>Fecha: ${new Date().toLocaleString('es-MX')}</p>
          </div>
        </div>
      </body>
      </html>
    `;

    await transporter.sendMail({
      from: process.env.SMTP_FROM || `"CRM" <${process.env.SMTP_USER}>`,
      to: emailDestino,
      subject: `Cotización ${cotizacion.folio} ${accionTexto}`,
      html: htmlContent,
    });
  } catch (error) {
    console.error('Error enviando notificación:', error);
    // No lanzar error para no interrumpir el flujo principal
  }
}

module.exports = {
  enviarCotizacionPorEmail,
  enviarNotificacionAceptacionRechazo
};

