const pool = require('../database/connection');
const { generarFolio, generarTokenPublico } = require('../utils/folio.utils');
const { generarPDFCotizacion } = require('../utils/pdf.utils');
const { enviarCotizacionPorEmail } = require('../utils/email.utils');

/**
 * Obtener todas las cotizaciones
 */
const obtenerTodas = async (req, res) => {
  try {
    const { estado, cliente_id, fecha_desde, fecha_hasta, pagina = 1, limite = 20 } = req.query;
    const offset = (pagina - 1) * limite;
    const empresaId = req.empresaId;

    let query = `
      SELECT 
        c.*,
        cl.nombre_razon_social as cliente_nombre,
        cl.email as cliente_email
      FROM cotizaciones c
      INNER JOIN clientes cl ON c.cliente_id = cl.id
      WHERE c.empresa_id = ?
    `;
    const params = [empresaId];

    if (estado) {
      query += ` AND c.estado = ?`;
      params.push(estado);
    }

    if (cliente_id) {
      query += ` AND c.cliente_id = ?`;
      params.push(cliente_id);
    }

    if (fecha_desde) {
      query += ` AND c.fecha >= ?`;
      params.push(fecha_desde);
    }

    if (fecha_hasta) {
      query += ` AND c.fecha <= ?`;
      params.push(fecha_hasta);
    }

    query += ` ORDER BY c.fecha DESC LIMIT ? OFFSET ?`;
    params.push(parseInt(limite), parseInt(offset));

    const [cotizaciones] = await pool.query(query, params);

    // Contar total
    let countQuery = `
      SELECT COUNT(*) as total FROM cotizaciones c
      WHERE c.empresa_id = ?
    `;
    const countParams = [empresaId];

    if (estado) {
      countQuery += ` AND c.estado = ?`;
      countParams.push(estado);
    }
    if (cliente_id) {
      countQuery += ` AND c.cliente_id = ?`;
      countParams.push(cliente_id);
    }

    const [countResult] = await pool.query(countQuery, countParams);
    const total = countResult[0].total;

    res.json({
      cotizaciones,
      paginacion: {
        pagina: parseInt(pagina),
        limite: parseInt(limite),
        total,
        totalPaginas: Math.ceil(total / limite)
      }
    });
  } catch (error) {
    console.error('Error obteniendo cotizaciones:', error);
    res.status(500).json({ error: 'Error al obtener cotizaciones' });
  }
};

/**
 * Obtener una cotización por ID con sus partidas
 */
const obtenerPorId = async (req, res) => {
  try {
    const { id } = req.params;
    const empresaId = req.empresaId;

    const [cotizaciones] = await pool.query(
      `SELECT 
        c.*,
        cl.nombre_razon_social as cliente_nombre,
        cl.rfc as cliente_rfc,
        cl.direccion as cliente_direccion,
        cl.telefono as cliente_telefono,
        cl.email as cliente_email
      FROM cotizaciones c
      INNER JOIN clientes cl ON c.cliente_id = cl.id
      WHERE c.id = ? AND c.empresa_id = ?`,
      [id, empresaId]
    );

    if (cotizaciones.length === 0) {
      return res.status(404).json({ error: 'Cotización no encontrada' });
    }

    const cotizacion = cotizaciones[0];

    // Obtener partidas
    const [partidas] = await pool.query(
      'SELECT * FROM cotizacion_partidas WHERE cotizacion_id = ? ORDER BY orden ASC',
      [id]
    );

    res.json({
      cotizacion: {
        ...cotizacion,
        partidas
      }
    });
  } catch (error) {
    console.error('Error obteniendo cotización:', error);
    res.status(500).json({ error: 'Error al obtener cotización' });
  }
};

/**
 * Crear nueva cotización
 */
