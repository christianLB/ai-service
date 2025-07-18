#!/usr/bin/env node

const axios = require('axios');

async function testEncryption() {
  console.log('🔐 Testing GoCardless Encryption/Decryption\n');

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

    // 2. Update secret_id to "SECRET_ID"
    console.log('2️⃣ Updating secret_id to "SECRET_ID"...');
    try {
      await axios.put(
        `${API_BASE}/integrations/configs`,
        {
          integrationType: 'gocardless',
          configKey: 'secret_id',
          configValue: 'SECRET_ID',
          isEncrypted: true
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      console.log('✅ secret_id updated\n');
    } catch (error) {
      console.log('❌ Failed to update secret_id:', error.response?.data?.error || error.message);
    }

    // 3. Update secret_key to "SECRET_KEY"
    console.log('3️⃣ Updating secret_key to "SECRET_KEY"...');
    try {
      await axios.put(
        `${API_BASE}/integrations/configs`,
        {
          integrationType: 'gocardless',
          configKey: 'secret_key',
          configValue: 'SECRET_KEY',
          isEncrypted: true
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      console.log('✅ secret_key updated\n');
    } catch (error) {
      console.log('❌ Failed to update secret_key:', error.response?.data?.error || error.message);
    }

    // 4. Run diagnosis to see what happens
    console.log('4️⃣ Running diagnosis to check encryption/decryption...');
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

    // 5. Try to setup BBVA to see the actual error
    console.log('\n5️⃣ Attempting setup to see decrypted values in error...');
    try {
      await axios.post(
        `${API_BASE}/financial/setup-bbva`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
    } catch (error) {
      console.log('Expected error:', error.response?.data?.error || error.message);
      
      // The error message might reveal information about the decrypted values
      if (error.response?.data?.error?.includes('length')) {
        console.log('\n📊 Analysis:');
        console.log('The error shows the actual length of the decrypted values.');
        console.log('If "SECRET_ID" (9 chars) shows as 9, encryption/decryption works.');
        console.log('If "SECRET_KEY" (10 chars) shows as 10, encryption/decryption works.');
      }
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run the test
testEncryption();