# Sistema de Makefiles - AI Service

## 🚀 Inicio Rápido

```bash
# 1. Configurar ambiente
make setup

# 2. Ver estado de producción
make prod

# 3. Ver todos los comandos
make help-all

# 4. En caso de emergencia
make 911
# 5. Ayuda de desarrollo
make 811
```

## 📁 Estructura

- **Makefile** - Principal, incluye todos los demás
- **Makefile.production** - Comandos para producción (🔴 usar con cuidado)
- **Makefile.development** - Comandos para desarrollo local (🟢 seguros)
- **Makefile.multi-env** - Comandos que funcionan en ambos ambientes (🔵)
- **Makefile.compare** - Comparación dev vs prod (🟡)
- **Makefile.quick** - Atajos y emergencias (⚡)

## 🔐 Configuración

1. Copia `.make.env.example` a `.make.env`
2. Configura tus credenciales (NO las commitees)
3. Los comandos de producción requieren `SSHPASS` y `SUDO_PASS`

## 📋 Comandos Principales

### Producción
```bash
make prod                # Estado de producción
make prod-backup         # Crear backup
make prod-health         # Health check completo
make prod-reset-db       # Reset BD (pide confirmación)
```

### Desarrollo
```bash
make dev                 # Estado local
make dev-up              # Levantar servicios
make dev-reset-db        # Reset BD local
make dev-test            # Ejecutar tests
make dev-build-frontend  # Recompilar frontend
```

### Multi-ambiente
```bash
make status ENV=production     # Estado de cualquier ambiente
make backup ENV=development    # Backup de cualquier ambiente
make apply-sql FILE=x.sql ENV=production
```

### Comparación
```bash
make diff-schema         # Comparar schemas
make validate-deploy     # Validar antes de deploy
make compare-all         # Todas las comparaciones
```

### Emergencia
```bash
make 911                 # Guía de emergencia
make 811                 # Ayuda de desarrollo
make prod-emergency-stop # Detener todo
make prod-rollback       # Rollback completo
```

## ⚠️ Seguridad

- **NUNCA** commitees `.make.env` con credenciales reales
- Los comandos de producción piden confirmación
- Usa `make validate-deploy` antes de deployar
- Siempre haz backup antes de cambios grandes

## 🆘 Troubleshooting

### Error: SSHPASS environment variable not set
```bash
# Asegúrate de tener configurado .make.env
cat .make.env | grep SSHPASS
```

### Error: No se puede conectar al NAS
```bash
# Verifica conectividad
ping 192.168.1.11
ssh usuario@192.168.1.11
```

### Error: Comando no encontrado
```bash
# Asegúrate de estar en el directorio correcto
pwd  # Debe ser /home/k2600x/dev/ai-service

# O especifica el Makefile
make help -f Makefile.production
```