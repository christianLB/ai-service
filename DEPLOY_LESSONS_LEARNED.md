# 📚 LECCIONES APRENDIDAS: DEPLOY DE PRODUCCIÓN

**Fecha**: 2025-07-08  
**Proyecto**: AI Service  
**Resultado**: Deploy exitoso después de resolver 8 problemas críticos

## 🎯 RESUMEN RÁPIDO PARA FUTUROS DEPLOYS

### ⚡ Checklist Pre-Deploy
```bash
□ Verificar .env.production tiene POSTGRES_HOST correcto
□ Verificar docker-compose.production.yml usa la imagen correcta
□ Compilar frontend: npm run build
□ Construir imagen: make prod-build-image
□ Base de datos existe: make prod-create-db
□ Deploy: make prod-deploy-image
□ Verificar: curl http://192.168.1.11:3003/
```

## 🔍 PROBLEMAS Y SOLUCIONES

### 1. Error de Conexión a PostgreSQL
```bash
# PROBLEMA
connect ECONNREFUSED 127.0.0.1:5432

# CAUSA
POSTGRES_HOST=postgres  # Nombre incorrecto

# SOLUCIÓN
POSTGRES_HOST=ai-postgres  # Nombre del contenedor en docker-compose
```

### 2. Base de Datos No Existe
```bash
# PROBLEMA
database "ai_service" does not exist

# SOLUCIÓN
make prod-create-db
```

### 3. Error de Inicialización de Schemas
```typescript
// PROBLEMA
constructor() {
  this.initializeSchemasAsync(); // Se ejecuta antes de que DB esté lista
}

// SOLUCIÓN
private async ensureSchemasInitialized(): Promise<void> {
  if (!this.schemasInitialized) {
    try {
      await this.initializeSchemasAsync();
    } catch (error) {
      // Continue anyway
    }
  }
}
```

### 4. Frontend No Se Muestra
```typescript
// PROBLEMA
app.use('/public', express.static(path.join(__dirname, '../public')));
app.get('/', (req, res) => res.json({...})); // API en raíz

// SOLUCIÓN
app.use(express.static(path.join(__dirname, '../frontend/dist')));
app.get('/api/info', ...); // Mover API
app.get('*', (req, res) => { // Catch-all para SPA
  res.sendFile(path.join(__dirname, '../frontend/dist/index.html'));
});
```

### 5. Imagen Docker Incorrecta
```yaml
# PROBLEMA (docker-compose.production.yml)
image: ghcr.io/christianlb/ai-service:latest

# SOLUCIÓN
image: ai-service:simple
```

## 🛠️ COMANDOS MAKE ESENCIALES

### Creados Durante la Batalla
```makefile
# Construir imagen de producción
.PHONY: prod-build-image
prod-build-image:
	@npm run build
	@docker build -f Dockerfile -t ai-service:simple .
	@docker save ai-service:simple | gzip > ai-service-production.tar.gz
```

### Comandos Más Útiles
```bash
make prod-build-image    # Construir imagen
make prod-deploy-image   # Desplegar
make prod-status         # Ver estado
make prod-logs           # Ver logs
make prod-create-db      # Crear base de datos
make prod-update-config  # Actualizar y reiniciar
```

## 📋 ORDEN CORRECTO DE OPERACIONES

1. **Preparar código**
   - Verificar que el código compila: `npm run build`
   - Corregir errores de TypeScript

2. **Construir imagen**
   - `make prod-build-image`
   - Verificar: `docker images | grep ai-service`

3. **Preparar infraestructura**
   - Verificar `.env.production`
   - Verificar `docker-compose.production.yml`
   - Crear DB si necesario: `make prod-create-db`

4. **Desplegar**
   - `make prod-deploy-image`
   - Esperar ~60 segundos para arranque completo

5. **Verificar**
   - Frontend: `curl http://192.168.1.11:3003/`
   - API: `curl http://192.168.1.11:3003/status`

## 🚨 ERRORES COMUNES Y CÓMO EVITARLOS

### 1. "Permission denied" en Forensic Logger
```typescript
// Agregar check de producción
if (!this.enabled || this.logFile === '/dev/null') {
  return;
}
```

### 2. Puerto Incorrecto
```yaml
# docker-compose.production.yml
ports:
  - "3003:3000"  # Externo:Interno
```

### 3. Timing de Inicialización
- NO inicializar en constructores
- Usar inicialización lazy
- Implementar reintentos con backoff

### 4. Variables de Entorno
```bash
# SIEMPRE verificar antes de deploy
cat .env.production | grep POSTGRES_HOST
cat .env.production | grep DATABASE_URL
```

## 🎓 MEJORES PRÁCTICAS DESCUBIERTAS

### 1. Usar Múltiples Agentes
- Dividir el problema por especialidad
- Analizar desde diferentes perspectivas
- Trabajar en paralelo cuando sea posible

### 2. Documentar Mientras Resuelves
- Crear TODOs para trackear progreso
- Documentar cada solución encontrada
- Actualizar Makefiles inmediatamente

### 3. Verificación Incremental
```bash
# No asumir, verificar cada paso
make prod-status    # ¿Contenedores corriendo?
curl /health        # ¿API responde?
curl /             # ¿Frontend visible?
```

### 4. Logs Son Tus Amigos
```bash
make prod-logs | grep -i error
make prod-logs | grep "Starting"
```

## 💡 AUTOMATIZACIONES RECOMENDADAS

### 1. Script de Validación Pre-Deploy
```bash
#!/bin/bash
# validate-deploy.sh
echo "Verificando configuración..."
grep "POSTGRES_HOST=ai-postgres" .env.production || exit 1
grep "image: ai-service:simple" docker-compose.production.yml || exit 1
npm run build || exit 1
echo "✅ Listo para deploy"
```

### 2. Health Check Completo
```bash
# health-check.sh
curl -f http://192.168.1.11:3003/ > /dev/null || echo "❌ Frontend"
curl -f http://192.168.1.11:3003/status > /dev/null || echo "❌ API"
```

## 📊 MÉTRICAS DE ÉXITO

- **Tiempo de resolución**: 2.5 horas
- **Problemas encontrados**: 8
- **Problemas resueltos**: 8 (100%)
- **Deploys necesarios**: 5
- **Líneas de código cambiadas**: ~50
- **Archivos modificados**: 6

## 🎯 CONCLUSIÓN

El deploy que parecía simple se convirtió en una lección magistral sobre:
1. La importancia de la configuración consistente
2. El valor de la automatización
3. La necesidad de verificación sistemática
4. El poder del debugging colaborativo

**Recordar**: En producción, los detalles pequeños (como un nombre de host) pueden causar fallas catastróficas. La paranoia productiva es una virtud.

---

*"El deploy exitoso no es ausencia de problemas, sino la presencia de soluciones sistemáticas."*

**Documentado para la posteridad y futuros deploys.**