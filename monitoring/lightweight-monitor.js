#!/usr/bin/env node

/**
 * Monitor Ligero para AI Service
 * Consume < 50MB RAM y proporciona métricas esenciales
 */

const http = require('http');
const os = require('os');
const fs = require('fs');
const path = require('path');

// Configuración
const CONFIG = {
    serviceUrl: process.env.SERVICE_URL || 'http://localhost:3000',
    port: process.env.MONITOR_PORT || 9090,
    checkInterval: 5000, // 5 segundos
    alertThresholds: {
        memory: 80, // %
        cpu: 80, // %
        responseTime: 5000, // ms
        errorRate: 10 // errors per minute
    },
    logFile: process.env.MONITOR_LOG || '/tmp/ai-service-monitor.log'
};

// Estado del monitor
const state = {
    startTime: Date.now(),
    checks: 0,
    errors: 0,
    alerts: [],
    metrics: {
        cpu: 0,
        memory: 0,
        responseTime: 0,
        lastCheck: null
    }
};

// Utilidades
function getCPUUsage() {
    const cpus = os.cpus();
    let totalIdle = 0;
    let totalTick = 0;

    cpus.forEach(cpu => {
        for (const type in cpu.times) {
            totalTick += cpu.times[type];
        }
        totalIdle += cpu.times.idle;
    });

    return 100 - ~~(100 * totalIdle / totalTick);
}

function getMemoryUsage() {
    const total = os.totalmem();
    const free = os.freemem();
    return ((total - free) / total) * 100;
}

function formatBytes(bytes) {
    return (bytes / 1024 / 1024).toFixed(1) + 'MB';
}

function log(level, message, data = {}) {
    const timestamp = new Date().toISOString();
    const logEntry = {
        timestamp,
        level,
        message,
        ...data
    };
    
    console.log(`[${timestamp}] ${level.toUpperCase()}: ${message}`);
    
    // Escribir al archivo de log
    try {
        fs.appendFileSync(CONFIG.logFile, JSON.stringify(logEntry) + '\n');
    } catch (err) {
        console.error('Error writing to log file:', err.message);
    }
}

// Función para verificar el servicio
async function checkService() {
    const startTime = Date.now();
    
    try {
        // Hacer petición al health endpoint
        const response = await makeRequest(`${CONFIG.serviceUrl}/health`);
        const responseTime = Date.now() - startTime;
        
        state.metrics.responseTime = responseTime;
        state.metrics.lastCheck = new Date().toISOString();
        state.checks++;
        
        // Verificar tiempo de respuesta
        if (responseTime > CONFIG.alertThresholds.responseTime) {
            addAlert('warning', 'response_time', 
                `Response time ${responseTime}ms exceeds threshold ${CONFIG.alertThresholds.responseTime}ms`);
        }
        
        return { success: true, responseTime, data: response };
        
    } catch (error) {
        state.errors++;
        addAlert('critical', 'service_down', `Service check failed: ${error.message}`);
        return { success: false, error: error.message };
    }
}

// Función para hacer peticiones HTTP
function makeRequest(url) {
    return new Promise((resolve, reject) => {
        http.get(url, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    resolve(JSON.parse(data));
                } catch (e) {
                    resolve(data);
                }
            });
        }).on('error', reject);
    });
}

// Gestión de alertas
function addAlert(level, metric, message) {
    const alert = {
        timestamp: new Date().toISOString(),
        level,
        metric,
        message
    };
    
    state.alerts.push(alert);
    
    // Mantener solo las últimas 100 alertas
    if (state.alerts.length > 100) {
        state.alerts = state.alerts.slice(-100);
    }
    
    // Log de alerta
    log(level, message, { metric });
    
    // Enviar notificación si es crítica
    if (level === 'critical') {
        sendNotification(alert);
    }
}

// Enviar notificación (stub - implementar según necesidad)
function sendNotification(alert) {
    // Aquí se podría integrar con Telegram, email, etc.
    console.error(`\n🚨 CRITICAL ALERT: ${alert.message}\n`);
}

// Monitoreo de recursos del sistema
function checkSystemResources() {
    const cpu = getCPUUsage();
    const memory = getMemoryUsage();
    
    state.metrics.cpu = cpu;
    state.metrics.memory = memory;
    
    // Verificar umbrales
    if (cpu > CONFIG.alertThresholds.cpu) {
        addAlert('warning', 'cpu_usage', 
            `CPU usage ${cpu.toFixed(1)}% exceeds threshold ${CONFIG.alertThresholds.cpu}%`);
    }
    
    if (memory > CONFIG.alertThresholds.memory) {
        addAlert('warning', 'memory_usage', 
            `Memory usage ${memory.toFixed(1)}% exceeds threshold ${CONFIG.alertThresholds.memory}%`);
    }
}

