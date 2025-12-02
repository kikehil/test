const express = require('express');
const router = express.Router();
const {
  obtenerTodos,
  buscar,
  obtenerPorId,
  crear,
  actualizar,
  eliminar
} = require('../controllers/productos.controller');
const { authenticateToken, requireRole } = require('../middlewares/auth.middleware');

// Todas las rutas requieren autenticación
router.use(authenticateToken);

// Rutas
router.get('/buscar', buscar); // Ruta especial para autocompletar
router.get('/', obtenerTodos);
router.get('/:id', obtenerPorId);
router.post('/', requireRole('ADMIN', 'VENTAS'), crear);
router.put('/:id', requireRole('ADMIN', 'VENTAS'), actualizar);
router.delete('/:id', requireRole('ADMIN'), eliminar);

module.exports = router;

