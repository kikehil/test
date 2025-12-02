const pool = require('../database/connection');

/**
 * Obtener estadísticas del dashboard
 */
const obtenerEstadisticas = async (req, res) => {
  try {
    const empresaId = req.empresaId;

    // Total cotizado
    const [totalCotizado] = await pool.query(
      `SELECT COALESCE(SUM(total), 0) as total FROM cotizaciones WHERE empresa_id = ?`,
      [empresaId]
    );

    // Total aceptado
    const [totalAceptado] = await pool.query(
      `SELECT COALESCE(SUM(total), 0) as total FROM cotizaciones 
       WHERE empresa_id = ? AND estado = 'Aceptada'`,
      [empresaId]
    );

    // Total pagado
    const [totalPagado] = await pool.query(
      `SELECT COALESCE(SUM(monto), 0) as total FROM pagos WHERE empresa_id = ?`,
      [empresaId]
    );

    // Cotizaciones por estatus
    const [porEstatus] = await pool.query(
      `SELECT estado, COUNT(*) as cantidad, COALESCE(SUM(total), 0) as total
       FROM cotizaciones
       WHERE empresa_id = ?
       GROUP BY estado`,
      [empresaId]
    );

    // 5 clientes con más cotizaciones
    const [topClientes] = await pool.query(
      `SELECT 
        c.id,
        c.nombre_razon_social,
        COUNT(co.id) as cantidad_cotizaciones,
        COALESCE(SUM(co.total), 0) as total_cotizado
      FROM clientes c
      LEFT JOIN cotizaciones co ON c.id = co.cliente_id AND c.empresa_id = co.empresa_id
      WHERE c.empresa_id = ?
      GROUP BY c.id, c.nombre_razon_social
      ORDER BY cantidad_cotizaciones DESC
      LIMIT 5`,
      [empresaId]
    );

    // 5 cotizaciones más recientes
    const [recientes] = await pool.query(
      `SELECT 
        c.id,
        c.folio,
        c.fecha,
        c.estado,
        c.total,
        cl.nombre_razon_social as cliente_nombre
      FROM cotizaciones c
      INNER JOIN clientes cl ON c.cliente_id = cl.id
      WHERE c.empresa_id = ?
      ORDER BY c.created_at DESC
      LIMIT 5`,
      [empresaId]
    );

    // Gráfica mensual (últimos 12 meses)
    const [mensual] = await pool.query(
      `SELECT 
        DATE_FORMAT(fecha, '%Y-%m') as mes,
        COUNT(*) as cantidad,
        COALESCE(SUM(total), 0) as total
      FROM cotizaciones
      WHERE empresa_id = ? 
        AND fecha >= DATE_SUB(CURDATE(), INTERVAL 12 MONTH)
      GROUP BY DATE_FORMAT(fecha, '%Y-%m')
      ORDER BY mes ASC`,
      [empresaId]
    );

    res.json({
      totales: {
        cotizado: parseFloat(totalCotizado[0].total),
        aceptado: parseFloat(totalAceptado[0].total),
        pagado: parseFloat(totalPagado[0].total)
      },
      porEstatus,
      topClientes,
      recientes,
      mensual
    });
  } catch (error) {
    console.error('Error obteniendo estadísticas:', error);
    res.status(500).json({ error: 'Error al obtener estadísticas' });
  }
};

module.exports = {
  obtenerEstadisticas
};

