const express = require('express');
const router = express.Router();
const {
  obtenerTodos,
  crear,
  actualizar,
  eliminar
} = require('../controllers/pagos.controller');
const { authenticateToken, requireRole } = require('../middlewares/auth.middleware');

router.use(authenticateToken);

router.get('/', obtenerTodos);
router.post('/', requireRole('ADMIN', 'VENTAS'), crear);
router.put('/:id', requireRole('ADMIN', 'VENTAS'), actualizar);
router.delete('/:id', requireRole('ADMIN'), eliminar);

module.exports = router;

