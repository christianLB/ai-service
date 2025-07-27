#!/usr/bin/env node

const fs = require('fs').promises;
const path = require('path');
const axios = require('axios');
const { checkAccountsForImport, HISTORIC_IBAN } = require('./check-accounts-for-import');

const API_BASE = 'http://localhost:3001/api';
const HISTORIC_DIR = path.join(__dirname, '../historic_transactions');

// Reference prefix for historic transactions
const REFERENCE_PREFIX = 'HIST';
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
 * Login to the API
 */
async function login() {
  const loginRes = await axios.post(`${API_BASE}/auth/login`, {
    email: 'admin@ai-service.local',
    password: 'admin123'
  });
  return loginRes.data.accessToken;
}

/**
 * Get account by IBAN
 */
async function getAccountByIBAN(token, iban) {
  const accountsRes = await axios.get(
    `${API_BASE}/financial/accounts`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  
  const accounts = accountsRes.data.data || [];
  return accounts.find(acc => acc.iban === iban);
}

/**
 * Get EUR currency ID
 */
async function getEurCurrencyId(token) {
  try {
    const currenciesRes = await axios.get(
      `${API_BASE}/financial/currencies`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    
    const currencies = currenciesRes.data.data || [];
    const eurCurrency = currencies.find(c => c.code === 'EUR');
    return eurCurrency ? eurCurrency.id : null;
  } catch (error) {
    // If endpoint doesn't exist, use default
    console.log('⚠️  Currencies endpoint not available, using default EUR currency ID');
    return 'EUR'; // Fallback
  }
}

/**
 * Check if transaction already exists
 */
async function checkDuplicateTransaction(token, accountId, date, amount, description) {
  try {
    // Convert date to start and end of day for comparison
    const txDate = new Date(date);
    const startDate = new Date(txDate);
    startDate.setHours(0, 0, 0, 0);
    const endDate = new Date(txDate);
    endDate.setHours(23, 59, 59, 999);
    
    const response = await axios.get(
      `${API_BASE}/financial/transactions`,
      {
        headers: { Authorization: `Bearer ${token}` },
        params: {
          accountId: accountId,
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
          limit: 100
        }
      }
    );
    
    const transactions = response.data.data || [];
    
    // Check for exact duplicates
    const duplicate = transactions.find(tx => {
      const txAmount = parseFloat(tx.amount);
      const checkAmount = parseFloat(amount);
      const amountMatch = Math.abs(txAmount - checkAmount) < 0.01;
      
      // Check if descriptions are similar (could be formatted differently)
      const descMatch = tx.description && description && 
        (tx.description.toLowerCase().includes(description.toLowerCase()) ||
         description.toLowerCase().includes(tx.description.toLowerCase()));
      
      return amountMatch && (descMatch || tx.reference?.startsWith(REFERENCE_PREFIX));
    });
    
    return duplicate;
  } catch (error) {
    console.log('⚠️  Error checking duplicates:', error.message);
    return null;
  }
}

/**
 * Create a transaction via API
 */
async function createTransaction(token, transaction) {
  try {
    const response = await axios.post(
      `${API_BASE}/financial/transactions`,
      transaction,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.message || error.message);
  }
}

/**
 * Import transactions from a single JSON file
 */
async function importTransactionsFromFile(token, jsonFile, account, currencyId, options = {}) {
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
        token,
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
      
      // Prepare transaction for import
      const transaction = {
        accountId: account.account_id || account.id,
        type: tx.type,
        status: tx.status,
        amount: tx.amount,
        currencyId: currencyId || tx.currencyCode,
        description: tx.description,
        reference: generateHistoricReference(),
        date: tx.date,
        counterpartyName: tx.counterpartyName,
        counterpartyAccount: tx.counterpartyAccount,
        metadata: {
          ...tx.metadata,
          source: 'historic_import',
          original_reference: tx.reference,
          import_date: new Date().toISOString(),
          import_file: results.file
        }
      };
      
      if (options.dryRun) {
        console.log(`   🔍 [DRY RUN] Would import: ${tx.date} | €${tx.amount} | ${tx.description}`);
        results.imported++;
      } else {
        await createTransaction(token, transaction);
        results.imported++;
        if (options.verbose) {
          console.log(`   ✅ Imported: ${tx.date} | €${tx.amount} | ${tx.description}`);
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
  console.log('🚀 Starting historic transaction import...\n');
  
  try {
    // 1. Login
    console.log('1️⃣ Logging in...');
    const token = await login();
    console.log('✅ Login successful\n');
    
    // 2. Check for matching account
    console.log('2️⃣ Checking for account with IBAN:', HISTORIC_IBAN);
    const account = await getAccountByIBAN(token, HISTORIC_IBAN);
    
    if (!account) {
      console.error('❌ No account found with the required IBAN');
      console.error('   Please ensure the BBVA account is connected via GoCardless first');
      return;
    }
    
    console.log(`✅ Found account: ${account.name} (ID: ${account.account_id || account.id})\n`);
    
    // 3. Get EUR currency ID
    console.log('3️⃣ Getting EUR currency ID...');
    const currencyId = await getEurCurrencyId(token);
    console.log(`✅ Currency ID: ${currencyId}\n`);
    
    // 4. Get all JSON files
    console.log('4️⃣ Loading historic transaction files...');
    const files = await fs.readdir(HISTORIC_DIR);
    const jsonFiles = files
      .filter(file => file.endsWith('.json') && !file.includes('summary'))
      .sort();
    
    console.log(`Found ${jsonFiles.length} transaction files to process`);
    
    if (options.dryRun) {
      console.log('\n⚠️  DRY RUN MODE - No transactions will be imported\n');
    }
    
    // 5. Import transactions from each file
    const allResults = [];
    let totalImported = 0;
    let totalSkipped = 0;
    let totalErrors = 0;
    
    for (const jsonFile of jsonFiles) {
      const filePath = path.join(HISTORIC_DIR, jsonFile);
      const results = await importTransactionsFromFile(
        token,
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
    } else {
      console.log('\n✅ Import completed successfully!');
    }
    
  } catch (error) {
    console.error('\n❌ Fatal error:', error.message);
    if (options.verbose) {
      console.error(error.stack);
    }
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
Historic Transaction Import Script

Usage: node import-historic-transactions.js [options]

Options:
  --dry-run         Simulate the import without making changes
  --verbose         Show detailed output for each transaction
  --show-duplicates Show duplicate transactions that were skipped
  --help           Show this help message

Examples:
  node import-historic-transactions.js --dry-run
  node import-historic-transactions.js --verbose --show-duplicates
`);
  process.exit(0);
}

// Run the import
importHistoricTransactions(options).catch(console.error);