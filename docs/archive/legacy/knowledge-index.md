# 📚 AI Service - Knowledge Base Index

## 📖 Guía de Navegación

Esta es la base de conocimiento completa del proyecto AI Service, organizada por categorías para facilitar su consulta y mantenimiento.

---

## 🏗️ Architecture (Arquitectura)

Documentos relacionados con la arquitectura del sistema, decisiones técnicas y estructura general.

- **[ARQUITECTURA_SCHEMA.md](./architecture/ARQUITECTURA_SCHEMA.md)** - Arquitectura de base de datos y schema
- **[INFRASTRUCTURE.md](./architecture/INFRASTRUCTURE.md)** - Infraestructura y componentes del sistema

---

## 💻 Development (Desarrollo)

Metodologías, procesos y guías para el desarrollo del proyecto.

- **[METODOLOGIA_DESARROLLO.md](./development/METODOLOGIA_DESARROLLO.md)** - Metodología profesional obligatoria
- **[ANALISIS_ESTRATEGICO.md](./ANALISIS_ESTRATEGICO.md)** - Análisis estratégico del proyecto

---

## 🚀 Deployment (Despliegue)

Todo lo relacionado con el deployment, configuración y puesta en producción.

- **[DEPLOYMENT_SYNOLOGY.md](./deployment/DEPLOYMENT_SYNOLOGY.md)** - Deploy en Synology NAS
- **[SYNOLOGY_DEPLOYMENT.md](./deployment/SYNOLOGY_DEPLOYMENT.md)** - Guía específica de Synology
- **[PORTAINER_FINAL_SETUP.md](./deployment/PORTAINER_FINAL_SETUP.md)** - Setup definitivo de Portainer
- **[PORTAINER_SETUP.md](./deployment/PORTAINER_SETUP.md)** - Configuración inicial de Portainer
- **[PRODUCTION_DIAGNOSIS.md](./deployment/PRODUCTION_DIAGNOSIS.md)** - Diagnóstico de producción
- **[PRODUCTION_SETUP.md](./deployment/PRODUCTION_SETUP.md)** - Setup de producción
- **[REGLAS_DEPLOYMENT.md](./deployment/REGLAS_DEPLOYMENT.md)** - Reglas críticas de deployment
- **[ENV_FILE_FIX.md](./deployment/ENV_FILE_FIX.md)** - Fix de archivos de entorno
- **[ENV_SETUP.md](./deployment/ENV_SETUP.md)** - Setup de variables de entorno

---

## 📡 Communication (Comunicación)

Integraciones de comunicación, bots y notificaciones.

- **[TELEGRAM_BOT_SETUP.md](./communication/TELEGRAM_BOT_SETUP.md)** - Setup del bot de Telegram
- **[TELEGRAM_SETUP.md](./communication/TELEGRAM_SETUP.md)** - Configuración de Telegram
- **[TELEGRAM_SLACK_INTEGRATION.md](./communication/TELEGRAM_SLACK_INTEGRATION.md)** - Integración Telegram-Slack

---

## ⚙️ Systems (Sistemas)

Sistemas específicos implementados en el proyecto.

### Financial System
- **[financial-system/TECHNICAL_MANUAL.md](./systems/financial-system/TECHNICAL_MANUAL.md)** - Manual técnico
- **[financial-system/USER_GUIDE.md](./systems/financial-system/USER_GUIDE.md)** - Guía de usuario
- **[financial-system/CATEGORIZATION_SYSTEM.md](./systems/financial-system/CATEGORIZATION_SYSTEM.md)** - Sistema de categorización
- **[financial-system/IMPLEMENTATION_LOG.md](./systems/financial-system/IMPLEMENTATION_LOG.md)** - Log de implementación

### Next Steps
- **[next steps/GO_CARDLESS_INTEGRATION.md](./systems/next\ steps/GO_CARDLESS_INTEGRATION.md)** - Integración GoCardless

### Monitoring & Dashboard
- **[DASHBOARD_PREVIEW.md](./systems/DASHBOARD_PREVIEW.md)** - Preview del dashboard
- **[MONITORS.md](./systems/MONITORS.md)** - Sistema de monitoreo

---

## 🚧 Projects (Proyectos)

Proyectos específicos en desarrollo o planificación.

### Document Intelligence System
- **[document-intelligence-system/document-intelligence-scope-definition-v2.md](./projects/document-intelligence-system/document-intelligence-scope-definition-v2.md)** - Definición de alcance v2
- **[document-intelligence-system/action-plan-mvp-sprint.md](./projects/document-intelligence-system/action-plan-mvp-sprint.md)** - Plan de acción MVP

### General
- **[PROPUESTA_TRABAJO_HOY.md](./projects/PROPUESTA_TRABAJO_HOY.md)** - Propuesta de trabajo actual

---

## 📋 Core Documents (Documentos Centrales)

Documentos que deben mantenerse en la raíz por su importancia central:

- **[../CLAUDE.md](../CLAUDE.md)** - Protocolo de comunicación con Claude (OBLIGATORIO LEER)
- **[../CENTRO_COMUNICACION.md](../CENTRO_COMUNICACION.md)** - Centro de comunicación principal
- **[../README.md](../README.md)** - Documentación principal del proyecto

---

## 🔍 Cómo Usar Esta Base de Conocimiento

### Para Desarrolladores
1. **Siempre leer**: `../CLAUDE.md` antes de empezar cualquier sesión
2. **Consultar**: `development/METODOLOGIA_DESARROLLO.md` antes de hacer cambios
3. **Verificar**: `deployment/REGLAS_DEPLOYMENT.md` antes de desplegar

### Para Nuevos Contribuidores
1. Empezar por `../README.md`
2. Leer `architecture/` para entender la estructura
3. Revisar `systems/` para entender los componentes existentes

### Para Troubleshooting
1. `deployment/PRODUCTION_DIAGNOSIS.md` para problemas de producción
2. `systems/MONITORS.md` para problemas de monitoreo
3. `communication/` para problemas de integración

---

## 📝 Mantenimiento de la Documentación

### Reglas
- **Actualizar** este índice cuando se agreguen nuevos documentos
- **Mantener** la estructura de directorios limpia
- **No duplicar** información entre documentos
- **Archivar** documentos obsoletos en lugar de eliminarlos

### Estructura de Directorios
```
knowledge/
├── INDEX.md (este archivo)
├── architecture/     # Arquitectura y estructura
├── development/      # Metodologías y procesos
├── deployment/       # Deploy y configuración
├── communication/    # Integraciones de comunicación
├── systems/         # Sistemas específicos
├── projects/        # Proyectos en desarrollo
└── archive/         # Documentos obsoletos (futuro)
```

---

**Última actualización**: 2025-07-04  
**Mantenido por**: AI Assistant  
**Versión**: 1.0