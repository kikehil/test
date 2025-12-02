const pool = require('../database/connection');

/**
 * Obtener todas las facturas
 */
const obtenerTodas = async (req, res) => {
  try {
    const { cotizacion_id, pagina = 1, limite = 20 } = req.query;
    const offset = (pagina - 1) * limite;
    const empresaId = req.empresaId;

    let query = `
      SELECT 
        f.*,
        c.folio as cotizacion_folio
      FROM facturas f
      INNER JOIN cotizaciones c ON f.cotizacion_id = c.id
      WHERE f.empresa_id = ?
    `;
    const params = [empresaId];

    if (cotizacion_id) {
      query += ` AND f.cotizacion_id = ?`;
      params.push(cotizacion_id);
    }

    query += ` ORDER BY f.fecha_factura DESC LIMIT ? OFFSET ?`;
    params.push(parseInt(limite), parseInt(offset));

    const [facturas] = await pool.query(query, params);

    res.json({ facturas });
  } catch (error) {
    console.error('Error obteniendo facturas:', error);
    res.status(500).json({ error: 'Error al obtener facturas' });
  }
};

/**
 * Crear nueva factura
 */
const crear = async (req, res) => {
  try {
    const {
      cotizacion_id,
      numero_factura,
      fecha_factura,
      xml_url,
      pdf_url
    } = req.body;

    const empresaId = req.empresaId;

    if (!cotizacion_id || !numero_factura || !fecha_factura) {
      return res.status(400).json({ error: 'Datos incompletos' });
    }

    // Verificar que la cotización existe
    const [cotizaciones] = await pool.query(
      'SELECT id FROM cotizaciones WHERE id = ? AND empresa_id = ?',
      [cotizacion_id, empresaId]
    );

    if (cotizaciones.length === 0) {
      return res.status(404).json({ error: 'Cotización no encontrada' });
    }

    const [result] = await pool.query(
      `INSERT INTO facturas (
        empresa_id, cotizacion_id, numero_factura, fecha_factura, xml_url, pdf_url
      ) VALUES (?, ?, ?, ?, ?, ?)`,
      [
        empresaId,
        cotizacion_id,
        numero_factura,
        fecha_factura,
        xml_url || null,
        pdf_url || null
      ]
    );

    const [nuevaFactura] = await pool.query(
      'SELECT * FROM facturas WHERE id = ?',
      [result.insertId]
    );

    res.status(201).json({
      message: 'Factura creada exitosamente',
      factura: nuevaFactura[0]
    });
  } catch (error) {
    console.error('Error creando factura:', error);
    res.status(500).json({ error: 'Error al crear factura' });
  }
};

/**
 * Actualizar factura
 */
const actualizar = async (req, res) => {
  try {
    const { id } = req.params;
    const empresaId = req.empresaId;
    const {
      numero_factura,
      fecha_factura,
      xml_url,
      pdf_url
    } = req.body;

    const [existentes] = await pool.query(
      'SELECT id FROM facturas WHERE id = ? AND empresa_id = ?',
      [id, empresaId]
    );

    if (existentes.length === 0) {
      return res.status(404).json({ error: 'Factura no encontrada' });
    }

    await pool.query(
      `UPDATE facturas SET
        numero_factura = ?,
        fecha_factura = ?,
        xml_url = ?,
        pdf_url = ?
      WHERE id = ? AND empresa_id = ?`,
      [
        numero_factura,
        fecha_factura,
        xml_url || null,
        pdf_url || null,
        id,
        empresaId
      ]
    );

    const [facturaActualizada] = await pool.query(
      'SELECT * FROM facturas WHERE id = ?',
      [id]
    );

    res.json({
      message: 'Factura actualizada exitosamente',
      factura: facturaActualizada[0]
    });
  } catch (error) {
    console.error('Error actualizando factura:', error);
    res.status(500).json({ error: 'Error al actualizar factura' });
  }
};

/**
 * Eliminar factura
 */
const eliminar = async (req, res) => {
  try {
    const { id } = req.params;
    const empresaId = req.empresaId;

    const [result] = await pool.query(
      'DELETE FROM facturas WHERE id = ? AND empresa_id = ?',
      [id, empresaId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Factura no encontrada' });
    }

    res.json({ message: 'Factura eliminada exitosamente' });
  } catch (error) {
    console.error('Error eliminando factura:', error);
    res.status(500).json({ error: 'Error al eliminar factura' });
  }
};

module.exports = {
  obtenerTodas,
  crear,
  actualizar,
  eliminar
};

