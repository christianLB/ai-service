#!/usr/bin/env node

const fs = require('fs').promises;
const path = require('path');
const { spawn } = require('child_process');

const PASSWORD = '72298830D';
const HISTORIC_DIR = path.join(__dirname, '../historic_transactions');

/**
 * Execute a command and return a promise
 */
function executeCommand(command, args) {
  return new Promise((resolve, reject) => {
    const proc = spawn(command, args);
    let stdout = '';
    let stderr = '';
    
    proc.stdout.on('data', (data) => {
      stdout += data.toString();
    });
    
    proc.stderr.on('data', (data) => {
      stderr += data.toString();
    });
    
    proc.on('close', (code) => {
      if (code === 0) {
        resolve(stdout);
      } else {
        reject(new Error(`Command failed with code ${code}: ${stderr}`));
      }
    });
  });
}

/**
 * Process a single PDF file
 */
async function processPDF(pdfFile) {
  const baseName = path.basename(pdfFile, '.pdf');
  const jsonFile = path.join(HISTORIC_DIR, `${baseName}.json`);
  const decryptedFile = path.join(HISTORIC_DIR, `${baseName}_decrypted.pdf`);
  
  console.log(`\n📄 Processing: ${pdfFile}`);
  
  try {
    // Check if JSON already exists
    try {
      await fs.access(jsonFile);
      console.log(`✅ JSON already exists: ${baseName}.json`);
      return { file: baseName, status: 'already_processed' };
    } catch {
      // JSON doesn't exist, continue processing
    }
    
    // Decrypt PDF
    console.log('🔓 Decrypting PDF...');
    await executeCommand('qpdf', [
      '--decrypt',
      `--password=${PASSWORD}`,
      pdfFile,
      decryptedFile
    ]);
    
    // Extract transactions
    console.log('📊 Extracting transactions...');
    const extractScript = path.join(__dirname, 'extract-pdf-transactions.js');
    await executeCommand('node', [extractScript, decryptedFile]);
    
    // Rename JSON to match original PDF name
    const decryptedJsonFile = path.join(HISTORIC_DIR, `${baseName}_decrypted.json`);
    await fs.rename(decryptedJsonFile, jsonFile);
    
    // Update sourceFile in JSON
    const jsonContent = await fs.readFile(jsonFile, 'utf8');
    const data = JSON.parse(jsonContent);
    data.metadata.sourceFile = `${baseName}.pdf`;
    await fs.writeFile(jsonFile, JSON.stringify(data, null, 2));
    
    // Clean up decrypted PDF
    await fs.unlink(decryptedFile);
    
    console.log(`✅ Successfully processed: ${baseName}`);
    return { 
      file: baseName, 
      status: 'success',
      transactions: data.summary.totalTransactions,
      period: `${data.summary.startDate} to ${data.summary.endDate}`,
      balance: `€${data.summary.startBalance} → €${data.summary.endBalance}`
    };
    
  } catch (error) {
    console.error(`❌ Error processing ${baseName}: ${error.message}`);
    
    // Clean up any temporary files
    try {
      await fs.unlink(decryptedFile);
    } catch {}
    
    return { file: baseName, status: 'error', error: error.message };
  }
}

/**
 * Main execution
 */
async function main() {
  console.log('🚀 Starting batch PDF processing...');
  console.log(`📁 Directory: ${HISTORIC_DIR}`);
  
  try {
    // Get all PDF files
    const files = await fs.readdir(HISTORIC_DIR);
    const pdfFiles = files
      .filter(file => file.endsWith('.pdf'))
      .map(file => path.join(HISTORIC_DIR, file))
      .sort(); // Process in chronological order
    
    console.log(`📄 Found ${pdfFiles.length} PDF files`);
    
    // Process each PDF
    const results = [];
    for (const pdfFile of pdfFiles) {
      const result = await processPDF(pdfFile);
      results.push(result);
    }
    
    // Generate summary report
    console.log('\n' + '='.repeat(80));
    console.log('📊 PROCESSING SUMMARY');
    console.log('='.repeat(80));
    
    let totalSuccess = 0;
    let totalError = 0;
    let totalAlready = 0;
    let totalTransactions = 0;
    
    results.forEach(result => {
      if (result.status === 'success') {
        totalSuccess++;
        totalTransactions += result.transactions;
        console.log(`✅ ${result.file}: ${result.transactions} transactions | ${result.period} | ${result.balance}`);
      } else if (result.status === 'already_processed') {
        totalAlready++;
        console.log(`📁 ${result.file}: Already processed`);
      } else {
        totalError++;
        console.log(`❌ ${result.file}: ${result.error}`);
      }
    });
    
    console.log('\n' + '-'.repeat(80));
    console.log(`Total PDFs: ${pdfFiles.length}`);
    console.log(`✅ Successfully processed: ${totalSuccess}`);
    console.log(`📁 Already processed: ${totalAlready}`);
    console.log(`❌ Errors: ${totalError}`);
    console.log(`📊 Total transactions extracted: ${totalTransactions}`);
    
    // Generate consolidated summary
    if (totalSuccess > 0 || totalAlready > 0) {
      await generateConsolidatedSummary();
    }
    
  } catch (error) {
    console.error('❌ Fatal error:', error.message);
    process.exit(1);
  }
}

