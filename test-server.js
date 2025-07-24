const express = require('express');
const cors = require('cors');
const path = require('path');
const crypto = require('crypto');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Serve static files from frontend
app.use(express.static(path.join(__dirname, 'frontend/dist')));

// Simple auth endpoint for testing
app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  
  console.log('Login attempt:', { email, password });
  
  // For test server only - use environment variable
  const testPassword = process.env.TEST_ADMIN_PASSWORD;
  if (!testPassword) {
    return res.status(500).json({ error: 'TEST_ADMIN_PASSWORD not configured' });
  }
  
  if (email === 'admin@ai-service.local' && password === testPassword) {
    // Generate simple tokens for testing with crypto-secure random
    const accessToken = 'test-access-token-' + crypto.randomBytes(16).toString('hex');
    const refreshToken = 'test-refresh-token-' + crypto.randomBytes(16).toString('hex');
    
    res.json({
      accessToken,
      refreshToken,
      tokenType: 'Bearer'
    });
  } else {
    res.status(401).json({ error: 'Invalid credentials' });
  }
});

// Simple protected endpoint
app.get('/api/auth/me', (req, res) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }
  
  // For testing, just return a dummy user
  res.json({
    id: '1',
    email: 'admin@ai-service.local',
    fullName: 'System Administrator',
    role: 'admin',
    isActive: true
  });
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Info endpoint
app.get('/api/info', (req, res) => {
  res.json({
    service: 'AI Service Test Server',
    version: '1.0.0',
    authEnabled: true
  });
});

// Catch all - serve React app
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'frontend/dist/index.html'));
});

const PORT = 3002;
app.listen(PORT, () => {
  console.log(`🚀 Test server running on http://localhost:${PORT}`);
  console.log(`📂 Serving frontend from: ${path.join(__dirname, 'frontend/dist')}`);
  console.log(`\n🔐 Test credentials:`);
  console.log(`   Email: admin@ai-service.local`);
  console.log(`   Password: admin123`);
});