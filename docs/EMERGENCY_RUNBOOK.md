# 🚨 EMERGENCY RUNBOOK - AI Service

**Objetivo: Recuperación en menos de 30 segundos**

---

## 🔴 RESPUESTA INMEDIATA (0-30 segundos)

### 1. Sistema Completamente Caído
```bash
# EJECUTAR INMEDIATAMENTE:
cd /home/k2600x/dev/ai-service
./scripts/emergency/diagnose.sh    # Diagnóstico rápido (10s)
./scripts/emergency/rollback.sh latest  # Rollback automático (20s)
```

### 2. API No Responde
```bash
# Reinicio rápido:
make prod-restart    # Reinicia todos los servicios
# Si falla:
docker-compose -f docker-compose.production.yml restart api
```

### 3. Base de Datos No Responde
```bash
# Reinicio de emergencia:
docker-compose -f docker-compose.production.yml restart postgres
# Verificar:
docker exec ai-service-postgres-1 pg_isready -U postgres
```

### 4. Contenedores Crasheando en Loop
```bash
# Detener todo:
make prod-emergency-stop
# Diagnóstico:
./scripts/emergency/diagnose.sh
# Rollback si es necesario:
./scripts/emergency/rollback.sh latest
```

---

## 🟡 DIAGNÓSTICO RÁPIDO (30-60 segundos)

### Comandos de Verificación Esenciales

```bash
# 1. Estado general
make prod-status

# 2. Logs en tiempo real
docker-compose -f docker-compose.production.yml logs -f --tail=50

# 3. Uso de recursos
docker stats

# 4. Conexiones de red
netstat -tlnp | grep -E "3000|5432|6379"

# 5. Espacio en disco
df -h
```

### Patrones de Error Comunes

| Síntoma | Causa Probable | Solución Rápida |
|---------|----------------|-----------------|
| "Connection refused" | Servicio caído | `make prod-restart` |
| "Out of memory" | Fuga de memoria | `docker-compose restart api` |
| "No space left" | Disco lleno | `docker system prune -a` |
| "Permission denied" | Permisos incorrectos | `chown -R k2600x:users .` |
| "Port already in use" | Puerto ocupado | `lsof -i :3000` → kill proceso |

---

## 🟠 PROCEDIMIENTOS DE RECUPERACIÓN

### A. Rollback Completo (< 30s)
```bash
# 1. Listar backups disponibles
ls -la /volume1/docker/ai-service/backups/

# 2. Rollback al último backup estable
./scripts/emergency/rollback.sh latest

# 3. Verificar servicios
make prod-status
```

### B. Recuperación Selectiva
```bash
# Solo base de datos
docker-compose -f docker-compose.production.yml stop postgres
docker-compose -f docker-compose.production.yml rm -f postgres
docker-compose -f docker-compose.production.yml up -d postgres

# Solo API
docker-compose -f docker-compose.production.yml restart api
```

### C. Reconstrucción Completa
```bash
# 1. Backup actual (por si acaso)
./scripts/emergency/pre-deploy-backup.sh emergency

# 2. Detener todo
make prod-emergency-stop

# 3. Limpiar y reconstruir
docker system prune -f
docker-compose -f docker-compose.production.yml build --no-cache
docker-compose -f docker-compose.production.yml up -d

# 4. Verificar
./scripts/emergency/diagnose.sh
```

---

## 🔥 ESCENARIOS CRÍTICOS

### 1. Ataque o Compromiso de Seguridad
```bash
# INMEDIATO:
make prod-emergency-stop         # Detener todo
iptables -A INPUT -j DROP       # Bloquear tráfico entrante
./scripts/emergency/pre-deploy-backup.sh emergency  # Backup forense

# Análisis:
docker logs ai-service-api-1 > /tmp/api-logs-forensic.txt
grep -E "unauthorized|injection|malicious" /tmp/api-logs-forensic.txt

# Recuperación:
./scripts/emergency/rollback.sh [ultimo-backup-seguro]
```

