# 🚨 Diagnóstico de Producción - AI Service

## 📋 Estado Actual

**Problema detectado**: El AI Service no está respondiendo
- ❌ https://ai-service.anaxi.net/status → 503 Service Unavailable
- ❌ https://ai-service.anaxi.net → 404 Not Found
- ❌ Telegram bot no responde
- ❌ Financial dashboard no accesible

## 🔍 Posibles Causas

### **1. Contenedor AI Service No Inicia**
Causa más probable: El contenedor `ai-service-prod` no está iniciando correctamente.

**Síntomas**:
- Endpoints no responden
- Probablemente falla el health check
- Puede estar en loop de reinicio

### **2. Variables de Entorno Faltantes**
**Variables críticas que pueden estar faltando**:
- `OPENAI_API_KEY` (si es requerida)
- `CLAUDE_API_KEY` (si es requerida) 
- Configuración incorrecta de URLs

### **3. Problemas de Conectividad DB**
- PostgreSQL puede no estar accesible desde el contenedor AI Service
- Credenciales incorrectas

## 🛠️ Comandos de Diagnóstico

### **Ejecutar en Synology/Portainer**:

```bash
# 1. Verificar estado de contenedores
docker ps --filter name=ai-service

# 2. Ver contenedores parados
docker ps -a --filter name=ai-service

# 3. Ver logs del AI Service (CRÍTICO)
docker logs ai-service-prod --tail 50

# 4. Ver logs de PostgreSQL
docker logs ai-service-db --tail 20

# 5. Ver logs de Redis
docker logs ai-service-redis --tail 10

# 6. Intentar reiniciar AI Service
docker restart ai-service-prod

# 7. Monitorear logs en tiempo real
docker logs -f ai-service-prod
```

### **Script Automático de Diagnóstico**:
```bash
# Ejecutar script completo de diagnóstico
./diagnose-production.sh
```

## 🔧 Soluciones Probables

### **Si falta OPENAI_API_KEY**:
Agregar en Portainer variables de entorno:
```env
OPENAI_API_KEY=sk-...
CLAUDE_API_KEY=sk-ant-...
```

### **Si falla la conexión a DB**:
```bash
# Verificar que PostgreSQL está running
docker exec ai-service-db psql -U ai_user -d ai_service -c 'SELECT 1;'

# Verificar red
docker network inspect ai-service_ai-service-network
```

### **Si el contenedor está en crash loop**:
```bash
# Ver últimos logs para identificar error
docker logs ai-service-prod --tail 100

# Reiniciar todo el stack
docker-compose -f docker-compose.production.yml restart
```

## 📱 Telegram Bot Debug

### **Verificar configuración**:
- `TELEGRAM_BOT_TOKEN` debe estar configurado
- `TELEGRAM_WEBHOOK_URL` debe apuntar a la URL correcta
- El bot debe estar configurado con el webhook correcto

### **Test manual**:
```bash
# Cuando el servicio funcione, probar:
curl -X POST https://ai-service.anaxi.net/api/telegram/test
```

## 💰 Financial System Debug

### **Inicialización requerida**:
```bash
# Después de que AI Service responda, ejecutar:
curl -X POST https://ai-service.anaxi.net/api/init-db
curl -X POST https://ai-service.anaxi.net/api/financial/init-db
```

## 🎯 Próximos Pasos

1. **Ejecutar `./diagnose-production.sh`** para obtener información completa
2. **Identificar error específico** en los logs
3. **Corregir configuración** según el error encontrado
4. **Reiniciar servicios** y verificar
5. **Inicializar esquemas** una vez que funcione

## 📞 Estado de Diagnóstico

**Primera verificación**: 
- ❌ AI Service no responde (503/404)
- ❓ Contenedores estado: Pendiente verificación
- ❓ Logs error: Pendiente revisión

**Ejecutar diagnóstico y reportar hallazgos para siguiente paso.**