#!/usr/bin/env node

const axios = require('axios');

const API_BASE = 'http://localhost:3000/api';
const HISTORIC_IBAN = process.env.HISTORIC_IBAN || 'ES36XXXXXXXXXXXXXXXXXXXX'; // IBAN redacted for security

async function checkAccountsForImport() {
  console.log('🔍 Checking accounts and IBANs for historic transaction import...\n');
  
  try {
    // 1. Login
    console.log('1️⃣ Logging in...');
    const loginRes = await axios.post(`${API_BASE}/auth/login`, {
      email: 'admin@ai-service.local',
      password: 'admin123'
    });
    const token = loginRes.data.accessToken;
    console.log('✅ Login successful\n');

    // 2. Get all accounts
    console.log('2️⃣ Fetching all accounts...');
    const accountsRes = await axios.get(
      `${API_BASE}/financial/accounts`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    
    const accounts = accountsRes.data.data || [];
    console.log(`Found ${accounts.length} accounts:\n`);
    
    // Display all accounts with their IBANs
    accounts.forEach((account, index) => {
      console.log(`${index + 1}. ${account.name}`);
      console.log(`   Account ID: ${account.account_id || 'NULL'}`);
      console.log(`   IBAN: ${account.iban || 'Not set'}`);
      console.log(`   Type: ${account.type}`);
      console.log(`   Institution: ${account.institution_id || 'N/A'}`);
      console.log(`   Balance: €${account.balance}`);
      console.log(`   Active: ${account.is_active}`);
      console.log('');
    });
    
    // 3. Check for matching IBAN
    console.log(`\n3️⃣ Looking for account with historic IBAN: ${HISTORIC_IBAN}`);
    
    const matchingAccount = accounts.find(acc => acc.iban === HISTORIC_IBAN);
    if (matchingAccount) {
      console.log(`\n✅ FOUND MATCHING ACCOUNT!`);
      console.log(`   Name: ${matchingAccount.name}`);
      console.log(`   Account ID: ${matchingAccount.account_id}`);
      console.log(`   This account can be used for importing historic transactions\n`);
      
      // Check existing transactions for this account
      if (matchingAccount.account_id) {
        console.log('4️⃣ Checking existing transactions for this account...');
        try {
          const txRes = await axios.get(
            `${API_BASE}/financial/transactions?accountId=${matchingAccount.account_id}&limit=5`,
            { headers: { Authorization: `Bearer ${token}` } }
          );
          
          const transactions = txRes.data.data || [];
          console.log(`   Found ${txRes.data.total || 0} existing transactions`);
          
          if (transactions.length > 0) {
            console.log(`   Latest transactions:`);
            transactions.slice(0, 3).forEach(tx => {
              console.log(`   - ${new Date(tx.date).toISOString().split('T')[0]} | €${tx.amount} | ${tx.description || 'No description'}`);
            });
          }
        } catch (txError) {
          console.log('   No transactions found or error fetching transactions');
        }
      }
      
      return matchingAccount;
    } else {
      console.log(`\n❌ No account found with IBAN ${HISTORIC_IBAN}`);
      console.log('\n⚠️  IMPORTANT: The historic transactions cannot be imported without a matching account.');
      console.log('   Options:');
      console.log('   1. Connect the BBVA account through GoCardless first');
      console.log('   2. Manually update an existing account to have this IBAN');
      console.log('   3. Create a new account with this IBAN\n');
      
      return null;
    }
    
  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
    return null;
  }
}

// Export for use in other scripts
module.exports = { checkAccountsForImport, HISTORIC_IBAN };

// Run if called directly
if (require.main === module) {
  checkAccountsForImport();
}