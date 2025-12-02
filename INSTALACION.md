# Guía de Instalación - CRM Cotizaciones

## Requisitos Previos

- Node.js 18 o superior
- MySQL 8 o superior
- npm o yarn

## Pasos de Instalación

### 1. Clonar o descargar el proyecto

```bash
cd CRM
```

### 2. Instalar dependencias

```bash
npm install
```

### 3. Configurar variables de entorno

Crea un archivo `.env` en la raíz del proyecto basándote en `.env.example`:

```bash
# En Windows (PowerShell)
Copy-Item .env.example .env

# En Linux/Mac
cp .env.example .env
```

Edita el archivo `.env` con tus credenciales:

```env
PORT=3000

DB_HOST=localhost
DB_USER=root
DB_PASSWORD=tu_password_mysql
DB_NAME=crm_cotizaciones
DB_PORT=3306

JWT_SECRET=tu_secreto_super_seguro_cambiar_en_produccion
JWT_REFRESH_SECRET=tu_refresh_secreto_super_seguro_cambiar_en_produccion
JWT_EXPIRES_IN=24h
JWT_REFRESH_EXPIRES_IN=7d

SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=tu_email@gmail.com
SMTP_PASS=tu_password_app
SMTP_FROM=CRM Cotizaciones <noreply@tudominio.com>

APP_URL=http://localhost:3000

EMPRESA_NOMBRE=Mi Empresa S.A. de C.V.
EMPRESA_RFC=ABC123456789
EMPRESA_DIRECCION=Calle Principal 123, Ciudad, Estado
EMPRESA_TELEFONO=+52 55 1234 5678
EMPRESA_EMAIL=contacto@miempresa.com
EMPRESA_WEB=www.miempresa.com
```

### 4. Crear la base de datos MySQL

```bash
mysql -u root -p
```

```sql
CREATE DATABASE crm_cotizaciones CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
EXIT;
```

### 5. Ejecutar migraciones

```bash
npm run migrate
```

Esto creará todas las tablas necesarias en la base de datos.

### 6. Ejecutar seeders (datos de ejemplo)

```bash
npm run seed
```

Esto creará:
- Una empresa de ejemplo
- 3 usuarios de prueba (admin, ventas, lectura)
- 3 clientes de ejemplo
- 5 productos de ejemplo
- 1 cotización de ejemplo

### 7. Compilar CSS de Tailwind (en otra terminal)

```bash
npm run build:css
```

**Nota:** Si no tienes Tailwind CLI instalado globalmente, puedes usar el CDN temporalmente editando los archivos HTML.

### 8. Iniciar el servidor

```bash
npm start
```

O en modo desarrollo:

```bash
npm run dev
```

### 9. Acceder a la aplicación

Abre tu navegador en: `http://localhost:3000`

## Credenciales de Acceso (Seeders)

- **Admin:** admin@test.com / password123
- **Ventas:** ventas@test.com / password123
- **Lectura:** lectura@test.com / password123

## Estructura del Proyecto

```
/
├── backend/
│   └── src/
│       ├── controllers/     # Lógica de negocio
│       ├── routes/          # Rutas de la API
│       ├── middlewares/     # Middlewares (auth, roles)
│       ├── services/        # Servicios (opcional)
│       ├── models/          # Modelos (opcional)
│       ├── database/        # Migraciones y seeders
│       ├── utils/           # Utilidades (PDF, email, JWT)
│       └── server.js        # Servidor principal
├── frontend/
│   ├── public/              # Archivos estáticos
│   │   ├── css/            # CSS compilado
│   │   └── js/             # JavaScript del frontend
│   └── views/               # Vistas HTML
├── package.json
└── .env
```

## Despliegue en Railway

1. Conecta tu repositorio a Railway
2. Configura las variables de entorno en Railway:
   - Todas las variables del archivo `.env`
   - Railway proporcionará `PORT` automáticamente
3. Railway detectará automáticamente el proyecto Node.js
4. El sistema ejecutará las migraciones automáticamente al iniciar (si `INIT_DB=true`)

### Variables de Entorno en Railway

Asegúrate de configurar todas las variables necesarias, especialmente:
- `DB_HOST`, `DB_USER`, `DB_PASSWORD`, `DB_NAME` (proporcionadas por Railway MySQL)
- `JWT_SECRET` y `JWT_REFRESH_SECRET` (genera valores seguros)
- `SMTP_*` (configuración de correo)
- `APP_URL` (URL de tu aplicación en Railway)
- `INIT_DB=true` (para ejecutar migraciones automáticamente)

## Solución de Problemas

### Error de conexión a MySQL

- Verifica que MySQL esté corriendo
- Verifica las credenciales en `.env`
- Asegúrate de que la base de datos exista

### Error al generar PDF

- Verifica que `pdf-lib` y `qrcode` estén instalados
- Revisa los logs del servidor

### Error al enviar correos

- Verifica la configuración SMTP en `.env`
- Para Gmail, usa una "Contraseña de aplicación"
- Verifica que `SMTP_USER` y `SMTP_PASS` sean correctos

### CSS no se ve

- Ejecuta `npm run build:css` para compilar Tailwind
- O usa el CDN de Tailwind temporalmente

## API Endpoints Principales

- `POST /api/auth/login` - Iniciar sesión
- `GET /api/clientes` - Listar clientes
- `GET /api/productos` - Listar productos
- `GET /api/cotizaciones` - Listar cotizaciones
- `GET /api/dashboard/estadisticas` - Estadísticas del dashboard
- `GET /cotizacion/:token/public` - Ver cotización pública
- `GET /api/health` - Health check

## Notas Importantes

- El sistema es **multi-empresa**: cada usuario pertenece a una empresa
- Los roles son: `ADMIN`, `VENTAS`, `LECTURA`
- Las cotizaciones tienen un token público único para acceso sin autenticación
- Los PDFs incluyen un código QR para acceso rápido
- El sistema registra todos los eventos en `eventos_cotizacion`

## Soporte

Para problemas o preguntas, revisa los logs del servidor y la consola del navegador.

