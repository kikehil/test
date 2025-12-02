const pool = require('../database/connection');

/**
 * Obtener todos los productos
 */
const obtenerTodos = async (req, res) => {
  try {
    const { buscar, categoria, activo, pagina = 1, limite = 50 } = req.query;
    const offset = (pagina - 1) * limite;
    const empresaId = req.empresaId;

    let query = `SELECT * FROM productos WHERE empresa_id = ?`;
    const params = [empresaId];

    if (buscar) {
      query += ` AND (nombre LIKE ? OR descripcion LIKE ?)`;
      const busqueda = `%${buscar}%`;
      params.push(busqueda, busqueda);
    }

    if (categoria) {
      query += ` AND categoria = ?`;
      params.push(categoria);
    }

    if (activo !== undefined) {
      query += ` AND activo = ?`;
      params.push(activo === 'true' ? 1 : 0);
    }

    query += ` ORDER BY nombre ASC LIMIT ? OFFSET ?`;
    params.push(parseInt(limite), parseInt(offset));

    const [productos] = await pool.query(query, params);

    res.json({ productos });
  } catch (error) {
    console.error('Error obteniendo productos:', error);
    res.status(500).json({ error: 'Error al obtener productos' });
  }
};

/**
 * Buscar productos para autocompletar
 */
const buscar = async (req, res) => {
  try {
    const { q } = req.query;
    const empresaId = req.empresaId;

    if (!q || q.length < 2) {
      return res.json({ productos: [] });
    }

    const [productos] = await pool.query(
      `SELECT id, nombre, descripcion, precio_unitario, unidad, categoria
       FROM productos 
       WHERE empresa_id = ? AND activo = TRUE 
       AND (nombre LIKE ? OR descripcion LIKE ?)
       ORDER BY nombre ASC
       LIMIT 20`,
      [empresaId, `%${q}%`, `%${q}%`]
    );

    res.json({ productos });
  } catch (error) {
    console.error('Error buscando productos:', error);
    res.status(500).json({ error: 'Error al buscar productos' });
  }
};

/**
 * Obtener un producto por ID
 */
const obtenerPorId = async (req, res) => {
  try {
    const { id } = req.params;
    const empresaId = req.empresaId;

    const [productos] = await pool.query(
      'SELECT * FROM productos WHERE id = ? AND empresa_id = ?',
      [id, empresaId]
    );

    if (productos.length === 0) {
      return res.status(404).json({ error: 'Producto no encontrado' });
    }

    res.json({ producto: productos[0] });
  } catch (error) {
    console.error('Error obteniendo producto:', error);
    res.status(500).json({ error: 'Error al obtener producto' });
  }
};

/**
 * Crear nuevo producto
 */
const crear = async (req, res) => {
  try {
    const { nombre, descripcion, precio_unitario, unidad, categoria } = req.body;
    const empresaId = req.empresaId;

    if (!nombre || precio_unitario === undefined) {
      return res.status(400).json({ error: 'Nombre y precio unitario son requeridos' });
    }

    const [result] = await pool.query(
      `INSERT INTO productos (empresa_id, nombre, descripcion, precio_unitario, unidad, categoria)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        empresaId,
        nombre,
        descripcion || null,
        parseFloat(precio_unitario),
        unidad || 'PZA',
        categoria || null
      ]
    );

    const [nuevoProducto] = await pool.query(
      'SELECT * FROM productos WHERE id = ?',
      [result.insertId]
    );

    res.status(201).json({
      message: 'Producto creado exitosamente',
      producto: nuevoProducto[0]
    });
  } catch (error) {
    console.error('Error creando producto:', error);
    res.status(500).json({ error: 'Error al crear producto' });
  }
};

/**
 * Actualizar producto
 */
const actualizar = async (req, res) => {
  try {
    const { id } = req.params;
    const empresaId = req.empresaId;
    const { nombre, descripcion, precio_unitario, unidad, categoria, activo } = req.body;

    const [existentes] = await pool.query(
      'SELECT id FROM productos WHERE id = ? AND empresa_id = ?',
      [id, empresaId]
    );

    if (existentes.length === 0) {
      return res.status(404).json({ error: 'Producto no encontrado' });
    }

    await pool.query(
      `UPDATE productos SET
        nombre = ?,
        descripcion = ?,
        precio_unitario = ?,
        unidad = ?,
        categoria = ?,
        activo = ?
      WHERE id = ? AND empresa_id = ?`,
      [
        nombre,
        descripcion || null,
        parseFloat(precio_unitario),
        unidad || 'PZA',
        categoria || null,
        activo !== undefined ? activo : true,
        id,
        empresaId
      ]
    );

    const [productoActualizado] = await pool.query(
      'SELECT * FROM productos WHERE id = ?',
      [id]
    );

    res.json({
      message: 'Producto actualizado exitosamente',
      producto: productoActualizado[0]
    });
  } catch (error) {
    console.error('Error actualizando producto:', error);
    res.status(500).json({ error: 'Error al actualizar producto' });
  }
};

/**
 * Eliminar producto
 */
const eliminar = async (req, res) => {
  try {
    const { id } = req.params;
    const empresaId = req.empresaId;

    // En lugar de eliminar, desactivar
    const [result] = await pool.query(
      'UPDATE productos SET activo = FALSE WHERE id = ? AND empresa_id = ?',
      [id, empresaId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Producto no encontrado' });
    }

    res.json({ message: 'Producto desactivado exitosamente' });
  } catch (error) {
    console.error('Error eliminando producto:', error);
    res.status(500).json({ error: 'Error al eliminar producto' });
  }
};

module.exports = {
  obtenerTodos,
  buscar,
  obtenerPorId,
  crear,
  actualizar,
  eliminar
};

