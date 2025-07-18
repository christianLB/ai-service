#!/usr/bin/env node

require('dotenv').config();
const fs = require('fs').promises;
const path = require('path');
const { Pool } = require('pg');
const { v4: uuidv4 } = require('uuid');

const HISTORIC_DIR = path.join(__dirname, '../historic_transactions');
const HISTORIC_IBAN = process.env.HISTORIC_IBAN || 'ES36XXXXXXXXXXXXXXXXXXXX'; // IBAN redacted for security
const REFERENCE_PREFIX = 'HIST';

// Database connection using .env
// Override port if different from default
const dbUrl = process.env.DATABASE_URL || 'postgresql://postgres:changeme@localhost:5432/ai_service';
const connectionString = dbUrl.replace(':5432', ':5434'); // Use the actual port

const pool = new Pool({
  connectionString: connectionString,
  ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : false
});

let referenceCounter = 1;

/**
 * Generate unique reference for historic transactions
 */
function generateHistoricReference() {
  const timestamp = Date.now();
  const reference = `${REFERENCE_PREFIX}_${timestamp}_${referenceCounter++}`;
  return reference;
}

/**
 * Get account by IBAN
 */
async function getAccountByIBAN(client, iban) {
  const result = await client.query(
    `SELECT id, account_id, name, type, currency_id 
     FROM financial.accounts 
     WHERE iban = $1 AND is_active = true
     LIMIT 1`,
    [iban]
  );
  
  return result.rows[0] || null;
}

/**
 * Get EUR currency
 */
async function getEurCurrency(client) {
  const result = await client.query(
    `SELECT id FROM financial.currencies WHERE code = 'EUR' LIMIT 1`
  );
  
  if (result.rows[0]) {
    return result.rows[0].id;
  }
  
  // If not found, create EUR currency
  const insertResult = await client.query(
    `INSERT INTO financial.currencies (id, code, name, type, decimals, symbol, is_active)
     VALUES (gen_random_uuid(), 'EUR', 'Euro', 'fiat', 2, '€', true)
     RETURNING id`
  );
  
  return insertResult.rows[0].id;
}

/**
 * Check if transaction already exists
 */
async function checkDuplicateTransaction(client, accountId, date, amount, description) {
  const startDate = new Date(date);
  startDate.setHours(0, 0, 0, 0);
  const endDate = new Date(date);
  endDate.setHours(23, 59, 59, 999);
  
  const result = await client.query(
    `SELECT id, reference, description 
     FROM financial.transactions 
     WHERE account_id = $1 
       AND date >= $2 
       AND date <= $3 
       AND ABS(amount::numeric - $4::numeric) < 0.01
     LIMIT 1`,
    [accountId, startDate, endDate, amount]
  );
  
  if (result.rows.length > 0) {
    const tx = result.rows[0];
    // Check if it's already a historic import or if descriptions match
    if (tx.reference?.startsWith(REFERENCE_PREFIX) || 
        (tx.description && description && 
         tx.description.toLowerCase().includes(description.toLowerCase()))) {
      return tx;
    }
  }
  
  return null;
}

/**
 * Insert transaction into database
 */
async function insertTransaction(client, accountId, currencyId, transaction) {
  const id = uuidv4();
  const reference = generateHistoricReference();
  const transactionId = reference; // Use reference as transaction_id for historic imports
  
  const query = `
    INSERT INTO financial.transactions (
      id, transaction_id, account_id, type, status, amount, currency_id, 
      description, reference, date, counterparty_name, 
      counterparty_account, metadata
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
    RETURNING id
  `;
  
  const values = [
    id,
    transactionId, // Added transaction_id
    accountId,
    transaction.type,
    transaction.status,
    transaction.amount,
    currencyId,
    transaction.description,
    reference,
    transaction.date,
    transaction.counterpartyName,
    transaction.counterpartyAccount,
    JSON.stringify({
      ...transaction.metadata,
      source: 'historic_import',
      original_reference: transaction.reference,
      import_date: new Date().toISOString()
    })
  ];
  
  const result = await client.query(query, values);
  return result.rows[0];
}

/**
 * Import transactions from a single JSON file
 */
async function importTransactionsFromFile(client, jsonFile, account, currencyId, options = {}) {
  const content = await fs.readFile(jsonFile, 'utf8');
  const data = JSON.parse(content);
  
  const results = {
    file: path.basename(jsonFile),
    total: data.transactions.length,
    imported: 0,
    skipped: 0,
    errors: 0,
    duplicates: []
  };
  
  console.log(`\n📄 Processing ${results.file} (${results.total} transactions)`);
  
  for (const tx of data.transactions) {
    try {
      // Check for duplicates
      const duplicate = await checkDuplicateTransaction(
        client,
        account.account_id || account.id,
        tx.date,
        tx.amount,
        tx.description
      );
      
      if (duplicate) {
        results.skipped++;
        results.duplicates.push({
          date: tx.date,
          amount: tx.amount,
          description: tx.description,
          existingRef: duplicate.reference
        });
        if (options.verbose) {
          console.log(`   ⏭️  Skipped duplicate: ${tx.date} | €${tx.amount} | ${tx.description}`);
        }
        continue;
      }
      
      // Insert transaction
      if (options.dryRun) {
        console.log(`   🔍 [DRY RUN] Would import: ${tx.date} | €${tx.amount} | ${tx.description}`);
        results.imported++;
      } else {
        const inserted = await insertTransaction(client, account.account_id || account.id, currencyId, {
          ...tx,
          metadata: {
            ...tx.metadata,
            import_file: results.file
          }
        });
        results.imported++;
        if (options.verbose) {
          console.log(`   ✅ Imported: ${tx.date} | €${tx.amount} | ${tx.description} (ID: ${inserted.id})`);
        }
      }
      
    } catch (error) {
      results.errors++;
      console.error(`   ❌ Error importing transaction: ${error.message}`);
      if (options.verbose) {
        console.error(`      Transaction: ${JSON.stringify(tx, null, 2)}`);
      }
    }
  }
  
  console.log(`   Summary: ${results.imported} imported, ${results.skipped} skipped, ${results.errors} errors`);
  
  return results;
}

