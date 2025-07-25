# Guía de Despliegue AI Service en Synology

## 🚀 Despliegue Completo con Sistema Financiero

### Pre-requisitos

1. **Synology NAS** con Docker instalado
2. **Dominio configurado** (ai-service.anaxi.net)
3. **Reverse proxy** configurado para los puertos
4. **Variables de entorno** configuradas

### Paso 1: Preparar Directorios

```bash
# En el NAS, crear directorios de datos
mkdir -p /volume1/docker/ai-service/postgres
mkdir -p /volume1/docker/ai-service/redis
mkdir -p /volume1/docker/ai-service/n8n
mkdir -p /volume1/docker/ai-service/prometheus
mkdir -p /volume1/docker/ai-service/grafana
mkdir -p /volume1/docker/ai-service/logs
mkdir -p /volume1/docker/ai-service/workflows
mkdir -p /volume1/docker/ai-service/documents
mkdir -p /volume1/docker/ai-service/knowledge

# Permisos
chmod -R 755 /volume1/docker/ai-service/
```

### Paso 2: Configurar Variables de Entorno

Crear archivo `.env` en el directorio del proyecto:

```env
# APIs críticas
OPENAI_API_KEY=tu_openai_api_key_aqui
CLAUDE_API_KEY=tu_claude_api_key_aqui
N8N_API_KEY=tu_n8n_api_key_aqui

# Configuración base
NODE_ENV=production
PORT=3000
LOG_LEVEL=info

# Base de datos
POSTGRES_HOST=postgres
POSTGRES_PORT=5432
POSTGRES_DB=ai_service
POSTGRES_USER=ai_user
POSTGRES_PASSWORD=

# Redis
REDIS_HOST=redis
REDIS_PORT=6379
REDIS_PASSWORD=

# Telegram
TELEGRAM_BOT_TOKEN=
TELEGRAM_CHAT_ID=
TELEGRAM_WEBHOOK_URL=
TELEGRAM_ALERTS_ENABLED=true

# N8N
N8N_API_URL=http://n8n:5678
N8N_ADMIN_PASSWORD=n8n_admin_2025

# GoCardless (Sistema Financiero)
GO_SECRET_ID=
GO_SECRET_KEY=
GO_REDIRECT_URI=https://ai-service.anaxi.net/financial/callback

# Dashboard
DASHBOARD_URL=https://domain.com/dashboard
GRAFANA_ADMIN_PASSWORD=
```

### Paso 3: Desplegar con Docker Compose

```bash
# Copiar archivos al NAS
scp docker-compose.synology.yml user@nas:/volume1/docker/ai-service/
scp monitoring/prometheus.synology.yml user@nas:/volume1/docker/ai-service/
scp .env user@nas:/volume1/docker/ai-service/

# Conectarse al NAS
ssh user@nas

# Ir al directorio
cd /volume1/docker/ai-service

# Ejecutar despliegue
docker-compose -f docker-compose.synology.yml up -d
```

### Paso 4: Verificar Despliegue

```bash
# Verificar que todos los contenedores estén ejecutándose
docker ps

# Verificar logs
docker logs ai-service-prod
docker logs ai-service-db
docker logs ai-service-redis
docker logs ai-service-n8n
docker logs ai-service-prometheus
docker logs ai-service-grafana

# Ejecutar script de prueba
./test-production-services.sh
```

### Paso 5: Configuración de Reverse Proxy

Configurar en Synology DSM > Control Panel > Application Portal > Reverse Proxy:

#### AI Service Principal

- **Source**: `domain.com` (puerto 443)
- **Destination**: `localhost:3003`

#### Grafana Dashboard

- **Source**: `domain.com:3001` (puerto 3001)
- **Destination**: `localhost:3001`

#### Prometheus

- **Source**: `domain.com:9090` (puerto 9090)
- **Destination**: `localhost:9090`

#### N8N

- **Source**: `domain.com:5678` (puerto 5678)
- **Destination**: `localhost:5678`

### Paso 6: Configurar Sistema Financiero

