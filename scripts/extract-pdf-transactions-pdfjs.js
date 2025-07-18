#!/usr/bin/env node

const fs = require('fs').promises;
const path = require('path');
const pdfjsLib = require('pdfjs-dist');

// Configuration
const PDF_PASSWORD = '72298830D';

/**
 * Extract text from PDF using pdfjs-dist
 * @param {string} pdfPath - Path to the PDF file
 * @returns {Promise<string>} Extracted text
 */
async function extractTextFromPDF(pdfPath) {
  console.log(`📄 Reading PDF: ${pdfPath}`);
  
  try {
    // Read PDF file
    const pdfBuffer = await fs.readFile(pdfPath);
    const typedArray = new Uint8Array(pdfBuffer);
    
    // Load PDF with password
    const loadingTask = pdfjsLib.getDocument({
      data: typedArray,
      password: PDF_PASSWORD
    });
    
    const pdfDoc = await loadingTask.promise;
    console.log(`✅ PDF loaded successfully. Pages: ${pdfDoc.numPages}`);
    
    let fullText = '';
    
    // Extract text from each page
    for (let pageNum = 1; pageNum <= pdfDoc.numPages; pageNum++) {
      const page = await pdfDoc.getPage(pageNum);
      const textContent = await page.getTextContent();
      
      // Join text items with appropriate spacing
      const pageText = textContent.items
        .map(item => item.str)
        .join(' ');
      
      fullText += pageText + '\n';
      console.log(`📖 Processed page ${pageNum}/${pdfDoc.numPages}`);
    }
    
    return fullText;
    
  } catch (error) {
    console.error('❌ Error extracting PDF text:', error.message);
    throw error;
  }
}

/**
 * Parse transaction lines from PDF text
 * @param {string} text - Raw text from PDF
 * @returns {Array} Array of transaction objects
 */
function parseTransactions(text) {
  console.log('🔍 Parsing transactions from text...');
  console.log('📝 Sample of extracted text:');
  console.log(text.substring(0, 500) + '...\n');
  
  const transactions = [];
  const lines = text.split('\n').map(line => line.trim()).filter(line => line);
  
  // Enhanced patterns for Spanish bank statements
  const transactionPatterns = [
    // Pattern 1: Date Description Amount Balance
    /(\d{2}[\/\-\.]\d{2}[\/\-\.]\d{4})\s+(.+?)\s+([\-\+]?\d{1,3}(?:\.\d{3})*(?:,\d{2})?)\s*€?\s*(\d{1,3}(?:\.\d{3})*(?:,\d{2})?)?/,
    // Pattern 2: Date at start, amounts at end
    /(\d{2}[\/\-\.]\d{2}[\/\-\.]\d{2,4})\s+(.+?)\s+([\-\+]?\d+[.,]\d{2})/,
    // Pattern 3: Compact format
    /(\d{2}\/\d{2}\/\d{4})\s+(.+?)\s+([\-\+]?\d+,\d{2})/
  ];
  
  // Also look for transaction blocks
  const transactionBlocks = text.split(/(?=\d{2}[\/\-\.]\d{2}[\/\-\.]\d{2,4})/);
  
  transactionBlocks.forEach((block, blockIndex) => {
    const blockLines = block.trim().split('\n').filter(l => l);
    if (blockLines.length === 0) return;
    
    // Try to extract date from first line
    const dateMatch = blockLines[0].match(/(\d{2}[\/\-\.]\d{2}[\/\-\.]\d{2,4})/);
    if (!dateMatch) return;
    
    const date = dateMatch[1];
    let description = '';
    let amount = null;
    let balance = null;
    
    // Look for amounts in the block
    for (const line of blockLines) {
      // Check for amount patterns
      const amountMatch = line.match(/([\-\+]?\d{1,3}(?:\.\d{3})*(?:,\d{2})?)\s*€?/g);
      if (amountMatch && amountMatch.length > 0) {
        // First amount is transaction amount, second might be balance
        if (!amount) amount = amountMatch[0];
        else if (!balance && amountMatch.length > 1) balance = amountMatch[1];
      }
      
      // Build description (exclude pure number lines)
      if (!line.match(/^[\d\.,\-\+\s€]+$/) && !line.match(/^\d{2}[\/\-\.]\d{2}/)) {
        description += (description ? ' ' : '') + line.trim();
      }
    }
    
    if (date && amount && description) {
      const cleanAmount = amount.replace(/\./g, '').replace(',', '.').replace(/[^\d\-\.]/g, '');
      const cleanBalance = balance ? balance.replace(/\./g, '').replace(',', '.').replace(/[^\d\-\.]/g, '') : null;
      const isoDate = parseSpanishDate(date);
      const counterpartyInfo = extractCounterparty(description);
      
      transactions.push({
        type: 'bank_transfer',
        status: 'confirmed',
        amount: cleanAmount,
        currencyCode: 'EUR',
        date: isoDate,
        description: description.trim(),
        reference: `HIST_${blockIndex + 1}`,
        counterpartyName: counterpartyInfo.name,
        counterpartyAccount: counterpartyInfo.account,
        metadata: {
          balance_after: cleanBalance,
          original_description: description,
          pdf_block_number: blockIndex + 1
        }
      });
    }
  });
  
  console.log(`✅ Found ${transactions.length} transactions`);
  return transactions;
}

