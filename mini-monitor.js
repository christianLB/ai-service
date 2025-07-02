#!/usr/bin/env node

const http = require('http');

// Configuración
const API_BASE = 'http://localhost:3001';
const REFRESH_INTERVAL = 1000; // 1 segundo

// Colores
const c = {
  r: '\x1b[0m', g: '\x1b[32m', y: '\x1b[33m', b: '\x1b[34m', 
  m: '\x1b[35m', c: '\x1b[36m', w: '\x1b[37m', br: '\x1b[1m'
};

let isRunning = true;

// Request helper
function req(url) {
  return new Promise((resolve, reject) => {
    const r = http.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); } catch (e) { reject(e); }
      });
    });
    r.on('error', reject);
    r.setTimeout(3000, () => { r.destroy(); reject(new Error('Timeout')); });
  });
}

// Formatters
const fmt = {
  time: (s) => `${Math.floor(s/3600)}h${Math.floor((s%3600)/60)}m`,
  mem: (b) => b > 1024*1024 ? `${(b/1024/1024).toFixed(1)}MB` : `${Math.floor(b/1024)}KB`,
  num: (n) => n > 1000 ? `${(n/1000).toFixed(1)}K` : n.toString()
};

// Monitor loop
async function monitor() {
  const spinner = ['⠋','⠙','⠹','⠸','⠼','⠴','⠦','⠧','⠇','⠏'];
  let spin = 0;
  
  while (isRunning) {
    try {
      const [status, metrics] = await Promise.all([
        req(`${API_BASE}/status`),
        req(`${API_BASE}/api/metrics/json`)
      ]);
      
      const statusIcon = status.status === 'ok' ? '🟢' : '🔴';
      const time = new Date().toLocaleTimeString();
      const uptime = fmt.time(status.uptime || 0);
      const memory = fmt.mem(status.memory?.heapUsed || 0);
      const workflows = metrics.metrics?.workflows_generated || 0;
      const requests = metrics.metrics?.api_requests || 0;
      const validations = metrics.metrics?.validations_run || 0;
      
      // Clear and display
      console.clear();
      console.log(`${c.br}${c.c}╭─ 🚀 AI SERVICE MONITOR ─╮${c.r}`);
      console.log(`${c.c}│ ${c.w}${time} ${statusIcon} ${c.g}${status.status?.toUpperCase()}${' '.repeat(10)}${c.c}│${c.r}`);
      console.log(`${c.c}├─────────────────────────┤${c.r}`);
      console.log(`${c.c}│ ${c.w}⏱️  ${uptime}${' '.repeat(18-uptime.length)}${c.c}│${c.r}`);
      console.log(`${c.c}│ ${c.w}💾 ${memory}${' '.repeat(18-memory.length)}${c.c}│${c.r}`);
      console.log(`${c.c}│ ${c.w}🔥 ${workflows} workflows${' '.repeat(10-workflows.toString().length)}${c.c}│${c.r}`);
      console.log(`${c.c}│ ${c.w}📊 ${requests} requests${' '.repeat(11-requests.toString().length)}${c.c}│${c.r}`);
      console.log(`${c.c}│ ${c.w}✅ ${validations} validated${' '.repeat(10-validations.toString().length)}${c.c}│${c.r}`);
      console.log(`${c.c}├─────────────────────────┤${c.r}`);
      console.log(`${c.c}│ ${c.y}${spinner[spin]} Monitoring... CTRL+C${c.c} │${c.r}`);
      console.log(`${c.c}╰─────────────────────────╯${c.r}`);
      
      spin = (spin + 1) % spinner.length;
      
    } catch (error) {
      console.clear();
      console.log(`${c.br}${c.c}╭─ 🚀 AI SERVICE MONITOR ─╮${c.r}`);
      console.log(`${c.c}│ ${c.w}${new Date().toLocaleTimeString()} 🔴 ${c.y}OFFLINE${' '.repeat(8)}${c.c}│${c.r}`);
      console.log(`${c.c}├─────────────────────────┤${c.r}`);
      console.log(`${c.c}│ ${c.y}❌ Connection failed    ${c.c}│${c.r}`);
      console.log(`${c.c}│ ${c.w}Error: ${error.message.substring(0,14)}${' '.repeat(Math.max(0, 8-error.message.length))}${c.c}│${c.r}`);
      console.log(`${c.c}├─────────────────────────┤${c.r}`);
      console.log(`${c.c}│ ${c.y}${spinner[spin]} Retrying... CTRL+C${' '.repeat(2)}${c.c}│${c.r}`);
      console.log(`${c.c}╰─────────────────────────╯${c.r}`);
      
      spin = (spin + 1) % spinner.length;
    }
    
    await new Promise(resolve => setTimeout(resolve, REFRESH_INTERVAL));
  }
}

// Signal handlers
process.on('SIGINT', () => {
  console.log(`\n${c.y}📊 Mini monitor stopped!${c.r}`);
  isRunning = false;
  process.exit(0);
});

// Start
console.log(`${c.g}🚀 Starting mini monitor for ${API_BASE}...${c.r}`);
monitor();