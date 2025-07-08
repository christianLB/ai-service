# CLAUDE.md - Communication Protocol

## 🎯 LECTURA OBLIGATORIA AL INICIAR CADA SESIÓN

**IMPORTANTE**: Siempre leer este documento al comenzar cualquier sesión de trabajo.

## 🚀 POLÍTICA DE OPERACIONES: ÚNICAMENTE COMANDOS MAKE

### ⚠️ IMPORTANTE - NUEVA POLÍTICA OBLIGATORIA (2025-07-08)

**TODAS las operaciones del proyecto DEBEN ser manejadas EXCLUSIVAMENTE a través de comandos `make`.**

### PROHIBIDO:
- ❌ Ejecutar comandos directos de Docker, npm, python, etc.
- ❌ Modificar archivos de configuración sin usar make
- ❌ Ejecutar scripts o comandos fuera del sistema make
- ❌ Crear soluciones temporales que no estén en los Makefiles

### OBLIGATORIO:
- ✅ Usar SIEMPRE comandos make para CUALQUIER operación
- ✅ Si un comando make falla, DEPURARLO hasta que funcione
- ✅ Si falta un comando make, CREARLO en el Makefile correspondiente
- ✅ Verificar configuración con `.make.env` antes de ejecutar

### 📋 Comandos Make Principales:

```bash
# ATAJOS RÁPIDOS (más usados)
make prod          # Ver estado de producción
make dev           # Ver estado de desarrollo  
make st            # Status ultra-rápido
make 911           # Guía de emergencia
make help-all      # Ver TODOS los comandos disponibles

# DESARROLLO
make dev-up        # Levantar ambiente local
make dev-down      # Detener ambiente local
make dev-test      # Ejecutar tests
make dev-reset-db  # Reset base de datos local

# PRODUCCIÓN (requiere credenciales SSH)
make prod-status   # Estado completo del sistema
make prod-backup   # Crear backup con timestamp
make restart-service # Reiniciar servicio AI
make prod-logs     # Ver logs de producción

# VALIDACIÓN Y DEPLOY
make validate-deploy # Validación pre-deploy
make compare-all    # Comparar dev vs prod
make deploy        # Deploy a producción (con validaciones)

# EMERGENCIAS
make prod-emergency-stop    # Detener TODO inmediatamente
make prod-emergency-restore # Restaurar último backup
make fix                    # Fix rápido de schema
```

### 🔧 Configuración Requerida:

Crear archivo `.make.env` con:
```bash
# Credenciales SSH para el NAS
export SSHPASS=tu_password_ssh
export SUDO_PASS=tu_password_sudo

# Configuración del NAS
NAS_HOST=192.168.1.11
NAS_USER=k2600x
NAS_PATH=/volume1/docker/ai-service
```

### 📁 Estructura de Makefiles:

- `Makefile` - Principal con atajos y comandos base
- `Makefile.production` - Operaciones de producción
- `Makefile.development` - Operaciones de desarrollo
- `Makefile.multi-env` - Comandos multi-ambiente
- `Makefile.compare` - Herramientas de comparación
- `Makefile.quick` - Comandos de emergencia
- `Makefile.migrations` - Sistema de migraciones

### 🚨 Protocolo de Depuración:

Si un comando make falla:

1. **NO ejecutar comandos alternativos**
2. **Verificar** `.make.env` existe y tiene credenciales
3. **Revisar** el Makefile correspondiente
4. **Depurar** el comando hasta que funcione
5. **Documentar** la solución si es recurrente

### 💡 Ejemplos de Uso:

```bash
# Flujo típico de desarrollo
make dev-up        # Levantar servicios
make dev-status    # Verificar estado
make dev-test      # Ejecutar tests
make dev-down      # Detener al terminar

# Flujo de deploy a producción
make validate-deploy  # Validar cambios
make prod-backup      # Backup preventivo
make deploy           # Aplicar cambios
make prod-status      # Verificar resultado

# Manejo de problemas
make 911              # Ver guía de emergencia
make prod-logs        # Revisar logs
make fix              # Aplicar fixes rápidos
```

## 🚨 METODOLOGÍA DE DESARROLLO OBLIGATORIA

### PROHIBIDO:
- ❌ Deploy sin análisis completo
- ❌ Fixes reactivos en producción  
- ❌ "Probar" en producción
- ❌ Desarrollo sin tests
- ❌ Ejecutar comandos fuera del sistema make
- ❌ Soluciones temporales sin documentar en Makefiles

### OBLIGATORIO:
- ✅ Usar EXCLUSIVAMENTE comandos make para TODAS las operaciones
- ✅ Leer `METODOLOGIA_DESARROLLO.md` antes de cualquier cambio
- ✅ Seguir proceso: Análisis → Diseño → Testing → Deploy
- ✅ Validación completa pre-deploy con `make validate-deploy`
- ✅ Tests automáticos con `make dev-test`

