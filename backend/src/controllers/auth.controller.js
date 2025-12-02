const bcrypt = require('bcryptjs');
const pool = require('../database/connection');
const { generateAccessToken, generateRefreshToken } = require('../utils/jwt.utils');

/**
 * Registro de nuevo usuario
 */
const registrar = async (req, res) => {
  try {
    const { nombre, email, password, rol = 'LECTURA', empresa_id } = req.body;

    // Validaciones básicas
    if (!nombre || !email || !password) {
      return res.status(400).json({ error: 'Faltan campos requeridos' });
    }

    if (!empresa_id) {
      return res.status(400).json({ error: 'Se requiere empresa_id' });
    }

    // Verificar que el email no exista
    const [existentes] = await pool.query(
      'SELECT id FROM usuarios WHERE email = ?',
      [email]
    );

    if (existentes.length > 0) {
      return res.status(400).json({ error: 'El email ya está registrado' });
    }

    // Hash de la contraseña
    const passwordHash = await bcrypt.hash(password, 10);

    // Crear usuario
    const [result] = await pool.query(
      `INSERT INTO usuarios (empresa_id, nombre, email, password, rol)
       VALUES (?, ?, ?, ?, ?)`,
      [empresa_id, nombre, email, passwordHash, rol]
    );

    res.status(201).json({
      message: 'Usuario registrado exitosamente',
      usuario: {
        id: result.insertId,
        nombre,
        email,
        rol
      }
    });
  } catch (error) {
    console.error('Error en registro:', error);
    res.status(500).json({ error: 'Error al registrar usuario' });
  }
};

/**
 * Inicio de sesión
 */
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email y contraseña son requeridos' });
    }

    // Buscar usuario
    const [usuarios] = await pool.query(
      `SELECT u.*, e.nombre as empresa_nombre 
       FROM usuarios u
       INNER JOIN empresas e ON u.empresa_id = e.id
       WHERE u.email = ? AND u.activo = TRUE`,
      [email]
    );

    if (usuarios.length === 0) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    const usuario = usuarios[0];

    // Verificar contraseña
    const passwordValida = await bcrypt.compare(password, usuario.password);

    if (!passwordValida) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    // Generar tokens
    const accessToken = generateAccessToken(usuario.id, usuario.empresa_id, usuario.rol);
    const refreshToken = generateRefreshToken(usuario.id, usuario.empresa_id);

    // Eliminar password de la respuesta
    delete usuario.password;

    res.json({
      message: 'Login exitoso',
      usuario: {
        id: usuario.id,
        nombre: usuario.nombre,
        email: usuario.email,
        rol: usuario.rol,
        empresa_id: usuario.empresa_id,
        empresa_nombre: usuario.empresa_nombre
      },
      tokens: {
        accessToken,
        refreshToken
      }
    });
  } catch (error) {
    console.error('Error en login:', error);
    res.status(500).json({ error: 'Error al iniciar sesión' });
  }
};

/**
 * Obtener perfil del usuario autenticado
 */
const perfil = async (req, res) => {
  try {
    const [usuarios] = await pool.query(
      `SELECT u.id, u.nombre, u.email, u.rol, u.empresa_id, e.nombre as empresa_nombre
       FROM usuarios u
       INNER JOIN empresas e ON u.empresa_id = e.id
       WHERE u.id = ?`,
      [req.user.id]
    );

    if (usuarios.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    res.json({ usuario: usuarios[0] });
  } catch (error) {
    console.error('Error obteniendo perfil:', error);
    res.status(500).json({ error: 'Error al obtener perfil' });
  }
};

/**
 * Refresh token
 */
const refresh = async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({ error: 'Refresh token requerido' });
    }

    const { verifyRefreshToken } = require('../utils/jwt.utils');
    const decoded = verifyRefreshToken(refreshToken);

    // Verificar que el usuario existe
    const [usuarios] = await pool.query(
      'SELECT id, empresa_id, rol FROM usuarios WHERE id = ? AND activo = TRUE',
      [decoded.userId]
    );

    if (usuarios.length === 0) {
      return res.status(401).json({ error: 'Token inválido' });
    }

    const usuario = usuarios[0];

    // Generar nuevo access token
    const accessToken = generateAccessToken(usuario.id, usuario.empresa_id, usuario.rol);

    res.json({ accessToken });
  } catch (error) {
    console.error('Error refrescando token:', error);
    res.status(401).json({ error: 'Token inválido o expirado' });
  }
};

module.exports = {
  registrar,
  login,
  perfil,
  refresh
};

