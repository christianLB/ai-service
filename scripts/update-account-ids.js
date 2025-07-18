#!/usr/bin/env node

const { Pool } = require('pg');

async function updateAccountIds() {
  console.log('🔧 Updating account_ids from metadata\n');

  // Database connection
  const pool = new Pool({
    host: 'localhost',
    port: 5434, // Docker PostgreSQL port
    database: 'ai_service',
    user: 'ai_user',
    password: 'ultra_secure_password_2025'
  });

  try {
    // 1. First, let's see what we have
    console.log('1️⃣ Checking current accounts...');
    const checkQuery = `
      SELECT 
        id,
        name,
        account_id,
        metadata->>'gocardless_account_id' as gocardless_id_in_metadata
      FROM financial.accounts
      WHERE type = 'bank_account'
    `;
    
    const checkResult = await pool.query(checkQuery);
    console.log(`Found ${checkResult.rows.length} bank accounts:\n`);
    
    checkResult.rows.forEach(row => {
      console.log(`Account: ${row.name}`);
      console.log(`  - ID: ${row.id}`);
      console.log(`  - Current account_id: ${row.account_id || 'NULL'}`);
      console.log(`  - GoCardless ID in metadata: ${row.gocardless_id_in_metadata || 'NULL'}`);
      console.log(`  - Needs update: ${!row.account_id && row.gocardless_id_in_metadata ? 'YES' : 'NO'}`);
      console.log();
    });

    // 2. Update account_ids
    console.log('2️⃣ Updating account_ids...');
    const updateQuery = `
      UPDATE financial.accounts 
      SET account_id = metadata->>'gocardless_account_id'
      WHERE metadata->>'gocardless_account_id' IS NOT NULL 
        AND account_id IS NULL
        AND type = 'bank_account'
      RETURNING id, name, account_id
    `;
    
    const updateResult = await pool.query(updateQuery);
    
    if (updateResult.rows.length > 0) {
      console.log(`✅ Updated ${updateResult.rows.length} accounts:\n`);
      updateResult.rows.forEach(row => {
        console.log(`  - ${row.name}: account_id = ${row.account_id}`);
      });
    } else {
      console.log('ℹ️  No accounts needed updating');
    }

    // 3. Verify the update
    console.log('\n3️⃣ Verifying update...');
    const verifyQuery = `
      SELECT 
        name,
        account_id,
        metadata->>'gocardless_account_id' as gocardless_id_in_metadata
      FROM financial.accounts
      WHERE type = 'bank_account'
    `;
    
    const verifyResult = await pool.query(verifyQuery);
    console.log('\nFinal state:');
    verifyResult.rows.forEach(row => {
      const match = row.account_id === row.gocardless_id_in_metadata;
      console.log(`  - ${row.name}: ${match ? '✅' : '❌'} account_id matches metadata`);
    });

    console.log('\n✅ Account ID update completed!');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

// Run the update
updateAccountIds();