#!/usr/bin/env node

const axios = require('axios');

async function fixAccountIds() {
  console.log('🔧 Fixing Account IDs\n');

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

    // 2. Get accounts
    console.log('2️⃣ Getting accounts...');
    const accountsRes = await axios.get(
      `${API_BASE}/financial/accounts`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    
    const accounts = accountsRes.data.data;
    console.log(`Found ${accounts.length} accounts to fix:\n`);

    // 3. Update each account
    for (const account of accounts) {
      const gocardlessId = account.metadata?.gocardless_account_id;
      
      if (gocardlessId && !account.account_id) {
        console.log(`Fixing ${account.name}:`);
        console.log(`  - Internal ID: ${account.id}`);
        console.log(`  - GoCardless ID in metadata: ${gocardlessId}`);
        console.log(`  - Current account_id field: ${account.account_id || 'NULL'}`);
        
        // TODO: Need to create an endpoint to update account_id
        // For now, just log what needs to be done
        console.log(`  ⚠️  Need to update account_id to: ${gocardlessId}`);
        console.log();
      }
    }

    // 4. Check rate limit status
    console.log('3️⃣ Checking rate limit info...');
    console.log('The previous sync attempt got a 429 error (Too Many Requests)');
    console.log('GoCardless has rate limits that reset after some time');
    console.log('You may need to wait before attempting another sync');
    console.log();
    
    console.log('💡 Next steps:');
    console.log('1. Update the database to set account_id = metadata->gocardless_account_id');
    console.log('2. Wait for rate limit to reset (usually 15-60 minutes)');
    console.log('3. Try syncing again with smaller date ranges');

  } catch (error) {
    console.error('❌ Fix failed:', error.message);
  }
}

// Run the fix
fixAccountIds();