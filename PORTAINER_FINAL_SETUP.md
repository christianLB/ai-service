# 🚀 Configuración DEFINITIVA para Portainer

## ⚡ Setup Rápido (5 minutos)

### 1. En Portainer, crear nuevo Stack

Nombre: `ai-service`

### 2. Copiar este docker-compose:

```
https://raw.githubusercontent.com/christianLB/ai-service/main/docker-compose.production-final.yml
```

### 3. En la sección "Environment variables" de Portainer, agregar:

```
POSTGRES_PASSWORD=tu_password_segura_aqui
REDIS_PASSWORD=tu_redis_password_aqui
TELEGRAM_BOT_TOKEN=tu_token_real_del_bot
TELEGRAM_CHAT_ID=tu_chat_id_real
TELEGRAM_WEBHOOK_URL=https://tu-dominio.com/api/telegram/webhook
GO_SECRET_ID=tu_gocardless_secret_id
GO_SECRET_KEY=tu_gocardless_secret_key
OPENAI_API_KEY=sk-... (opcional)
CLAUDE_API_KEY=sk-ant-... (opcional)
```

### 4. Deploy the stack

## ✅ Ventajas de esta solución:

1. **NO necesita archivo .env** - Las variables se configuran directamente en Portainer
2. **Usa named volumes** - Más fácil de gestionar en Portainer
3. **Variables con defaults** - Funciona incluso sin configurar todo
4. **Todo en un solo lugar** - Gestión centralizada en Portainer UI

## 📝 Variables Requeridas:

Solo estas son REQUERIDAS para que funcione:
- `TELEGRAM_BOT_TOKEN` - Token de tu bot
- `TELEGRAM_CHAT_ID` - Tu chat ID

Las demás tienen valores por defecto o son opcionales.

## 🔍 Verificación:

1. Después del deploy, ve a Containers → `ai-service-prod` → Logs
2. Deberías ver:
   ```
   ✅ Database initialized successfully
   ✅ Telegram bot initialized successfully
   🚀 AI Service listening on port 3000
   ```

3. Prueba el bot de Telegram con `/start`

## 🐛 Si algo falla:

1. **Logs del contenedor**: Siempre revisa primero los logs
2. **Variables de entorno**: Verifica en Container → Inspect → Env
3. **Base de datos**: Verifica que postgres esté healthy
4. **Volúmenes**: Asegúrate de que `/volume1/docker/ai-service/` existe

## 🎯 URLs:

- Dashboard: `http://tu-nas:3001/dashboard`
- Health: `http://tu-nas:3001/status`
- Metrics: `http://tu-nas:3001/api/metrics`