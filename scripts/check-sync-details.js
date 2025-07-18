#!/usr/bin/env node

const axios = require('axios');

async function checkSyncDetails() {
  console.log('🔍 Checking Sync Details and Rate Limits\n');

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

    // 2. Get updated accounts
    console.log('2️⃣ Getting account details...');
    const accountsRes = await axios.get(
      `${API_BASE}/financial/accounts`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    
    console.log(`Found ${accountsRes.data.data.length} accounts:`);
    const accounts = accountsRes.data.data;
    accounts.forEach(acc => {
      console.log(`\n  Account: ${acc.name}`);
      console.log(`  - Internal ID: ${acc.id}`);
      console.log(`  - GoCardless ID: ${acc.account_id || 'NOT SET'}`);
      console.log(`  - Balance: ${acc.balance} ${acc.currency || 'EUR'}`);
      console.log(`  - Last sync: ${acc.last_sync || 'Never'}`);
      console.log(`  - Active: ${acc.is_active}`);
      console.log(`  - Metadata:`, acc.metadata || {});
    });

    // 3. Try manual sync for each account individually
    console.log('\n3️⃣ Attempting individual account sync...');
    for (const account of accounts) {
      if (account.account_id) {
        console.log(`\nSyncing ${account.name} (${account.account_id})...`);
        
        // Try sync transactions
        try {
          const syncRes = await axios.post(
            `${API_BASE}/financial/sync/transactions`,
            { 
              days: 7,
              accountId: account.account_id 
            },
            { headers: { Authorization: `Bearer ${token}` } }
          );
          
          console.log('Response:', JSON.stringify(syncRes.data, null, 2));
        } catch (error) {
          console.log('❌ Sync failed:', error.response?.data?.error || error.message);
          if (error.response?.data?.details) {
            console.log('Details:', error.response.data.details);
          }
        }
      }
    }

    // 4. Check rate limit status
    console.log('\n4️⃣ Checking rate limit status...');
    // This would normally query the rate_limit_tracking table
    console.log('Rate limit tracking is managed internally by the service.');
    console.log('Each API call to GoCardless is tracked to prevent exceeding limits.');

    // 5. Try full sync
    console.log('\n5️⃣ Attempting full sync...');
    try {
      const fullSyncRes = await axios.post(
        `${API_BASE}/financial/sync`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      console.log('Full sync response:', JSON.stringify(fullSyncRes.data, null, 2));
    } catch (error) {
      console.log('❌ Full sync failed:', error.response?.data?.error || error.message);
    }

    // 6. Get sync logs
    console.log('\n6️⃣ Getting sync status...');
    const statusRes = await axios.get(
      `${API_BASE}/financial/sync-status`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    
    console.log('Sync status:', JSON.stringify(statusRes.data, null, 2));

  } catch (error) {
    console.error('❌ Check failed:', error.message);
  }
}

// Run the check
checkSyncDetails();