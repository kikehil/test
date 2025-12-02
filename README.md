# CRM Sistema de Cotizaciones Multi-Empresa

Sistema completo de gestión de cotizaciones desarrollado con Node.js, Express, MySQL y TailwindCSS.

## 🚀 Características

- ✅ Autenticación JWT con roles (ADMIN, VENTAS, LECTURA)
- ✅ Gestión completa de clientes
- ✅ Catálogo de productos/servicios
- ✅ Cotizaciones con partidas y cálculos automáticos
- ✅ Generación de PDF profesional
- ✅ Envío de cotizaciones por correo
- ✅ Link público para aceptación/rechazo
- ✅ Dashboard con estadísticas
- ✅ Módulo de pagos y facturas
- ✅ **Sistema multi-empresa**

## 📋 Requisitos

- Node.js 18+
- MySQL 8+
- npm o yarn

## 🔧 Instalación

1. Clonar el repositorio
2. Instalar dependencias:
```bash
npm install
```

3. Configurar variables de entorno:
```bash
cp .env.example .env
# Editar .env con tus credenciales
```

4. Crear la base de datos:
```bash
mysql -u root -p -e "CREATE DATABASE crm_cotizaciones;"
```

5. Ejecutar migraciones:
```bash
npm run migrate
```

6. Ejecutar seeders (datos de ejemplo):
```bash
npm run seed
```

7. Iniciar el servidor:
```bash
npm start
# o en desarrollo:
npm run dev
```

8. Compilar CSS de Tailwind (en otra terminal):
```bash
npm run build:css
```

## 🌐 Uso

- Frontend: http://localhost:3000
- API: http://localhost:3000/api

### Usuarios por defecto (seeders)

- **Admin**: admin@test.com / password123
- **Ventas**: ventas@test.com / password123
- **Lectura**: lectura@test.com / password123

## 🚂 Despliegue en Railway

1. Conectar tu repositorio a Railway
2. Configurar variables de entorno en Railway
3. Railway detectará automáticamente el proyecto Node.js
4. El sistema creará las tablas automáticamente al iniciar

## 📁 Estructura del Proyecto

```
/
├── backend/
│   └── src/
│       ├── controllers/
│       ├── routes/
│       ├── middlewares/
│       ├── services/
│       ├── models/
│       ├── database/
│       └── utils/
├── frontend/
│   ├── public/
│   ├── views/
│   └── components/
└── package.json
```

## 🔐 Roles

- **ADMIN**: Acceso completo al sistema
- **VENTAS**: Puede crear y editar cotizaciones
- **LECTURA**: Solo lectura

## 📝 API Endpoints

Ver documentación en `/api/docs` (próximamente)

## 📄 Licencia

ISC

