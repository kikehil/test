const express = require('express');
const router = express.Router();
const {
  verCotizacion,
  generarPDFPublico,
  aceptarCotizacion,
  rechazarCotizacion
} = require('../controllers/public.controller');

// Rutas públicas (sin autenticación)
router.get('/:token/public', verCotizacion);
router.get('/:token/pdf', generarPDFPublico);
router.post('/:token/aceptar', aceptarCotizacion);
router.post('/:token/rechazar', rechazarCotizacion);

module.exports = router;