**OBJETIVO**: Zero errores en producción

---

## 📋 Centro de Comunicación Principal

### Documento Maestro: `CENTRO_COMUNICACION.md`

**SIEMPRE consultar antes de hacer cambios importantes:**

1. **Estado actual del proyecto** - Línea 29-108
2. **Capacidades vs necesidades** - Línea 401-442  
3. **Próximos pasos** - Línea 623-642
4. **Feedback del usuario** - Línea 669-689

### Protocolo de Actualización

Después de cada cambio significativo:

1. **Actualizar** sección correspondiente en `CENTRO_COMUNICACION.md`
2. **Documentar** en "Registro de Cambios" (línea 578+)
3. **Notificar** cambios importantes al usuario

---

## 🚀 Objetivos Estratégicos Actuales

### Meta Principal: **EXTENSIÓN ULTRA PODEROSA DEL CEREBRO HUMANO**

#### Prioridades Inmediatas (2-3 semanas):

1. **Versión Productiva** - Integraciones reales (OpenAI + PostgreSQL)
2. **Comunicación Total** - Bots multi-plataforma 
3. **Cerebro de Datos** - Ingesta y clasificación automática
4. **Plataforma Financiera** - Métricas de negocio

#### Criterios de Decisión:

- ❓ **¿Genera ingresos?** - Prioridad alta
- ❓ **¿Amplifica capacidades cognitivas?** - Prioridad alta  
- ❓ **¿Mejora comunicación?** - Prioridad media
- ❓ **¿Es solo técnico?** - Prioridad baja

---

## 📡 Canales de Comunicación

### Estado Actual:
- ✅ **Este documento** - Centro de comunicación
- ✅ **CENTRO_COMUNICACION.md** - Estado del proyecto
- ⏳ **Telegram Bot** - Alertas inmediatas
- ⏳ **Slack Integration** - Notificaciones
- ⏳ **Email Reports** - Reportes automáticos

### Protocolo de Emergencia:

Si hay problemas críticos:

1. **Actualizar** `CENTRO_COMUNICACION.md` inmediatamente
2. **Documentar** en sección "🚨 Alertas" 
3. **Crear** todo item con prioridad "high"

---

## 🔄 Flujo de Trabajo Estándar

### Para Cada Sesión:

1. **Leer** `CLAUDE.md` (este archivo)
2. **Verificar** `.make.env` existe y está configurado
3. **Ejecutar** `make st` o `make prod` para ver estado actual
4. **Consultar** `CENTRO_COMUNICACION.md` 
5. **Revisar** todos pendientes
6. **Actualizar** progress según corresponda

### Para Cambios Importantes:

1. **Planificar** con TodoWrite
2. **Implementar** paso a paso usando comandos make
3. **Validar** con `make validate-deploy`
4. **Documentar** en `CENTRO_COMUNICACION.md`
5. **Comunicar** al usuario

---

## 📊 KPIs de Comunicación

### Métricas de Seguimiento:

- **Frecuencia de updates** - Diario mínimo
- **Tiempo de respuesta** - < 24h para issues críticos
- **Documentación actualizada** - 100% sincronización
- **Comunicación proactiva** - Reportes semanales

### Alertas Automáticas:

- **Errores críticos** - Inmediato
- **Cambios arquitecturales** - Dentro de 1h
- **Nuevas funcionalidades** - Diario
- **Métricas de negocio** - Semanal

---

## 🎯 Próximos Hitos

### Semana 1-2: Producción
- [ ] OpenAI API real
- [ ] PostgreSQL setup  
- [ ] Docker production
- [ ] Telegram bot

### Semana 3-4: Cerebro
- [ ] Document ingestion
- [ ] Auto-categorización
- [ ] Knowledge retrieval
- [ ] Multi-platform communication

### Mes 2: Negocio
- [ ] Financial metrics
- [ ] Market analysis
- [ ] Revenue tracking
- [ ] Growth automation

---

**Última actualización**: 2025-07-08  
**Próxima revisión**: Cada inicio de sesión

---

### 📝 Notas para Claude:

- **SIEMPRE** usar comandos make para CUALQUIER operación
- **NUNCA** ejecutar comandos directos (docker, npm, python, etc.)
- **DEPURAR** comandos make hasta que funcionen correctamente
- **SIEMPRE** consultar `CENTRO_COMUNICACION.md` antes de tomar decisiones arquitecturales
- **NUNCA** implementar cambios importantes sin documentar
- **COMUNICAR** proactivamente el progreso al usuario
- **PRIORIZAR** funcionalidades que generen ingresos o amplíen capacidades cognitivas
- **NUNCA** se sugiere hacer cambios directamente en producción. Producción es para desplegar y nada más
- **Si falta un comando make**, crearlo en el Makefile correspondiente antes de proceder