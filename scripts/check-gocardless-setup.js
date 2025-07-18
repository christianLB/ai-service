#!/usr/bin/env node

const axios = require('axios');

async function checkGoCardlessSetup() {
  console.log('🔍 GoCardless Setup Checker\n');

  const API_BASE = 'http://localhost:3000/api';
  
  try {
    // 1. Login
    console.log('1️⃣ Logging in...');
    const loginRes = await axios.post(`${API_BASE}/auth/login`, {
      email: 'admin@ai-service.local',
      password: 'admin123'
    });
    const token = loginRes.data.accessToken;
    console.log('✅ Login successful\n');

    // 2. Check diagnosis
    console.log('2️⃣ Running GoCardless diagnosis...');
    const diagRes = await axios.post(
      `${API_BASE}/financial/diagnose-gocardless`,
      {},
      { headers: { Authorization: `Bearer ${token}` } }
    );
    
    console.log('Diagnosis result:');
    diagRes.data.diagnosis.checks.forEach(check => {
      console.log(`  ${check.passed ? '✅' : '❌'} ${check.name}: ${check.message || ''}`);
      if (check.details) {
        console.log(`     Details:`, check.details);
      }
    });
    console.log();

    // 3. Try to generate requisition
    console.log('3️⃣ Attempting to generate requisition ID...');
    try {
      const setupRes = await axios.post(
        `${API_BASE}/financial/setup-bbva`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      console.log('✅ Requisition generated successfully!');
      console.log(`   Requisition ID: ${setupRes.data.data.requisitionId}`);
      console.log(`   Consent URL: ${setupRes.data.data.consentUrl}`);
      
    } catch (error) {
      console.log('❌ Failed to generate requisition');
      console.log(`   Error: ${error.response?.data?.error || error.message}`);
      
      // Check if it's the secret key length issue
      if (error.response?.data?.error?.includes('Secret Key length')) {
        console.log('\n💡 Secret Key Issue Detected:');
        console.log('   The secret_key in the database appears to be in the wrong format.');
        console.log('   GoCardless expects a 43-character base64 string.');
        console.log('   Current length suggests it might be hex-encoded.');
        console.log('\n   To fix:');
        console.log('   1. Get the correct secret_key from GoCardless dashboard');
        console.log('   2. Update it using: POST /api/integrations/configs');
      }
    }

    // 4. Check existing accounts
    console.log('\n4️⃣ Checking existing accounts...');
    try {
      const accountsRes = await axios.get(
        `${API_BASE}/financial/accounts`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      if (accountsRes.data.success && accountsRes.data.data.length > 0) {
        console.log(`✅ Found ${accountsRes.data.data.length} existing account(s):`);
        accountsRes.data.data.forEach(acc => {
          console.log(`   - ${acc.name} (${acc.account_id})`);
          console.log(`     Balance: ${acc.balance} ${acc.currency}`);
        });
      } else {
        console.log('❌ No accounts found');
      }
    } catch (error) {
      console.log('❌ Failed to fetch accounts');
    }

  } catch (error) {
    console.error('❌ Setup check failed:', error.message);
  }
}

// Run the check
checkGoCardlessSetup();