#!/usr/bin/env node

const axios = require('axios');

async function syncTransactionsOnly() {
  console.log('💰 Syncing Transactions Only\n');

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

    // 2. Get current accounts
    console.log('2️⃣ Getting accounts...');
    const accountsRes = await axios.get(
      `${API_BASE}/financial/accounts`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    
    const accounts = accountsRes.data.data;
    console.log(`Found ${accounts.length} accounts:`);
    accounts.forEach(acc => {
      console.log(`  - ${acc.name} (${acc.account_id})`);
    });
    console.log();

    // 3. Sync transactions only (start with 7 days to avoid rate limit)
    console.log('3️⃣ Syncing transactions (last 7 days)...');
    console.log('Note: Starting with 7 days to minimize API calls\n');
    
    try {
      const syncRes = await axios.post(
        `${API_BASE}/financial/sync/transactions`,
        { days: 7 },
        { 
          headers: { Authorization: `Bearer ${token}` },
          timeout: 30000 // 30 second timeout
        }
      );
      
      console.log('✅ Transaction sync completed!');
      if (syncRes.data.success) {
        console.log(`   Status: Success`);
        if (syncRes.data.data) {
          console.log(`   Accounts processed: ${syncRes.data.data.accountsProcessed || 'N/A'}`);
          console.log(`   Total transactions: ${syncRes.data.data.totalTransactions || 0}`);
          
          if (syncRes.data.data.results) {
            console.log('\n   Results per account:');
            syncRes.data.data.results.forEach(result => {
              console.log(`   - ${result.accountName}: ${result.transactionsSynced} transactions`);
              if (result.error) {
                console.log(`     ❌ Error: ${result.error}`);
              }
            });
          }
        }
      }
    } catch (error) {
      console.log('❌ Transaction sync failed');
      console.log(`   Status: ${error.response?.status}`);
      console.log(`   Error: ${error.response?.data?.error || error.message}`);
      
      if (error.response?.status === 429) {
        console.log('\n⚠️  Rate limit still active!');
        console.log('   GoCardless is still limiting requests.');
        console.log('   You may need to wait longer (usually 1-24 hours)');
      }
      
      if (error.response?.data?.details) {
        console.log('\n   Details:', error.response.data.details);
      }
      return;
    }

    // 4. Check transaction count
    console.log('\n4️⃣ Checking transaction count...');
    const transRes = await axios.get(
      `${API_BASE}/financial/transactions?limit=5`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    
    const totalTransactions = transRes.data.pagination?.total || 0;
    console.log(`Total transactions in database: ${totalTransactions}`);
    
    if (transRes.data.data && transRes.data.data.length > 0) {
      console.log('\nSample transactions (latest 5):');
      transRes.data.data.forEach(tx => {
        console.log(`  - ${tx.date}: ${tx.description}`);
        console.log(`    Amount: ${tx.amount} ${tx.currency}`);
        console.log(`    Category: ${tx.category_name || 'Uncategorized'}`);
      });
    }

    // 5. If successful with 7 days, offer to sync more
    if (totalTransactions > 0) {
      console.log('\n✅ Success! Transactions are syncing.');
      console.log('You can now try syncing more days if needed.');
    }

  } catch (error) {
    console.error('❌ Process failed:', error.message);
  }
}

// Run the sync
syncTransactionsOnly();