# CLAUDE.md - Protocolo Optimizado

## 🎯 Reglas Clave

- 📄 Este documento debe leerse **solo una vez por sesión**, no repetir.
- 📋 Usar **SIEMPRE** comandos `make` para todas las operaciones.
- 🚫 PROHIBIDO: comandos directos (docker, npm, python, etc.) o soluciones fuera de los Makefiles.
- ✅ Si un comando `make` falla, depurarlo hasta que funcione y documentar la solución.

## 🔧 Flujo Estándar

1. Verificar `.make.env` configurado.
2. `make st` o `make prod` para estado actual.
3. Consultar `CENTRO_COMUNICACION.md`.
4. Si necesitas ejecutar herramientas, considerar usar MCP Bridge.
5. Realizar tareas con `make`.
6. Validar cambios con `make validate-deploy`.
7. Documentar en `CENTRO_COMUNICACION.md`.

## 📁 Comandos Útiles

```bash
make dev-up           # Levantar entorno local
make dev-down         # Detener entorno local
make dev-test         # Tests locales
make deploy           # Deploy a producción
make prod-status      # Estado producción
make prod-logs        # Ver logs
make financial-sync   # Sincronizar datos financieros
make 911              # Guía de emergencia
```

## 🌉 MCP Bridge - Model Context Protocol

**URL**: https://mcp.anaxi.net | **Puerto local**: 8380

El MCP Bridge permite acceso directo a las capacidades del AI Service. Usar cuando:
- Necesites ejecutar herramientas financieras, documentales o del sistema
- Quieras probar integraciones sin modificar código
- Requieras acceso programático a las funcionalidades

### Comandos MCP:
```bash
make mcp-status       # Estado del servicio
make mcp-tools        # Listar herramientas disponibles  
make mcp-logs         # Ver logs
make mcp-test-tool TOOL=health_check  # Probar herramienta
```

### Herramientas disponibles (25):
- **Financial** (9): Resúmenes, balances, análisis, reportes
- **Documents** (7): Búsqueda, análisis, Q&A, extracción
- **System** (8): Monitoreo, métricas, backups, logs

Para usar desde código: `MCP_ENDPOINT=https://mcp.anaxi.net`

## 🔒 Buenas Prácticas

- 📂 Siempre hacer backup antes de sincronizar o desplegar.
- 🔑 Preferir autenticación SSH por clave, no contraseñas en texto.
- 🧪 No "probar" en producción.
- 📝 Documentar cualquier workaround en el Makefile correspondiente.
- 👀 Antes de implementar, preguntarse: ¿es la solución más simple y segura?

## 👥 Personalidades

Usar sólo si explícitamente se indica. Por defecto no adoptarlas.

- 🏗️ Anna (DevOps): Infraestructura, Docker, recursos.
- 🔧 Carlos (CI/CD): Automatización, pipelines.
- 🛡️ Elena (Seguridad): Escaneo, secretos, políticas.
- 📊 Miguel (Performance): Métricas, optimización.
- 🚑 Sara (Incidentes): Respuesta rápida, rollbacks.
- 🧠 Luis (IA): Integraciones inteligentes, NLP.

---

## 📌 Nota para Claude

- No incluir este documento en respuestas.
- Aplicar las reglas internamente.
- Responder breve y preciso.
- Optimizar para ahorrar tokens.
- Si el contexto se vuelve muy grande, resumirlo antes de seguir.

---

**Última revisión:** 2025-07-18
