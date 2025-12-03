const { PDFDocument, rgb, StandardFonts } = require('pdf-lib');
const QRCode = require('qrcode');
const pool = require('../database/connection');

/**
 * Genera un PDF profesional de cotización
 */
async function generarPDFCotizacion(cotizacionId, empresaId) {
  try {
    // Obtener datos de la cotización
    const [cotizaciones] = await pool.query(`
      SELECT 
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
      WHERE c.id = ? AND c.empresa_id = ?
    `, [cotizacionId, empresaId]);

    if (cotizaciones.length === 0) {
      throw new Error('Cotización no encontrada');
    }

    const cotizacion = cotizaciones[0];

    // Obtener partidas
    const [partidas] = await pool.query(`
      SELECT * FROM cotizacion_partidas
      WHERE cotizacion_id = ?
      ORDER BY orden ASC
    `, [cotizacionId]);

    // Crear documento PDF
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([595, 842]); // A4
    const { width, height } = page.getSize();

    // Fuentes
    const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const helveticaBoldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    let yPosition = height - 50;

    // Encabezado - Datos de la empresa
    page.drawText(cotizacion.empresa_nombre || 'Mi Empresa', {
      x: 50,
      y: yPosition,
      size: 20,
      font: helveticaBoldFont,
      color: rgb(0, 0, 0),
    });

    yPosition -= 25;

    if (cotizacion.empresa_rfc) {
      page.drawText(`RFC: ${cotizacion.empresa_rfc}`, {
        x: 50,
        y: yPosition,
        size: 10,
        font: helveticaFont,
        color: rgb(0.3, 0.3, 0.3),
      });
      yPosition -= 15;
    }

    if (cotizacion.empresa_direccion) {
      page.drawText(cotizacion.empresa_direccion, {
        x: 50,
        y: yPosition,
        size: 10,
        font: helveticaFont,
        color: rgb(0.3, 0.3, 0.3),
      });
      yPosition -= 15;
    }

    if (cotizacion.empresa_telefono) {
      page.drawText(`Tel: ${cotizacion.empresa_telefono}`, {
        x: 50,
        y: yPosition,
        size: 10,
        font: helveticaFont,
        color: rgb(0.3, 0.3, 0.3),
      });
      yPosition -= 15;
    }

    // Título
    yPosition -= 30;
    page.drawText('COTIZACIÓN', {
      x: 50,
      y: yPosition,
      size: 24,
      font: helveticaBoldFont,
      color: rgb(0, 0, 0),
    });

    yPosition -= 30;

    // Datos de la cotización
    page.drawText(`Folio: ${cotizacion.folio}`, {
      x: 50,
      y: yPosition,
      size: 12,
      font: helveticaBoldFont,
    });
    page.drawText(`Fecha: ${new Date(cotizacion.fecha).toLocaleDateString('es-MX')}`, {
      x: 300,
      y: yPosition,
      size: 12,
      font: helveticaFont,
    });

    yPosition -= 30;

    // Datos del cliente
    page.drawText('Cliente:', {
      x: 50,
      y: yPosition,
      size: 12,
      font: helveticaBoldFont,
    });
    yPosition -= 20;

    page.drawText(cotizacion.cliente_nombre, {
      x: 50,
      y: yPosition,
      size: 11,
      font: helveticaFont,
    });
    yPosition -= 15;

    if (cotizacion.cliente_rfc) {
      page.drawText(`RFC: ${cotizacion.cliente_rfc}`, {
        x: 50,
        y: yPosition,
        size: 10,
        font: helveticaFont,
        color: rgb(0.3, 0.3, 0.3),
      });
      yPosition -= 15;
    }

    if (cotizacion.cliente_direccion) {
      page.drawText(cotizacion.cliente_direccion, {
        x: 50,
        y: yPosition,
        size: 10,
        font: helveticaFont,
        color: rgb(0.3, 0.3, 0.3),
      });
      yPosition -= 20;
    }

    // Tabla de partidas
    yPosition -= 20;
    const tableTop = yPosition;
    const tableStartX = 50;
    const tableWidth = width - 100;

    // Encabezado de tabla
    page.drawRectangle({
      x: tableStartX,
      y: tableTop - 20,
      width: tableWidth,
      height: 25,
      color: rgb(0.9, 0.9, 0.9),
    });

    page.drawText('Cant.', { x: tableStartX + 10, y: tableTop - 5, size: 10, font: helveticaBoldFont });
    page.drawText('Unidad', { x: tableStartX + 70, y: tableTop - 5, size: 10, font: helveticaBoldFont });
    page.drawText('Descripción', { x: tableStartX + 130, y: tableTop - 5, size: 10, font: helveticaBoldFont });
    page.drawText('P. Unit.', { x: tableStartX + 380, y: tableTop - 5, size: 10, font: helveticaBoldFont });
    page.drawText('Subtotal', { x: tableStartX + 450, y: tableTop - 5, size: 10, font: helveticaBoldFont });

    let currentY = tableTop - 45;

    // Partidas
    for (const partida of partidas) {
      if (currentY < 150) {
        // Nueva página si es necesario
        const newPage = pdfDoc.addPage([595, 842]);
        currentY = height - 50;
      }

      page.drawText(partida.cantidad.toString(), {
        x: tableStartX + 10,
        y: currentY,
        size: 10,
        font: helveticaFont,
      });

      page.drawText(partida.unidad || 'PZA', {
        x: tableStartX + 70,
        y: currentY,
        size: 10,
        font: helveticaFont,
      });

      // Descripción (puede ser multilínea)
      const descLines = partida.descripcion.match(/.{1,40}/g) || [partida.descripcion];
      page.drawText(descLines[0], {
        x: tableStartX + 130,
        y: currentY,
        size: 10,
        font: helveticaFont,
      });

      page.drawText(`$${partida.precio_unitario.toFixed(2)}`, {
        x: tableStartX + 380,
        y: currentY,
        size: 10,
        font: helveticaFont,
      });

      page.drawText(`$${partida.subtotal.toFixed(2)}`, {
        x: tableStartX + 450,
        y: currentY,
        size: 10,
        font: helveticaFont,
      });

      currentY -= 20;
    }

    // Totales
    currentY -= 20;
    const totalY = currentY;

    page.drawText('Subtotal:', {
      x: tableStartX + 380,
      y: totalY,
      size: 11,
      font: helveticaBoldFont,
    });
    page.drawText(`$${parseFloat(cotizacion.subtotal).toFixed(2)}`, {
      x: tableStartX + 450,
      y: totalY,
      size: 11,
      font: helveticaFont,
    });

    currentY -= 20;
    page.drawText('IVA (16%):', {
      x: tableStartX + 380,
      y: currentY,
      size: 11,
      font: helveticaBoldFont,
    });
    page.drawText(`$${parseFloat(cotizacion.iva).toFixed(2)}`, {
      x: tableStartX + 450,
      y: currentY,
      size: 11,
      font: helveticaFont,
    });

    currentY -= 25;
    page.drawRectangle({
      x: tableStartX + 370,
      y: currentY - 5,
      width: tableWidth - 320,
      height: 30,
      color: rgb(0.95, 0.95, 0.95),
    });
    page.drawText('TOTAL:', {
      x: tableStartX + 380,
      y: currentY + 5,
      size: 14,
      font: helveticaBoldFont,
    });
    page.drawText(`$${parseFloat(cotizacion.total).toFixed(2)}`, {
      x: tableStartX + 450,
      y: currentY + 5,
      size: 14,
      font: helveticaBoldFont,
    });

    // Condiciones y notas
    currentY -= 40;
    if (cotizacion.condiciones_pago) {
      page.drawText(`Condiciones de pago: ${cotizacion.condiciones_pago}`, {
        x: 50,
        y: currentY,
        size: 10,
        font: helveticaFont,
      });
      currentY -= 20;
    }

    if (cotizacion.validez) {
      page.drawText(`Validez: ${cotizacion.validez}`, {
        x: 50,
        y: currentY,
        size: 10,
        font: helveticaFont,
      });
      currentY -= 20;
    }

    if (cotizacion.notas) {
      page.drawText(`Notas: ${cotizacion.notas}`, {
        x: 50,
        y: currentY,
        size: 10,
        font: helveticaFont,
      });
      currentY -= 20;
    }

    // QR Code para ver en línea
    try {
      const publicUrl = `${process.env.APP_URL || 'http://localhost:3000'}/cotizacion/${cotizacion.token_publico || cotizacionId}/public`;
      const qrCodeDataURL = await QRCode.toDataURL(publicUrl, { errorCorrectionLevel: 'M', width: 200 });
      const qrImageBytes = Buffer.from(qrCodeDataURL.split(',')[1], 'base64');
      const qrImage = await pdfDoc.embedPng(qrImageBytes);
      
      page.drawImage(qrImage, {
        x: width - 100,
        y: 50,
        width: 60,
        height: 60,
      });

      page.drawText('Escanea para ver en línea', {
        x: width - 100,
        y: 40,
        size: 8,
        font: helveticaFont,
        color: rgb(0.5, 0.5, 0.5),
      });
    } catch (qrError) {
      console.warn('Error generando QR code, continuando sin QR:', qrError.message);
      // Continuar sin QR si hay error
    }
    
    page.drawImage(qrImage, {
      x: width - 100,
      y: 50,
      width: 60,
      height: 60,
    });

    page.drawText('Escanea para ver en línea', {
      x: width - 100,
      y: 40,
      size: 8,
      font: helveticaFont,
      color: rgb(0.5, 0.5, 0.5),
    });

    // Pie de página
    page.drawText(`Generado el ${new Date().toLocaleString('es-MX')}`, {
      x: 50,
      y: 30,
      size: 8,
      font: helveticaFont,
      color: rgb(0.5, 0.5, 0.5),
    });

    const pdfBytes = await pdfDoc.save();
    return pdfBytes;
  } catch (error) {
    console.error('Error generando PDF:', error);
    throw error;
  }
}

module.exports = {
  generarPDFCotizacion
};

