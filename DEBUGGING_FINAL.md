# 🔍 Debugging Configuración Final

## 🚨 Problema Actual
La configuración `docker-compose.production-final.yml` falla sin mensaje claro.

## 📋 Estado Conocido
- ✅ **Step 1-3** funcionan (PostgreSQL + Redis + AI Service + Telegram + Financial)
- ❌ **Step 4** falla (al agregar N8N)
- ❌ **Step 4C** falla (sin N8N pero con Prometheus/Grafana)
- ❌ **Production-final** falla

## 🎯 Hipótesis de Fallo

### **Posibles Causas:**

1. **Health Check de Redis** - Puede estar fallando
2. **Prometheus configuration** - Puede necesitar archivos de config
3. **Grafana dependencies** - Puede estar esperando Prometheus
4. **Volume permissions** - Prometheus/Grafana pueden tener problemas de permisos

## 🧪 Plan de Testing Progresivo

### **Test 1: Ultra Minimal** (`docker-compose.ultra-minimal.yml`)
**Cambios vs Step 3**:
- ❌ Removido health check de Redis
- ❌ Sin dependencia de Redis health check en AI Service
- ✅ Solo PostgreSQL + Redis + AI Service (como Step 3 pero sin health checks problemáticos)

**Variables necesarias**: Las mismas de Step 3

### **Test 2: Agregar Prometheus** (`docker-compose.add-prometheus.yml`)
**Si Test 1 funciona**, agregar:
- ✅ Prometheus sin health checks
- ✅ Configuración mínima de Prometheus
- ❌ Sin archivos de configuración externos

### **Test 3: Agregar Grafana** (`docker-compose.add-grafana.yml`)
**Si Test 2 funciona**, agregar:
- ✅ Grafana sin depends_on Prometheus
- ✅ Sin plugins complejos
- ❌ Sin configuraciones avanzadas

## 🔧 Variables de Entorno Requeridas

### **Para todos los tests:**
```env
POSTGRES_PASSWORD=ultra_secure_password_2025
REDIS_PASSWORD=redis_secure_password_2025
TELEGRAM_BOT_TOKEN=7675285244:AAHcM733tpyttgRPWITfeQOAGnrtbrWThpE
TELEGRAM_CHAT_ID=5015255679
TELEGRAM_WEBHOOK_URL=https://ai-service.anaxi.net/api/telegram/webhook
GO_SECRET_ID=6b4b7fe5-5863-4432-880a-aab64d52a1e6
GO_SECRET_KEY=8246fb5525c80628d4d13de48c0d7ea4c38fc01e100f8ab5270977b0f0898ce6469d68e09667e77da588f172c9147a83748aa026b8382b9139b13c8d8e9cb79b
GO_REDIRECT_URI=https://ai-service.anaxi.net/financial/callback
DASHBOARD_URL=https://ai-service.anaxi.net/dashboard
```

### **Para Test 3 (con Grafana):**
```env
GRAFANA_ADMIN_PASSWORD=grafana_admin_password_2025
```

## 📊 Comandos de Verificación

### **Para cada test:**
```bash
# Verificar contenedores
docker ps -a

# Verificar logs específicos
docker logs ai-service-prod
docker logs ai-service-redis
docker logs ai-service-prometheus  # Solo Test 2 y 3
docker logs ai-service-grafana     # Solo Test 3

# Verificar AI Service
curl https://ai-service.anaxi.net/status
curl https://ai-service.anaxi.net/dashboard

# Verificar Telegram
curl -X POST https://ai-service.anaxi.net/api/telegram/test
```

## 🎯 Proceso de Testing

### **Paso 1**: Probar `ultra-minimal.yml`
- **Objetivo**: Confirmar que Step 3 + health checks simplificados funciona
- **Si falla**: El problema es más básico (Redis, variables, etc.)
- **Si funciona**: El problema está en Prometheus/Grafana

### **Paso 2**: Probar `add-prometheus.yml`
- **Objetivo**: Identificar si Prometheus causa el problema
- **Si falla**: Prometheus es el problema
- **Si funciona**: El problema está en Grafana o sus dependencias

### **Paso 3**: Probar `add-grafana.yml`
- **Objetivo**: Confirmar configuración completa sin dependencias complejas
- **Si falla**: Grafana o interacción Prometheus-Grafana es el problema
- **Si funciona**: ¡Tenemos configuración funcional!

## 🚨 Diagnóstico de Errores Comunes

### **Error: Redis Health Check**
```bash
# Verificar si Redis acepta la contraseña
docker exec ai-service-redis redis-cli -a "redis_secure_password_2025" ping
```

### **Error: Prometheus Volúmenes**
```bash
# Verificar permisos de directorio
ls -la /volume1/docker/ai-service/prometheus
# Debe ser writable por UID 65534 (nobody)
```

### **Error: Grafana Volúmenes**
```bash
# Verificar permisos de directorio
ls -la /volume1/docker/ai-service/grafana
# Debe ser writable por UID 472 (grafana)
```

## 📋 Checklist de Debugging

- [ ] **Test 1**: ultra-minimal.yml desplegado
- [ ] **Test 1**: 3 contenedores running (postgres, redis, ai-service)
- [ ] **Test 1**: AI Service responde en /status
- [ ] **Test 1**: Telegram bot funciona
- [ ] **Test 1**: Sistema financiero funciona
- [ ] **Test 2**: add-prometheus.yml desplegado (si Test 1 OK)
- [ ] **Test 2**: 4 contenedores running (+ prometheus)
- [ ] **Test 2**: Prometheus accesible en :9090
- [ ] **Test 3**: add-grafana.yml desplegado (si Test 2 OK)
- [ ] **Test 3**: 5 contenedores running (+ grafana)
- [ ] **Test 3**: Grafana accesible en :3001

## 🎯 Resultado Esperado

**Objetivo**: Identificar exactamente qué componente está causando el fallo y tener una configuración estable.

**Plan**: Una vez identificado el componente problemático, crear la configuración final sin ese componente o con configuración simplificada.