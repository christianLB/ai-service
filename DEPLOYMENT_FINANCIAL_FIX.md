# 🚀 DEPLOYMENT: Solución para financial.account_insights

## 🎯 Problema
- El servicio está en estado "degraded" 
- Error: `relation "financial.account_insights" does not exist`
- El dashboard financiero no funciona

## ✅ Solución Inmediata (Sin Downtime)

### Opción 1: Aplicar directamente en el NAS

```bash
# 1. Copiar el archivo SQL al NAS
scp config/init-financial-tables.sql admin@192.168.1.11:/volume1/docker/ai-service/config/

# 2. SSH al NAS
ssh admin@192.168.1.11

# 3. Aplicar el SQL (reemplaza 'ai_service' con el nombre correcto de tu BD)
sudo docker exec -i ai-postgres psql -U ai_user -d ai_service < /volume1/docker/ai-service/config/init-financial-tables.sql

# 4. Verificar que funcionó
curl http://localhost:3003/status
```

### Opción 2: Aplicar desde tu máquina local

```bash
# Ejecutar directamente sin copiar archivos
cat config/init-financial-tables.sql | ssh admin@192.168.1.11 "sudo docker exec -i ai-postgres psql -U ai_user -d ai_service"
```

## 📋 Para el próximo reinicio (Solución permanente)

### 1. Actualizar docker-compose en Container Manager

Agrega este volumen al servicio postgres:

```yaml
postgres:
  volumes:
    - /volume1/docker/ai-service/config/init-financial-tables.sql:/docker-entrypoint-initdb.d/02-financial.sql:ro
```

### 2. El archivo se ejecutará automáticamente en futuros reinicios

## 🔍 Verificación

### 1. Verificar el estado del servicio
```bash
curl http://192.168.1.11:3003/status | jq .status
# Debe devolver "healthy" en lugar de "degraded"
```

### 2. Verificar el dashboard
```bash
curl http://192.168.1.11:3003/api/financial/dashboard/overview
# Debe devolver datos sin errores
```

### 3. Verificar que la tabla existe
```bash
ssh admin@192.168.1.11 "sudo docker exec ai-postgres psql -U ai_user -d ai_service -c 'SELECT COUNT(*) FROM financial.account_insights;'"
```

## ⚡ Características del Script

- ✅ **100% Idempotente**: Se puede ejecutar múltiples veces
- ✅ **Sin downtime**: No afecta servicios en ejecución  
- ✅ **Sin pérdida de datos**: Solo crea, nunca borra
- ✅ **Compatible**: Funciona con el código TypeScript existente
- ✅ **Completo**: Crea TODAS las tablas financieras necesarias

## 🛠️ Qué hace el script

1. Crea el esquema `financial` si no existe
2. Crea todas las tablas del módulo financiero:
   - `currencies` - Monedas soportadas
   - `accounts` - Cuentas bancarias
   - `transactions` - Transacciones
   - `categories` - Categorías de gastos
   - `account_insights` - **LA TABLA CRÍTICA** (como tabla, no vista)
   - Y más...
3. Crea vistas para reporting
4. Inserta datos iniciales (categorías básicas)
5. Otorga permisos al usuario `ai_user`

## 🚨 Notas Importantes

1. **Base de datos**: Asegúrate de usar el nombre correcto
   - Si es `ai_service_db`: usa ese nombre
   - Si es `ai_service`: usa ese nombre

2. **Usuario**: El script asume que el usuario es `ai_user`

3. **No requiere reinicio**: Los cambios se aplican inmediatamente

## 📊 Resultado Esperado

Después de aplicar el script:
- `/status` devolverá `"status": "healthy"`
- `/api/financial/dashboard/overview` funcionará sin errores
- El Neural Orchestrator reportará estado "optimal"
- Watchtower seguirá funcionando normalmente

---

**Última actualización**: 2025-07-07