/**
 * Extract account information from PDF text
 * @param {string} text - Raw text from PDF
 * @returns {Object} Account information
 */
function extractAccountInfo(text) {
  const accountInfo = {
    name: 'Historic Bank Account',
    type: 'bank_account',
    currency: 'EUR'
  };
  
  // Try to extract IBAN (Spanish format)
  const ibanMatch = text.match(/\b(ES\d{2}\s?\d{4}\s?\d{4}\s?\d{4}\s?\d{4}\s?\d{4})\b/);
  if (ibanMatch) {
    accountInfo.iban = ibanMatch[1].replace(/\s/g, '');
    console.log(`💳 Found IBAN: ${accountInfo.iban}`);
  }
  
  // Try to extract account number
  const accountPatterns = [
    /(?:Cuenta|Account|Número de cuenta):\s*([\d\s\-]+)/i,
    /(?:Nº Cuenta|Nº Account):\s*([\d\s\-]+)/i
  ];
  
  for (const pattern of accountPatterns) {
    const match = text.match(pattern);
    if (match) {
      accountInfo.accountNumber = match[1].trim();
      break;
    }
  }
  
  // Try to extract account holder name
  const holderPatterns = [
    /(?:Titular|Account holder|Cliente):\s*(.+?)(?:\n|$)/i,
    /(?:Nombre|Name):\s*(.+?)(?:\n|$)/i
  ];
  
  for (const pattern of holderPatterns) {
    const match = text.match(pattern);
    if (match) {
      accountInfo.name = match[1].trim();
      break;
    }
  }
  
  return accountInfo;
}

/**
 * Calculate summary statistics
 * @param {Array} transactions - Array of transactions
 * @param {string} text - Raw PDF text for additional info
 * @returns {Object} Summary statistics
 */
function calculateSummary(transactions, text) {
  if (transactions.length === 0) {
    return {
      totalTransactions: 0,
      totalDebits: '0.00',
      totalCredits: '0.00',
      netChange: '0.00'
    };
  }
  
  let totalDebits = 0;
  let totalCredits = 0;
  let startDate = new Date(transactions[0].date);
  let endDate = new Date(transactions[0].date);
  
  transactions.forEach(tx => {
    const amount = parseFloat(tx.amount);
    const txDate = new Date(tx.date);
    
    if (amount < 0) {
      totalDebits += amount;
    } else {
      totalCredits += amount;
    }
    
    if (txDate < startDate) startDate = txDate;
    if (txDate > endDate) endDate = txDate;
  });
  
  // Try to extract balance information
  let startBalance = null;
  let endBalance = null;
  
  const balancePatterns = [
    /Saldo\s+inicial:\s*([\d.,\-]+)/i,
    /Saldo\s+anterior:\s*([\d.,\-]+)/i,
    /Initial\s+balance:\s*([\d.,\-]+)/i,
    /Saldo\s+final:\s*([\d.,\-]+)/i,
    /Final\s+balance:\s*([\d.,\-]+)/i,
    /Nuevo\s+saldo:\s*([\d.,\-]+)/i
  ];
  
  balancePatterns.forEach(pattern => {
    const match = text.match(pattern);
    if (match) {
      const balance = match[1].replace(/\./g, '').replace(',', '.').replace(/[^\d\.\-]/g, '');
      if (pattern.toString().includes('inicial') || pattern.toString().includes('anterior') || pattern.toString().includes('Initial')) {
        startBalance = balance;
      } else {
        endBalance = balance;
      }
    }
  });
  
  return {
    totalTransactions: transactions.length,
    totalDebits: totalDebits.toFixed(2),
    totalCredits: totalCredits.toFixed(2),
    netChange: (totalCredits + totalDebits).toFixed(2),
    startDate: startDate.toISOString().split('T')[0],
    endDate: endDate.toISOString().split('T')[0],
    startBalance: startBalance,
    endBalance: endBalance
  };
}

