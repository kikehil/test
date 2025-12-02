const jwt = require('jsonwebtoken');

/**
 * Genera un token de acceso JWT
 */
const generateAccessToken = (userId, empresaId, rol) => {
  return jwt.sign(
    { userId, empresaId, rol },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
  );
};

/**
 * Genera un token de refresh JWT
 */
const generateRefreshToken = (userId, empresaId) => {
  return jwt.sign(
    { userId, empresaId },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d' }
  );
};

/**
 * Verifica un token de refresh
 */
const verifyRefreshToken = (token) => {
  return jwt.verify(token, process.env.JWT_REFRESH_SECRET);
};

module.exports = {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken
};

