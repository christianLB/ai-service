#!/usr/bin/env node

/**
 * Authentication Token Diagnostics Script
 * 
 * This script diagnoses JWT token structure issues by:
 * - Testing token generation matches middleware expectations
 * - Validating required fields in access and refresh tokens
 * - Comparing actual vs expected token payloads
 * - Identifying common mismatches that cause auth failures
 */

const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
require('dotenv').config({ path: '.env.local' });

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logHeader(title) {
  console.log('\n' + '='.repeat(60));
  log(title, 'blue');
  console.log('='.repeat(60));
}

function logSuccess(message) {
  log(`✅ ${message}`, 'green');
}

function logError(message) {
  log(`❌ ${message}`, 'red');
}

function logWarning(message) {
  log(`⚠️  ${message}`, 'yellow');
}

function logInfo(message) {
  log(`ℹ️  ${message}`, 'cyan');
}

async function diagnoseTokens() {
  logHeader('AUTH TOKEN DIAGNOSTICS');
  
  const jwtSecret = process.env.JWT_SECRET || 'default-jwt-secret-for-dev';
  const jwtExpiresIn = process.env.JWT_EXPIRES_IN || '15m';
  const refreshExpiresIn = process.env.JWT_REFRESH_EXPIRES_IN || '7d';
  
  logInfo(`JWT Secret: ${jwtSecret.substring(0, 10)}...`);
  logInfo(`Access Token Expiry: ${jwtExpiresIn}`);
  logInfo(`Refresh Token Expiry: ${refreshExpiresIn}`);
  
  // Test user data
  const testUser = {
    id: 'test-user-123',
    email: 'test@example.com',
    role: 'user'
  };
  
  logHeader('1. TESTING ACCESS TOKEN GENERATION');
  
  try {
    // Generate access token as the AuthService does
    const accessPayload = {
      userId: testUser.id,
      email: testUser.email,
      role: testUser.role,
      type: 'access'  // This is the field that was missing!
    };
    
    const accessToken = jwt.sign(accessPayload, jwtSecret, { expiresIn: jwtExpiresIn });
    logSuccess('Access token generated successfully');
    
    // Decode and analyze
    const decoded = jwt.decode(accessToken);
    console.log('\nAccess Token Payload:');
    console.log(JSON.stringify(decoded, null, 2));
    
    // Check required fields
    const requiredFields = ['userId', 'email', 'role', 'type'];
    const missingFields = requiredFields.filter(field => !decoded[field]);
    
    if (missingFields.length > 0) {
      logError(`Missing required fields: ${missingFields.join(', ')}`);
    } else {
      logSuccess('All required fields present');
    }
    
    // Check type field specifically
    if (decoded.type !== 'access') {
      logError(`Token type is '${decoded.type}' but middleware expects 'access'`);
    } else {
      logSuccess('Token type field is correct');
    }
    
  } catch (error) {
    logError(`Failed to generate access token: ${error.message}`);
  }
  
  logHeader('2. TESTING REFRESH TOKEN GENERATION');
  
  try {
    // Generate refresh token
    const refreshPayload = {
      userId: testUser.id,
      type: 'refresh'
    };
    
    const refreshToken = jwt.sign(refreshPayload, jwtSecret, { expiresIn: refreshExpiresIn });
    logSuccess('Refresh token generated successfully');
    
    // Decode and analyze
    const decoded = jwt.decode(refreshToken);
    console.log('\nRefresh Token Payload:');
    console.log(JSON.stringify(decoded, null, 2));
    
    if (decoded.type !== 'refresh') {
      logError(`Refresh token type is '${decoded.type}' but should be 'refresh'`);
    } else {
      logSuccess('Refresh token type field is correct');
    }
    
  } catch (error) {
    logError(`Failed to generate refresh token: ${error.message}`);
  }
  
  logHeader('3. TESTING MIDDLEWARE VALIDATION');
  
  try {
    // Simulate what the auth middleware does
    const testTokens = [
      { 
        name: 'Valid Access Token',
        token: jwt.sign({ userId: testUser.id, email: testUser.email, role: testUser.role, type: 'access' }, jwtSecret)
      },
      { 
        name: 'Token Without Type',
        token: jwt.sign({ userId: testUser.id, email: testUser.email, role: testUser.role }, jwtSecret)
      },
      { 
        name: 'Token With Wrong Type',
        token: jwt.sign({ userId: testUser.id, email: testUser.email, role: testUser.role, type: 'refresh' }, jwtSecret)
      },
      { 
        name: 'Token Missing UserId',
        token: jwt.sign({ email: testUser.email, role: testUser.role, type: 'access' }, jwtSecret)
      }
    ];
    
    for (const testCase of testTokens) {
      console.log(`\nTesting: ${testCase.name}`);
      
      try {
        const decoded = jwt.verify(testCase.token, jwtSecret);
        
        // Simulate middleware checks
        if (decoded.type !== 'access') {
          logError(`Would fail: Invalid token type '${decoded.type || 'undefined'}'`);
        } else if (!decoded.userId || !decoded.email || !decoded.role) {
          logError('Would fail: Missing required fields');
        } else {
          logSuccess('Would pass middleware validation');
        }
      } catch (error) {
        logError(`Would fail: ${error.message}`);
      }
    }
    
  } catch (error) {
    logError(`Middleware validation test failed: ${error.message}`);
  }
  
  logHeader('4. COMMON ISSUES CHECK');
  
  // Check for common configuration issues
  if (jwtSecret === 'default-jwt-secret-for-dev' || jwtSecret === 'your-secret-key-change-in-production') {
    logWarning('Using default JWT secret - this is insecure for production!');
  }
  
  // Check token expiry settings
  try {
    const accessMs = parseExpiry(jwtExpiresIn);
    const refreshMs = parseExpiry(refreshExpiresIn);
    
    if (accessMs >= refreshMs) {
      logWarning('Access token expiry is longer than or equal to refresh token expiry');
    }
    
    if (accessMs < 5 * 60 * 1000) { // Less than 5 minutes
      logWarning('Access token expiry is very short (< 5 minutes)');
    }
    
  } catch (error) {
    logError(`Invalid expiry format: ${error.message}`);
  }
  
  logHeader('DIAGNOSTICS COMPLETE');
  
  console.log('\n📋 Summary:');
  console.log('- Access tokens must include type: "access"');
  console.log('- Refresh tokens must include type: "refresh"');
  console.log('- Both must be signed with the same JWT secret');
  console.log('- Middleware validates: type, userId, email, role');
  console.log('\n✨ If tokens are failing, check AuthService.generateAccessToken()');
}

function parseExpiry(expiry) {
  const match = expiry.match(/^(\d+)([smhd])$/);
  if (!match) throw new Error(`Invalid expiry format: ${expiry}`);
  
  const value = parseInt(match[1]);
  const unit = match[2];
  
  const multipliers = {
    s: 1000,
    m: 60 * 1000,
    h: 60 * 60 * 1000,
    d: 24 * 60 * 60 * 1000
  };
  
  return value * multipliers[unit];
}

// Run diagnostics
diagnoseTokens().catch(error => {
  logError(`Diagnostic failed: ${error.message}`);
  process.exit(1);
});