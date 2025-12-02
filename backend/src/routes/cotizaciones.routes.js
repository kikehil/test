const express = require('express');
const router = express.Router();
const {
  obtenerTodas,
  obtenerPorId,
  crear,
  actualizar,
  cambiarEstado,
  duplicar,
  generarPDF,
  enviarPorCorreo
} = require('../controllers/cotizaciones.controller');
const { authenticateToken, requireRole } = require('../middlewares/auth.middleware');

// Todas las rutas requieren autenticación
router.use(authenticateToken);

// Rutas
router.get('/', obtenerTodas);
router.get('/:id', obtenerPorId);
router.get('/:id/pdf', generarPDF);
router.post('/', requireRole('ADMIN', 'VENTAS'), crear);
router.put('/:id', requireRole('ADMIN', 'VENTAS'), actualizar);
router.patch('/:id/estado', requireRole('ADMIN', 'VENTAS'), cambiarEstado);
router.post('/:id/duplicar', requireRole('ADMIN', 'VENTAS'), duplicar);
router.post('/:id/enviar', requireRole('ADMIN', 'VENTAS'), enviarPorCorreo);

module.exports = router;

