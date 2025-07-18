#!/usr/bin/env node

const axios = require('axios');

async function testGoCardless() {
  console.log('🔐 Testing GoCardless with updated validation\n');

  const API_BASE = 'http://localhost:3001/api';
  
  try {
    // 1. Login
    console.log('1️⃣ Logging in...');
    const loginRes = await axios.post(`${API_BASE}/auth/login`, {
      email: 'admin@ai-service.local',
      password: 'admin123'
    });
    const token = loginRes.data.accessToken;
    console.log('✅ Login successful\n');

    // 2. Force refresh authentication (this might reload the service)
    console.log('2️⃣ Refreshing GoCardless authentication...');
    try {
      await axios.post(
        `${API_BASE}/financial/refresh-auth`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      console.log('✅ Authentication refreshed\n');
    } catch (error) {
      console.log('⚠️  Refresh auth failed:', error.response?.data?.error || error.message);
    }

    // 3. Run diagnosis
    console.log('3️⃣ Running diagnosis...');
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

    // 4. Try to generate requisition
    console.log('4️⃣ Attempting to generate requisition ID...');
    try {
      const setupRes = await axios.post(
        `${API_BASE}/financial/setup-bbva`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      console.log('✅ Requisition generated successfully!');
      console.log(`   Requisition ID: ${setupRes.data.data.requisitionId}`);
      console.log(`   Consent URL: ${setupRes.data.data.consentUrl}`);
      console.log('\n🎉 SUCCESS! GoCardless is working with the 128-character key!');
      
    } catch (error) {
      console.log('❌ Failed to generate requisition');
      console.log(`   Error: ${error.response?.data?.error || error.message}`);
      
      if (error.response?.data) {
        console.log(`   Full response:`, error.response.data);
      }
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run the test
testGoCardless();