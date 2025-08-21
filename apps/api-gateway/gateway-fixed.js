const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();
const PORT = 8000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Service URLs
const services = {
  auth: 'http://localhost:3004',
  financial: 'http://localhost:3002',
  monolith: 'http://localhost:3001'
};

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'api-gateway',
    timestamp: new Date().toISOString()
  });
});

// Proxy function
async function proxyRequest(req, res, targetUrl) {
  try {
    console.log(`Proxying ${req.method} ${req.originalUrl} to ${targetUrl}`);
    
    const config = {
      method: req.method,
      url: targetUrl + req.originalUrl,
      headers: {
        ...req.headers,
        host: undefined,
        'content-length': undefined
      },
      data: req.body,
      timeout: 30000
    };

    const response = await axios(config);
    res.status(response.status).json(response.data);
  } catch (error) {
    if (error.response) {
      res.status(error.response.status).json(error.response.data);
    } else if (error.code === 'ECONNREFUSED') {
      res.status(503).json({ error: 'Service unavailable' });
    } else {
      console.error('Proxy error:', error.message);
      res.status(500).json({ error: 'Gateway error', message: error.message });
    }
  }
}

// Auth routes
app.all('/api/auth/*', (req, res) => proxyRequest(req, res, services.auth));

// Financial routes
app.all('/api/financial/*', (req, res) => proxyRequest(req, res, services.financial));

// Trading routes - REMOVED
app.all('/api/trading/*', (req, res) => {
  res.status(501).json({
    error: 'Trading Service removed',
    message: 'This service has been removed from scope'
  });
});

// Dashboard routes
app.all('/api/dashboard/*', (req, res) => proxyRequest(req, res, services.monolith));

// Default API routes to monolith
app.all('/api/*', (req, res) => proxyRequest(req, res, services.monolith));

// Start server
app.listen(PORT, () => {
  console.log(`
🚀 API Gateway Running (FIXED)
==============================
Port: ${PORT}
Health: http://localhost:${PORT}/health

Routing:
- /api/auth/* → Auth Service (3004)
- /api/financial/* → Financial Service (3002)
- /api/trading/* → 501 (Removed)
- /api/* → Monolith (3001)
  `);
});