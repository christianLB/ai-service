# 🚀 Guía de Despliegue Final - AI Service Production

## 📋 **Archivo de Configuración**

**Usar**: `docker-compose.production-final.yml`

## ✅ **Sistema Completo Incluido**

- ✅ **PostgreSQL** - Base de datos principal
- ✅ **Redis** - Cache y sesiones  
- ✅ **AI Service** - Servicio principal con TODAS las funcionalidades
- ✅ **Telegram Bot** - 8 comandos financieros
- ✅ **Sistema Financiero** - GoCardless + BBVA completo
- ✅ **Dashboard Web** - Métricas en tiempo real
- ✅ **Prometheus** - Métricas del sistema
- ✅ **Grafana** - Dashboards de monitoreo
- ❌ **N8N** - Removido (innecesario)

---

## 🔧 **Configuración en Portainer**

### **1. Crear Stack**
- **Name**: `ai-service-production`
- **Repository**: `https://github.com/christianLB/ai-service`
- **Compose File**: `docker-compose.production-final.yml`

### **2. Variables de Entorno (TODAS)**

```env
# Database Configuration
POSTGRES_PASSWORD=ultra_secure_password_2025
REDIS_PASSWORD=redis_secure_password_2025

# Telegram Bot Configuration
TELEGRAM_BOT_TOKEN=7675285244:AAHcM733tpyttgRPWITfeQOAGnrtbrWThpE
TELEGRAM_CHAT_ID=5015255679
TELEGRAM_WEBHOOK_URL=https://ai-service.anaxi.net/api/telegram/webhook

# GoCardless Financial Integration
GO_SECRET_ID=6b4b7fe5-5863-4432-880a-aab64d52a1e6
GO_SECRET_KEY=8246fb5525c80628d4d13de48c0d7ea4c38fc01e100f8ab5270977b0f0898ce6469d68e09667e77da588f172c9147a83748aa026b8382b9139b13c8d8e9cb79b
GO_REDIRECT_URI=https://ai-service.anaxi.net/financial/callback

# Dashboard and Monitoring
DASHBOARD_URL=https://ai-service.anaxi.net/dashboard
GRAFANA_ADMIN_PASSWORD=grafana_admin_password_2025

# AI APIs (Opcionales pero recomendadas)
OPENAI_API_KEY=tu_openai_api_key_aqui
CLAUDE_API_KEY=tu_claude_api_key_aqui
```

### **3. Verificar Directorios**

Asegurarse que existen en el NAS:
```bash
/volume1/docker/ai-service/postgres
/volume1/docker/ai-service/redis
/volume1/docker/ai-service/prometheus
/volume1/docker/ai-service/grafana
/volume1/docker/ai-service/logs
/volume1/docker/ai-service/workflows
/volume1/docker/ai-service/documents
/volume1/docker/ai-service/knowledge
```

---

## 🌐 **Configuración de Reverse Proxy**

### **Synology DSM > Application Portal > Reverse Proxy**

#### **1. AI Service Principal**
- **Source**: `ai-service.anaxi.net` (HTTPS 443)
- **Destination**: `localhost:3003`

#### **2. Grafana Dashboard**
- **Source**: `ai-service.anaxi.net:3001` (HTTPS 3001)
- **Destination**: `localhost:3001`

#### **3. Prometheus Metrics**
- **Source**: `ai-service.anaxi.net:9090` (HTTPS 9090)
- **Destination**: `localhost:9090`

---

## 🔍 **Verificación del Despliegue**

### **1. Verificar Contenedores**
```bash
docker ps
```

**Debe mostrar 5 contenedores running**:
- `ai-service-prod`
- `ai-service-db`
- `ai-service-redis`
- `ai-service-prometheus`
- `ai-service-grafana`

### **2. Verificar Health Checks**
```bash
# AI Service
curl https://ai-service.anaxi.net/status

# Dashboard
curl https://ai-service.anaxi.net/dashboard

# Grafana
curl https://ai-service.anaxi.net:3001/api/health

# Prometheus
curl https://ai-service.anaxi.net:9090/-/healthy
```

### **3. Verificar Sistema Financiero**
```bash
# Cuentas bancarias
curl https://ai-service.anaxi.net/api/financial/accounts

# Dashboard financiero
curl https://ai-service.anaxi.net/api/financial/dashboard/overview

# Transacciones
curl https://ai-service.anaxi.net/api/financial/transactions
```

### **4. Verificar Telegram Bot**
```bash
# Test del bot
curl -X POST https://ai-service.anaxi.net/api/telegram/test

# Enviar comando de prueba directamente al bot
# /status, /help, /balance, etc.
```

---

## 📱 **Comandos Telegram Disponibles**

```bash
/start     - Inicialización y bienvenida
/help      - Lista completa de comandos  
/status    - Estado del sistema AI Service
/balance   - Balance de cuentas bancarias
/gastos    - Análisis de gastos por categoría
/reporte   - Reportes automáticos (daily/weekly/monthly)
/sync      - Sincronización bancaria manual
/dashboard - URL directa al dashboard web
```

---

## 🌐 **URLs de Acceso Final**

- **🏠 AI Service**: https://ai-service.anaxi.net
- **📊 Dashboard Financiero**: https://ai-service.anaxi.net/dashboard
- **📈 Grafana**: https://ai-service.anaxi.net:3001 (admin/grafana_admin_password_2025)
- **📉 Prometheus**: https://ai-service.anaxi.net:9090
- **💬 Telegram Bot**: Buscar @tu_bot_username

---

## 🚨 **Troubleshooting**

### **Si algún contenedor no inicia:**
```bash
# Ver logs específicos
docker logs ai-service-prod
docker logs ai-service-db
docker logs ai-service-redis
docker logs ai-service-prometheus
docker logs ai-service-grafana

# Reiniciar contenedor específico
docker restart [container_name]

# Reiniciar todo el stack
docker-compose -f docker-compose.production-final.yml restart
```

### **Si falla el health check:**
1. Verificar que las variables de entorno están configuradas
2. Verificar que los puertos no están en conflicto
3. Verificar conectividad de red entre contenedores

### **Si el bot de Telegram no responde:**
1. Verificar webhook configurado: `/api/telegram/webhook`
2. Verificar variables TELEGRAM_* configuradas
3. Probar endpoint de test: `/api/telegram/test`

---

## ✅ **Checklist de Despliegue**

- [ ] Directorios creados en NAS
- [ ] Variables de entorno configuradas en Portainer
- [ ] Stack desplegado desde repositorio
- [ ] 5 contenedores running
- [ ] Health checks pasando
- [ ] Reverse proxy configurado
- [ ] AI Service responde en puerto 3003
- [ ] Dashboard accesible
- [ ] Telegram bot responde
- [ ] Sistema financiero funcional
- [ ] Grafana accesible
- [ ] Prometheus recogiendo métricas

---

## 🎯 **Resultado Final**

**🎉 Sistema AI Service 100% funcional en producción:**

- ✅ **Base de datos PostgreSQL** - Datos persistentes
- ✅ **Cache Redis** - Performance optimizada
- ✅ **Sistema Financiero completo** - BBVA sincronizado
- ✅ **Bot Telegram** - 8 comandos operativos
- ✅ **Dashboard web** - Métricas en tiempo real
- ✅ **Monitoreo completo** - Prometheus + Grafana
- ✅ **Alertas automáticas** - Notificaciones inteligentes

**¡Extensión ultra poderosa del cerebro humano lista para usar!** 🧠⚡