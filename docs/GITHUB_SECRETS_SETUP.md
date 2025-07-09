# GitHub Secrets Setup - AI Service CI/CD

## Secretos Requeridos en GitHub Actions

Para que el sistema CI/CD funcione correctamente, necesitas configurar los siguientes secretos en tu repositorio de GitHub.

### Acceder a la configuración de secretos

1. Ve a tu repositorio en GitHub: `https://github.com/christianlb/ai-service`
2. Click en **Settings** → **Secrets and variables** → **Actions**
3. Click en **New repository secret** para cada secreto

### Lista de Secretos Necesarios

#### 1. **GHCR_TOKEN** (Obligatorio)
- **Descripción**: Personal Access Token de GitHub con permisos para GitHub Container Registry
- **Cómo obtenerlo**:
  1. Ve a GitHub Settings → Developer settings → Personal access tokens → Tokens (classic)
  2. Click "Generate new token (classic)"
  3. Nombre: "AI Service GHCR Token"
  4. Selecciona los siguientes permisos:
     - `read:packages`
     - `write:packages`
     - `delete:packages` (opcional)
  5. Genera el token y cópialo inmediatamente
- **Formato**: `ghp_xxxxxxxxxxxxxxxxxxxx`

#### 2. **NAS_SSH_PASSWORD** (Obligatorio)
- **Descripción**: Contraseña SSH para acceder al NAS Synology
- **Usuario asociado**: k2600x
- **Nota de seguridad**: Asegúrate de que esta contraseña sea fuerte y única

#### 3. **NAS_SUDO_PASSWORD** (Obligatorio)
- **Descripción**: Contraseña para ejecutar comandos sudo en el NAS
- **Puede ser la misma que SSH_PASSWORD si el usuario tiene permisos sudo

#### 4. **TELEGRAM_BOT_TOKEN** (Opcional - para notificaciones)
- **Descripción**: Token del bot de Telegram para notificaciones de CI/CD
- **Formato**: `1234567890:ABCdefGHIjklmNOPqrstUVwxyz`
- **Cómo obtenerlo**: Hablar con @BotFather en Telegram

#### 5. **DOCKER_HUB_TOKEN** (Opcional - si usas Docker Hub)
- **Descripción**: Access Token de Docker Hub
- **Solo necesario si publicas imágenes en Docker Hub además de GHCR

### Variables de Entorno de Producción

Además de los secretos anteriores, las siguientes variables deben estar configuradas en el servidor de producción (NO en GitHub):

```bash
# Base de datos
DATABASE_URL=postgresql://user:password@host:5432/dbname
DB_HOST=localhost
DB_PORT=5432
DB_NAME=ai_service
DB_USER=ai_service_user
DB_PASSWORD=secure_password

# OpenAI
OPENAI_API_KEY=sk-xxxxxxxxxxxxxxxxxxxx

# Telegram Bot
TELEGRAM_BOT_TOKEN=1234567890:ABCdefGHIjklmNOPqrstUVwxyz
TELEGRAM_WEBHOOK_URL=https://yourdomain.com/webhook/telegram

# GoCardless
GOCARDLESS_ACCESS_TOKEN=live_xxxxxxxxxxxxxxxxxxxx
GOCARDLESS_VERSION=2023-01-01
GOCARDLESS_ENVIRONMENT=live

# Seguridad
JWT_SECRET=your_jwt_secret_min_32_chars
SESSION_SECRET=your_session_secret

# Email (para envío de facturas)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
EMAIL_FROM=noreply@yourdomain.com

# Aplicación
NODE_ENV=production
PORT=3000
API_URL=https://api.yourdomain.com
FRONTEND_URL=https://app.yourdomain.com

# Almacenamiento
STORAGE_PATH=/app/data/documents
UPLOAD_MAX_SIZE=10485760
```

### Verificación de Secretos

Para verificar que los secretos están configurados correctamente:

1. **En GitHub Actions**:
   - Los workflows deberían ejecutarse sin errores de autenticación
   - Las imágenes deberían publicarse en ghcr.io correctamente

2. **En el servidor de producción**:
   ```bash
   # Verificar que Watchtower puede autenticarse
   docker login ghcr.io -u christianlb --password-stdin < /path/to/token

   # Verificar variables de entorno
   docker exec ai-service env | grep -E "(DATABASE|TELEGRAM|OPENAI)"
   ```

### Seguridad y Mejores Prácticas

1. **Rotación de secretos**:
   - Rotar tokens de GitHub cada 90 días
   - Cambiar contraseñas del NAS regularmente
   - Regenerar JWT_SECRET si hay sospechas de compromiso

2. **Principio de menor privilegio**:
   - Los tokens deben tener solo los permisos mínimos necesarios
   - Usar cuentas de servicio dedicadas cuando sea posible

3. **Auditoría**:
   - Revisar logs de acceso regularmente
   - Monitorear uso de tokens en GitHub Settings

4. **Backup de secretos**:
   - Mantener los secretos en un gestor de contraseñas seguro
   - Documentar qué secreto se usa para qué servicio

### Troubleshooting

**Error: "unauthorized: authentication required"**
- Verifica que GHCR_TOKEN esté configurado correctamente
- Asegúrate de que el token tenga permisos de packages

**Error: "Permission denied (publickey,password)"**
- Verifica NAS_SSH_PASSWORD
- Confirma que el usuario k2600x existe en el NAS

**Error: "sudo: a password is required"**
- Configura NAS_SUDO_PASSWORD
- Verifica que el usuario tenga permisos sudo

### Script de Validación

Usa el script de gestión de secretos para validar la configuración:

```bash
cd /home/k2600x/dev/ai-service
./scripts/secure-secrets-manager.sh verify
```

---

**Última actualización**: 2025-07-09
**Mantenido por**: Security Guardian (Elena)