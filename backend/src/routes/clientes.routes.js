const express = require('express');
const router = express.Router();
const {
  obtenerTodos,
  obtenerPorId,
  crear,
  actualizar,
  eliminar,
  obtenerHistorialCotizaciones
} = require('../controllers/clientes.controller');
const { authenticateToken, requireRole } = require('../middlewares/auth.middleware');

// Todas las rutas requieren autenticación
router.use(authenticateToken);

// Rutas
router.get('/', obtenerTodos);
router.get('/:id', obtenerPorId);
router.get('/:id/cotizaciones', obtenerHistorialCotizaciones);
router.post('/', requireRole('ADMIN', 'VENTAS'), crear);
router.put('/:id', requireRole('ADMIN', 'VENTAS'), actualizar);
router.delete('/:id', requireRole('ADMIN'), eliminar);

module.exports = router;

