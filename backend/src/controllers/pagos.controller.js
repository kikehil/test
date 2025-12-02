const pool = require('../database/connection');

/**
 * Obtener todos los pagos
 */
const obtenerTodos = async (req, res) => {
  try {
    const { cotizacion_id, pagina = 1, limite = 20 } = req.query;
    const offset = (pagina - 1) * limite;
    const empresaId = req.empresaId;

    let query = `
      SELECT 
        p.*,
        c.folio as cotizacion_folio,
        c.total as cotizacion_total
      FROM pagos p
      INNER JOIN cotizaciones c ON p.cotizacion_id = c.id
      WHERE p.empresa_id = ?
    `;
    const params = [empresaId];

    if (cotizacion_id) {
      query += ` AND p.cotizacion_id = ?`;
      params.push(cotizacion_id);
    }

    query += ` ORDER BY p.fecha_pago DESC LIMIT ? OFFSET ?`;
    params.push(parseInt(limite), parseInt(offset));

    const [pagos] = await pool.query(query, params);

    res.json({ pagos });
  } catch (error) {
    console.error('Error obteniendo pagos:', error);
    res.status(500).json({ error: 'Error al obtener pagos' });
  }
};

/**
 * Crear nuevo pago
 */
const crear = async (req, res) => {
  try {
    const {
      cotizacion_id,
      monto,
      fecha_pago,
      metodo_pago,
      referencia,
      archivo_comprobante,
      estatus
    } = req.body;

    const empresaId = req.empresaId;

    if (!cotizacion_id || !monto || !fecha_pago) {
      return res.status(400).json({ error: 'Datos incompletos' });
    }

    // Verificar que la cotización existe y pertenece a la empresa
    const [cotizaciones] = await pool.query(
      'SELECT id, total FROM cotizaciones WHERE id = ? AND empresa_id = ?',
      [cotizacion_id, empresaId]
    );

    if (cotizaciones.length === 0) {
      return res.status(404).json({ error: 'Cotización no encontrada' });
    }

    // Calcular total pagado
    const [pagosExistentes] = await pool.query(
      'SELECT SUM(monto) as total_pagado FROM pagos WHERE cotizacion_id = ?',
      [cotizacion_id]
    );

    const totalPagado = parseFloat(pagosExistentes[0].total_pagado || 0);
    const nuevoTotalPagado = totalPagado + parseFloat(monto);
    const totalCotizacion = parseFloat(cotizaciones[0].total);

    // Determinar estatus
    let estatusFinal = estatus || 'parcial';
    if (nuevoTotalPagado >= totalCotizacion) {
      estatusFinal = 'completo';
    }

    const [result] = await pool.query(
      `INSERT INTO pagos (
        empresa_id, cotizacion_id, monto, fecha_pago, metodo_pago,
        referencia, archivo_comprobante, estatus
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        empresaId,
        cotizacion_id,
        parseFloat(monto),
        fecha_pago,
        metodo_pago || null,
        referencia || null,
        archivo_comprobante || null,
        estatusFinal
      ]
    );

    const [nuevoPago] = await pool.query(
      'SELECT * FROM pagos WHERE id = ?',
      [result.insertId]
    );

    res.status(201).json({
      message: 'Pago registrado exitosamente',
      pago: nuevoPago[0]
    });
  } catch (error) {
    console.error('Error creando pago:', error);
    res.status(500).json({ error: 'Error al crear pago' });
  }
};

/**
 * Actualizar pago
 */
const actualizar = async (req, res) => {
  try {
    const { id } = req.params;
    const empresaId = req.empresaId;
    const {
      monto,
      fecha_pago,
      metodo_pago,
      referencia,
      archivo_comprobante,
      estatus
    } = req.body;

    const [existentes] = await pool.query(
      'SELECT id FROM pagos WHERE id = ? AND empresa_id = ?',
      [id, empresaId]
    );

    if (existentes.length === 0) {
      return res.status(404).json({ error: 'Pago no encontrado' });
    }

    await pool.query(
      `UPDATE pagos SET
        monto = ?,
        fecha_pago = ?,
        metodo_pago = ?,
        referencia = ?,
        archivo_comprobante = ?,
        estatus = ?
      WHERE id = ? AND empresa_id = ?`,
      [
        parseFloat(monto),
        fecha_pago,
        metodo_pago || null,
        referencia || null,
        archivo_comprobante || null,
        estatus || 'parcial',
        id,
        empresaId
      ]
    );

    const [pagoActualizado] = await pool.query(
      'SELECT * FROM pagos WHERE id = ?',
      [id]
    );

    res.json({
      message: 'Pago actualizado exitosamente',
      pago: pagoActualizado[0]
    });
  } catch (error) {
    console.error('Error actualizando pago:', error);
    res.status(500).json({ error: 'Error al actualizar pago' });
  }
};

/**
 * Eliminar pago
 */
const eliminar = async (req, res) => {
  try {
    const { id } = req.params;
    const empresaId = req.empresaId;

    const [result] = await pool.query(
      'DELETE FROM pagos WHERE id = ? AND empresa_id = ?',
      [id, empresaId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Pago no encontrado' });
    }

    res.json({ message: 'Pago eliminado exitosamente' });
  } catch (error) {
    console.error('Error eliminando pago:', error);
    res.status(500).json({ error: 'Error al eliminar pago' });
  }
};

module.exports = {
  obtenerTodos,
  crear,
  actualizar,
  eliminar
};

