#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Configuration
const HISTORIC_TRANSACTIONS_DIR = path.join(__dirname, '..', 'historic_transactions');
const ACCOUNT_ID = '44eef950-e08e-45b8-8315-6bfd41f4c10d'; // BBVA Account 8475
const CURRENCY_ID = '32e61502-edc4-48fe-8473-e54d97eb8198'; // EUR

console.log('🔄 Starting transaction transformation...\n');

// Read all JSON files (exclude consolidated_summary.json and already transformed files)
const files = fs.readdirSync(HISTORIC_TRANSACTIONS_DIR)
  .filter(file => 
    file.endsWith('.json') && 
    file !== 'consolidated_summary.json' &&
    !file.includes('_ready_to_import') &&
    file !== 'all_transactions_ready_to_import.json'
  )
  .sort(); // Sort by filename to process chronologically

let allTransactions = [];
let totalProcessed = 0;
let duplicatesFound = 0;
const seenReferences = new Set();

files.forEach(file => {
  console.log(`📄 Processing ${file}...`);
  
  const filePath = path.join(HISTORIC_TRANSACTIONS_DIR, file);
  const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  
  if (!data.transactions || !Array.isArray(data.transactions)) {
    console.warn(`  ⚠️  No transactions found in ${file}`);
    return;
  }
  
  // Extract year and month from filename (e.g., "2024_08_242201001538409.json" -> "2024_08")
  const fileMatch = file.match(/^(\d{4})_(\d{2})_/);
  const yearMonth = fileMatch ? `${fileMatch[1]}_${fileMatch[2]}` : 'UNKNOWN';
  
  const transformedTransactions = [];
  
  data.transactions.forEach((transaction, index) => {
    // Generate unique reference based on file's year/month and transaction index
    const uniqueReference = `BBVA_${yearMonth}_${index + 1}`;
    
    // Check for duplicates (should not happen with new naming scheme)
    if (seenReferences.has(uniqueReference)) {
      console.warn(`  ⚠️  Duplicate reference found: ${uniqueReference}`);
      duplicatesFound++;
      return;
    }
    seenReferences.add(uniqueReference);
    
    // Transform transaction to database format
    const transformed = {
      transaction_id: `HIST_${uniqueReference}`,
      account_id: ACCOUNT_ID,
      amount: transaction.amount,
      currency_id: CURRENCY_ID,
      type: transaction.type || 'bank_transfer',
      status: transaction.status || 'confirmed',
      description: transaction.description || '',
      reference: uniqueReference,
      counterparty_name: transaction.counterpartyName || transaction.description || null,
      counterparty_account: transaction.counterpartyAccount || null,
      date: transaction.date.split('T')[0], // Extract date part only
      metadata: {
        ...transaction.metadata,
        original_reference: transaction.reference,
        source_file: file,
        imported_at: new Date().toISOString()
      },
      tags: [],
      fee_amount: null,
      fee_currency_id: null,
      gocardless_data: null,
      transaction_hash: null,
      block_number: null,
      gas_used: null,
      gas_price: null,
      from_address: null,
      to_address: null
    };
    
    transformedTransactions.push(transformed);
    allTransactions.push(transformed);
    totalProcessed++;
  });
  
  // Save individual transformed file
  const outputFile = file.replace('.json', '_ready_to_import.json');
  const outputPath = path.join(HISTORIC_TRANSACTIONS_DIR, outputFile);
  
  fs.writeFileSync(outputPath, JSON.stringify({
    metadata: {
      original_file: file,
      transformed_at: new Date().toISOString(),
      account_id: ACCOUNT_ID,
      currency_id: CURRENCY_ID,
      transaction_count: transformedTransactions.length
    },
    transactions: transformedTransactions
  }, null, 2));
  
  console.log(`  ✅ Transformed ${transformedTransactions.length} transactions → ${outputFile}`);
});

// Create consolidated file for all transactions
const consolidatedPath = path.join(HISTORIC_TRANSACTIONS_DIR, 'all_transactions_ready_to_import.json');

// Sort all transactions by date
allTransactions.sort((a, b) => new Date(a.date) - new Date(b.date));

// Calculate summary statistics
const totalDebits = allTransactions
  .filter(t => parseFloat(t.amount) < 0)
  .reduce((sum, t) => sum + parseFloat(t.amount), 0);

const totalCredits = allTransactions
  .filter(t => parseFloat(t.amount) > 0)
  .reduce((sum, t) => sum + parseFloat(t.amount), 0);

fs.writeFileSync(consolidatedPath, JSON.stringify({
  metadata: {
    generated_at: new Date().toISOString(),
    account_id: ACCOUNT_ID,
    currency_id: CURRENCY_ID,
    total_transactions: allTransactions.length,
    total_files_processed: files.length,
    duplicates_found: duplicatesFound,
    date_range: {
      start: allTransactions[0]?.date || null,
      end: allTransactions[allTransactions.length - 1]?.date || null
    },
    summary: {
      total_debits: totalDebits.toFixed(2),
      total_credits: totalCredits.toFixed(2),
      net_change: (totalCredits + totalDebits).toFixed(2)
    }
  },
  transactions: allTransactions
}, null, 2));

console.log('\n📊 Transformation Summary:');
console.log(`   - Files processed: ${files.length}`);
console.log(`   - Total transactions: ${totalProcessed}`);
console.log(`   - Duplicates skipped: ${duplicatesFound}`);
console.log(`   - Transactions ready to import: ${allTransactions.length}`);
console.log(`   - Date range: ${allTransactions[0]?.date} to ${allTransactions[allTransactions.length - 1]?.date}`);
console.log(`   - Total debits: €${Math.abs(totalDebits).toFixed(2)}`);
console.log(`   - Total credits: €${totalCredits.toFixed(2)}`);
console.log(`   - Net change: €${(totalCredits + totalDebits).toFixed(2)}`);
console.log(`\n✅ All transactions saved to: ${consolidatedPath}`);
console.log('\n🎯 Next steps:');
console.log('   1. Review the transformed files');
console.log('   2. Use the consolidated file to import all transactions at once');
console.log('   3. Or import individual monthly files as needed');