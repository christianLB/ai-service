#!/usr/bin/env node

/**
 * Monitor ligero para AI Service en Synology NAS
 * Objetivo: Usar menos de 50MB de RAM
 * 
 * Funcionalidades:
 * - Monitoreo de salud de servicios
 * - Métricas básicas de recursos
 * - Alertas por problemas críticos
 * - Logs rotativos
 */

const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const { Client } = require('pg');
const redis = require('redis');

// Configuración
const config = {
  postgres: {
    host: process.env.POSTGRES_HOST || 'postgres',
    database: process.env.POSTGRES_DB || 'ai_service',
    user: process.env.POSTGRES_USER || 'ai_user',
    password: process.env.POSTGRES_PASSWORD,
    port: 5432,
  },
  redis: {
    host: process.env.REDIS_HOST || 'redis',
    port: process.env.REDIS_PORT || 6379,
  },
  app: {
    url: process.env.APP_URL || 'http://ai-service:3001',
    metricsUrl: process.env.METRICS_URL || 'http://ai-service:9090/metrics',
  },
  monitor: {
    interval: parseInt(process.env.MONITOR_INTERVAL) || 60000, // 1 minuto
    logRetentionDays: parseInt(process.env.LOG_RETENTION_DAYS) || 7,
  },
  telegram: {
    botToken: process.env.TELEGRAM_BOT_TOKEN,
    chatId: process.env.TELEGRAM_CHAT_ID,
  }
};

// Estado global (minimal para ahorrar memoria)
const state = {
  lastCheck: null,
  failures: {},
  alerts: new Set(),
};

// Logger minimalista
class MiniLogger {
  constructor(logFile) {
    this.logFile = logFile;
    this.ensureLogDir();
  }

  ensureLogDir() {
    const dir = path.dirname(this.logFile);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  log(level, message, data = {}) {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      level,
      message,
      ...data
    };
    
    // Escribir al archivo
    fs.appendFileSync(
      this.logFile,
      JSON.stringify(logEntry) + '\n',
      'utf8'
    );

    // Rotar logs si es necesario
    this.rotateIfNeeded();
  }

  rotateIfNeeded() {
    const stats = fs.statSync(this.logFile);
    const ageInDays = (Date.now() - stats.birthtime) / (1000 * 60 * 60 * 24);
    
    if (ageInDays > config.monitor.logRetentionDays) {
      const archivePath = this.logFile + '.' + new Date().toISOString().split('T')[0];
      fs.renameSync(this.logFile, archivePath);
      
      // Eliminar archivos antiguos
      this.cleanOldLogs();
    }
  }

  cleanOldLogs() {
    const dir = path.dirname(this.logFile);
    const files = fs.readdirSync(dir);
    const cutoffTime = Date.now() - (config.monitor.logRetentionDays * 24 * 60 * 60 * 1000);
    
    files.forEach(file => {
      if (file.startsWith(path.basename(this.logFile) + '.')) {
        const filePath = path.join(dir, file);
        const stats = fs.statSync(filePath);
        if (stats.mtime < cutoffTime) {
          fs.unlinkSync(filePath);
        }
      }
    });
  }
}

const logger = new MiniLogger('/app/data/monitor.log');

// Funciones de monitoreo
async function checkPostgres() {
  const client = new Client(config.postgres);
  try {
    await client.connect();
    const result = await client.query('SELECT 1');
    await client.end();
    return { status: 'healthy', response_time: Date.now() - start };
  } catch (error) {
    return { status: 'unhealthy', error: error.message };
  }
}

async function checkRedis() {
  const start = Date.now();
  const client = redis.createClient({
    socket: {
      host: config.redis.host,
      port: config.redis.port
    }
  });
  
  try {
    await client.connect();
    await client.ping();
    await client.quit();
    return { status: 'healthy', response_time: Date.now() - start };
  } catch (error) {
    return { status: 'unhealthy', error: error.message };
  }
}

async function checkApp() {
  return new Promise((resolve) => {
    const start = Date.now();
    const url = new URL(config.app.url + '/health');
    
    const request = http.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode === 200) {
          resolve({ 
            status: 'healthy', 
            response_time: Date.now() - start,
            data: JSON.parse(data)
          });
        } else {
          resolve({ 
            status: 'unhealthy', 
            status_code: res.statusCode 
          });
        }
      });
    });
    
    request.on('error', (error) => {
      resolve({ status: 'unhealthy', error: error.message });
    });
    
    request.setTimeout(5000, () => {
      request.destroy();
      resolve({ status: 'unhealthy', error: 'timeout' });
    });
  });
}

