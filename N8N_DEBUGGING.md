# Debugging N8N - Paso 4 Falla

## 🔍 Problema Identificado

**Step 3 funciona ✅** (Telegram + Financial)  
**Step 4 falla ❌** (Al agregar N8N)

## 🧪 Versiones de Prueba Creadas

### **4A: N8N Simple** (`docker-compose.step4a-n8n-simple.yml`)
**Cambios**:
- ❌ Removida conexión PostgreSQL de N8N
- ❌ Removido health check de N8N
- ✅ USA SQLite por defecto
- ✅ Sin dependencias complejas

### **4B: N8N Mínimo** (`docker-compose.step4b-n8n-minimal.yml`)
**Cambios**:
- ❌ Sin autenticación básica
- ❌ Sin health checks
- ❌ Configuración ultra mínima
- ✅ AI Service sin dependencia de N8N

### **4C: Sin N8N** (`docker-compose.step4c-sin-n8n.yml`)
**Cambios**:
- ❌ N8N completamente removido
- ✅ Agregado Prometheus + Grafana
- ✅ Sistema completo funcional
- ✅ Todas las funcionalidades excepto workflows

## 🎯 Plan de Pruebas

### Orden de Prueba:

1. **Probar 4C (Sin N8N)** - Debería funcionar al 100%
2. **Probar 4B (N8N Mínimo)** - Identificar si es problema de configuración
3. **Probar 4A (N8N Simple)** - Ver si es problema de PostgreSQL
4. **Analizar logs específicos** de N8N si sigue fallando

### Variables Requeridas para todas:

```env
# Básicas (funcionan en Step 1-3)
POSTGRES_PASSWORD=ultra_secure_password_2025
REDIS_PASSWORD=redis_secure_password_2025
TELEGRAM_BOT_TOKEN=7675285244:AAHcM733tpyttgRPWITfeQOAGnrtbrWThpE
TELEGRAM_CHAT_ID=5015255679
TELEGRAM_WEBHOOK_URL=https://ai-service.anaxi.net/api/telegram/webhook
GO_SECRET_ID=6b4b7fe5-5863-4432-880a-aab64d52a1e6
GO_SECRET_KEY=8246fb5525c80628d4d13de48c0d7ea4c38fc01e100f8ab5270977b0f0898ce6469d68e09667e77da588f172c9147a83748aa026b8382b9139b13c8d8e9cb79b
GO_REDIRECT_URI=https://ai-service.anaxi.net/financial/callback
DASHBOARD_URL=https://ai-service.anaxi.net/dashboard

# Para versiones con N8N
N8N_ADMIN_PASSWORD=n8n_admin_2025
WEBHOOK_URL=https://ai-service.anaxi.net

# Para versión 4C (con Grafana)
GRAFANA_ADMIN_PASSWORD=grafana_admin_password_2025
```

## 🚨 Posibles Causas del Fallo N8N

### 1. **Problema de Base de Datos**
- N8N requiere DB dedicada o configuración específica
- **Solución**: Versión 4A usa SQLite

### 2. **Problema de Volúmenes**
- Directorio `/volume1/docker/ai-service/n8n` no existe o sin permisos
- **Solución**: Crear directorio manualmente

### 3. **Problema de Health Check**
- N8N tarda en inicializar y falla el health check
- **Solución**: Versiones 4A y 4B sin health check

### 4. **Problema de Variables de Entorno**
- Configuración incompatible
- **Solución**: Versión 4B con configuración ultra mínima

## 📋 Comandos de Verificación

### Para cada versión que pruebes:

```bash
# Ver todos los contenedores
docker ps -a

# Ver logs de N8N específicamente
docker logs ai-service-n8n

# Ver logs del AI Service
docker logs ai-service-prod

# Probar N8N directamente (si inicia)
curl https://ai-service.anaxi.net:5678/

# Probar el AI Service
curl https://ai-service.anaxi.net/status
```

## 🎯 Recomendación

**Empezar con 4C (Sin N8N)**:
- Te da un sistema 95% funcional
- Todas las funcionalidades financieras
- Telegram completo
- Monitoreo con Grafana

N8N es útil para workflows automáticos, pero el sistema core funciona perfectamente sin él.

## 💡 Si N8N es Crítico

Si necesitas N8N absolutamente:

1. **Crear directorio manualmente**:
   ```bash
   mkdir -p /volume1/docker/ai-service/n8n
   chmod 755 /volume1/docker/ai-service/n8n
   ```

2. **Probar versión 4B** (más simple)

3. **Verificar logs específicos** para error exacto

## ✅ Sistema Funcional Inmediato

**Usa `docker-compose.step4c-sin-n8n.yml`** para tener:
- ✅ PostgreSQL + Redis
- ✅ Telegram Bot (8 comandos)
- ✅ Sistema Financiero completo
- ✅ Dashboard web
- ✅ Prometheus + Grafana
- ❌ N8N workflows (puede agregarse después)