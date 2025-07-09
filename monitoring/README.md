# Sistema de Monitoreo AI Service

Sistema de monitoreo ligero con overhead mínimo (< 50MB RAM total) para AI Service.

## Componentes

### 1. Dashboard HTML (`dashboard.html`)
- Dashboard visual en tiempo real
- Muestra métricas de CPU, memoria, requests, errores
- Gráficos históricos de recursos
- Sistema de alertas visuales
- Auto-actualización cada 5 segundos

### 2. Monitor Ligero (`lightweight-monitor.js`)
- Proceso independiente de monitoreo
- Consume < 20MB RAM
- Expone métricas en formato Prometheus
- Alertas automáticas al superar umbrales
- Log persistente de eventos

### 3. Endpoint de Métricas
- `/metrics` - Métricas en formato Prometheus
- `/api/financial/metrics/performance` - Reporte de rendimiento JSON
- `/api/financial/metrics/alerts` - Alertas activas

## Instalación Rápida

### 1. Desarrollo Local

```bash
# Iniciar el monitor independiente
node monitoring/lightweight-monitor.js

# Servir el dashboard (en otro terminal)
node monitoring/serve-dashboard.js

# Acceder al dashboard
open http://localhost:8080
```

### 2. Producción con Docker

```bash
# El servicio principal ya incluye métricas
docker-compose -f docker-compose.production.yml up -d

# Para el monitor independiente
docker run -d \
  --name ai-monitor \
  --memory="50m" \
  --cpus="0.1" \
  -p 9090:9090 \
  -e SERVICE_URL=http://ai-service:3000 \
  -v /var/log:/var/log \
  node:18-alpine \
  node /app/monitoring/lightweight-monitor.js
```

### 3. Como Servicio Systemd

```bash
# Copiar el servicio
sudo cp monitoring/ai-monitor.service /etc/systemd/system/

# Habilitar e iniciar
sudo systemctl enable ai-monitor
sudo systemctl start ai-monitor

# Ver logs
sudo journalctl -u ai-monitor -f
```

## Configuración

### Variables de Entorno

```bash
# Monitor Ligero
SERVICE_URL=http://localhost:3000    # URL del servicio a monitorear
MONITOR_PORT=9090                    # Puerto para métricas
MONITOR_LOG=/tmp/ai-monitor.log      # Archivo de log

# Dashboard
DASHBOARD_PORT=8080                  # Puerto del dashboard
```

### Umbrales de Alerta

Configurables en `lightweight-monitor.js`:

```javascript
alertThresholds: {
    memory: 80,        // % uso de memoria
    cpu: 80,          // % uso de CPU
    responseTime: 5000, // ms tiempo de respuesta
    errorRate: 10      // errores por minuto
}
```

## Endpoints de Monitoreo

### Monitor Ligero (Puerto 9090)

- `GET /metrics` - Métricas Prometheus
- `GET /status` - Estado JSON detallado
- `GET /health` - Health check simple

### Servicio Principal (Puerto 3000)

- `GET /metrics` - Métricas Prometheus completas
- `GET /api/financial/metrics/performance` - Reporte de rendimiento
- `GET /api/financial/metrics/alerts` - Alertas activas
- `GET /status` - Estado del sistema neural
- `GET /health` - Health check básico

## Integración con Prometheus

### prometheus.yml

```yaml
scrape_configs:
  - job_name: 'ai-service'
    static_configs:
      - targets: ['localhost:3000']
    scrape_interval: 15s
    
  - job_name: 'ai-monitor'
    static_configs:
      - targets: ['localhost:9090']
    scrape_interval: 5s
```

## Alertas Automáticas

El sistema genera alertas automáticas cuando:

1. **Memoria > 80%** - Alerta warning
2. **Memoria > 90%** - Alerta crítica
3. **CPU > 80%** - Alerta warning
4. **Tiempo respuesta > 5s** - Alerta warning
5. **Servicio caído** - Alerta crítica
6. **Tasa de errores > 10/min** - Alerta crítica

Las alertas se:
- Registran en logs
- Muestran en el dashboard
- Envían por Telegram (si configurado)

## Dashboard Features

- **Métricas en Tiempo Real**: CPU, memoria, requests/min
- **Gráficos Históricos**: Últimos 5 minutos de recursos
- **Sistema de Alertas**: Visualización de alertas activas
- **Auto-refresh**: Actualización cada 5 segundos
- **Indicadores Visuales**: Estados healthy/warning/critical

## Troubleshooting

### El monitor no se conecta al servicio

```bash
# Verificar que el servicio esté corriendo
curl http://localhost:3000/health

# Verificar logs del monitor
tail -f /tmp/ai-monitor.log
```

### Dashboard no muestra datos

```bash
# Verificar CORS si está en diferentes puertos
# Verificar que los endpoints respondan:
curl http://localhost:3000/metrics
curl http://localhost:3000/status
```

### Consumo excesivo de memoria

```bash
# Verificar límites del servicio
docker stats ai-service

# Ajustar límites en docker-compose
mem_limit: 50m
```

## Optimización

Para minimizar el overhead:

1. **Ajustar intervalos** de verificación según necesidad
2. **Limitar historial** de métricas almacenadas
3. **Usar compresión** en logs
4. **Rotar logs** periódicamente

## Próximas Mejoras

- [ ] Integración con Grafana
- [ ] Exportador para CloudWatch
- [ ] Alertas por email
- [ ] Métricas de negocio personalizadas
- [ ] Dashboard móvil responsive