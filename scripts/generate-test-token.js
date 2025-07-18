#!/usr/bin/env node

const jwt = require('jsonwebtoken');

// Read JWT secret from environment or use default
const JWT_SECRET = process.env.JWT_SECRET || 'eyJ0eXAiOiJhdCtqd3QiLCJhbGciOiJFUzI1NiIsImtpZCI6ImU3YWZjYWNkZGY0NTg5ZDYxZWEyZWNhNzhiNzY3ZDg5In0.eyJpc3MiOiJodHRwczovL2lkcC5sb2NhbCIsImF1ZCI6ImFwaTEiLCJzdWIiOiI1YmU4NjM1OTA3M2M0MzRiYWQyZGEzOTMyMjIyZGFiZSIsImNsaWVudF9pZCI6ImFpLXNlcnZpY2UiLCJleHAiOjE3NTI1MjQyOTksImlhdCI6MTc1MjUyMDY5OSwianRpIjoiNWUxOTdlYWJkMWU5ZTY3YWNiZjFjY2UwYmU3NDY4OWQifQ.DdGvrk-rWJBDmWcn_Ud83WDjawiIK8hvLAvtZ-keBEo7e4F8xGbbwUkl9-CJt9065uZiVJoFG5ex948AeL4Edw';

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