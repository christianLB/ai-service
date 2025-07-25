# 📚 Documentación del Makefile - AI Service

## 🎯 ¿Qué es y para qué sirve?

El Makefile es una herramienta que **simplifica y estandariza** los comandos de desarrollo. En lugar de recordar comandos largos y complejos, usas comandos cortos y descriptivos.

### Beneficios Clave:

1. **Velocidad**: Comandos cortos (`make dev` vs `npm run dev:full`)
2. **Consistencia**: Todos usan los mismos comandos
3. **Documentación Viva**: `make help` siempre muestra comandos actualizados
4. **Menos Errores**: Comandos probados y validados
5. **Flujos Complejos**: Un comando puede ejecutar múltiples acciones

## 📋 Comandos Disponibles

### 🚀 Desarrollo

| Comando | Descripción | Equivalente |
|---------|-------------|-------------|
| `make dev` | Desarrollo completo (backend + frontend) | `npm run dev:full` |
| `make dev-backend` | Solo backend | `npm run dev` |
| `make dev-frontend` | Solo frontend | `npm run dev:frontend` |

### 🐳 Docker

| Comando | Descripción |
|---------|-------------|
| `make up` | Levantar todos los servicios |
| `make down` | Detener servicios |
| `make rebuild` | Reconstruir sin cache |
| `make logs` | Ver logs de todos los servicios |
| `make logs-ai` | Ver solo logs del AI Service |

### 🧪 Testing y Validación

| Comando | Descripción |
|---------|-------------|
| `make test` | Ejecutar todos los tests |
| `make test-watch` | Tests en modo watch |
| `make test-coverage` | Tests con reporte de cobertura |
| `make validate` | Validación completa (tipos + tests + esquemas) |
| `make typecheck` | Solo verificar tipos TypeScript |

### 🏗️ Build y Deploy

| Comando | Descripción |
|---------|-------------|
| `make build` | Construir para producción |
| `make predeploy` | Preparar para deployment |
| `make deploy-check` | Verificar si está listo |

### 🔧 Utilidades

| Comando | Descripción |
|---------|-------------|
| `make shell` | Entrar al contenedor del servicio |
| `make shell-db` | Conectar a PostgreSQL |
| `make redis-cli` | Conectar a Redis |
| `make health` | Verificar salud de servicios |
| `make status` | Estado del sistema y recursos |

### 🎯 Atajos

| Atajo | Comando Completo |
|-------|------------------|
| `make d` | `make dev` |
| `make t` | `make test` |
| `make u` | `make up` |
| `make l` | `make logs-ai` |

## 🔄 Workflows Típicos

### 1. Inicio del Día
```bash
make status      # Ver estado
make up          # Levantar servicios si es necesario
make dev         # Iniciar desarrollo
```

### 2. Durante Desarrollo
```bash
make test        # Después de cambios
make typecheck   # Verificar tipos
make logs-ai     # Si hay errores
```

### 3. Antes de Commit
```bash
make validate    # Validación completa
git add .
git commit -m "feat: nueva funcionalidad"
```

### 4. Preparar Deploy
```bash
make validate
make build
make deploy-check
```

## 🛠️ Personalización

### Agregar un Nuevo Comando

1. Edita el `Makefile`
2. Agrega tu comando siguiendo el formato:

```makefile
mi-comando: ## Descripción de mi comando
	@echo "Ejecutando mi comando..."
	# Comandos bash aquí
```

3. El comando aparecerá automáticamente en `make help`

### Variables de Entorno

Puedes pasar variables:
```bash
make ingest FILE=documento.pdf
```

## 🚨 Solución de Problemas

### "make: command not found"
```bash
# En Ubuntu/Debian
sudo apt-get install make

# En macOS
brew install make
```

### Comando no funciona
1. Verifica con `make help` que existe
2. Revisa que tengas los permisos necesarios
3. Algunos comandos requieren que Docker esté corriendo

## 💡 Tips Pro

1. **Tab completion**: Muchos shells soportan autocompletado con Tab
2. **Dry run**: Usa `make -n comando` para ver qué se ejecutaría
3. **Verbose**: Usa `make V=1 comando` para ver todos los detalles
4. **Parallel**: Algunos comandos pueden ejecutarse en paralelo con `make -j4`

## 📝 Notas Importantes

- El Makefile está en la raíz del proyecto
- Los comandos están diseñados para el entorno de desarrollo local
- Algunos comandos (como `reset-db`) son destructivos y piden confirmación
- Los colores en la salida ayudan a identificar éxitos (verde) y errores (rojo)

---

**Última actualización**: 2025-01-07  
**Versión**: 1.0.0