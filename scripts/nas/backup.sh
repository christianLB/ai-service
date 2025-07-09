#!/bin/sh

# Script de backup automático para PostgreSQL
# Ejecuta en Alpine Linux con recursos mínimos

set -e

# Configuración
BACKUP_DIR="/backups"
BACKUP_RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-7}"
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
BACKUP_FILE="${BACKUP_DIR}/ai_service_backup_${TIMESTAMP}.sql.gz"

# Función de logging
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1"
}

# Crear directorio si no existe
mkdir -p "${BACKUP_DIR}"

# Realizar backup
log "Iniciando backup de base de datos..."

# Dump con compresión
pg_dump \
    --verbose \
    --no-owner \
    --no-acl \
    --clean \
    --if-exists \
    --format=plain \
    --encoding=UTF8 \
    ai_service | gzip -9 > "${BACKUP_FILE}"

# Verificar tamaño del backup
BACKUP_SIZE=$(du -h "${BACKUP_FILE}" | cut -f1)
log "Backup completado: ${BACKUP_FILE} (${BACKUP_SIZE})"

# Limpiar backups antiguos
log "Limpiando backups antiguos..."
find "${BACKUP_DIR}" \
    -name "ai_service_backup_*.sql.gz" \
    -type f \
    -mtime +${BACKUP_RETENTION_DAYS} \
    -delete

# Listar backups actuales
log "Backups disponibles:"
ls -lh "${BACKUP_DIR}"/ai_service_backup_*.sql.gz 2>/dev/null || echo "No hay backups"

# Crear link al último backup
ln -sf "${BACKUP_FILE}" "${BACKUP_DIR}/latest_backup.sql.gz"

log "Proceso de backup finalizado"

# Configurar cron si es primera ejecución
if [ ! -f /var/spool/cron/crontabs/root ]; then
    echo "${BACKUP_SCHEDULE:-0 2 * * *} /backup.sh >> /var/log/backup.log 2>&1" | crontab -
    log "Cron configurado para backups automáticos"
fi