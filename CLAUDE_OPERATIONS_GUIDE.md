# 🤖 CLAUDE OPERATIONS GUIDE - Guía Completa de Operaciones

## 📋 Índice de Contenidos

1. [Configuración Inicial](#configuración-inicial)
2. [Operaciones Diarias](#operaciones-diarias)
3. [Deployment y Sincronización](#deployment-y-sincronización)
4. [Monitoreo y Logs](#monitoreo-y-logs)
5. [Gestión de Base de Datos](#gestión-de-base-de-datos)
6. [Emergencias y Troubleshooting](#emergencias-y-troubleshooting)
7. [Comandos Faltantes Propuestos](#comandos-faltantes-propuestos)

---

## 🚀 Configuración Inicial

### Pre-requisitos

1. **Verificar archivo `.make.env`**:
```bash
make setup  # Crea .make.env si no existe
```

2. **Contenido requerido en `.make.env`**:
```bash
# Credenciales SSH
export SSHPASS=password_ssh_del_nas
export SUDO_PASS=password_sudo_del_nas

# Configuración del NAS
NAS_HOST=192.168.1.11
NAS_USER=k2600x
NAS_PATH=/volume1/docker/ai-service
```

3. **Verificar conexión**:
```bash
make test-connection  # Verifica SSH al NAS
```

---

## 📅 Operaciones Diarias

### Inicio del Día

```bash
# 1. Ver estado general
make st              # Status ultra-rápido
make prod            # Estado detallado de producción
make dev             # Estado de desarrollo

# 2. Verificar servicios críticos
make prod-status     # Estado completo del sistema
make prod-health     # Health check detallado
make dashboard-check # Verificar dashboard financiero

# 3. Revisar logs recientes
make logs            # Logs del servicio AI
make logs-postgres   # Logs de PostgreSQL
```

### Durante el Desarrollo

```bash
# Desarrollo local
make dev-up          # Levantar ambiente
make dev-test        # Ejecutar tests
make dev-typecheck   # Verificar tipos
make dev-lint        # Ejecutar linter

# Comparación dev vs prod
make compare-all     # Todas las comparaciones
make diff-schema     # Solo schemas
make diff-counts     # Solo conteo de registros
```

---

## 🚢 Deployment y Sincronización

### Flujo de Deploy Seguro

```bash
# 1. PRE-DEPLOY: Validación completa
make validate-deploy      # Validación automática
make compare-all          # Comparar ambientes
make prod-backup          # Backup preventivo

# 2. DEPLOY
make deploy               # Deploy completo con validaciones

# 3. POST-DEPLOY: Verificación
make prod-status          # Estado del sistema
make dashboard-check      # Verificar funcionalidad
make prod-logs           # Revisar logs por errores
```

### Sincronización de Base de Datos

```bash
# Generar SQL de sincronización
make sync-schema          # Genera SQL para sincronizar schemas

# Aplicar cambios específicos
make ssh-apply-sql FILE=migrations/fix.sql

# Verificar sincronización
make diff-schema          # Comparar schemas
make diff-tables          # Comparar estructura
```

---

## 📊 Monitoreo y Logs

### Comandos de Monitoreo

```bash
# Estado general
make status ENV=production    # Estado del ambiente
make health ENV=production    # Health check detallado

# Logs en tiempo real
make logs                     # Logs del servicio AI
make logs-postgres           # Logs de PostgreSQL

# Logs con parámetros (propuesto)
make logs LINES=100 FOLLOW=true GREP="error"
```

### Verificaciones de Salud

```bash
# Verificaciones rápidas
make check-db            # Conexión a BD
make db-tables           # Listar tablas
make check-migrations    # Migraciones pendientes

# Dashboard
make dashboard-check     # API financiera
```

---

## 🗄️ Gestión de Base de Datos

### Operaciones Básicas

```bash
# Conexión directa
make db-shell            # Shell psql interactiva
make db ENV=production   # Atajo rápido

# Información
make db-tables           # Listar tablas financial
make schema-dump         # Exportar schema actual
```

### Migraciones

```bash
# Sistema Alembic
make migrate-create NAME="agregar_columna_balance"
make migrate-up          # Aplicar migraciones
make migrate-down        # Revertir última
make migrate-status      # Ver estado

# Migraciones manuales
make apply-financial-migration
make ssh-apply-sql FILE=fix.sql
```

### Backups y Restore

```bash
# Crear backup
make prod-backup         # Con timestamp automático
make backup ENV=production

# Listar backups
make prod-backup-list

# Restaurar
make prod-restore FILE=backup_20250101_120000.sql.gz
```

---

## 🚨 Emergencias y Troubleshooting

### Guía Rápida de Emergencias

```bash
make 911                 # Ver guía completa de emergencias
```

### Comandos de Emergencia

```bash
# DETENER TODO
make prod-emergency-stop

# Restaurar último backup
make prod-emergency-restore

# Rollback completo
make prod-rollback

# Fixes rápidos
make fix                 # Fix schema financiero
make fix-balance         # Fix columna balance
make quick-fix           # Fix account_insights
```

### Troubleshooting Common Issues

#### 1. Servicio no responde
```bash
make prod-status         # Ver estado
make restart-service     # Reiniciar servicio
make prod-logs          # Ver logs para errores
```

#### 2. Error de base de datos
```bash
make check-db           # Verificar conexión
make db-shell           # Conectar manualmente
make prod-backup        # Backup preventivo
make fix                # Aplicar fixes conocidos
```

#### 3. Deploy fallido
```bash
make prod-logs          # Ver qué falló
make prod-rollback      # Revertir cambios
make prod-restore FILE=ultimo_backup.sql.gz
```

---

## 🆕 Comandos Faltantes Propuestos

### 1. Gestión de Secrets y Credenciales

```makefile
# Makefile.security
make secrets-validate    # Validar .env files
make secrets-rotate      # Rotar credenciales
make secrets-audit       # Auditar accesos
make env-check          # Verificar variables requeridas
```

### 2. Monitoreo Avanzado

```makefile
# Makefile.monitoring
make metrics            # Ver métricas de performance
make alerts-setup       # Configurar alertas
make resource-usage     # Uso de CPU/memoria/disco
make performance-check  # Análisis de performance
make doctor            # Verificación completa del sistema
```

### 3. Gestión de Docker

```makefile
# Makefile.docker
make docker-cleanup     # Limpiar imágenes/volúmenes huérfanos
make docker-stats       # Estadísticas de contenedores
make volume-backup      # Backup de volúmenes
make image-scan        # Escaneo de vulnerabilidades
make registry-push     # Push a registry privado
```

### 4. Networking y Conectividad

```makefile
# Makefile.network
make network-test      # Test de conectividad
make port-check        # Verificar puertos abiertos
make firewall-status   # Estado del firewall
make ssl-check        # Verificar certificados SSL
```

### 5. Automatización y CI/CD

```makefile
# Makefile.ci
make ci-validate      # Validación para CI
make pre-commit       # Hooks pre-commit
make post-deploy      # Acciones post-deploy
make smoke-test       # Tests de humo
```

---

## 📝 Mejores Prácticas

### 1. Siempre usar comandos make
```bash
# ❌ NUNCA
docker exec -it ai-postgres psql

# ✅ SIEMPRE
make db-shell
```

### 2. Validar antes de deploy
```bash
# Flujo correcto
make validate-deploy
make prod-backup
make deploy
```

### 3. Monitorear después de cambios
```bash
# Post-deploy
make prod-status
make prod-logs
make dashboard-check
```

### 4. Documentar comandos nuevos
Si necesitas un comando que no existe:
1. Créalo en el Makefile correspondiente
2. Documéntalo con comentarios
3. Agrégalo al help
4. Pruébalo antes de usar en producción

---

## 🔧 Configuración de Parámetros

### Propuesta de sintaxis mejorada

```bash
# Logs con opciones
make logs LINES=200 FOLLOW=true GREP="error|warning"

# Backup con opciones
make backup COMPRESS=true RETENTION=7 DESTINATION=s3

# Deploy con opciones
make deploy DRY_RUN=true SKIP_TESTS=false SKIP_BACKUP=false

# Status con formato
make status FORMAT=json VERBOSE=true
```

---

## 📚 Referencias Rápidas

- `make help-all` - Ver TODOS los comandos disponibles
- `make -f Makefile.production help` - Comandos de producción
- `make -f Makefile.development help` - Comandos de desarrollo
- `make -f Makefile.compare help` - Comandos de comparación
- `make -f Makefile.quick help` - Comandos rápidos

---

**Última actualización**: 2025-07-08  
**Mantenido por**: Claude AI Assistant