const jwt = require('jsonwebtoken');
const pool = require('../database/connection');

// Middleware para verificar token JWT
const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({ error: 'Token no proporcionado' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Verificar que el usuario existe y está activo
    const [usuarios] = await pool.query(
      'SELECT id, empresa_id, nombre, email, rol, activo FROM usuarios WHERE id = ? AND activo = TRUE',
      [decoded.userId]
    );

    if (usuarios.length === 0) {
      return res.status(401).json({ error: 'Usuario no válido o inactivo' });
    }

    req.user = usuarios[0];
    req.empresaId = usuarios[0].empresa_id;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expirado' });
    }
    return res.status(403).json({ error: 'Token inválido' });
  }
};

// Middleware para verificar roles
const requireRole = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'No autenticado' });
    }

    if (!roles.includes(req.user.rol)) {
      return res.status(403).json({ error: 'No tienes permisos para esta acción' });
    }

    next();
  };
};

// Middleware para verificar que el usuario pertenece a la empresa
const requireSameEmpresa = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'No autenticado' });
    }

    // Si hay empresa_id en los params o body, verificar que coincida
    const empresaId = req.params.empresaId || req.body.empresa_id;
    
    if (empresaId && parseInt(empresaId) !== req.user.empresa_id) {
      return res.status(403).json({ error: 'No tienes acceso a esta empresa' });
    }

    next();
  } catch (error) {
    return res.status(500).json({ error: 'Error verificando empresa' });
  }
};

module.exports = {
  authenticateToken,
  requireRole,
  requireSameEmpresa
};

