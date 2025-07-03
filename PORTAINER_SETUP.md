# 🚀 Portainer Deployment Setup

## 📋 Pre-requisitos

1. **Hacer el package público en GitHub**:
   - Ve a: https://github.com/christianLB/ai-service/pkgs/container/ai-service
   - Click en "Package settings" 
   - En "Danger Zone" → "Change visibility" → "Public"
   - Esto permite que Portainer descargue la imagen sin autenticación

2. **Crear archivo .env.production** en el NAS:
   ```
   /volume1/docker/ai-service/config/.env.production
   ```

## 🔧 Configuración en Portainer

1. **En Portainer**, crear nuevo stack llamado `ai-service`

2. **Copiar el contenido** de:
   ```
   https://raw.githubusercontent.com/christianLB/ai-service/main/docker-compose.portainer.yml
   ```

3. **Pegar en el editor** de Portainer

4. **Deploy the stack**

## 📝 Contenido del .env.production

```env
# === CORE SERVICE ===
NODE_ENV=production
PORT=3000
LOG_LEVEL=info

# === DATABASE ===
POSTGRES_HOST=postgres
POSTGRES_PORT=5432
POSTGRES_DB=ai_service
POSTGRES_USER=ai_user
POSTGRES_PASSWORD=ultra_secure_password_2025

# === REDIS ===
REDIS_HOST=redis
REDIS_PORT=6379
REDIS_PASSWORD=redis_secure_password_2025

# === TELEGRAM BOT ===
TELEGRAM_BOT_TOKEN=tu_token_real_aqui
TELEGRAM_CHAT_ID=tu_chat_id_aqui
TELEGRAM_WEBHOOK_URL=https://tu-dominio.com/api/telegram/webhook
TELEGRAM_ALERTS_ENABLED=true

# === GOCARDLESS (OPEN BANKING) ===
GO_SECRET_ID=tu_secret_id
GO_SECRET_KEY=tu_secret_key
GO_REDIRECT_URI=https://tu-dominio.com/callback

# === AI SERVICES ===
OPENAI_API_KEY=sk-...
CLAUDE_API_KEY=sk-ant-...
```

## 🔄 Actualización

Cuando hagas cambios en el código:

1. **Push a GitHub**:
   ```bash
   git push origin main
   ```

2. **Espera** ~5 minutos para que GitHub Actions construya

3. **En Portainer**:
   - Ve al stack `ai-service`
   - Click en "Pull and redeploy"
   - O click en "Update the stack" → "Re-pull image"

## 🎯 URLs de Acceso

- **AI Service**: http://tu-nas:3001
- **Dashboard**: http://tu-nas:3001/dashboard
- **Health Check**: http://tu-nas:3001/status

## 🐛 Troubleshooting

### Ver logs:
En Portainer → Containers → `ai-service-prod` → Logs

### La imagen no se descarga:
1. Verifica que el package sea público en GitHub
2. Verifica el status del build en: https://github.com/christianLB/ai-service/actions

### Variables de entorno no se cargan:
1. Verifica que el archivo existe: `/volume1/docker/ai-service/config/.env.production`
2. Verifica permisos del archivo