### 2. Corrupción de Base de Datos
```bash
# 1. Detener servicios que usan la BD
docker-compose -f docker-compose.production.yml stop api

# 2. Backup de emergencia de la BD corrupta
docker exec ai-service-postgres-1 pg_dump -U postgres ai_service > /tmp/corrupted-backup.sql

# 3. Restaurar desde backup
docker-compose -f docker-compose.production.yml stop postgres
docker-compose -f docker-compose.production.yml rm -f postgres
docker volume rm ai-service_postgres_data
docker-compose -f docker-compose.production.yml up -d postgres

# 4. Restaurar datos
docker exec -i ai-service-postgres-1 psql -U postgres ai_service < /path/to/last-good-backup.sql
```

### 3. Pérdida Total del Servidor
```bash
# En servidor nuevo:
# 1. Clonar repositorio
git clone [repo-url] /volume1/docker/ai-service
cd /volume1/docker/ai-service

# 2. Restaurar configuración
cp /backup/location/.env.production .
cp /backup/location/.make.env .

# 3. Restaurar desde backup
tar -xzf /backup/location/latest-backup.tar.gz

# 4. Levantar servicios
docker-compose -f docker-compose.production.yml up -d

# 5. Verificar
./scripts/emergency/diagnose.sh
```

---

## 📊 MÉTRICAS DE RECUPERACIÓN

### Tiempos Objetivo (SLA)

| Tipo de Incidente | Tiempo Detección | Tiempo Recuperación | Pérdida Datos Max |
|-------------------|------------------|---------------------|-------------------|
| API caída | < 1 min | < 30 seg | 0 |
| DB corrupta | < 2 min | < 5 min | 1 hora |
| Servidor caído | < 5 min | < 30 min | 1 día |
| Ataque seguridad | < 1 min | < 5 min | 0 |

### Checklist Post-Incidente

- [ ] Servicios restaurados y funcionando
- [ ] Datos verificados e íntegros
- [ ] Logs del incidente guardados
- [ ] Causa raíz identificada
- [ ] Medidas preventivas implementadas
- [ ] Documentación actualizada
- [ ] Stakeholders notificados

---

## 🛠️ HERRAMIENTAS DE EMERGENCIA

### Scripts Disponibles
```bash
/scripts/emergency/
├── diagnose.sh          # Diagnóstico completo (10s)
├── rollback.sh          # Rollback automático (20s)
└── pre-deploy-backup.sh # Backup preventivo (30s)
```

### Comandos Make de Emergencia
```bash
make 911                    # Muestra este runbook
make prod-emergency-stop    # Detiene TODO inmediatamente
make prod-emergency-restore # Restaura último backup
make fix                    # Fixes automáticos comunes
```

### Contactos de Emergencia
- **DevOps Lead**: [Contacto]
- **DBA**: [Contacto]
- **Security**: [Contacto]
- **Cloud Provider**: [Soporte 24/7]

---

## 📝 NOTAS IMPORTANTES

1. **SIEMPRE** hacer backup antes de cualquier acción destructiva
2. **NUNCA** ejecutar comandos sin entender su impacto
3. **DOCUMENTAR** cada acción tomada durante el incidente
4. **COMUNICAR** el estado a los stakeholders relevantes
5. **APRENDER** del incidente y actualizar este runbook

---

## 🔄 PROCESO DE ACTUALIZACIÓN

Este runbook debe actualizarse:
- Después de cada incidente mayor
- Cuando se añadan nuevos servicios
- Mensualmente como mínimo
- Cuando cambien los procedimientos

**Última actualización**: 2025-07-09
**Próxima revisión**: 2025-08-09

---

## 🎯 RESUMEN EJECUTIVO

**EN CASO DE EMERGENCIA:**

1. **NO ENTRAR EN PÁNICO**
2. Ejecutar: `./scripts/emergency/diagnose.sh`
3. Si crítico: `./scripts/emergency/rollback.sh latest`
4. Verificar: `make prod-status`
5. Documentar el incidente

**Tiempo objetivo: < 30 segundos para recuperación básica**