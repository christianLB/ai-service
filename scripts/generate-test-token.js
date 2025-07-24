#!/usr/bin/env node

const jwt = require('jsonwebtoken');

// Read JWT secret from environment
const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  console.error('Error: JWT_SECRET environment variable is required');
  console.error('Please set it in your .env file or environment');
  process.exit(1);
}

// Generate test token
const token = jwt.sign(
  {
    userId: 'test-user-123',
    email: 'test@example.com',
    role: 'admin',
    type: 'access'
  },
  JWT_SECRET,
  { expiresIn: '24h' }
);

console.log('Generated test token:');
console.log(token);
console.log('\nUse it with:');
console.log(`curl -H "Authorization: Bearer ${token}" http://localhost:3000/api/financial/diagnose-gocardless`);