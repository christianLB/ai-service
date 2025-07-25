# Guía de Uso de SuperClaude para AI Service

## 🎯 Introducción

SuperClaude es un framework que extiende las capacidades de Claude Code, proporcionando comandos especializados, personas cognitivas y optimización significativa en el uso de tokens. Esta guía está diseñada para el equipo de desarrollo del AI Service.

## 📋 Estado de la Integración

- **Fecha de instalación**: 2025-07-19
- **Versión**: 3.0.0
- **Rama**: `feature/superclaude-integration`
- **Estado**: En evaluación experimental

## 🚀 Cómo Usar SuperClaude

### Comandos Básicos

SuperClaude añade comandos slash que comienzan con `/sc:`. Estos comandos están optimizados para tareas específicas de desarrollo.

### 🛠️ Comandos de Desarrollo

#### `/sc:implement <descripción>`
Úsalo para implementar nuevas funcionalidades completas.

**Ejemplo**:
```
/sc:implement añadir endpoint de autenticación OAuth2 con Google
```

#### `/sc:build`
Para compilar o empaquetar el proyecto. NO es para implementar features (usa `/sc:implement` para eso).

**Ejemplo**:
```
/sc:build
```

#### `/sc:design <descripción>`
Para diseñar arquitecturas o soluciones antes de implementar.

**Ejemplo**:
```
/sc:design sistema de notificaciones en tiempo real con WebSockets
```

### 🔍 Comandos de Análisis

#### `/sc:analyze <código o archivo>`
Analiza código existente para identificar problemas, patrones o mejoras.

**Ejemplo**:
```
/sc:analyze src/services/financial.service.ts
```

#### `/sc:troubleshoot <problema>`
Diagnostica y resuelve problemas específicos.

**Ejemplo**:
```
/sc:troubleshoot la conexión a PostgreSQL falla intermitentemente
```

#### `/sc:explain <concepto o código>`
Obtén explicaciones detalladas de código o conceptos.

**Ejemplo**:
```
/sc:explain cómo funciona el sistema de categorización con IA
```

### 📈 Comandos de Calidad

#### `/sc:improve <código o archivo>`
Mejora código existente siguiendo mejores prácticas.

**Ejemplo**:
```
/sc:improve src/routes/financial.routes.ts
```

#### `/sc:test <componente>`
Crea o ejecuta tests para componentes específicos.

**Ejemplo**:
```
/sc:test TransactionMatchingService
```

#### `/sc:cleanup <directorio o archivo>`
Limpia y refactoriza código para mejorar mantenibilidad.

**Ejemplo**:
```
/sc:cleanup src/services/
```

### 📝 Otros Comandos Útiles

#### `/sc:document <componente>`
Genera documentación automática.

**Ejemplo**:
```
/sc:document API de financial endpoints
```

#### `/sc:git <operación>`
Operaciones Git avanzadas con mejores mensajes de commit.

**Ejemplo**:
```
/sc:git commit cambios del sistema de matching
```

#### `/sc:task <descripción>`
Gestión de tareas y planificación.

**Ejemplo**:
```
/sc:task planificar migración a microservicios
```

## 🎭 Personas Cognitivas

SuperClaude incluye "personas" especializadas que se activan automáticamente según el contexto:

- 🏗️ **architect**: Diseño de sistemas y arquitectura
- 🎨 **frontend**: UI/UX y accesibilidad
- ⚙️ **backend**: APIs e infraestructura
- 🔍 **analyzer**: Debugging y análisis
- 🛡️ **security**: Seguridad y vulnerabilidades
- ✍️ **scribe**: Documentación
- Y más...

## 💡 Mejores Prácticas

### 1. Usa el Comando Correcto
- Para nuevas features: `/sc:implement`
- Para compilar: `/sc:build`
- Para mejorar código existente: `/sc:improve`

### 2. Sé Específico
Los comandos funcionan mejor con descripciones detalladas:
```
❌ /sc:implement login
✅ /sc:implement sistema de login con JWT, refresh tokens y remember me
```

### 3. Combina Comandos
Puedes usar múltiples comandos en secuencia:
```
1. /sc:design sistema de caché
2. /sc:implement Redis cache service
3. /sc:test Redis cache service
4. /sc:document Redis cache implementation
```

### 4. Aprovecha la Optimización de Tokens
SuperClaude reduce ~70% el uso de tokens. Úsalo para:
- Sesiones largas de desarrollo
- Análisis de código extenso
- Refactoring de módulos grandes

## 📊 Métricas y Evaluación

Durante el período de prueba, evalúa:

1. **Reducción de tokens**: ¿Notas menos consumo en sesiones largas?
2. **Calidad del código**: ¿Los comandos generan mejor código?
3. **Velocidad**: ¿Desarrollas más rápido?
4. **Precisión**: ¿Las respuestas son más específicas?

## ⚠️ Limitaciones Conocidas

1. **Versión inicial** (3.0.0) - Pueden haber bugs
2. **Comandos nuevos** - Requieren `/sc:` prefix
3. **Curva de aprendizaje** - Toma tiempo adaptarse
4. **Sin hooks** - Removidos en v3, volverán en v4

## 🔧 Troubleshooting

### Si un comando no funciona:
1. Verifica la sintaxis: `/sc:comando descripción`
2. Revisa que el comando exista (lista arriba)
3. Intenta ser más específico en la descripción

### Si Claude no reconoce los comandos:
1. Reinicia la sesión de Claude Code
2. Verifica que los archivos estén en `~/.claude/`
3. Confirma con `ls ~/.claude/commands/sc/`

## 📝 Feedback

Documenta tu experiencia:
- ¿Qué comandos son más útiles?
- ¿Qué mejoras sugieres?
- ¿Encontraste bugs o comportamientos extraños?

Comparte en el canal del equipo o actualiza este documento con tus hallazgos.

## 🚀 Próximos Pasos

1. **Semana 1**: Prueba activa de comandos
2. **Semana 2**: Evaluación de métricas
3. **Decisión**: Adoptar, modificar o remover

---

**Autor**: Claude + Christian  
**Fecha**: 2025-07-19  
**Versión del documento**: 1.0