const crear = async (req, res) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const {
      fecha,
      fecha_vencimiento,
      cliente_id,
      contacto_cliente,
      condiciones_pago,
      validez,
      notas,
      partidas
    } = req.body;

    const empresaId = req.empresaId;
    const usuarioId = req.user.id;

    if (!cliente_id || !fecha || !partidas || partidas.length === 0) {
      return res.status(400).json({ error: 'Datos incompletos' });
    }

    // Verificar que el cliente pertenece a la empresa
    const [clientes] = await connection.query(
      'SELECT id FROM clientes WHERE id = ? AND empresa_id = ?',
      [cliente_id, empresaId]
    );

    if (clientes.length === 0) {
      await connection.rollback();
      return res.status(404).json({ error: 'Cliente no encontrado' });
    }

    // Generar folio y token público
    const folio = await generarFolio(empresaId);
    const tokenPublico = generarTokenPublico();

    // Calcular totales
    let subtotal = 0;
    partidas.forEach(partida => {
      const cantidad = parseFloat(partida.cantidad) || 0;
      const precioUnitario = parseFloat(partida.precio_unitario) || 0;
      const partidaSubtotal = cantidad * precioUnitario;
      subtotal += partidaSubtotal;
    });

    const ivaPorcentaje = 16; // Por defecto 16%
    const iva = subtotal * (ivaPorcentaje / 100);
    const total = subtotal + iva;

    // Crear cotización
    const [cotizacionResult] = await connection.query(
      `INSERT INTO cotizaciones (
        empresa_id, folio, fecha, fecha_vencimiento, cliente_id,
        contacto_cliente, condiciones_pago, validez, notas,
        estado, subtotal, iva, total, token_publico, created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'Pendiente', ?, ?, ?, ?, ?)`,
      [
        empresaId,
        folio,
        fecha,
        fecha_vencimiento || null,
        cliente_id,
        contacto_cliente || null,
        condiciones_pago || null,
        validez || null,
        notas || null,
        subtotal,
        iva,
        total,
        tokenPublico,
        usuarioId
      ]
    );

    const cotizacionId = cotizacionResult.insertId;

    // Crear partidas
    for (let i = 0; i < partidas.length; i++) {
      const partida = partidas[i];
      const cantidad = parseFloat(partida.cantidad) || 0;
      const precioUnitario = parseFloat(partida.precio_unitario) || 0;
      const partidaSubtotal = cantidad * precioUnitario;

      await connection.query(
        `INSERT INTO cotizacion_partidas (
          cotizacion_id, cantidad, unidad, descripcion, precio_unitario, subtotal, orden
        ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          cotizacionId,
          cantidad,
          partida.unidad || 'PZA',
          partida.descripcion,
          precioUnitario,
          partidaSubtotal,
          i + 1
        ]
      );
    }

    // Registrar evento
    await connection.query(
      'INSERT INTO eventos_cotizacion (cotizacion_id, tipo_evento, descripcion, usuario_id) VALUES (?, ?, ?, ?)',
      [cotizacionId, 'Creación', 'Cotización creada', usuarioId]
    );

    await connection.commit();

    // Obtener cotización completa
    const [nuevaCotizacion] = await connection.query(
      `SELECT 
        c.*,
        cl.nombre_razon_social as cliente_nombre
      FROM cotizaciones c
      INNER JOIN clientes cl ON c.cliente_id = cl.id
      WHERE c.id = ?`,
      [cotizacionId]
    );

    const [partidasCreadas] = await connection.query(
      'SELECT * FROM cotizacion_partidas WHERE cotizacion_id = ? ORDER BY orden ASC',
      [cotizacionId]
    );

    res.status(201).json({
      message: 'Cotización creada exitosamente',
      cotizacion: {
        ...nuevaCotizacion[0],
        partidas: partidasCreadas
      }
    });
  } catch (error) {
    await connection.rollback();
    console.error('Error creando cotización:', error);
    res.status(500).json({ error: 'Error al crear cotización' });
  } finally {
    connection.release();
  }
};

/**
 * Actualizar cotización
 */
const actualizar = async (req, res) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const { id } = req.params;
    const empresaId = req.empresaId;
    const {
      fecha,
      fecha_vencimiento,
      cliente_id,
      contacto_cliente,
      condiciones_pago,
      validez,
      notas,
      partidas
    } = req.body;

    // Verificar que la cotización existe y pertenece a la empresa
    const [existentes] = await connection.query(
      'SELECT id, estado FROM cotizaciones WHERE id = ? AND empresa_id = ?',
      [id, empresaId]
    );

    if (existentes.length === 0) {
      await connection.rollback();
      return res.status(404).json({ error: 'Cotización no encontrada' });
    }

    // No permitir editar si está aceptada
    if (existentes[0].estado === 'Aceptada') {
      await connection.rollback();
      return res.status(400).json({ error: 'No se puede editar una cotización aceptada' });
    }

    // Si hay partidas, recalcular totales
    let subtotal = 0;
    let iva = 0;
    let total = 0;

    if (partidas && partidas.length > 0) {
      partidas.forEach(partida => {
        const cantidad = parseFloat(partida.cantidad) || 0;
        const precioUnitario = parseFloat(partida.precio_unitario) || 0;
        subtotal += cantidad * precioUnitario;
      });

      const ivaPorcentaje = 16;
      iva = subtotal * (ivaPorcentaje / 100);
      total = subtotal + iva;

      // Eliminar partidas existentes y crear nuevas
      await connection.query(
        'DELETE FROM cotizacion_partidas WHERE cotizacion_id = ?',
        [id]
      );

      for (let i = 0; i < partidas.length; i++) {
        const partida = partidas[i];
        const cantidad = parseFloat(partida.cantidad) || 0;
        const precioUnitario = parseFloat(partida.precio_unitario) || 0;
        const partidaSubtotal = cantidad * precioUnitario;

        await connection.query(
          `INSERT INTO cotizacion_partidas (
            cotizacion_id, cantidad, unidad, descripcion, precio_unitario, subtotal, orden
          ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [
            id,
            cantidad,
            partida.unidad || 'PZA',
            partida.descripcion,
            precioUnitario,
            partidaSubtotal,
            i + 1
          ]
        );
      }
    } else {
      // Si no hay partidas nuevas, mantener los totales existentes
      const [cotizacionActual] = await connection.query(
        'SELECT subtotal, iva, total FROM cotizaciones WHERE id = ?',
        [id]
      );
      subtotal = parseFloat(cotizacionActual[0].subtotal);
      iva = parseFloat(cotizacionActual[0].iva);
      total = parseFloat(cotizacionActual[0].total);
    }

    // Actualizar cotización
    await connection.query(
      `UPDATE cotizaciones SET
        fecha = ?,
        fecha_vencimiento = ?,
        cliente_id = ?,
        contacto_cliente = ?,
        condiciones_pago = ?,
        validez = ?,
        notas = ?,
        subtotal = ?,
        iva = ?,
        total = ?
      WHERE id = ? AND empresa_id = ?`,
      [
        fecha,
        fecha_vencimiento || null,
        cliente_id,
        contacto_cliente || null,
        condiciones_pago || null,
        validez || null,
        notas || null,
        subtotal,
        iva,
        total,
        id,
        empresaId
      ]
    );

    // Registrar evento
    await connection.query(
      'INSERT INTO eventos_cotizacion (cotizacion_id, tipo_evento, descripcion, usuario_id) VALUES (?, ?, ?, ?)',
      [id, 'Actualización', 'Cotización actualizada', req.user.id]
    );

    await connection.commit();

    // Obtener cotización actualizada
    const [cotizacionActualizada] = await connection.query(
      `SELECT 
        c.*,
        cl.nombre_razon_social as cliente_nombre
      FROM cotizaciones c
      INNER JOIN clientes cl ON c.cliente_id = cl.id
      WHERE c.id = ?`,
      [id]
    );

    const [partidasActualizadas] = await connection.query(
      'SELECT * FROM cotizacion_partidas WHERE cotizacion_id = ? ORDER BY orden ASC',
      [id]
    );

    res.json({
      message: 'Cotización actualizada exitosamente',
      cotizacion: {
        ...cotizacionActualizada[0],
        partidas: partidasActualizadas
      }
    });
  } catch (error) {
    await connection.rollback();
    console.error('Error actualizando cotización:', error);
    res.status(500).json({ error: 'Error al actualizar cotización' });
  } finally {
    connection.release();
  }
};