```bash
# Inicializar base de datos financiera
curl -X POST https://domain.com/api/financial/init-db

# Configurar conexión BBVA
curl -X POST https://domain.com/api/financial/setup-bbva \
  -H "Content-Type: application/json" \
  -d '{
    "bank": "BBVA_ES",
    "redirect_uri": "https://domain.com/financial/callback"
  }'

# Ejecutar primera sincronización
curl -X POST https://domain.com/api/financial/sync
```

### Paso 7: Configurar Telegram Bot

```bash
# Configurar webhook
curl -X POST https://api.telegram.org/botYOUR_TELEGRAM_BOT_TOKEN/setWebhook \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://ai-service.anaxi.net/api/telegram/webhook"
  }'

# Probar bot
curl -X POST https://ai-service.anaxi.net/api/telegram/test
```

## 📊 Servicios Disponibles

### URLs de Acceso

- **AI Service**: https://ai-service.anaxi.net
- **Dashboard**: https://ai-service.anaxi.net/dashboard
- **Grafana**: https://ai-service.anaxi.net:3001
- **Prometheus**: https://ai-service.anaxi.net:9090
- **N8N**: https://ai-service.anaxi.net:5678

### Credenciales

- **Grafana**: admin / password
- **N8N**: admin / password
- **PostgreSQL**: ai_user / password

## 🔧 Comandos Útiles

### Gestión de Contenedores

```bash
# Ver estado
docker ps

# Reiniciar servicio principal
docker restart ai-service-prod

# Ver logs en tiempo real
docker logs -f ai-service-prod

# Acceder a contenedor
docker exec -it ai-service-prod /bin/bash
```

### Gestión de Base de Datos

```bash
# Acceder a PostgreSQL
docker exec -it ai-service-db psql -U ai_user -d ai_service

# Backup de base de datos
docker exec ai-service-db pg_dump -U ai_user ai_service > backup.sql

# Restaurar base de datos
docker exec -i ai-service-db psql -U ai_user ai_service < backup.sql
```

### Gestión Financiera

```bash
# Sincronizar transacciones
curl -X POST https://ai-service.anaxi.net/api/financial/sync

# Ver estado cuentas
curl https://ai-service.anaxi.net/api/financial/accounts

# Dashboard financiero
curl https://ai-service.anaxi.net/api/financial/dashboard/overview
```

## 🚨 Troubleshooting

### Problemas Comunes

1. **Contenedor no inicia**: Verificar logs con `docker logs [container_name]`
2. **Base de datos no conecta**: Verificar que PostgreSQL esté healthy
3. **APIs no responden**: Verificar variables de entorno
4. **Telegram bot no funciona**: Verificar webhook configurado

### Comandos de Diagnóstico

```bash
# Verificar conectividad de red
docker network ls
docker network inspect ai-service-network

# Verificar volúmenes
docker volume ls

# Verificar recursos
docker stats

# Verificar configuración
docker inspect ai-service-prod
```

## 📈 Monitoreo

### Métricas Disponibles

- **Prometheus**: https://ai-service.anaxi.net:9090
- **Grafana**: https://ai-service.anaxi.net:3001
- **Logs**: Docker logs + archivo logs

### Alertas

- **Telegram**: Notificaciones automáticas
- **Dashboard**: Métricas en tiempo real
- **Health checks**: Verificación automática de servicios

## 🔄 Actualizaciones

### Actualizar Imagen

```bash
# Descargar nueva imagen
docker pull k2600x/ai-service:latest

# Reiniciar con nueva imagen
docker-compose -f docker-compose.synology.yml up -d --no-deps ai-service
```

### Backup Completo

```bash
# Backup de datos
tar -czf ai-service-backup-$(date +%Y%m%d).tar.gz /volume1/docker/ai-service/

# Backup de base de datos
docker exec ai-service-db pg_dump -U ai_user ai_service > ai-service-db-$(date +%Y%m%d).sql
```

---

## ✅ Checklist de Despliegue

- [ ] Directorios creados en NAS
- [ ] Variables de entorno configuradas
- [ ] Docker compose ejecutado
- [ ] Todos los contenedores running
- [ ] Reverse proxy configurado
- [ ] Sistema financiero inicializado
- [ ] Telegram bot configurado
- [ ] Dashboard accesible
- [ ] Monitoreo funcionando
- [ ] Backup configurado

**🎉 ¡Despliegue completo realizado con éxito!**
