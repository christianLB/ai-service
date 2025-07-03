# Despliegue Escalonado AI Service

## 🎯 Enfoque de Debugging Paso a Paso

Dado que el despliegue completo está fallando, vamos a ir paso a paso para identificar el problema exacto.

### Paso 1: Servicios Básicos ✅ (Ya funciona)
**Archivo**: `docker-compose.step1-basic.yml`

```yaml
# Solo PostgreSQL + Redis + AI Service básico
# Sin dependencias externas, Telegram deshabilitado
```

**Variables mínimas requeridas**:
```env
POSTGRES_PASSWORD=ultra_secure_password_2025
REDIS_PASSWORD=redis_secure_password_2025
```

**Verificación**:
- PostgreSQL: ✅ Funciona
- Redis: ❓ Verificar
- AI Service: ❓ Verificar sin Telegram

---

### Paso 2: Agregar Telegram
**Archivo**: `docker-compose.step2-telegram.yml`

**Variables adicionales**:
```env
TELEGRAM_BOT_TOKEN=7675285244:AAHcM733tpyttgRPWITfeQOAGnrtbrWThpE
TELEGRAM_CHAT_ID=5015255679
TELEGRAM_WEBHOOK_URL=https://ai-service.anaxi.net/api/telegram/webhook
```

**Verificación**:
- Bot responde: `curl -X POST https://ai-service.anaxi.net/api/telegram/test`
- Comandos básicos: `/start`, `/help`, `/status`

---

### Paso 3: Agregar Sistema Financiero
**Archivo**: `docker-compose.step3-financial.yml`

**Variables adicionales**:
```env
GO_SECRET_ID=6b4b7fe5-5863-4432-880a-aab64d52a1e6
GO_SECRET_KEY=8246fb5525c80628d4d13de48c0d7ea4c38fc01e100f8ab5270977b0f0898ce6469d68e09667e77da588f172c9147a83748aa026b8382b9139b13c8d8e9cb79b
GO_REDIRECT_URI=https://ai-service.anaxi.net/financial/callback
DASHBOARD_URL=https://ai-service.anaxi.net/dashboard
```

**Verificación**:
- Financial endpoints: `/api/financial/accounts`
- Dashboard: `/dashboard`
- Comandos Telegram: `/balance`, `/gastos`

---

### Paso 4: Agregar N8N
**Archivo**: `docker-compose.step4-n8n.yml`

**Variables adicionales**:
```env
N8N_ADMIN_PASSWORD=n8n_admin_2025
WEBHOOK_URL=https://ai-service.anaxi.net
N8N_API_KEY=tu_n8n_api_key_aqui
```

**Verificación**:
- N8N UI: `https://ai-service.anaxi.net:5678`
- Workflows: `/api/flows`

---

### Paso 5: Agregar Monitoreo (Final)
**Archivo**: `docker-compose.synology.yml` (completo)

**Variables adicionales**:
```env
GRAFANA_ADMIN_PASSWORD=grafana_admin_password_2025
```

**Verificación**:
- Prometheus: `https://ai-service.anaxi.net:9090`
- Grafana: `https://ai-service.anaxi.net:3001`

---

## 🔍 Protocolo de Debugging

### Para cada paso:

1. **Desplegar** el archivo correspondiente en Portainer
2. **Verificar logs** de cada contenedor:
   ```bash
   docker logs ai-service-prod
   docker logs ai-service-db
   docker logs ai-service-redis
   ```
3. **Probar endpoints** específicos del paso
4. **Si falla**: Analizar logs y corregir antes de continuar

### Comandos de Verificación por Paso:

```bash
# Paso 1: Básico
curl https://ai-service.anaxi.net/status

# Paso 2: Telegram
curl -X POST https://ai-service.anaxi.net/api/telegram/test

# Paso 3: Financial
curl https://ai-service.anaxi.net/api/financial/accounts
curl https://ai-service.anaxi.net/dashboard

# Paso 4: N8N
curl https://ai-service.anaxi.net:5678/healthz
curl https://ai-service.anaxi.net/api/flows

# Paso 5: Monitoreo
curl https://ai-service.anaxi.net:9090/-/healthy
curl https://ai-service.anaxi.net:3001/api/health
```

---

## 🚨 Puntos de Fallo Comunes

### 1. **Variables de Entorno Faltantes**
- Verificar que todas las variables están configuradas en Portainer
- Usar valores por defecto para APIs opcionales

### 2. **Dependencias de Contenedores**
- PostgreSQL debe estar healthy antes de N8N
- Health checks deben pasar

### 3. **Volúmenes y Permisos**
- Verificar que existen todos los directorios
- Permisos de escritura correctos

### 4. **Network Issues**
- Contenedores en la misma red
- Puertos no conflictivos

---

## 📋 Estado Actual

**✅ Funcionando**: PostgreSQL, Prometheus, Grafana
**❌ Fallando**: Redis, N8N, AI Service

**Próximo paso**: Empezar con `docker-compose.step1-basic.yml` y verificar que Redis y AI Service básico funcionan.

---

## 🎯 Plan de Acción

1. **Eliminar stack actual** en Portainer
2. **Desplegar step1-basic.yml** con variables mínimas
3. **Verificar logs** y corregir problemas
4. **Continuar paso a paso** hasta identificar el punto de fallo exacto

Este enfoque nos permitirá aislar el problema específico sin la complejidad del stack completo.