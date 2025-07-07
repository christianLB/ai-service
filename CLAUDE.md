# CLAUDE.md - Communication Protocol

## 🎯 LECTURA OBLIGATORIA AL INICIAR CADA SESIÓN

**IMPORTANTE**: Siempre leer este documento al comenzar cualquier sesión de trabajo.

## 🚀 COMANDOS OPTIMIZADOS PARA CLAUDE

### Comandos Personalizados Disponibles:

Los siguientes comandos están disponibles directamente en Claude para desarrollo eficiente:

- `/dev` - Iniciar desarrollo completo (verifica Docker y levanta servicios)
- `/test` - Ejecutar tests y validación de tipos
- `/validate` - Validación completa del proyecto (secrets, tipos, tests, build)
- `/status` - Ver estado completo del sistema
- `/deploy [env]` - Deploy con validaciones (development/production)
- `/db [env] [type]` - Conectar a base de datos
- `/logs [service] [lines]` - Ver logs de servicios
- `/secrets <action> [env]` - Gestionar secrets de forma segura
- `/quick-fix <issue>` - Soluciones rápidas a problemas comunes

### Uso de Comandos:

```bash
# Iniciar desarrollo
/dev

# Ver estado del sistema
/status

# Ejecutar validación completa
/validate

# Ver logs del servicio AI
/logs ai-service 100

# Gestionar secrets
/secrets init production
/secrets switch development
/secrets audit

# Solucionar problemas comunes
/quick-fix ports    # Liberar puertos
/quick-fix docker   # Reiniciar Docker
/quick-fix cache    # Limpiar cache
/quick-fix deps     # Reinstalar dependencias
```

## 🚨 NUEVA METODOLOGÍA OBLIGATORIA (2025-07-04)

### PROHIBIDO:
- ❌ Deploy sin análisis completo
- ❌ Fixes reactivos en producción  
- ❌ "Probar" en producción
- ❌ Desarrollo sin tests

### OBLIGATORIO:
- ✅ Leer `METODOLOGIA_DESARROLLO.md` antes de cualquier cambio
- ✅ Seguir proceso: Análisis → Diseño → Testing → Deploy
- ✅ Validación completa pre-deploy
- ✅ Tests automáticos para todo

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
2. **Consultar** `CENTRO_COMUNICACION.md` 
3. **Revisar** todos pendientes
4. **Actualizar** progress según corresponda

### Para Cambios Importantes:

1. **Planificar** con TodoWrite
2. **Implementar** paso a paso
3. **Documentar** en `CENTRO_COMUNICACION.md`
4. **Comunicar** al usuario

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

**Última actualización**: 2025-07-02  
**Próxima revisión**: Cada inicio de sesión

---

### 📝 Notas para Claude:

- **SIEMPRE** consultar `CENTRO_COMUNICACION.md` antes de tomar decisiones arquitecturales
- **NUNCA** implementar cambios importantes sin documentar
- **COMUNICAR** proactivamente el progreso al usuario
- **PRIORIZAR** funcionalidades que generen ingresos o amplíen capacidades cognitivas
- **NUNCA** se sugiere hacer cambios directamente en producción. Producción es para desplegar y nada más