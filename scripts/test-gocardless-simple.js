#!/usr/bin/env node

/**
 * Simple GoCardless Connection Test
 * Tests authentication without consuming rate limits
 */

const axios = require('axios');

const API_BASE = 'http://localhost:3000/api';

async function testConnection() {
  console.log('🔍 GoCardless Simple Connection Test\n');

  try {
    // 1. Check service
    console.log('1️⃣ Checking service...');
    try {
      await axios.get('http://localhost:3000/status');
      console.log('✅ Service is running\n');
    } catch (error) {
      console.error('❌ Service is not running. Start with: make dev-up');
      process.exit(1);
    }

    // 2. Check health
    console.log('2️⃣ Checking financial health...');
    const healthRes = await axios.get(`${API_BASE}/financial/health`);
    if (healthRes.data.status === 'healthy') {
      console.log('✅ Financial service is healthy');
      console.log(`   Database: ${healthRes.data.checks?.database || 'unknown'}`);
      console.log(`   GoCardless: ${healthRes.data.checks?.gocardless || 'unknown'}\n`);
    } else {
      console.log('❌ Financial service is not healthy\n');
    }

    // 3. Test GoCardless
    console.log('3️⃣ Testing GoCardless authentication...');
    try {
      const testRes = await axios.post(`${API_BASE}/financial/test-gocardless`);
      console.log('✅ GoCardless authentication successful!\n');
      
      console.log('🎉 Ready to create requisitions!');
      console.log('Run: npx ts-node scripts/test-bbva-setup.ts');
      
    } catch (error) {
      console.log('❌ GoCardless authentication failed');
      console.log(`   Status: ${error.response?.status}`);
      console.log(`   Error: ${error.response?.data?.message || error.message}\n`);
      
      // Try diagnostic
      console.log('Running diagnostic...');
      try {
        const diagRes = await axios.post(`${API_BASE}/financial/diagnose-gocardless`);
        if (diagRes.data.diagnosis?.checks) {
          diagRes.data.diagnosis.checks.forEach(check => {
            console.log(`   ${check.passed ? '✅' : '❌'} ${check.name}`);
            if (!check.passed && check.error) {
              console.log(`      Error: ${JSON.stringify(check.error)}`);
            }
          });
        }
      } catch (diagError) {
        console.log('   Diagnostic endpoint not available');
      }
      
      console.log('\n💡 To fix:');
      console.log('1. Check credentials in database');
      console.log('2. Run: npx ts-node scripts/verify-gocardless-creds.ts');
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run test
testConnection();