// Servidor HTTP para exponer métricas
function startMetricsServer() {
    const server = http.createServer((req, res) => {
        res.setHeader('Content-Type', 'application/json');
        
        if (req.url === '/metrics') {
            // Formato Prometheus simplificado
            res.setHeader('Content-Type', 'text/plain');
            res.end(generatePrometheusMetrics());
        } else if (req.url === '/status') {
            res.end(JSON.stringify({
                uptime: Date.now() - state.startTime,
                checks: state.checks,
                errors: state.errors,
                metrics: state.metrics,
                alerts: state.alerts.slice(-10), // últimas 10 alertas
                system: {
                    platform: os.platform(),
                    totalMemory: formatBytes(os.totalmem()),
                    freeMemory: formatBytes(os.freemem()),
                    cpus: os.cpus().length
                }
            }, null, 2));
        } else if (req.url === '/health') {
            const isHealthy = state.errors < 10 && state.metrics.responseTime < CONFIG.alertThresholds.responseTime;
            res.statusCode = isHealthy ? 200 : 503;
            res.end(JSON.stringify({
                status: isHealthy ? 'healthy' : 'unhealthy',
                timestamp: new Date().toISOString()
            }));
        } else {
            res.statusCode = 404;
            res.end('Not Found');
        }
    });
    
    server.listen(CONFIG.port, () => {
        log('info', `Monitor server started on port ${CONFIG.port}`);
    });
}

// Generar métricas en formato Prometheus
function generatePrometheusMetrics() {
    const uptime = (Date.now() - state.startTime) / 1000;
    const errorRate = state.errors / (uptime / 60); // errors per minute
    
    return `# HELP monitor_uptime_seconds Monitor uptime in seconds
# TYPE monitor_uptime_seconds gauge
monitor_uptime_seconds ${uptime.toFixed(2)}

# HELP monitor_checks_total Total number of health checks performed
# TYPE monitor_checks_total counter
monitor_checks_total ${state.checks}

# HELP monitor_errors_total Total number of errors encountered
# TYPE monitor_errors_total counter
monitor_errors_total ${state.errors}

# HELP monitor_error_rate Errors per minute
# TYPE monitor_error_rate gauge
monitor_error_rate ${errorRate.toFixed(2)}

# HELP system_cpu_usage_percent System CPU usage percentage
# TYPE system_cpu_usage_percent gauge
system_cpu_usage_percent ${state.metrics.cpu.toFixed(2)}

# HELP system_memory_usage_percent System memory usage percentage
# TYPE system_memory_usage_percent gauge
system_memory_usage_percent ${state.metrics.memory.toFixed(2)}

# HELP service_response_time_ms Service response time in milliseconds
# TYPE service_response_time_ms gauge
service_response_time_ms ${state.metrics.responseTime}

# HELP monitor_alerts_active Number of active alerts
# TYPE monitor_alerts_active gauge
monitor_alerts_active ${state.alerts.filter(a => 
    new Date() - new Date(a.timestamp) < 300000 // alertas de los últimos 5 minutos
).length}
`;
}

// Loop principal de monitoreo
async function monitoringLoop() {
    // Verificar recursos del sistema
    checkSystemResources();
    
    // Verificar servicio
    const serviceCheck = await checkService();
    
    // Log periódico
    if (state.checks % 12 === 0) { // cada minuto aproximadamente
        log('info', 'Monitor status', {
            checks: state.checks,
            errors: state.errors,
            errorRate: (state.errors / state.checks * 100).toFixed(2) + '%',
            cpu: state.metrics.cpu.toFixed(1) + '%',
            memory: state.metrics.memory.toFixed(1) + '%',
            responseTime: state.metrics.responseTime + 'ms'
        });
    }
    
    // Verificar tasa de errores
    const errorRate = state.errors / (state.checks || 1) * 100;
    if (errorRate > CONFIG.alertThresholds.errorRate) {
        addAlert('critical', 'error_rate', 
            `Error rate ${errorRate.toFixed(1)}% exceeds threshold ${CONFIG.alertThresholds.errorRate}%`);
    }
}

// Manejo de señales para shutdown limpio
process.on('SIGINT', () => {
    log('info', 'Monitor shutting down...');
    process.exit(0);
});

process.on('SIGTERM', () => {
    log('info', 'Monitor shutting down...');
    process.exit(0);
});

// Iniciar monitor
function start() {
    log('info', 'AI Service Monitor starting...', CONFIG);
    
    // Verificar que el servicio esté accesible
    checkService().then(result => {
        if (!result.success) {
            log('warning', 'Initial service check failed, continuing anyway...');
        }
        
        // Iniciar servidor de métricas
        startMetricsServer();
        
        // Iniciar loop de monitoreo
        setInterval(monitoringLoop, CONFIG.checkInterval);
        
        // Primera ejecución
        monitoringLoop();
    });
}

// Ejecutar si es el script principal
if (require.main === module) {
    start();
}

module.exports = { start, state, CONFIG };