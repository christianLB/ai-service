# Infraestructura Optimizada para Synology NAS

## Descripción

Este conjunto de scripts y configuraciones está optimizado específicamente para ejecutar AI Service en un Synology DS420+ con 10GB de RAM, maximizando la eficiencia de recursos.

## Componentes

### 1. Docker Compose Optimizado (`deploy/nas/docker-compose.optimized.yml`)

Configuración completa con límites de recursos estrictos:
- **PostgreSQL**: Máximo 1GB RAM, configuración optimizada para bajo consumo
- **Redis**: Máximo 256MB RAM con políticas de evicción agresivas
- **AI Service**: Máximo 2GB RAM con 2 workers
- **Monitor**: Menos de 50MB RAM
- **Nginx**: Máximo 128MB RAM para servir frontend
- **Backup**: Sistema automático de respaldos

### 2. Scripts de Deployment

#### `deploy-optimized.sh`
Script principal de deployment con características:
- Build de imagen Docker optimizada (multi-stage, Alpine Linux)
- Deployment con zero-downtime
- Verificación automática de servicios
- Limpieza de recursos

**Uso:**
```bash
# Deployment completo
./scripts/nas/deploy-optimized.sh full

# Solo actualizar servicios
./scripts/nas/deploy-optimized.sh quick

# Solo construir imagen
./scripts/nas/deploy-optimized.sh build

# Verificar estado
./scripts/nas/deploy-optimized.sh verify
```

### 3. Monitor Ligero (`monitor.js`)

Monitor en Node.js que usa menos de 50MB RAM:
- Verifica salud de todos los servicios
- Registra métricas básicas
- Envía alertas por Telegram (opcional)
- Logs rotativos automáticos

**Características:**
- Intervalo configurable (default: 1 minuto)
- API HTTP en puerto 3000 para consultar estado
- Manejo eficiente de memoria

### 4. Sistema de Backup (`backup.sh`)

Script automático de backup con:
- Backup diario a las 2 AM
- Compresión gzip nivel 9
- Retención configurable (default: 7 días)
- Link simbólico al último backup

### 5. Monitoreo del Sistema

#### `system-monitor.sh`
Monitor visual del estado del sistema:
```bash
# Vista básica
./scripts/nas/system-monitor.sh

# Vista detallada con logs
./scripts/nas/system-monitor.sh -v

# Modo watch (actualización continua)
./scripts/nas/system-monitor.sh -w
```

#### `optimize-resources.sh`
Optimización automática de recursos:
```bash
# Optimizar una vez
./scripts/nas/optimize-resources.sh once

# Programar optimización cada 6 horas
./scripts/nas/optimize-resources.sh schedule

# Modo monitoreo continuo
./scripts/nas/optimize-resources.sh monitor
```

## Configuración Inicial

1. **Preparar el NAS:**
```bash
# Crear estructura de directorios
ssh k2600x@192.168.1.11 "mkdir -p /volume1/docker/ai-service/{data,logs,backups,config,scripts}"
```

2. **Copiar archivos:**
```bash
# Copiar configuraciones
scp -r deploy/nas/* k2600x@192.168.1.11:/volume1/docker/ai-service/
scp -r scripts/nas/* k2600x@192.168.1.11:/volume1/docker/ai-service/scripts/
```

3. **Configurar permisos:**
```bash
ssh k2600x@192.168.1.11 "chmod +x /volume1/docker/ai-service/scripts/*.sh"
```

4. **Crear archivo .env:**
```bash
# En el NAS, crear /volume1/docker/ai-service/.env con las variables necesarias
DB_USER=ai_user
DB_PASSWORD=your_secure_password
OPENAI_API_KEY=your_api_key
TELEGRAM_BOT_TOKEN=your_bot_token
# ... etc
```

## Uso Diario

### Deployment
```bash
# Desde tu máquina local
cd /home/k2600x/dev/ai-service
./scripts/nas/deploy-optimized.sh full
```

### Monitoreo
```bash
# Ver estado del sistema
ssh k2600x@192.168.1.11 "/volume1/docker/ai-service/scripts/system-monitor.sh"

# Ver logs del monitor
ssh k2600x@192.168.1.11 "tail -f /volume1/docker/ai-service/data/monitor/monitor.log"
```

### Backup Manual
```bash
ssh k2600x@192.168.1.11 "docker exec ai-service-backup /backup.sh"
```

### Optimización Manual
```bash
ssh k2600x@192.168.1.11 "/volume1/docker/ai-service/scripts/optimize-resources.sh once"
```

## Límites de Recursos

### Resumen de Asignación de RAM (Total: ~4.5GB de 10GB)
- PostgreSQL: 1GB
- Redis: 256MB
- AI Service: 2GB
- Monitor: 50MB
- Nginx: 128MB
- Backup: 256MB
- **Reserva para sistema y otros servicios**: ~5.5GB

### CPU
- PostgreSQL: 1 core
- Redis: 0.5 cores
- AI Service: 2 cores
- Monitor: 0.25 cores
- Nginx: 0.5 cores
- Backup: 0.5 cores

## Troubleshooting

### Alto uso de memoria
```bash
# Ejecutar optimización
ssh k2600x@192.168.1.11 "/volume1/docker/ai-service/scripts/optimize-resources.sh once"

# Reiniciar servicio específico
ssh k2600x@192.168.1.11 "cd /volume1/docker/ai-service && docker-compose -f docker-compose.optimized.yml restart ai-service"
```

### Servicios no responden
```bash
# Verificar logs
ssh k2600x@192.168.1.11 "cd /volume1/docker/ai-service && docker-compose -f docker-compose.optimized.yml logs --tail=50"

# Reiniciar todo
ssh k2600x@192.168.1.11 "cd /volume1/docker/ai-service && docker-compose -f docker-compose.optimized.yml restart"
```

### Espacio en disco lleno
```bash
# Limpiar Docker
ssh k2600x@192.168.1.11 "docker system prune -a -f"

# Limpiar logs antiguos
ssh k2600x@192.168.1.11 "find /volume1/docker/ai-service/logs -name '*.log' -mtime +7 -delete"
```

## Métricas de Rendimiento Esperadas

Con esta configuración optimizada, deberías observar:
- **Uso total de RAM**: ~4-5GB (dejando 5-6GB libres para el sistema)
- **Tiempo de respuesta API**: <100ms para endpoints simples
- **Tiempo de arranque**: <2 minutos para todos los servicios
- **Consumo en idle**: <10% CPU, <3GB RAM

## Mantenimiento Recomendado

### Diario
- Verificar logs de errores
- Monitorear uso de recursos

### Semanal
- Ejecutar optimización de recursos
- Revisar backups
- Actualizar imagen Docker si hay cambios

### Mensual
- Limpiar backups antiguos manualmente
- Revisar y ajustar límites de recursos según uso
- Actualizar dependencias

## Notas de Seguridad

1. **Siempre** usar HTTPS en producción (configurar reverse proxy)
2. **Nunca** exponer puertos de base de datos a internet
3. **Mantener** las credenciales en archivos .env seguros
4. **Configurar** firewall del NAS apropiadamente
5. **Habilitar** 2FA en Synology DSM

## Soporte

Para problemas o preguntas:
1. Revisar logs en `/volume1/docker/ai-service/logs/`
2. Verificar estado con `system-monitor.sh`
3. Consultar métricas en `http://NAS_IP:9090/metrics`
4. Revisar documentación en `CENTRO_COMUNICACION.md`