/**
 * Parse Spanish date format to ISO
 * @param {string} dateStr - Date in DD/MM/YYYY or similar format
 * @returns {string} ISO date string
 */
function parseSpanishDate(dateStr) {
  const parts = dateStr.split(/[\/\-\.]/);
  if (parts.length === 3) {
    let [day, month, year] = parts;
    
    // Handle 2-digit years
    if (year.length === 2) {
      year = '20' + year;
    }
    
    const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    return date.toISOString();
  }
  return new Date().toISOString(); // Fallback to current date
}

/**
 * Extract counterparty information from description
 * @param {string} description - Transaction description
 * @returns {Object} Counterparty name and account
 */
function extractCounterparty(description) {
  const result = {
    name: null,
    account: null
  };
  
  // Check for IBAN in description
  const ibanMatch = description.match(/\b(ES\d{22})\b/);
  if (ibanMatch) {
    result.account = ibanMatch[1];
  }
  
  // Common patterns for counterparty extraction
  const patterns = {
    transfer: /(?:TRANS(?:FERENCIA)?\.?\s+(?:A|DE)\s+)(.+?)(?:\s+ES\d{22})?$/i,
    payment: /(?:PAGO\s+(?:A|DE)\s+)(.+)/i,
    directDebit: /(?:RECIBO\s+)(.+)/i,
    domiciliation: /(?:DOMICILIACION\s+)(.+)/i,
    card: /(?:COMPRA\s+(?:EN|TARJETA)\s+)(.+)/i,
    withdrawal: /(?:RETIRADA\s+(?:EN|CAJERO)\s+)(.+)/i
  };
  
  // Extract name
  for (const [type, pattern] of Object.entries(patterns)) {
    const match = description.match(pattern);
    if (match) {
      result.name = match[1].trim();
      break;
    }
  }
  
  // If no specific pattern matched, use cleaned description
  if (!result.name) {
    result.name = description
      .replace(/\b(ES\d{22})\b/g, '') // Remove IBANs
      .replace(/^\d+\s+/, '') // Remove leading numbers
      .replace(/\s+/g, ' ')
      .trim();
  }
  
  return result;
}

/**
 * Main execution
 */
async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log('Usage: node extract-pdf-transactions-pdfjs.js <pdf-file-path>');
    console.log('Example: node extract-pdf-transactions-pdfjs.js ../historic_transactions/2024_06_241593001540367.pdf');
    process.exit(1);
  }
  
  const pdfPath = path.resolve(args[0]);
  const outputPath = pdfPath.replace('.pdf', '.json');
  
  try {
    // Check if PDF exists
    await fs.access(pdfPath);
    
    // Extract text from PDF
    console.log('🚀 Starting transaction extraction using pdfjs-dist...');
    const pdfText = await extractTextFromPDF(pdfPath);
    
    // Parse transactions
    const transactions = parseTransactions(pdfText);
    const accountInfo = extractAccountInfo(pdfText);
    const summary = calculateSummary(transactions, pdfText);
    
    // Create output structure
    const output = {
      metadata: {
        sourceFile: path.basename(pdfPath),
        extractedAt: new Date().toISOString(),
        extractionVersion: '2.0.0',
        extractionMethod: 'pdfjs-dist'
      },
      account: accountInfo,
      transactions: transactions,
      summary: summary
    };
    
    // Write JSON output
    await fs.writeFile(outputPath, JSON.stringify(output, null, 2));
    console.log(`\n✅ Successfully extracted ${transactions.length} transactions`);
    console.log(`📁 Output saved to: ${outputPath}`);
    
    // Print summary
    console.log('\n📊 Summary:');
    console.log(`- Total transactions: ${summary.totalTransactions}`);
    console.log(`- Total debits: €${summary.totalDebits}`);
    console.log(`- Total credits: €${summary.totalCredits}`);
    console.log(`- Net change: €${summary.netChange}`);
    console.log(`- Period: ${summary.startDate} to ${summary.endDate}`);
    if (summary.startBalance) console.log(`- Start balance: €${summary.startBalance}`);
    if (summary.endBalance) console.log(`- End balance: €${summary.endBalance}`);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.message.includes('password')) {
      console.error('💡 Hint: The PDF seems to be password-protected. Check if the password is correct.');
    }
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = { extractTextFromPDF, parseTransactions };