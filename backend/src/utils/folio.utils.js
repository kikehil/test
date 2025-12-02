const pool = require('../database/connection');

/**
 * Genera el siguiente folio automático para una cotización
 * Formato: Q-0001, Q-0002, etc.
 */
async function generarFolio(empresaId) {
  try {
    // Obtener el último folio de la empresa
    const [result] = await pool.query(
      `SELECT folio FROM cotizaciones 
       WHERE empresa_id = ? AND folio IS NOT NULL 
       ORDER BY id DESC LIMIT 1`,
      [empresaId]
    );

    if (result.length === 0) {
      return 'Q-0001';
    }

    const ultimoFolio = result[0].folio;
    const match = ultimoFolio.match(/Q-(\d+)/);

    if (match) {
      const numero = parseInt(match[1]);
      const nuevoNumero = numero + 1;
      return `Q-${String(nuevoNumero).padStart(4, '0')}`;
    }

    // Si no coincide el formato, empezar desde 1
    return 'Q-0001';
  } catch (error) {
    console.error('Error generando folio:', error);
    // Fallback: usar timestamp
    return `Q-${Date.now().toString().slice(-4)}`;
  }
}

/**
 * Genera un token público único para acceso a cotizaciones
 */
function generarTokenPublico() {
  const { randomBytes } = require('crypto');
  return randomBytes(32).toString('hex');
}

module.exports = {
  generarFolio,
  generarTokenPublico
};

