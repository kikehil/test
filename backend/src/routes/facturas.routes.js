const express = require('express');
const router = express.Router();
const {
  obtenerTodas,
  crear,
  actualizar,
  eliminar
} = require('../controllers/facturas.controller');
const { authenticateToken, requireRole } = require('../middlewares/auth.middleware');

router.use(authenticateToken);

router.get('/', obtenerTodas);
router.post('/', requireRole('ADMIN', 'VENTAS'), crear);
router.put('/:id', requireRole('ADMIN', 'VENTAS'), actualizar);
router.delete('/:id', requireRole('ADMIN'), eliminar);

module.exports = router;