async function getMetrics() {
  return new Promise((resolve) => {
    const url = new URL(config.app.metricsUrl);
    
    const request = http.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode === 200) {
          // Parsear métricas básicas de Prometheus
          const metrics = {};
          data.split('\n').forEach(line => {
            if (line.startsWith('nodejs_heap_size_used_bytes')) {
              metrics.heap_used = parseFloat(line.split(' ')[1]);
            }
            if (line.startsWith('nodejs_active_handles_total')) {
              metrics.active_handles = parseInt(line.split(' ')[1]);
            }
            if (line.startsWith('process_cpu_seconds_total')) {
              metrics.cpu_total = parseFloat(line.split(' ')[1]);
            }
          });
          resolve(metrics);
        } else {
          resolve(null);
        }
      });
    });
    
    request.on('error', () => resolve(null));
    request.setTimeout(5000, () => {
      request.destroy();
      resolve(null);
    });
  });
}

// Sistema de alertas
async function sendAlert(service, status, details) {
  const alertKey = `${service}-${status}`;
  
  // Evitar alertas duplicadas
  if (state.alerts.has(alertKey)) {
    return;
  }
  
  state.alerts.add(alertKey);
  
  // Log de alerta
  logger.log('alert', `Service ${service} is ${status}`, details);
  
  // Enviar a Telegram si está configurado
  if (config.telegram.botToken && config.telegram.chatId) {
    const message = `🚨 AI Service Alert\n\nService: ${service}\nStatus: ${status}\nDetails: ${JSON.stringify(details, null, 2)}`;
    
    try {
      await sendTelegramMessage(message);
    } catch (error) {
      logger.log('error', 'Failed to send Telegram alert', { error: error.message });
    }
  }
  
  // Limpiar alerta después de 5 minutos
  setTimeout(() => {
    state.alerts.delete(alertKey);
  }, 5 * 60 * 1000);
}

async function sendTelegramMessage(message) {
  return new Promise((resolve, reject) => {
    const url = `https://api.telegram.org/bot${config.telegram.botToken}/sendMessage`;
    const data = JSON.stringify({
      chat_id: config.telegram.chatId,
      text: message,
      parse_mode: 'Markdown'
    });
    
    const options = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': data.length
      }
    };
    
    const req = https.request(url, options, (res) => {
      if (res.statusCode === 200) {
        resolve();
      } else {
        reject(new Error(`Telegram API returned ${res.statusCode}`));
      }
    });
    
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

// Ciclo principal de monitoreo
async function runMonitoringCycle() {
  const checkTime = new Date();
  const results = {
    timestamp: checkTime.toISOString(),
    services: {},
    metrics: null
  };
  
  // Verificar servicios
  results.services.postgres = await checkPostgres();
  results.services.redis = await checkRedis();
  results.services.app = await checkApp();
  
  // Obtener métricas
  results.metrics = await getMetrics();
  
  // Registrar resultados
  logger.log('check', 'Monitoring cycle completed', results);
  
  // Verificar problemas y enviar alertas
  for (const [service, status] of Object.entries(results.services)) {
    if (status.status === 'unhealthy') {
      // Incrementar contador de fallos
      state.failures[service] = (state.failures[service] || 0) + 1;
      
      // Enviar alerta si hay 3 fallos consecutivos
      if (state.failures[service] >= 3) {
        await sendAlert(service, 'unhealthy', status);
      }
    } else {
      // Resetear contador de fallos
      state.failures[service] = 0;
    }
  }
  
  // Verificar uso de memoria de la app
  if (results.metrics && results.metrics.heap_used) {
    const heapUsedMB = results.metrics.heap_used / (1024 * 1024);
    if (heapUsedMB > 1800) { // 1.8GB de 2GB límite
      await sendAlert('app', 'high-memory', { heap_used_mb: heapUsedMB });
    }
  }
  
  state.lastCheck = checkTime;
}

// Endpoint HTTP para estado del monitor
const server = http.createServer((req, res) => {
  if (req.url === '/status') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: 'running',
      lastCheck: state.lastCheck,
      failures: state.failures,
      activeAlerts: Array.from(state.alerts),
      memory: process.memoryUsage()
    }));
  } else {
    res.writeHead(404);
    res.end();
  }
});

// Iniciar servicios
async function start() {
  logger.log('info', 'Starting AI Service Monitor');
  
  // Iniciar servidor HTTP
  server.listen(3000, () => {
    logger.log('info', 'Monitor HTTP server listening on port 3000');
  });
  
  // Ejecutar primer ciclo
  await runMonitoringCycle();
  
  // Configurar intervalo
  setInterval(runMonitoringCycle, config.monitor.interval);
}

// Manejo de señales
process.on('SIGTERM', () => {
  logger.log('info', 'Received SIGTERM, shutting down');
  server.close(() => {
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  logger.log('info', 'Received SIGINT, shutting down');
  server.close(() => {
    process.exit(0);
  });
});

// Manejo de errores no capturados
process.on('uncaughtException', (error) => {
  logger.log('error', 'Uncaught exception', { error: error.message, stack: error.stack });
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.log('error', 'Unhandled rejection', { reason, promise });
});

// Iniciar monitor
start().catch(error => {
  logger.log('error', 'Failed to start monitor', { error: error.message });
  process.exit(1);
});