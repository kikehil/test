const express = require('express');
const router = express.Router();
const { obtenerEstadisticas } = require('../controllers/dashboard.controller');
const { authenticateToken } = require('../middlewares/auth.middleware');

router.use(authenticateToken);

router.get('/estadisticas', obtenerEstadisticas);

module.exports = router;

