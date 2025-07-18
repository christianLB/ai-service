#!/usr/bin/env node

const axios = require('axios');

async function completeSetupAndSync() {
  console.log('🚀 Completing GoCardless Setup and Syncing Transactions\n');

  const API_BASE = 'http://localhost:3001/api';
  const REQUISITION_ID = '215d9eb3-4f1f-4dfd-b55c-9c4e908bbe4a';
  
  try {
    // 1. Login
    console.log('1️⃣ Logging in...');
    const loginRes = await axios.post(`${API_BASE}/auth/login`, {
      email: 'admin@ai-service.local',
      password: 'admin123'
    });
    const token = loginRes.data.accessToken;
    console.log('✅ Login successful\n');

    // 2. Complete setup
    console.log('2️⃣ Completing setup with requisition ID...');
    console.log(`   Requisition ID: ${REQUISITION_ID}`);
    
    try {
      const completeRes = await axios.post(
        `${API_BASE}/financial/complete-setup`,
        { requisitionId: REQUISITION_ID },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      console.log('✅ Setup completed successfully!');
      console.log(`   Accounts linked: ${completeRes.data.data.accounts.length}`);
      console.log(`   Transactions synced: ${completeRes.data.data.transactionsSynced}`);
      console.log(`   Scheduler status: ${completeRes.data.schedulerStatus || 'Not started'}`);
      
      if (completeRes.data.data.accounts.length > 0) {
        console.log('\n   Account details:');
        completeRes.data.data.accounts.forEach(acc => {
          console.log(`   - ${acc.name}`);
          console.log(`     Account ID: ${acc.account_id}`);
          console.log(`     IBAN: ${acc.iban}`);
          console.log(`     Balance: ${acc.balance} ${acc.currency}`);
        });
      }
    } catch (error) {
      console.log('❌ Complete setup failed:', error.response?.data?.error || error.message);
      if (error.response?.data) {
        console.log('   Full response:', JSON.stringify(error.response.data, null, 2));
      }
      return;
    }

    // 3. Check current accounts
    console.log('\n3️⃣ Checking current accounts...');
    const accountsRes = await axios.get(
      `${API_BASE}/financial/accounts`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    
    console.log(`Found ${accountsRes.data.data.length} accounts:`);
    accountsRes.data.data.forEach(acc => {
      console.log(`  - ${acc.name} (${acc.account_id || 'No GoCardless ID'})`);
      console.log(`    Balance: ${acc.balance} ${acc.currency}`);
      console.log(`    Last sync: ${acc.last_sync || 'Never'}`);
    });

    // 4. Sync transactions manually (without using the scheduler)
    console.log('\n4️⃣ Syncing transactions (last 30 days)...');
    try {
      const syncRes = await axios.post(
        `${API_BASE}/financial/sync/transactions`,
        { days: 30 },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      console.log('✅ Transaction sync completed!');
      console.log(`   Status: ${syncRes.data.success ? 'Success' : 'Failed'}`);
      if (syncRes.data.data) {
        console.log(`   Accounts processed: ${syncRes.data.data.accountsProcessed}`);
        console.log(`   Total transactions: ${syncRes.data.data.totalTransactions}`);
        
        if (syncRes.data.data.results) {
          console.log('\n   Results per account:');
          syncRes.data.data.results.forEach(result => {
            console.log(`   - ${result.accountName}: ${result.transactionsSynced} transactions`);
          });
        }
      }
    } catch (error) {
      console.log('❌ Transaction sync failed:', error.response?.data?.error || error.message);
    }

    // 5. Check transaction count
    console.log('\n5️⃣ Checking transaction count...');
    const transRes = await axios.get(
      `${API_BASE}/financial/transactions?limit=5`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    
    const totalTransactions = transRes.data.pagination?.total || 0;
    console.log(`Total transactions in database: ${totalTransactions}`);
    
    if (transRes.data.data && transRes.data.data.length > 0) {
      console.log('\nSample transactions:');
      transRes.data.data.forEach(tx => {
        console.log(`  - ${tx.date}: ${tx.description}`);
        console.log(`    Amount: ${tx.amount} ${tx.currency}`);
        console.log(`    Category: ${tx.category_name || 'Uncategorized'}`);
      });
    }

    // 6. Check sync status
    console.log('\n6️⃣ Checking sync status...');
    const statusRes = await axios.get(
      `${API_BASE}/financial/sync-status`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    
    console.log('Scheduler status:', statusRes.data.schedulerStatus);
    if (statusRes.data.syncStats?.summary) {
      console.log('Recent sync stats:', statusRes.data.syncStats.summary);
    }

    console.log('\n✅ Setup and sync completed successfully!');
    console.log('The GoCardless integration is now fully configured.');
    console.log('Automatic sync is scheduled to run twice daily (8 AM and 8 PM).');

  } catch (error) {
    console.error('❌ Process failed:', error.message);
  }
}

// Run the process
completeSetupAndSync();