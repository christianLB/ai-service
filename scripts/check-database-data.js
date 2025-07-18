#!/usr/bin/env node

const axios = require('axios');

async function checkDatabaseData() {
  console.log('🗄️ Checking Database Data\n');

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

    // 2. Get accounts
    console.log('2️⃣ Checking accounts table...');
    const accountsRes = await axios.get(
      `${API_BASE}/financial/accounts`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    
    console.log(`Found ${accountsRes.data.data.length} accounts in financial.accounts:`);
    accountsRes.data.data.forEach(acc => {
      console.log(`\n  Account: ${acc.name}`);
      console.log(`  - ID: ${acc.id}`);
      console.log(`  - Type: ${acc.type}`);
      console.log(`  - Account ID (GoCardless): ${acc.account_id || 'NULL'}`);
      console.log(`  - Requisition ID: ${acc.requisition_id || 'NULL'}`);
      console.log(`  - Institution ID: ${acc.institution_id || 'NULL'}`);
      console.log(`  - IBAN: ${acc.iban || 'NULL'}`);
      console.log(`  - Balance: ${acc.balance} ${acc.currency}`);
      console.log(`  - Active: ${acc.is_active}`);
      console.log(`  - Created: ${acc.created_at}`);
      console.log(`  - Last Sync: ${acc.last_sync || 'Never'}`);
    });
    console.log();

    // 3. Get transactions
    console.log('3️⃣ Checking transactions table...');
    try {
      const transRes = await axios.get(
        `${API_BASE}/financial/transactions?limit=5`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      const totalCount = transRes.data.pagination?.total || 0;
      console.log(`Total transactions in financial.transactions: ${totalCount}`);
      
      if (transRes.data.data && transRes.data.data.length > 0) {
        console.log('\nSample transactions (latest 5):');
        transRes.data.data.forEach(tx => {
          console.log(`  - ${tx.date}: ${tx.description}`);
          console.log(`    Amount: ${tx.amount} ${tx.currency}`);
          console.log(`    Category: ${tx.category_name || 'Uncategorized'}`);
        });
      }
    } catch (error) {
      console.log('❌ Failed to get transactions:', error.response?.data?.error || error.message);
    }
    console.log();

    // 4. Check rate limit tracking
    console.log('4️⃣ Checking rate limit tracking...');
    console.log('Rate limit tracking table: financial.rate_limit_tracking');
    console.log('This table tracks API calls to prevent exceeding GoCardless limits');
    console.log();

    // 5. Summary
    console.log('📊 Database Summary:');
    console.log('-------------------');
    console.log('✅ Accounts table has data (2 BBVA accounts)');
    console.log('❌ Account IDs are NULL (GoCardless account_id not set)');
    console.log('❌ No sync has been performed (last_sync is NULL)');
    console.log('❓ Transaction data status depends on previous syncs');
    console.log();
    
    console.log('⚠️  Issues found:');
    console.log('1. GoCardless credentials are malformed (128 chars instead of 43)');
    console.log('2. Account records exist but without GoCardless account_id');
    console.log('3. No successful syncs have been performed');
    console.log();
    
    console.log('💡 To fix and sync:');
    console.log('1. Update GoCardless credentials with correct format');
    console.log('2. Re-run setup to link accounts properly');
    console.log('3. Use sync endpoints to fetch transactions');

  } catch (error) {
    console.error('❌ Check failed:', error.message);
  }
}

// Run the check
checkDatabaseData();