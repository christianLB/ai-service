#!/usr/bin/env node

const axios = require('axios');

async function checkAccountsDetailed() {
  console.log('🔍 Checking Accounts Detailed\n');

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

    // 2. Get accounts with full details
    console.log('2️⃣ Getting account details from API...');
    const accountsRes = await axios.get(
      `${API_BASE}/financial/accounts`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    
    console.log('Raw response:', JSON.stringify(accountsRes.data, null, 2));
    console.log('\n---\n');
    
    if (accountsRes.data.data) {
      accountsRes.data.data.forEach(acc => {
        console.log(`Account: ${acc.name}`);
        Object.keys(acc).forEach(key => {
          console.log(`  ${key}: ${JSON.stringify(acc[key])}`);
        });
        console.log();
      });
    }

    // 3. Try sync with explicit logging
    console.log('3️⃣ Attempting sync with detailed logging...');
    try {
      const syncRes = await axios.post(
        `${API_BASE}/financial/sync/transactions`,
        { days: 1 }, // Just 1 day to minimize calls
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      console.log('Sync response:', JSON.stringify(syncRes.data, null, 2));
    } catch (error) {
      console.log('Sync error:', error.response?.status, error.response?.data);
    }

  } catch (error) {
    console.error('❌ Check failed:', error.message);
  }
}

// Run the check
checkAccountsDetailed();