/**
 * Cambiar estado de cotización
 */
const cambiarEstado = async (req, res) => {
  try {
    const { id } = req.params;
    const { estado } = req.body;
    const empresaId = req.empresaId;

    const estadosValidos = ['Pendiente', 'Enviada', 'Aceptada', 'Rechazada', 'Vencida'];
    if (!estadosValidos.includes(estado)) {
      return res.status(400).json({ error: 'Estado inválido' });
    }

    const [result] = await pool.query(
      `UPDATE cotizaciones SET estado = ? WHERE id = ? AND empresa_id = ?`,
      [estado, id, empresaId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Cotización no encontrada' });
    }

    // Registrar evento
    await pool.query(
      'INSERT INTO eventos_cotizacion (cotizacion_id, tipo_evento, descripcion, usuario_id) VALUES (?, ?, ?, ?)',
      [id, 'Cambio de estado', `Estado cambiado a: ${estado}`, req.user.id]
    );

    res.json({ message: 'Estado actualizado exitosamente' });
  } catch (error) {
    console.error('Error cambiando estado:', error);
    res.status(500).json({ error: 'Error al cambiar estado' });
  }
};

/**
 * Duplicar cotización
 */
const duplicar = async (req, res) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const { id } = req.params;
    const empresaId = req.empresaId;

    // Obtener cotización original
    const [cotizaciones] = await connection.query(
      'SELECT * FROM cotizaciones WHERE id = ? AND empresa_id = ?',
      [id, empresaId]
    );

    if (cotizaciones.length === 0) {
      await connection.rollback();
      return res.status(404).json({ error: 'Cotización no encontrada' });
    }

    const cotizacionOriginal = cotizaciones[0];

    // Obtener partidas originales
    const [partidasOriginales] = await connection.query(
      'SELECT * FROM cotizacion_partidas WHERE cotizacion_id = ? ORDER BY orden ASC',
      [id]
    );

    // Generar nuevo folio y token
    const nuevoFolio = await generarFolio(empresaId);
    const nuevoTokenPublico = generarTokenPublico();

    // Crear nueva cotización
    const [nuevaCotizacion] = await connection.query(
      `INSERT INTO cotizaciones (
        empresa_id, folio, fecha, fecha_vencimiento, cliente_id,
        contacto_cliente, condiciones_pago, validez, notas,
        estado, subtotal, iva, total, token_publico, created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'Pendiente', ?, ?, ?, ?, ?)`,
      [
        empresaId,
        nuevoFolio,
        new Date().toISOString().split('T')[0],
        cotizacionOriginal.fecha_vencimiento,
        cotizacionOriginal.cliente_id,
        cotizacionOriginal.contacto_cliente,
        cotizacionOriginal.condiciones_pago,
        cotizacionOriginal.validez,
        cotizacionOriginal.notas,
        cotizacionOriginal.subtotal,
        cotizacionOriginal.iva,
        cotizacionOriginal.total,
        nuevoTokenPublico,
        req.user.id
      ]
    );

    const nuevaCotizacionId = nuevaCotizacion.insertId;

    // Duplicar partidas
    for (const partida of partidasOriginales) {
      await connection.query(
        `INSERT INTO cotizacion_partidas (
          cotizacion_id, cantidad, unidad, descripcion, precio_unitario, subtotal, orden
        ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          nuevaCotizacionId,
          partida.cantidad,
          partida.unidad,
          partida.descripcion,
          partida.precio_unitario,
          partida.subtotal,
          partida.orden
        ]
      );
    }

    // Registrar evento
    await connection.query(
      'INSERT INTO eventos_cotizacion (cotizacion_id, tipo_evento, descripcion, usuario_id) VALUES (?, ?, ?, ?)',
      [nuevaCotizacionId, 'Duplicación', `Duplicada desde cotización ${cotizacionOriginal.folio}`, req.user.id]
    );

    await connection.commit();

    res.status(201).json({
      message: 'Cotización duplicada exitosamente',
      cotizacion_id: nuevaCotizacionId,
      folio: nuevoFolio
    });
  } catch (error) {
    await connection.rollback();
    console.error('Error duplicando cotización:', error);
    res.status(500).json({ error: 'Error al duplicar cotización' });
  } finally {
    connection.release();
  }
};

/**
 * Generar PDF de cotización
 */
const generarPDF = async (req, res) => {
  try {
    const { id } = req.params;
    const empresaId = req.empresaId;

    const pdfBuffer = await generarPDFCotizacion(id, empresaId);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="cotizacion_${id}.pdf"`);
    res.send(pdfBuffer);
  } catch (error) {
    console.error('Error generando PDF:', error);
    res.status(500).json({ error: 'Error al generar PDF' });
  }
};

/**
 * Enviar cotización por correo
 */
const enviarPorCorreo = async (req, res) => {
  try {
    const { id } = req.params;
    const empresaId = req.empresaId;

    // Generar PDF
    const pdfBuffer = await generarPDFCotizacion(id, empresaId);

    // Enviar correo
    const info = await enviarCotizacionPorEmail(id, empresaId, pdfBuffer);

    // Cambiar estado a "Enviada"
    await pool.query(
      'UPDATE cotizaciones SET estado = ? WHERE id = ?',
      ['Enviada', id]
    );

    res.json({
      message: 'Cotización enviada por correo exitosamente',
      messageId: info.messageId
    });
  } catch (error) {
    console.error('Error enviando correo:', error);
    res.status(500).json({ error: error.message || 'Error al enviar correo' });
  }
};

module.exports = {
  obtenerTodas,
  obtenerPorId,
  crear,
  actualizar,
  cambiarEstado,
  duplicar,
  generarPDF,
  enviarPorCorreo
};

