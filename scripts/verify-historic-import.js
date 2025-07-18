#!/usr/bin/env node

require('dotenv').config();
const { Pool } = require('pg');

// Database connection using .env
const dbUrl = process.env.DATABASE_URL || 'postgresql://postgres:changeme@localhost:5432/ai_service';
const connectionString = dbUrl.replace(':5432', ':5434'); // Use the actual port

const pool = new Pool({
  connectionString: connectionString,
  ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : false
});

async function verifyImport() {
  const client = await pool.connect();
  
  try {
    console.log('🔍 Verifying historic transaction import...\n');
    
    // 1. Count total transactions
    const countResult = await client.query(`
      SELECT COUNT(*) as total,
             COUNT(CASE WHEN reference LIKE 'HIST_%' THEN 1 END) as historic,
             MIN(date) as earliest_date,
             MAX(date) as latest_date
      FROM financial.transactions
    `);
    
    const stats = countResult.rows[0];
    console.log('📊 Transaction Statistics:');
    console.log(`   Total transactions: ${stats.total}`);
    console.log(`   Historic imports: ${stats.historic}`);
    console.log(`   Date range: ${stats.earliest_date ? new Date(stats.earliest_date).toISOString().split('T')[0] : 'N/A'} to ${stats.latest_date ? new Date(stats.latest_date).toISOString().split('T')[0] : 'N/A'}`);
    console.log('');
    
    // 2. Sample transactions
    console.log('📝 Sample Historic Transactions:');
    const sampleResult = await client.query(`
      SELECT transaction_id, date, amount, description, reference, 
             metadata->>'import_file' as import_file
      FROM financial.transactions
      WHERE reference LIKE 'HIST_%'
      ORDER BY date
      LIMIT 5
    `);
    
    sampleResult.rows.forEach((tx, idx) => {
      console.log(`\n${idx + 1}. ${new Date(tx.date).toISOString().split('T')[0]} | €${tx.amount}`);
      console.log(`   Description: ${tx.description}`);
      console.log(`   Reference: ${tx.reference}`);
      console.log(`   Import file: ${tx.import_file}`);
    });
    
    // 3. Monthly summary
    console.log('\n\n📅 Monthly Summary:');
    const monthlyResult = await client.query(`
      SELECT 
        TO_CHAR(date, 'YYYY-MM') as month,
        COUNT(*) as transaction_count,
        SUM(CASE WHEN amount < 0 THEN amount ELSE 0 END) as total_debits,
        SUM(CASE WHEN amount > 0 THEN amount ELSE 0 END) as total_credits,
        SUM(amount) as net_change
      FROM financial.transactions
      WHERE reference LIKE 'HIST_%'
      GROUP BY TO_CHAR(date, 'YYYY-MM')
      ORDER BY month
    `);
    
    monthlyResult.rows.forEach(month => {
      console.log(`\n${month.month}:`);
      console.log(`   Transactions: ${month.transaction_count}`);
      console.log(`   Debits: €${parseFloat(month.total_debits).toFixed(2)}`);
      console.log(`   Credits: €${parseFloat(month.total_credits).toFixed(2)}`);
      console.log(`   Net: €${parseFloat(month.net_change).toFixed(2)}`);
    });
    
    // 4. Check for potential duplicates
    console.log('\n\n🔍 Checking for Potential Duplicates:');
    const dupResult = await client.query(`
      SELECT date, amount, COUNT(*) as count
      FROM financial.transactions
      WHERE reference LIKE 'HIST_%'
      GROUP BY date, amount
      HAVING COUNT(*) > 1
      LIMIT 10
    `);
    
    if (dupResult.rows.length === 0) {
      console.log('✅ No duplicate transactions found based on date and amount');
    } else {
      console.log('⚠️  Potential duplicates found:');
      dupResult.rows.forEach(dup => {
        console.log(`   ${dup.date} | €${dup.amount} | Count: ${dup.count}`);
      });
    }
    
    // 5. Account verification
    console.log('\n\n💳 Account Verification:');
    const accountResult = await client.query(`
      SELECT DISTINCT 
        t.account_id,
        a.name as account_name,
        a.iban,
        COUNT(t.id) as transaction_count
      FROM financial.transactions t
      JOIN financial.accounts a ON (t.account_id = a.account_id OR t.account_id = a.id::text)
      WHERE t.reference LIKE 'HIST_%'
      GROUP BY t.account_id, a.name, a.iban
    `);
    
    accountResult.rows.forEach(acc => {
      console.log(`\n   Account: ${acc.account_name}`);
      console.log(`   IBAN: ${acc.iban}`);
      console.log(`   Historic transactions: ${acc.transaction_count}`);
    });
    
    console.log('\n\n✅ Verification complete!');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
  } finally {
    client.release();
    await pool.end();
  }
}

// Run verification
verifyImport().catch(console.error);