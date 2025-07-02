# 🖥️ AI Service Monitors

Conjunto de monitores en tiempo real para el AI Service que puedes tener abiertos mientras trabajas.

## 🚀 Inicio Rápido

```bash
# 1. Asegúrate que el servicio esté corriendo
node demo-standalone.js

# 2. En otra terminal, inicia un monitor
./start-monitors.sh mini
```

## 📊 Tipos de Monitor

### 1. **Mini Monitor** (`mini`) - ⭐ RECOMENDADO
```bash
./start-monitors.sh mini
```
- **Perfecto para**: Tener abierto en una ventana pequeña mientras trabajas
- **Tamaño**: Compacto (25x8 caracteres)
- **Actualización**: 1 segundo
- **Recursos**: Muy bajo

```
╭─ 🚀 AI SERVICE MONITOR ─╮
│ 1:05:30 AM 🟢 OK          │
├─────────────────────────┤
│ ⏱️  0h2m              │
│ 💾 4.0MB             │
│ 🔥 2 workflows         │
│ 📊 20 requests          │
│ ✅ 2 validated         │
├─────────────────────────┤
│ ⠏ Monitoring... CTRL+C │
╰─────────────────────────╯
```

### 2. **Status Line** (`line`)
```bash
./start-monitors.sh line
```
- **Perfecto para**: Terminal compartida o tmux status line
- **Tamaño**: Una sola línea
- **Actualización**: 2 segundos

```
[1:05:30] 🟢 OK | ⏱️ 0h2m | 💾 4.0MB | 🔥 2 workflows | 📊 20 requests | ✅ 2 validated
```

### 3. **Full Dashboard** (`full`)
```bash
./start-monitors.sh full
```
- **Perfecto para**: Terminal dedicado a monitoreo
- **Características**: Gráficos de tendencia, alertas, histórico
- **Tamaño**: Pantalla completa

### 4. **All in Tmux** (`all`) - 🔥 ESPECTACULAR
```bash
./start-monitors.sh all
```
- **Crea sesión tmux** con 3 monitores simultáneos
- **Panel izquierdo**: Dashboard completo
- **Panel derecho arriba**: Mini monitor
- **Panel derecho abajo**: Status line

## 🎯 Casos de Uso

### Para Desarrollo Diario
```bash
# Ventana pequeña en esquina
./start-monitors.sh mini

# O en tmux status line
./start-monitors.sh line
```

### Para Debugging/Testing
```bash
# Múltiples vistas simultáneas
./start-monitors.sh all
```

### Para Demos/Presentaciones
```bash
# Dashboard completo con gráficos
./start-monitors.sh full
```

## 📈 Métricas Monitoreadas

- **🟢 Status**: OK/ERROR del servicio
- **⏱️ Uptime**: Tiempo desde inicio
- **💾 Memory**: Uso de memoria heap
- **🔥 Workflows**: Total generados
- **📊 Requests**: Requests API totales
- **✅ Validations**: Validaciones ejecutadas

## ⚡ Comandos Útiles

```bash
# Verificar estado rápido
curl http://localhost:3001/status

# Ver métricas JSON
curl http://localhost:3001/api/metrics/json

# Generar workflow (cambia métricas)
curl -X POST http://localhost:3001/api/flow-gen \
  -H "Content-Type: application/json" \
  -d '{"description":"Test workflow"}'

# Detener servicio demo
pkill -f demo-standalone.js

# Matar sesión tmux
tmux kill-session -t ai-monitor
```

## 🔧 Personalización

### Cambiar Puerto
```bash
./start-monitors.sh mini 3000
```

### Modificar Refresh Rate
Edita los archivos directamente:
- `monitor-dashboard.js`: línea `REFRESH_INTERVAL`
- `mini-monitor.js`: línea `REFRESH_INTERVAL`
- `status-line.sh`: línea `sleep 2`

### Colores y Formato
Todos los monitores usan códigos ANSI que puedes personalizar.

## 🚨 Resolución de Problemas

### Monitor no conecta
```bash
# Verificar que el servicio esté corriendo
curl http://localhost:3001/status

# Si no responde, iniciar servicio
node demo-standalone.js
```

### Colores no aparecen
```bash
# Tu terminal debe soportar colores ANSI
export TERM=xterm-256color
```

### Tmux no disponible
```bash
# Instalar tmux
sudo apt install tmux  # Ubuntu/Debian
brew install tmux      # macOS
```

## 🎨 Screenshots

Los monitores incluyen:
- ✅ Iconos de estado en tiempo real
- 📊 Gráficos de barras ASCII
- 🎨 Colores para fácil identificación  
- ⚡ Animaciones de carga
- 🚨 Sistema de alertas

**¡Perfecto para tener abierto todo el tiempo mientras desarrollas!**