/**
 * Generate a consolidated summary of all transactions
 */
async function generateConsolidatedSummary() {
  console.log('\n📈 Generating consolidated summary...');
  
  try {
    const files = await fs.readdir(HISTORIC_DIR);
    const jsonFiles = files
      .filter(file => file.endsWith('.json') && !file.includes('summary'))
      .sort();
    
    let allTransactions = [];
    let monthlyData = {};
    
    for (const jsonFile of jsonFiles) {
      const content = await fs.readFile(path.join(HISTORIC_DIR, jsonFile), 'utf8');
      const data = JSON.parse(content);
      
      // Extract month/year from filename (e.g., 2024_06_...)
      const match = jsonFile.match(/(\d{4})_(\d{2})/);
      if (match) {
        const [, year, month] = match;
        const monthKey = `${year}-${month}`;
        
        monthlyData[monthKey] = {
          file: jsonFile,
          transactions: data.summary.totalTransactions,
          debits: parseFloat(data.summary.totalDebits),
          credits: parseFloat(data.summary.totalCredits),
          netChange: parseFloat(data.summary.netChange),
          startBalance: parseFloat(data.summary.startBalance || 0),
          endBalance: parseFloat(data.summary.endBalance || 0)
        };
        
        allTransactions = allTransactions.concat(data.transactions);
      }
    }
    
    // Sort transactions by date
    allTransactions.sort((a, b) => new Date(a.date) - new Date(b.date));
    
    // Calculate totals
    const totalDebits = Object.values(monthlyData).reduce((sum, m) => sum + m.debits, 0);
    const totalCredits = Object.values(monthlyData).reduce((sum, m) => sum + m.credits, 0);
    
    const summary = {
      generatedAt: new Date().toISOString(),
      totalFiles: jsonFiles.length,
      totalTransactions: allTransactions.length,
      dateRange: {
        start: allTransactions[0]?.date.split('T')[0],
        end: allTransactions[allTransactions.length - 1]?.date.split('T')[0]
      },
      totals: {
        debits: totalDebits.toFixed(2),
        credits: totalCredits.toFixed(2),
        netChange: (totalCredits + totalDebits).toFixed(2)
      },
      monthlyBreakdown: monthlyData,
      transactionTypes: countTransactionTypes(allTransactions),
      topMerchants: getTopMerchants(allTransactions)
    };
    
    // Save consolidated summary
    const summaryPath = path.join(HISTORIC_DIR, 'consolidated_summary.json');
    await fs.writeFile(summaryPath, JSON.stringify(summary, null, 2));
    console.log(`✅ Consolidated summary saved to: consolidated_summary.json`);
    
    // Print key insights
    console.log('\n💡 Key Insights:');
    console.log(`- Period: ${summary.dateRange.start} to ${summary.dateRange.end}`);
    console.log(`- Total transactions: ${summary.totalTransactions}`);
    console.log(`- Total debits: €${summary.totals.debits}`);
    console.log(`- Total credits: €${summary.totals.credits}`);
    console.log(`- Net change: €${summary.totals.netChange}`);
    
  } catch (error) {
    console.error('❌ Error generating summary:', error.message);
  }
}

/**
 * Count transaction types
 */
function countTransactionTypes(transactions) {
  const types = {};
  transactions.forEach(tx => {
    const type = tx.metadata?.transaction_type || 'other';
    types[type] = (types[type] || 0) + 1;
  });
  return types;
}

/**
 * Get top merchants/counterparties
 */
function getTopMerchants(transactions) {
  const merchants = {};
  
  transactions.forEach(tx => {
    if (tx.counterpartyName && tx.amount < 0) { // Only count debits
      const name = tx.counterpartyName;
      if (!merchants[name]) {
        merchants[name] = { count: 0, total: 0 };
      }
      merchants[name].count++;
      merchants[name].total += Math.abs(parseFloat(tx.amount));
    }
  });
  
  // Sort by total amount and get top 10
  return Object.entries(merchants)
    .map(([name, data]) => ({ name, ...data, total: data.total.toFixed(2) }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 10);
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = { processPDF };