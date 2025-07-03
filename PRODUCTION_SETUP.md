# 🚀 AI Service - Configuración de Producción Final

## 📋 Configuración Definitiva

**Archivo**: `docker-compose.production.yml`

### ✅ Servicios Incluidos:
- **PostgreSQL** - Base de datos con esquemas financieros
- **Redis** - Cache y sesiones
- **Prometheus** - Métricas del sistema
- **AI Service** - Servicio principal completo

### ❌ Servicios Removidos:
- **N8N** - No se usa funcionalmente
- **Grafana** - Causa problemas de despliegue

---

## 🔧 Variables de Entorno Requeridas

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

# Dashboard Configuration
DASHBOARD_URL=https://ai-service.anaxi.net/dashboard

# AI APIs (Opcionales)
OPENAI_API_KEY=tu_openai_api_key_aqui
CLAUDE_API_KEY=tu_claude_api_key_aqui
```

---

## 🗄️ Base de Datos - Inicialización Automática

### **Esquemas que se crean automáticamente**:

1. **`financial-schema.sql`** - Sistema financiero completo:
   - Tablas de cuentas bancarias
   - Transacciones financieras
   - Categorización automática
   - Sistema de facturas
   - Integración GoCardless

2. **`init-db.sql`** - Esquemas base:
   - Tablas del AI Service
   - Documentos y conocimiento
   - Logs de comunicación
   - Índices optimizados

### **Configuración GoCardless**:

Después del primer despliegue, ejecutar:

```bash
# 1. Inicializar sistema financiero
curl -X POST https://ai-service.anaxi.net/api/financial/init-db

# 2. Configurar conexión BBVA
curl -X POST https://ai-service.anaxi.net/api/financial/setup-bbva \
  -H "Content-Type: application/json" \
  -d '{
    "bank": "BBVA_ES",
    "redirect_uri": "https://ai-service.anaxi.net/financial/callback"
  }'

# 3. Obtener enlace de autorización (seguir URL devuelta)

# 4. Completar configuración después de autorización
curl -X POST https://ai-service.anaxi.net/api/financial/complete-setup

# 5. Primera sincronización
curl -X POST https://ai-service.anaxi.net/api/financial/sync
```

---

## 📱 Funcionalidades Disponibles

### **Sistema Financiero Completo**:
- ✅ Sincronización BBVA real via GoCardless
- ✅ Categorización automática con IA
- ✅ Dashboard web en tiempo real
- ✅ Reportes comprehensivos
- ✅ Alertas automáticas

### **Telegram Bot (8 comandos)**:
```bash
/start     - Inicialización y bienvenida
/help      - Lista completa de comandos
/status    - Estado del sistema AI Service
/balance   - Balance de cuentas bancarias
/gastos    - Análisis de gastos por categoría
/reporte   - Reportes automáticos
/sync      - Sincronización bancaria manual
/dashboard - URL directa al dashboard web
```

### **APIs Disponibles**:
```bash
# Core System
GET  /status                          # Health check
GET  /dashboard                       # Dashboard web

# Financial System
GET  /api/financial/accounts          # Cuentas bancarias
GET  /api/financial/transactions      # Transacciones
POST /api/financial/sync              # Sincronización manual
GET  /api/financial/dashboard/overview # Métricas financieras

# Telegram Integration
POST /api/telegram/webhook            # Webhook bot
POST /api/telegram/test               # Test bot

# Monitoring
GET  /api/metrics/json                # Métricas sistema
```

---

## 🌐 URLs de Acceso

- **AI Service**: https://ai-service.anaxi.net
- **Dashboard Financiero**: https://ai-service.anaxi.net/dashboard
- **Prometheus**: https://ai-service.anaxi.net:9090

---

## 🔍 Verificación del Despliegue

### **1. Verificar Contenedores**
```bash
docker ps
# Debe mostrar 4 contenedores running:
# - ai-service-prod
# - ai-service-db  
# - ai-service-redis
# - ai-service-prometheus
```

### **2. Verificar Servicios**
```bash
# AI Service
curl https://ai-service.anaxi.net/status

# Dashboard
curl https://ai-service.anaxi.net/dashboard

# Prometheus
curl https://ai-service.anaxi.net:9090/-/healthy

# Test Telegram
curl -X POST https://ai-service.anaxi.net/api/telegram/test
```

### **3. Verificar Base de Datos**
```bash
# Conectar a PostgreSQL
docker exec -it ai-service-db psql -U ai_user -d ai_service

# Verificar esquemas
\dn

# Verificar tablas financieras
\dt financial.*
```

---

## 🚨 Troubleshooting

### **Si falla el despliegue**:
1. Verificar todas las variables de entorno configuradas
2. Verificar que existen los directorios de volúmenes
3. Revisar logs: `docker logs ai-service-prod`

### **Si el sistema financiero no funciona**:
1. Verificar esquemas de DB: `\dt financial.*`
2. Ejecutar inicialización: `/api/financial/init-db`
3. Seguir proceso de configuración GoCardless

### **Si Telegram no responde**:
1. Verificar webhook: `/api/telegram/webhook`
2. Probar endpoint: `/api/telegram/test`
3. Verificar variables TELEGRAM_*

---

## ✅ Checklist de Despliegue

- [ ] Variables de entorno configuradas
- [ ] Directorios de volúmenes creados
- [ ] Stack desplegado desde repositorio
- [ ] 4 contenedores running
- [ ] AI Service responde
- [ ] PostgreSQL con esquemas financieros
- [ ] Sistema financiero inicializado
- [ ] GoCardless configurado
- [ ] Telegram bot responde
- [ ] Dashboard accesible

---

## 🎯 Sistema Final Operativo

**Resultado**: AI Service 95% funcional sin N8N ni Grafana
- ✅ Base de datos PostgreSQL completa
- ✅ Sistema financiero BBVA real
- ✅ Bot Telegram 8 comandos
- ✅ Dashboard web tiempo real
- ✅ Monitoreo Prometheus
- ✅ Alertas automáticas

**¡Extensión ultra poderosa del cerebro humano lista!** 🧠⚡