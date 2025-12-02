const pool = require('../database/connection');

/**
 * Obtener todos los clientes de la empresa
 */
const obtenerTodos = async (req, res) => {
  try {
    const { buscar, pagina = 1, limite = 20 } = req.query;
    const offset = (pagina - 1) * limite;
    const empresaId = req.empresaId;

    let query = `
      SELECT * FROM clientes 
      WHERE empresa_id = ?
    `;
    const params = [empresaId];

    if (buscar) {
      query += ` AND (nombre_razon_social LIKE ? OR email LIKE ? OR rfc LIKE ?)`;
      const busqueda = `%${buscar}%`;
      params.push(busqueda, busqueda, busqueda);
    }

    query += ` ORDER BY nombre_razon_social ASC LIMIT ? OFFSET ?`;
    params.push(parseInt(limite), parseInt(offset));

    const [clientes] = await pool.query(query, params);

    // Contar total
    let countQuery = `SELECT COUNT(*) as total FROM clientes WHERE empresa_id = ?`;
    const countParams = [empresaId];

    if (buscar) {
      countQuery += ` AND (nombre_razon_social LIKE ? OR email LIKE ? OR rfc LIKE ?)`;
      const busqueda = `%${buscar}%`;
      countParams.push(busqueda, busqueda, busqueda);
    }

    const [countResult] = await pool.query(countQuery, countParams);
    const total = countResult[0].total;

    res.json({
      clientes,
      paginacion: {
        pagina: parseInt(pagina),
        limite: parseInt(limite),
        total,
        totalPaginas: Math.ceil(total / limite)
      }
    });
  } catch (error) {
    console.error('Error obteniendo clientes:', error);
    res.status(500).json({ error: 'Error al obtener clientes' });
  }
};

/**
 * Obtener un cliente por ID
 */
const obtenerPorId = async (req, res) => {
  try {
    const { id } = req.params;
    const empresaId = req.empresaId;

    const [clientes] = await pool.query(
      'SELECT * FROM clientes WHERE id = ? AND empresa_id = ?',
      [id, empresaId]
    );

    if (clientes.length === 0) {
      return res.status(404).json({ error: 'Cliente no encontrado' });
    }

    res.json({ cliente: clientes[0] });
  } catch (error) {
    console.error('Error obteniendo cliente:', error);
    res.status(500).json({ error: 'Error al obtener cliente' });
  }
};

/**
 * Crear nuevo cliente
 */
const crear = async (req, res) => {
  try {
    const {
      nombre_razon_social,
      rfc,
      telefono,
      email,
      direccion,
      giro,
      contacto_principal,
      notas_internas
    } = req.body;

    if (!nombre_razon_social) {
      return res.status(400).json({ error: 'El nombre o razón social es requerido' });
    }

    const empresaId = req.empresaId;

    const [result] = await pool.query(
      `INSERT INTO clientes (
        empresa_id, nombre_razon_social, rfc, telefono, email, 
        direccion, giro, contacto_principal, notas_internas
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        empresaId,
        nombre_razon_social,
        rfc || null,
        telefono || null,
        email || null,
        direccion || null,
        giro || null,
        contacto_principal || null,
        notas_internas || null
      ]
    );

    const [nuevoCliente] = await pool.query(
      'SELECT * FROM clientes WHERE id = ?',
      [result.insertId]
    );

    res.status(201).json({
      message: 'Cliente creado exitosamente',
      cliente: nuevoCliente[0]
    });
  } catch (error) {
    console.error('Error creando cliente:', error);
    res.status(500).json({ error: 'Error al crear cliente' });
  }
};

/**
 * Actualizar cliente
 */
const actualizar = async (req, res) => {
  try {
    const { id } = req.params;
    const empresaId = req.empresaId;
    const {
      nombre_razon_social,
      rfc,
      telefono,
      email,
      direccion,
      giro,
      contacto_principal,
      notas_internas
    } = req.body;

    // Verificar que el cliente existe y pertenece a la empresa
    const [existentes] = await pool.query(
      'SELECT id FROM clientes WHERE id = ? AND empresa_id = ?',
      [id, empresaId]
    );

    if (existentes.length === 0) {
      return res.status(404).json({ error: 'Cliente no encontrado' });
    }

    await pool.query(
      `UPDATE clientes SET
        nombre_razon_social = ?,
        rfc = ?,
        telefono = ?,
        email = ?,
        direccion = ?,
        giro = ?,
        contacto_principal = ?,
        notas_internas = ?
      WHERE id = ? AND empresa_id = ?`,
      [
        nombre_razon_social,
        rfc || null,
        telefono || null,
        email || null,
        direccion || null,
        giro || null,
        contacto_principal || null,
        notas_internas || null,
        id,
        empresaId
      ]
    );

    const [clienteActualizado] = await pool.query(
      'SELECT * FROM clientes WHERE id = ?',
      [id]
    );

    res.json({
      message: 'Cliente actualizado exitosamente',
      cliente: clienteActualizado[0]
    });
  } catch (error) {
    console.error('Error actualizando cliente:', error);
    res.status(500).json({ error: 'Error al actualizar cliente' });
  }
};

/**
 * Eliminar cliente
 */
const eliminar = async (req, res) => {
  try {
    const { id } = req.params;
    const empresaId = req.empresaId;

    // Verificar que no tenga cotizaciones asociadas
    const [cotizaciones] = await pool.query(
      'SELECT id FROM cotizaciones WHERE cliente_id = ?',
      [id]
    );

    if (cotizaciones.length > 0) {
      return res.status(400).json({
        error: 'No se puede eliminar el cliente porque tiene cotizaciones asociadas'
      });
    }

    const [result] = await pool.query(
      'DELETE FROM clientes WHERE id = ? AND empresa_id = ?',
      [id, empresaId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Cliente no encontrado' });
    }

    res.json({ message: 'Cliente eliminado exitosamente' });
  } catch (error) {
    console.error('Error eliminando cliente:', error);
    res.status(500).json({ error: 'Error al eliminar cliente' });
  }
};

/**
 * Obtener historial de cotizaciones de un cliente
 */
const obtenerHistorialCotizaciones = async (req, res) => {
  try {
    const { id } = req.params;
    const empresaId = req.empresaId;

    // Verificar que el cliente existe y pertenece a la empresa
    const [clientes] = await pool.query(
      'SELECT id FROM clientes WHERE id = ? AND empresa_id = ?',
      [id, empresaId]
    );

    if (clientes.length === 0) {
      return res.status(404).json({ error: 'Cliente no encontrado' });
    }

    const [cotizaciones] = await pool.query(
      `SELECT 
        c.id, c.folio, c.fecha, c.fecha_vencimiento, c.estado, 
        c.subtotal, c.iva, c.total, c.created_at
      FROM cotizaciones c
      WHERE c.cliente_id = ? AND c.empresa_id = ?
      ORDER BY c.fecha DESC`,
      [id, empresaId]
    );

    res.json({ cotizaciones });
  } catch (error) {
    console.error('Error obteniendo historial:', error);
    res.status(500).json({ error: 'Error al obtener historial de cotizaciones' });
  }
};

module.exports = {
  obtenerTodos,
  obtenerPorId,
  crear,
  actualizar,
  eliminar,
  obtenerHistorialCotizaciones
};

