const express = require('express');
const router = express.Router();
const { registrar, login, perfil, refresh } = require('../controllers/auth.controller');
const { authenticateToken } = require('../middlewares/auth.middleware');

// Rutas públicas
router.post('/registrar', registrar);
router.post('/login', login);
router.post('/refresh', refresh);

// Rutas protegidas
router.get('/perfil', authenticateToken, perfil);

module.exports = router;

