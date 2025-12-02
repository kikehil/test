# 🚂 Guía de Despliegue en Railway

Esta guía te ayudará a desplegar el sistema CRM de Cotizaciones en [Railway](https://railway.com/).

## 📋 Requisitos Previos

1. Cuenta en GitHub (con el código del proyecto)
2. Cuenta en Railway (gratis en [railway.com](https://railway.com/))
3. El proyecto debe estar en un repositorio de GitHub

## 🚀 Paso 1: Preparar el Proyecto

### 1.1 Asegúrate de tener estos archivos en la raíz:

- ✅ `package.json`
- ✅ `Procfile` (ya creado)
- ✅ `railway.json` (ya creado)
- ✅ `.env.example` (para referencia)

### 1.2 Verifica que el `package.json` tenga el script de inicio:

```json
"scripts": {
  "start": "node backend/src/server.js"
}
```

### 1.3 (Opcional) Crea un archivo `.railwayignore`:

```
node_modules/
.env
*.log
.DS_Store
.git/
```

## 🎫 Paso 2: Crear Cuenta en Railway

1. Ve a [railway.com](https://railway.com/)
2. Haz clic en **"Start a New Project"** o **"Login"**
3. Inicia sesión con GitHub (recomendado)

## 📦 Paso 3: Crear Nuevo Proyecto

1. En el dashboard de Railway, haz clic en **"New Project"**
2. Selecciona **"Deploy from GitHub repo"**
3. Autoriza Railway a acceder a tus repositorios (si es la primera vez)
4. Selecciona el repositorio que contiene tu proyecto CRM

## 🗄️ Paso 4: Configurar Base de Datos MySQL

Railway puede crear una base de datos MySQL automáticamente:

1. En tu proyecto de Railway, haz clic en **"+ New"**
2. Selecciona **"Database"** → **"Add MySQL"**
3. Railway creará automáticamente una instancia MySQL
4. **IMPORTANTE:** Anota las variables de entorno que Railway genera:
   - `MYSQL_HOST`
   - `MYSQL_PORT`
   - `MYSQL_DATABASE`
   - `MYSQL_USER`
   - `MYSQL_PASSWORD`
   - `MYSQL_URL` (conexión completa)

## ⚙️ Paso 5: Configurar Variables de Entorno

1. En tu proyecto, haz clic en el servicio de tu aplicación (backend)
2. Ve a la pestaña **"Variables"**
3. Haz clic en **"+ New Variable"** y agrega las siguientes:

### Variables de Base de Datos (desde MySQL de Railway):

```env
DB_HOST=MYSQL_HOST (valor de Railway)
DB_PORT=MYSQL_PORT (valor de Railway)
DB_USER=MYSQL_USER (valor de Railway)
DB_PASSWORD=MYSQL_PASSWORD (valor de Railway)
DB_NAME=MYSQL_DATABASE (valor de Railway)
```

**Nota:** Railway expone estas variables automáticamente si el servicio MySQL está en el mismo proyecto. Puedes usar `MYSQL_HOST`, `MYSQL_PORT`, etc. directamente.

### Variables JWT (genera valores seguros):

```env
JWT_SECRET=tu_secreto_super_seguro_genera_uno_largo_y_aleatorio
JWT_REFRESH_SECRET=otro_secreto_diferente_y_seguro
JWT_EXPIRES_IN=24h
JWT_REFRESH_EXPIRES_IN=7d
```

**Genera secretos seguros:**
```bash
# En tu terminal local:
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### Variables de Correo (SMTP):

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=tu_email@gmail.com
SMTP_PASS=tu_password_de_aplicacion_gmail
SMTP_FROM=CRM Cotizaciones <noreply@tudominio.com>
```

**Para Gmail:**
1. Ve a tu cuenta de Google
2. Seguridad → Verificación en 2 pasos → Contraseñas de aplicaciones
3. Genera una contraseña de aplicación
4. Úsala en `SMTP_PASS`

### Variables de la Aplicación:

```env
PORT=3000
NODE_ENV=production
APP_URL=https://tu-proyecto.railway.app
INIT_DB=true
```

**Nota:** `APP_URL` será la URL que Railway te asigne. La encontrarás en la pestaña "Settings" → "Domains".

### Variables de Empresa (opcional, puedes cambiarlas después):

```env
EMPRESA_NOMBRE=Mi Empresa S.A. de C.V.
EMPRESA_RFC=ABC123456789
EMPRESA_DIRECCION=Calle Principal 123, Ciudad, Estado
EMPRESA_TELEFONO=+52 55 1234 5678
EMPRESA_EMAIL=contacto@miempresa.com
EMPRESA_WEB=www.miempresa.com
```

## 🔗 Paso 6: Conectar Servicios

1. Railway debería detectar automáticamente la conexión entre tu app y MySQL
2. Si no, en el servicio MySQL, ve a **"Settings"** → **"Connect"**
3. Asegúrate de que las variables de entorno estén disponibles en tu servicio de aplicación

## 🚀 Paso 7: Desplegar

1. Railway comenzará a desplegar automáticamente cuando detecte cambios en GitHub
2. Ve a la pestaña **"Deployments"** para ver el progreso
3. Los logs aparecerán en tiempo real

### Si necesitas ejecutar migraciones manualmente:

Railway ejecutará automáticamente las migraciones si `INIT_DB=true` está configurado.

Si prefieres ejecutarlas manualmente:

1. Ve a tu servicio
2. Abre la terminal (pestaña "Deployments" → "View Logs" o usa Railway CLI)
3. Ejecuta:
```bash
npm run migrate
npm run seed
```

## 🌐 Paso 8: Configurar Dominio Personalizado (Opcional)

1. En tu servicio, ve a **"Settings"** → **"Networking"**
2. Haz clic en **"Generate Domain"** para obtener un dominio `.railway.app`
3. O configura un dominio personalizado:
   - Haz clic en **"Custom Domain"**
   - Ingresa tu dominio
   - Configura los registros DNS según las instrucciones

## ✅ Paso 9: Verificar Despliegue

1. Espera a que el despliegue termine (verás "Deployment Successful")
2. Haz clic en el dominio generado o ve a la URL de tu aplicación
3. Deberías ver la página de login
4. Prueba con las credenciales de seeders:
   - Email: `admin@test.com`
   - Password: `password123`

## 🔍 Paso 10: Verificar Logs y Salud

### Health Check:

Railway verificará automáticamente `/api/health`. Asegúrate de que responda correctamente.

### Ver Logs:

1. Ve a **"Deployments"**
2. Haz clic en el deployment más reciente
3. Revisa los logs para ver errores o confirmaciones

### Logs Esperados:

```
🚀 Servidor corriendo en puerto 3000
📊 Ambiente: production
✅ Conexión a MySQL establecida
🔄 Inicializando base de datos...
✅ Tabla empresas creada
✅ Tabla usuarios creada
...
```

## 🛠️ Solución de Problemas

### Error: "Cannot connect to MySQL"

**Solución:**
1. Verifica que las variables de entorno de MySQL estén correctas
2. Asegúrate de que el servicio MySQL esté corriendo
3. Verifica que `DB_HOST`, `DB_PORT`, etc. estén configurados

### Error: "Port already in use"

**Solución:**
- Railway asigna el puerto automáticamente a través de `process.env.PORT`
- Asegúrate de que tu código use `process.env.PORT || 3000`

### Error: "Module not found"

**Solución:**
1. Verifica que `package.json` tenga todas las dependencias
2. Railway ejecuta `npm install` automáticamente
3. Revisa los logs de build para ver errores de instalación

### Las migraciones no se ejecutan

**Solución:**
1. Verifica que `INIT_DB=true` esté en las variables de entorno
2. O ejecuta manualmente desde la terminal de Railway:
   ```bash
   npm run migrate
   npm run seed
   ```

### El CSS no se ve

**Solución:**
1. Compila Tailwind antes de hacer commit:
   ```bash
   npm run build:css
   ```
2. O usa el CDN de Tailwind temporalmente en los HTML

## 📊 Monitoreo en Railway

Railway proporciona:
- **Logs en tiempo real**
- **Métricas de uso** (CPU, memoria, red)
- **Historial de deployments**
- **Variables de entorno** centralizadas

## 🔄 Actualizaciones Futuras

Railway despliega automáticamente cuando:
- Haces push a la rama principal de GitHub
- O cuando haces push a la rama conectada

Para desplegar manualmente:
1. Haz push a GitHub
2. Railway detectará los cambios
3. Iniciará un nuevo deployment automáticamente

## 💰 Costos

Railway tiene un plan gratuito generoso:
- **$5 de crédito gratis** cada mes
- El proyecto básico debería estar dentro del plan gratuito
- MySQL tiene un costo adicional (verifica precios actuales)

## 📝 Checklist Final

- [ ] Proyecto en GitHub
- [ ] Cuenta en Railway creada
- [ ] Proyecto conectado a GitHub
- [ ] MySQL creado en Railway
- [ ] Variables de entorno configuradas
- [ ] `INIT_DB=true` configurado
- [ ] Despliegue exitoso
- [ ] Base de datos inicializada
- [ ] Aplicación accesible
- [ ] Login funcionando

## 🎉 ¡Listo!

Tu sistema CRM está desplegado en Railway. Puedes acceder desde cualquier lugar y Railway manejará el escalado automáticamente.

## 📚 Recursos Adicionales

- [Documentación de Railway](https://docs.railway.app/)
- [Railway Discord](https://discord.gg/railway)
- [Ejemplos de Railway](https://railway.app/templates)

---

**Nota:** Railway es muy intuitivo. Si tienes problemas, revisa los logs en tiempo real y la documentación oficial.