/**
 * Main import function
 */
async function importHistoricTransactions(options = {}) {
  console.log('🚀 Starting historic transaction import (direct database)...\n');
  
  const client = await pool.connect();
  
  try {
    // Start transaction for atomicity
    await client.query('BEGIN');
    
    // 1. Check for matching account
    console.log('1️⃣ Checking for account with IBAN:', HISTORIC_IBAN);
    const account = await getAccountByIBAN(client, HISTORIC_IBAN);
    
    if (!account) {
      throw new Error(`No account found with IBAN ${HISTORIC_IBAN}`);
    }
    
    console.log(`✅ Found account: ${account.name} (ID: ${account.account_id || account.id})\n`);
    
    // 2. Get EUR currency ID
    console.log('2️⃣ Getting EUR currency ID...');
    const currencyId = await getEurCurrency(client);
    console.log(`✅ Currency ID: ${currencyId}\n`);
    
    // 3. Get all JSON files
    console.log('3️⃣ Loading historic transaction files...');
    const files = await fs.readdir(HISTORIC_DIR);
    const jsonFiles = files
      .filter(file => file.endsWith('.json') && !file.includes('summary'))
      .sort();
    
    console.log(`Found ${jsonFiles.length} transaction files to process`);
    
    if (options.dryRun) {
      console.log('\n⚠️  DRY RUN MODE - No transactions will be imported\n');
    }
    
    // 4. Import transactions from each file
    const allResults = [];
    let totalImported = 0;
    let totalSkipped = 0;
    let totalErrors = 0;
    
    for (const jsonFile of jsonFiles) {
      const filePath = path.join(HISTORIC_DIR, jsonFile);
      const results = await importTransactionsFromFile(
        client,
        filePath,
        account,
        currencyId,
        options
      );
      
      allResults.push(results);
      totalImported += results.imported;
      totalSkipped += results.skipped;
      totalErrors += results.errors;
    }
    
    // 5. Commit or rollback
    if (options.dryRun || totalErrors > 0) {
      await client.query('ROLLBACK');
      console.log('\n⚠️  Transaction rolled back' + (totalErrors > 0 ? ' due to errors' : ' (dry run)'));
    } else {
      await client.query('COMMIT');
      console.log('\n✅ Transaction committed successfully');
    }
    
    // 6. Generate summary report
    console.log('\n' + '='.repeat(80));
    console.log('📊 IMPORT SUMMARY');
    console.log('='.repeat(80));
    
    allResults.forEach(result => {
      console.log(`\n${result.file}:`);
      console.log(`  Total: ${result.total} | Imported: ${result.imported} | Skipped: ${result.skipped} | Errors: ${result.errors}`);
      
      if (result.duplicates.length > 0 && options.showDuplicates) {
        console.log('  Duplicates:');
        result.duplicates.slice(0, 3).forEach(dup => {
          console.log(`    - ${dup.date} | €${dup.amount} | ${dup.description}`);
        });
        if (result.duplicates.length > 3) {
          console.log(`    ... and ${result.duplicates.length - 3} more`);
        }
      }
    });
    
    console.log('\n' + '-'.repeat(80));
    console.log('TOTALS:');
    console.log(`  Files processed: ${allResults.length}`);
    console.log(`  Transactions imported: ${totalImported}`);
    console.log(`  Duplicates skipped: ${totalSkipped}`);
    console.log(`  Errors: ${totalErrors}`);
    console.log('='.repeat(80));
    
    if (options.dryRun) {
      console.log('\n✅ Dry run completed. Run without --dry-run to actually import transactions.');
    } else if (totalImported > 0) {
      console.log('\n✅ Import completed successfully!');
      console.log(`\n💡 Next steps:`);
      console.log(`   - Run 'node scripts/check-database-data.js' to verify the import`);
      console.log(`   - Check for duplicates when syncing with GoCardless`);
    }
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('\n❌ Fatal error:', error.message);
    if (options.verbose) {
      console.error(error.stack);
    }
  } finally {
    client.release();
    await pool.end();
  }
}

// Parse command line arguments
const args = process.argv.slice(2);
const options = {
  dryRun: args.includes('--dry-run'),
  verbose: args.includes('--verbose'),
  showDuplicates: args.includes('--show-duplicates')
};

if (args.includes('--help')) {
  console.log(`
Historic Transaction Import Script (Direct Database)

Usage: node import-historic-transactions-direct.js [options]

Options:
  --dry-run         Simulate the import without making changes
  --verbose         Show detailed output for each transaction
  --show-duplicates Show duplicate transactions that were skipped
  --help           Show this help message

Examples:
  node import-historic-transactions-direct.js --dry-run
  node import-historic-transactions-direct.js --verbose --show-duplicates
`);
  process.exit(0);
}

// Run the import
importHistoricTransactions(options).catch(console.error);