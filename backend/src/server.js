require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

// Inicializar base de datos al iniciar (solo en producción o si se requiere)
if (process.env.INIT_DB === 'true' || process.env.NODE_ENV === 'production') {
  const initDatabase = require('./database/init');
  initDatabase().catch(err => {
    console.error('Error inicializando BD (continuando...):', err.message);
  });
}

const app = express();

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Servir archivos estáticos
app.use('/css', express.static(path.join(__dirname, '../../frontend/public/css')));
app.use('/js', express.static(path.join(__dirname, '../../frontend/public/js')));

// Importar rutas
const authRoutes = require('./routes/auth.routes');
const clientesRoutes = require('./routes/clientes.routes');
const productosRoutes = require('./routes/productos.routes');
const cotizacionesRoutes = require('./routes/cotizaciones.routes');
const pagosRoutes = require('./routes/pagos.routes');
const facturasRoutes = require('./routes/facturas.routes');
const dashboardRoutes = require('./routes/dashboard.routes');
const publicRoutes = require('./routes/public.routes');

// Rutas API
app.use('/api/auth', authRoutes);
app.use('/api/clientes', clientesRoutes);
app.use('/api/productos', productosRoutes);
app.use('/api/cotizaciones', cotizacionesRoutes);
app.use('/api/pagos', pagosRoutes);
app.use('/api/facturas', facturasRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/cotizacion', publicRoutes);

// Ruta de salud para Railway
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Servir vistas HTML del frontend
const viewsPath = path.join(__dirname, '../../frontend/views');

app.get('/', (req, res) => {
  res.sendFile(path.join(viewsPath, 'index.html'));
});

app.get('/login.html', (req, res) => {
  res.sendFile(path.join(viewsPath, 'login.html'));
});

app.get('/index.html', (req, res) => {
  res.sendFile(path.join(viewsPath, 'index.html'));
});

app.get('/cotizaciones.html', (req, res) => {
  res.sendFile(path.join(viewsPath, 'cotizaciones.html'));
});

app.get('/clientes.html', (req, res) => {
  res.sendFile(path.join(viewsPath, 'clientes.html'));
});

app.get('/productos.html', (req, res) => {
  res.sendFile(path.join(viewsPath, 'productos.html'));
});

app.get('/cotizacion-detalle.html', (req, res) => {
  res.sendFile(path.join(viewsPath, 'cotizacion-detalle.html'));
});

// Ruta pública para ver cotizaciones (sin .html)
app.get('/cotizacion/:token/public', (req, res) => {
  res.sendFile(path.join(viewsPath, 'cotizacion-publica.html'));
});

// Manejo de errores
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Error interno del servidor',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// Railway asigna el puerto automáticamente
const PORT = process.env.PORT || 3000;

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Servidor corriendo en puerto ${PORT}`);
  console.log(`📊 Ambiente: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🌐 URL: ${process.env.APP_URL || `http://localhost:${PORT}`}`);
  
  // Inicializar BD si está configurado
  if (process.env.INIT_DB === 'true') {
    console.log('🔄 Inicializando base de datos...');
  }
});

module.exports = app;

