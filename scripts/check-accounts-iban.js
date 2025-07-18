#!/usr/bin/env node

const axios = require('axios');

const API_BASE = 'http://localhost:3000/api';
const HISTORIC_IBAN = process.env.HISTORIC_IBAN || 'ES36XXXXXXXXXXXXXXXXXXXX'; // IBAN redacted for security

async function checkAccounts() {
  console.log('🔍 Checking accounts and IBANs for historic transaction import...\n');
  
  try {
    console.log('🔍 Checking accounts in financial.accounts table...\n');
    
    // Get all accounts with their IBANs
    const accountsResult = await client.query(`
      SELECT 
        id,
        account_id,
        name,
        type,
        iban,
        institution_id,
        balance,
        is_active,
        created_at,
        metadata
      FROM financial.accounts
      ORDER BY created_at DESC
    `);
    
    console.log(`Found ${accountsResult.rows.length} accounts:\n`);
    
    accountsResult.rows.forEach((account, index) => {
      console.log(`${index + 1}. ${account.name}`);
      console.log(`   ID: ${account.id}`);
      console.log(`   Account ID: ${account.account_id || 'NULL'}`);
      console.log(`   Type: ${account.type}`);
      console.log(`   IBAN: ${account.iban || 'Not set'}`);
      console.log(`   Institution: ${account.institution_id || 'N/A'}`);
      console.log(`   Balance: €${account.balance}`);
      console.log(`   Active: ${account.is_active}`);
      console.log(`   Created: ${account.created_at}`);
      if (account.metadata?.gocardless_account_id) {
        console.log(`   GoCardless ID (in metadata): ${account.metadata.gocardless_account_id}`);
      }
      console.log('');
    });
    
    // Check for accounts with matching IBAN from historic data
    const historicIBAN = process.env.HISTORIC_IBAN || 'ES36XXXXXXXXXXXXXXXXXXXX'; // IBAN redacted for security
    console.log(`\n🔍 Looking for account with IBAN: ${historicIBAN}`);
    
    const matchingAccount = accountsResult.rows.find(acc => acc.iban === historicIBAN);
    if (matchingAccount) {
      console.log(`✅ Found matching account: ${matchingAccount.name} (ID: ${matchingAccount.account_id})`);
    } else {
      console.log(`❌ No account found with IBAN ${historicIBAN}`);
    }
    
    // Check transaction counts per account
    console.log('\n📊 Transaction counts per account:\n');
    
    for (const account of accountsResult.rows) {
      if (account.account_id) {
        const txResult = await client.query(`
          SELECT COUNT(*) as count,
                 MIN(date) as first_date,
                 MAX(date) as last_date
          FROM financial.transactions
          WHERE account_id = $1
        `, [account.account_id]);
        
        const txCount = txResult.rows[0];
        if (txCount.count > 0) {
          console.log(`${account.name}: ${txCount.count} transactions`);
          console.log(`   Period: ${txCount.first_date ? new Date(txCount.first_date).toISOString().split('T')[0] : 'N/A'} to ${txCount.last_date ? new Date(txCount.last_date).toISOString().split('T')[0] : 'N/A'}`);
        }
      }
    }
    
    // Check for schema inconsistencies
    console.log('\n🔍 Checking for schema inconsistencies...\n');
    
    // Check if old schemas exist
    const schemasResult = await client.query(`
      SELECT schema_name 
      FROM information_schema.schemata 
      WHERE schema_name LIKE '%financial%' OR schema_name LIKE '%account%'
      ORDER BY schema_name
    `);
    
    console.log('Database schemas:');
    schemasResult.rows.forEach(row => {
      console.log(`- ${row.schema_name}`);
    });
    
    // Check for duplicate account tables
    const tablesResult = await client.query(`
      SELECT table_schema, table_name 
      FROM information_schema.tables 
      WHERE table_name LIKE '%account%' 
      AND table_schema NOT IN ('information_schema', 'pg_catalog')
      ORDER BY table_schema, table_name
    `);
    
    console.log('\nAccount-related tables:');
    tablesResult.rows.forEach(row => {
      console.log(`- ${row.table_schema}.${row.table_name}`);
    });
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    client.release();
    await pool.end();
  }
}

// Run the check
checkAccounts().catch(console.error);