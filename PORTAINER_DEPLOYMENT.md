# Guía de Despliegue en Portainer

## 🚀 Despliegue Seguro AI Service

### Variables de Entorno Requeridas

**IMPORTANTE**: Configurar estas variables en Portainer antes del despliegue:

```env
# Database Configuration
POSTGRES_PASSWORD=ultra_secure_password_2025
REDIS_PASSWORD=redis_secure_password_2025

# Telegram Bot Configuration  
TELEGRAM_BOT_TOKEN=7675285244:AAHcM733tpyttgRPWITfeQOAGnrtbrWThpE
TELEGRAM_CHAT_ID=5015255679
TELEGRAM_WEBHOOK_URL=https://ai-service.anaxi.net/api/telegram/webhook

# N8N Configuration
N8N_ADMIN_PASSWORD=n8n_admin_2025
N8N_API_KEY=tu_n8n_api_key_aqui
WEBHOOK_URL=https://ai-service.anaxi.net

# AI APIs
OPENAI_API_KEY=tu_openai_api_key_aqui
CLAUDE_API_KEY=tu_claude_api_key_aqui

# GoCardless (Banking Integration)
GO_SECRET_ID=6b4b7fe5-5863-4432-880a-aab64d52a1e6
GO_SECRET_KEY=8246fb5525c80628d4d13de48c0d7ea4c38fc01e100f8ab5270977b0f0898ce6469d68e09667e77da588f172c9147a83748aa026b8382b9139b13c8d8e9cb79b
GO_REDIRECT_URI=https://ai-service.anaxi.net/financial/callback

# Dashboard Configuration
DASHBOARD_URL=https://ai-service.anaxi.net/dashboard
GRAFANA_ADMIN_PASSWORD=grafana_admin_password_2025
```

### Pasos de Despliegue

1. **Crear Stack en Portainer**
   - Ir a Stacks → Add Stack
   - Nombre: `ai-service`
   - Repository: `https://github.com/christianLB/ai-service`
   - Compose File: `docker-compose.synology.yml`

2. **Configurar Variables de Entorno**
   - En la sección "Environment variables"
   - Agregar todas las variables listadas arriba
   - **IMPORTANTE**: Reemplazar valores placeholder con los reales

3. **Verificar Volúmenes**
   Asegurarse que existen los directorios:
   ```bash
   /volume1/docker/ai-service/postgres
   /volume1/docker/ai-service/redis
   /volume1/docker/ai-service/n8n
   /volume1/docker/ai-service/prometheus
   /volume1/docker/ai-service/grafana
   /volume1/docker/ai-service/logs
   /volume1/docker/ai-service/workflows
   /volume1/docker/ai-service/documents
   /volume1/docker/ai-service/knowledge
   ```

4. **Deploy**
   - Click en "Deploy the stack"
   - Esperar a que todos los servicios estén running

### Verificación del Despliegue

```bash
# Verificar contenedores
docker ps

# Verificar logs
docker logs ai-service-prod

# Probar endpoints
curl https://ai-service.anaxi.net/status
curl https://ai-service.anaxi.net/dashboard
```

### URLs de Acceso

- **AI Service**: https://ai-service.anaxi.net
- **Dashboard**: https://ai-service.anaxi.net/dashboard  
- **Grafana**: https://ai-service.anaxi.net:3001
- **Prometheus**: https://ai-service.anaxi.net:9090
- **N8N**: https://ai-service.anaxi.net:5678

### Troubleshooting

1. **Si faltan variables de entorno**: Verificar que todas estén configuradas en Portainer
2. **Si fallan volúmenes**: Crear directorios manualmente en NAS
3. **Si no responde**: Verificar reverse proxy en Synology DSM
4. **Si falla health check**: Verificar logs del contenedor

### Seguridad

- ✅ **Credenciales**: Ahora son variables de entorno, no hardcoded
- ✅ **Archivos externos**: Eliminada dependencia de prometheus.synology.yml
- ✅ **Configuración mínima**: Solo servicios esenciales