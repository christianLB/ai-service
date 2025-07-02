#!/usr/bin/env node

const http = require('http');
const { spawn } = require('child_process');

// Configuración
const API_BASE = 'http://localhost:3001';
const REFRESH_INTERVAL = 2000; // 2 segundos
const HISTORY_SIZE = 20;

// Estado del dashboard
let isRunning = true;
let metrics = {};
let status = {};
let history = [];
let alerts = [];

// Colores ANSI
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  bgRed: '\x1b[41m',
  bgGreen: '\x1b[42m',
  bgYellow: '\x1b[43m',
  bgBlue: '\x1b[44m'
};

// Función para hacer requests HTTP
function makeRequest(url) {
  return new Promise((resolve, reject) => {
    const req = http.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(e);
        }
      });
    });
    
    req.on('error', reject);
    req.setTimeout(5000, () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });
  });
}

// Formatear números
function formatNumber(num) {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
  return num.toString();
}

// Formatear tiempo
function formatUptime(seconds) {
  const hours = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  return `${hours}h ${mins}m ${secs}s`;
}

// Formatear bytes
function formatBytes(bytes) {
  if (bytes >= 1024 * 1024 * 1024) return (bytes / (1024 * 1024 * 1024)).toFixed(1) + 'GB';
  if (bytes >= 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + 'MB';
  if (bytes >= 1024) return (bytes / 1024).toFixed(1) + 'KB';
  return bytes + 'B';
}

// Obtener estado del sistema
async function fetchSystemData() {
  try {
    const [statusData, metricsData] = await Promise.all([
      makeRequest(`${API_BASE}/status`),
      makeRequest(`${API_BASE}/api/metrics/json`)
    ]);
    
    status = statusData;
    metrics = metricsData;
    
    // Agregar a historial
    history.push({
      timestamp: new Date(),
      memory: status.memory?.heapUsed || 0,
      requests: metrics.metrics?.api_requests || 0,
      workflows: metrics.metrics?.workflows_generated || 0
    });
    
    // Mantener historial limitado
    if (history.length > HISTORY_SIZE) {
      history.shift();
    }
    
    // Detectar alertas
    checkAlerts();
    
  } catch (error) {
    alerts.push({
      level: 'error',
      message: `Connection failed: ${error.message}`,
      timestamp: new Date()
    });
  }
}

// Detectar alertas
function checkAlerts() {
  alerts = alerts.filter(alert => 
    Date.now() - alert.timestamp.getTime() < 30000 // 30 segundos
  );
  
  if (status.memory?.heapUsed > 100 * 1024 * 1024) { // 100MB
    alerts.push({
      level: 'warning',
      message: 'High memory usage detected',
      timestamp: new Date()
    });
  }
  
  if (metrics.metrics?.api_requests && history.length >= 2) {
    const currentReqs = metrics.metrics.api_requests;
    const prevReqs = history[history.length - 2]?.requests || 0;
    const reqRate = (currentReqs - prevReqs) / (REFRESH_INTERVAL / 1000);
    
    if (reqRate > 5) { // Más de 5 req/seg
      alerts.push({
        level: 'info',
        message: `High request rate: ${reqRate.toFixed(1)} req/s`,
        timestamp: new Date()
      });
    }
  }
}

// Crear gráfico de barras simple
function createSparkline(data, width = 20) {
  if (data.length < 2) return '─'.repeat(width);
  
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  
  const bars = ['▁', '▂', '▃', '▄', '▅', '▆', '▇', '█'];
  
  return data.slice(-width).map(value => {
    const normalized = (value - min) / range;
    const barIndex = Math.floor(normalized * (bars.length - 1));
    return bars[barIndex];
  }).join('');
}

// Renderizar dashboard
function renderDashboard() {
  // Limpiar pantalla
  console.clear();
  
  const now = new Date();
  const isHealthy = status.status === 'ok';
  
  // Header
  console.log(`${colors.bright}${colors.cyan}╭${'─'.repeat(78)}╮${colors.reset}`);
  console.log(`${colors.bright}${colors.cyan}│${colors.white}                    🚀 AI SERVICE MONITOR DASHBOARD                    ${colors.cyan}│${colors.reset}`);
  console.log(`${colors.bright}${colors.cyan}├${'─'.repeat(78)}┤${colors.reset}`);
  
  // Timestamp y status
  const statusColor = isHealthy ? colors.green : colors.red;
  const statusIcon = isHealthy ? '🟢' : '🔴';
  console.log(`${colors.cyan}│ ${colors.white}${now.toLocaleString()}${' '.repeat(35)} ${statusIcon} ${statusColor}${status.status?.toUpperCase() || 'UNKNOWN'}${colors.cyan} │${colors.reset}`);
  console.log(`${colors.cyan}├${'─'.repeat(78)}┤${colors.reset}`);
  
  // Métricas principales
  console.log(`${colors.cyan}│ ${colors.bright}${colors.yellow}CORE METRICS${colors.reset}${' '.repeat(54)} ${colors.cyan}│${colors.reset}`);
  
  const uptime = status.uptime ? formatUptime(status.uptime) : 'N/A';
  const memory = status.memory?.heapUsed ? formatBytes(status.memory.heapUsed) : 'N/A';
  const workflows = metrics.metrics?.workflows_generated || 0;
  const requests = metrics.metrics?.api_requests || 0;
  const validations = metrics.metrics?.validations_run || 0;
  
  console.log(`${colors.cyan}│ ${colors.white}⏱️  Uptime:       ${colors.green}${uptime}${' '.repeat(46 - uptime.length)}${colors.cyan}│${colors.reset}`);
  console.log(`${colors.cyan}│ ${colors.white}💾 Memory:       ${colors.blue}${memory}${' '.repeat(46 - memory.length)}${colors.cyan}│${colors.reset}`);
  console.log(`${colors.cyan}│ ${colors.white}🔥 Workflows:    ${colors.magenta}${workflows}${' '.repeat(46 - workflows.toString().length)}${colors.cyan}│${colors.reset}`);
  console.log(`${colors.cyan}│ ${colors.white}📊 API Requests: ${colors.yellow}${requests}${' '.repeat(46 - requests.toString().length)}${colors.cyan}│${colors.reset}`);
  console.log(`${colors.cyan}│ ${colors.white}✅ Validations:  ${colors.green}${validations}${' '.repeat(46 - validations.toString().length)}${colors.cyan}│${colors.reset}`);
  
  console.log(`${colors.cyan}├${'─'.repeat(78)}┤${colors.reset}`);
  
  // Gráficos de tendencia
  if (history.length > 1) {
    console.log(`${colors.cyan}│ ${colors.bright}${colors.yellow}TRENDS${colors.reset}${' '.repeat(60)} ${colors.cyan}│${colors.reset}`);
    
    const memoryData = history.map(h => h.memory);
    const requestData = history.map(h => h.requests);
    const workflowData = history.map(h => h.workflows);
    
    const memorySparkline = createSparkline(memoryData);
    const requestSparkline = createSparkline(requestData);
    const workflowSparkline = createSparkline(workflowData);
    
    console.log(`${colors.cyan}│ ${colors.white}Memory:   ${colors.blue}${memorySparkline}${' '.repeat(48 - memorySparkline.length)}${colors.cyan}│${colors.reset}`);
    console.log(`${colors.cyan}│ ${colors.white}Requests: ${colors.yellow}${requestSparkline}${' '.repeat(48 - requestSparkline.length)}${colors.cyan}│${colors.reset}`);
    console.log(`${colors.cyan}│ ${colors.white}Workflows:${colors.magenta}${workflowSparkline}${' '.repeat(48 - workflowSparkline.length)}${colors.cyan}│${colors.reset}`);
    
    console.log(`${colors.cyan}├${'─'.repeat(78)}┤${colors.reset}`);
  }
  
  // Alertas
  if (alerts.length > 0) {
    console.log(`${colors.cyan}│ ${colors.bright}${colors.red}ALERTS${colors.reset}${' '.repeat(60)} ${colors.cyan}│${colors.reset}`);
    
    alerts.slice(-3).forEach(alert => {
      const alertColor = alert.level === 'error' ? colors.red : 
                        alert.level === 'warning' ? colors.yellow : colors.blue;
      const icon = alert.level === 'error' ? '🚨' : 
                   alert.level === 'warning' ? '⚠️' : 'ℹ️';
      const time = alert.timestamp.toLocaleTimeString();
      
      const message = alert.message.substring(0, 50);
      console.log(`${colors.cyan}│ ${icon} ${alertColor}${message}${colors.white} (${time})${' '.repeat(78 - message.length - time.length - 6)}${colors.cyan}│${colors.reset}`);
    });
    
    console.log(`${colors.cyan}├${'─'.repeat(78)}┤${colors.reset}`);
  }
  
  // Rate calculations
  if (history.length >= 2) {
    const currentTime = history[history.length - 1].timestamp;
    const previousTime = history[history.length - 2].timestamp;
    const timeDiff = (currentTime - previousTime) / 1000;
    
    const reqRate = ((requests - (history[history.length - 2]?.requests || 0)) / timeDiff).toFixed(1);
    const workflowRate = ((workflows - (history[history.length - 2]?.workflows || 0)) / timeDiff).toFixed(1);
    
    console.log(`${colors.cyan}│ ${colors.bright}${colors.yellow}RATES${colors.reset}${' '.repeat(61)} ${colors.cyan}│${colors.reset}`);
    console.log(`${colors.cyan}│ ${colors.white}Requests/sec:  ${colors.yellow}${reqRate}${' '.repeat(44 - reqRate.length)}${colors.cyan}│${colors.reset}`);
    console.log(`${colors.cyan}│ ${colors.white}Workflows/sec: ${colors.magenta}${workflowRate}${' '.repeat(44 - workflowRate.length)}${colors.cyan}│${colors.reset}`);
    console.log(`${colors.cyan}├${'─'.repeat(78)}┤${colors.reset}`);
  }
  
  // Footer
  console.log(`${colors.cyan}│ ${colors.white}Press ${colors.bright}CTRL+C${colors.reset}${colors.white} to exit | Refresh: ${REFRESH_INTERVAL/1000}s | API: ${API_BASE}${' '.repeat(78 - 50 - API_BASE.length)}${colors.cyan}│${colors.reset}`);
  console.log(`${colors.cyan}╰${'─'.repeat(78)}╯${colors.reset}`);
  
  // Indicador de loading
  const loadingChars = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
  const loadingChar = loadingChars[Math.floor(Date.now() / 100) % loadingChars.length];
  console.log(`\n${colors.blue}${loadingChar} Monitoring...${colors.reset}`);
}

// Función principal de monitoreo
async function monitorLoop() {
  while (isRunning) {
    await fetchSystemData();
    renderDashboard();
    await new Promise(resolve => setTimeout(resolve, REFRESH_INTERVAL));
  }
}

// Manejo de señales
process.on('SIGINT', () => {
  console.log(`\n${colors.yellow}📊 Dashboard stopped. Goodbye!${colors.reset}`);
  isRunning = false;
  process.exit(0);
});

process.on('SIGTERM', () => {
  isRunning = false;
  process.exit(0);
});

// Iniciar dashboard
console.log(`${colors.green}🚀 Starting AI Service Monitor Dashboard...${colors.reset}`);
console.log(`${colors.blue}📡 Connecting to ${API_BASE}${colors.reset}\n`);

// Verificar que el servicio esté corriendo
makeRequest(`${API_BASE}/status`)
  .then(() => {
    console.log(`${colors.green}✅ Service detected! Starting monitor...${colors.reset}\n`);
    monitorLoop();
  })
  .catch(() => {
    console.log(`${colors.red}❌ Cannot connect to AI Service at ${API_BASE}${colors.reset}`);
    console.log(`${colors.yellow}💡 Make sure the service is running first!${colors.reset}`);
    console.log(`${colors.white}   Try: node demo-standalone.js${colors.reset}\n`);
    process.exit(1);
  });