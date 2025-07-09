#!/usr/bin/env node

/**
 * Servidor simple para el dashboard de monitoreo
 * Puede ejecutarse independientemente del servicio principal
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.DASHBOARD_PORT || 8080;
const DASHBOARD_FILE = path.join(__dirname, 'dashboard.html');

// Verificar que el archivo existe
if (!fs.existsSync(DASHBOARD_FILE)) {
    console.error('Dashboard file not found:', DASHBOARD_FILE);
    process.exit(1);
}

// Crear servidor HTTP
const server = http.createServer((req, res) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
    
    if (req.url === '/' || req.url === '/dashboard') {
        // Servir el dashboard
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        
        const content = fs.readFileSync(DASHBOARD_FILE, 'utf8');
        res.end(content);
    } else if (req.url === '/health') {
        // Health check endpoint
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({
            status: 'ok',
            timestamp: new Date().toISOString()
        }));
    } else {
        // 404 para otras rutas
        res.statusCode = 404;
        res.end('Not Found');
    }
});

// Iniciar servidor
server.listen(PORT, () => {
    console.log(`
╔════════════════════════════════════════════╗
║     AI Service Monitoring Dashboard        ║
╠════════════════════════════════════════════╣
║                                            ║
║  Dashboard URL:                            ║
║  http://localhost:${PORT}/                      ║
║                                            ║
║  Status: Running                           ║
║  PID: ${process.pid}                            ║
║                                            ║
╚════════════════════════════════════════════╝
    `);
});

// Manejo de señales para shutdown limpio
process.on('SIGINT', () => {
    console.log('\nShutting down dashboard server...');
    server.close(() => {
        console.log('Dashboard server stopped.');
        process.exit(0);
    });
});

process.on('SIGTERM', () => {
    console.log('\nShutting down dashboard server...');
    server.close(() => {
        console.log('Dashboard server stopped.');
        process.exit(0);
    });
});