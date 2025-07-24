#!/usr/bin/env node

const fs = require('fs').promises;
const path = require('path');
const pdfParse = require('pdf-parse');

// Configuration
const PDF_PASSWORD = process.env.PDF_PASSWORD || process.env.BANK_PDF_PASSWORD;

/**
 * Extract transactions from bank statement PDF
 * @param {string} pdfPath - Path to the PDF file
 * @returns {Promise<Object>} Extracted transaction data
 */
async function extractTransactionsFromPDF(pdfPath) {
  console.log(`📄 Reading PDF: ${pdfPath}`);
  
  try {
    // Read PDF file
    const pdfBuffer = await fs.readFile(pdfPath);
    
    // Parse PDF (handle both encrypted and decrypted)
    let pdfData;
    try {
      // First try without password (in case it's already decrypted)
      pdfData = await pdfParse(pdfBuffer);
    } catch (error) {
      // If that fails, try with password
      console.log('⚠️  Trying with password...');
      try {
        pdfData = await pdfParse(pdfBuffer, {
          password: PDF_PASSWORD
        });
      } catch (passwordError) {
        console.log('❌ PDF parsing failed. Consider decrypting with: qpdf --decrypt --password=<PDF_PASSWORD> input.pdf output.pdf');
        console.log('   Set PDF_PASSWORD environment variable to provide the password.');
        throw passwordError;
      }
    }
    console.log(`✅ PDF parsed successfully. Pages: ${pdfData.numpages}`);
    console.log(`📝 Text length: ${pdfData.text.length} characters`);
    
    // Extract and parse transactions
    const transactions = parseTransactions(pdfData.text);
    const accountInfo = extractAccountInfo(pdfData.text);
    const summary = calculateSummary(transactions, pdfData.text);
    
    // Create output structure matching database schema
    const output = {
      metadata: {
        sourceFile: path.basename(pdfPath),
        extractedAt: new Date().toISOString(),
        extractionVersion: '1.0.0',
        pdfPages: pdfData.numpages,
        textLength: pdfData.text.length
      },
      account: accountInfo,
      transactions: transactions,
      summary: summary
    };
    
    return output;
    
  } catch (error) {
    console.error('❌ Error parsing PDF:', error.message);
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
  
  const transactions = [];
  
  // Look for the transactions table section
  const movimientosMatch = text.match(/F\.Oper\.F\.ValorConceptoImporteSaldoDivisa(.+?)(?:Saldofinal:|AtenciónBBVA:|$)/s);
  
  if (!movimientosMatch) {
    console.log('❌ Could not find transactions section in PDF');
    return transactions;
  }
  
  const transactionsText = movimientosMatch[1];
  console.log(`📝 Found transactions section with ${transactionsText.length} characters`);
  
  // Split by date pattern (DD/MM at start)
  const transactionBlocks = transactionsText.split(/(?=\d{2}\/\d{2})/);
  
  let transactionIndex = 0;
  
  for (const block of transactionBlocks) {
    if (!block.trim()) continue;
    
    // Extract dates - operation date and value date
    const dateMatch = block.match(/^(\d{2}\/\d{2})(\d{2}\/\d{2})?/);
    if (!dateMatch) continue;
    
    const operationDate = dateMatch[1] + '/2024'; // May 2024
    const valueDate = dateMatch[2] ? dateMatch[2] + '/2024' : operationDate;
    
    // Remove dates from block for easier parsing
    let remainingText = block.replace(/^\d{2}\/\d{2}\d{2}\/\d{2}/, '').trim();
    
    // Extract amount and balance (format: -816,253.959,94EUR)
    const amountBalanceMatch = remainingText.match(/([\-\+]?\d{1,3}(?:\.\d{3})*,\d{2})(\d{1,3}(?:\.\d{3})*,\d{2})EUR/);
    if (!amountBalanceMatch) continue;
    
    const amount = amountBalanceMatch[1];
    const balance = amountBalanceMatch[2];
    
    // Extract description (everything before the amounts)
    let description = remainingText.substring(0, remainingText.indexOf(amountBalanceMatch[0])).trim();
    
    // Clean up and format description
    description = formatDescription(description);
    
    // Extract counterparty information
    const counterpartyInfo = extractCounterpartyInfo(description);
    
    // Clean amounts for database
    const cleanAmount = amount.replace(/\./g, '').replace(',', '.');
    const cleanBalance = balance.replace(/\./g, '').replace(',', '.');
    
    // Parse date to ISO
    const isoDate = parseSpanishDate(valueDate);
    
    const transaction = {
      type: 'bank_transfer',
      status: 'confirmed',
      amount: cleanAmount,
      currencyCode: 'EUR',
      date: isoDate,
      description: counterpartyInfo.cleanDescription,
      reference: `BBVA_2024_05_${++transactionIndex}`,
      counterpartyName: counterpartyInfo.name,
      counterpartyAccount: counterpartyInfo.account,
      metadata: {
        balance_after: cleanBalance,
        original_description: description,
        transaction_index: transactionIndex,
        operation_date: parseSpanishDate(operationDate),
        card_number: counterpartyInfo.cardNumber,
        transaction_type: counterpartyInfo.type
      }
    };
    
    transactions.push(transaction);
  }
  
  console.log(`✅ Found ${transactions.length} transactions`);
  return transactions;
}

/**
 * Format description by adding spaces and cleaning up
 * @param {string} description - Raw description
 * @returns {string} Formatted description
 */
function formatDescription(description) {
  return description
    // Common replacements
    .replace(/TRANSFERENCIAS?/gi, 'TRANSFERENCIA')
    .replace(/PAGOCONTARJETA/gi, 'PAGO CON TARJETA')
    .replace(/ADEUDODE/gi, 'ADEUDO DE')
    .replace(/ABONOPORTRANSFERENCIA/gi, 'ABONO POR TRANSFERENCIA')
    .replace(/ASUFAVOR/gi, 'A SU FAVOR')
    .replace(/RECIBIDAENEUROS/gi, 'RECIBIDA EN EUROS')
    .replace(/ENSUPERMERCADOS/gi, 'EN SUPERMERCADOS')
    .replace(/DESERVICIOSVARIOS/gi, 'DE SERVICIOS VARIOS')
    .replace(/ENCAJERO\.AUT\./gi, 'EN CAJERO AUT.')
    .replace(/RET\.EFECTIVO/gi, 'RETIRADA EFECTIVO')
    .replace(/ADEBITOCONTARJ\./gi, 'A DEBITO CON TARJETA')
    .replace(/ADEUDOMENSUALDETARJETA/gi, 'ADEUDO MENSUAL DE TARJETA')
    // Add spaces between words
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/([A-Z]{2,})([A-Z][a-z])/g, '$1 $2')
    // Clean up extra spaces
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Extract counterparty information from description
 * @param {string} description - Transaction description
 * @returns {Object} Counterparty details
 */
function extractCounterpartyInfo(description) {
  const info = {
    name: null,
    account: null,
    cardNumber: null,
    cleanDescription: description,
    type: 'other'
  };
  
  // Extract card number if present
  const cardMatch = description.match(/\b(\d{6}\*{6}\d{4})\b/);
  if (cardMatch) {
    info.cardNumber = cardMatch[1];
    description = description.replace(cardMatch[0], '').trim();
  }
  
  // Identify transaction type and extract counterparty
  if (description.includes('TRANSFERENCIA')) {
    info.type = 'transfer';
    // Extract transfer recipient/sender
    const transferMatch = description.match(/TRANSFERENCIA\s+(.+?)(?:\s+LIQ\.OP\.|$)/i);
    if (transferMatch) {
      info.name = transferMatch[1].trim();
      info.cleanDescription = `Transferencia: ${info.name}`;
    }
  } else if (description.includes('PAGO CON TARJETA')) {
    info.type = 'card_payment';
    // Extract merchant name
    const merchantMatch = description.match(/PAGO CON TARJETA(?:\s+EN\s+\w+)?\s+(.+?)(?:\s+\w{2}ES)?$/i);
    if (merchantMatch) {
      info.name = merchantMatch[1].trim();
      const category = description.includes('SUPERMERCADOS') ? 'en supermercados' : 
                      description.includes('SERVICIOS') ? 'de servicios' : '';
      info.cleanDescription = `Pago con tarjeta ${category}: ${info.name}`.trim();
    }
  } else if (description.includes('ADEUDO DE')) {
    info.type = 'direct_debit';
    // Extract company name
    const debitMatch = description.match(/ADEUDO DE\s*(.+?)(?:\s+N\d+|$)/i);
    if (debitMatch) {
      info.name = debitMatch[1].trim();
      info.cleanDescription = `Adeudo domiciliado: ${info.name}`;
    }
  } else if (description.includes('BIZUM')) {
    info.type = 'bizum';
    // Extract Bizum recipient
    const bizumMatch = description.match(/BIZUM\s+ENVIADO:\s*(.+?)(?:\.|$)/i);
    if (bizumMatch) {
      info.name = bizumMatch[1].trim();
      info.cleanDescription = `Bizum enviado a: ${info.name}`;
    }
  } else if (description.includes('RETIRADA EFECTIVO')) {
    info.type = 'cash_withdrawal';
    info.name = 'Cajero automático';
    info.cleanDescription = 'Retirada de efectivo en cajero automático';
  } else if (description.includes('TRASPASO')) {
    info.type = 'internal_transfer';
    const nameMatch = description.match(/TRASPASO\s+(.+)/i);
    if (nameMatch) {
      info.name = nameMatch[1].trim();
      info.cleanDescription = `Traspaso interno: ${info.name}`;
    }
  } else if (description.includes('ABONO POR TRANSFERENCIA')) {
    info.type = 'incoming_transfer';
    info.cleanDescription = 'Transferencia recibida';
    // Try to extract operation number
    const opMatch = description.match(/LIQ\.OP\.Nº(\d+)/);
    if (opMatch) {
      info.cleanDescription += ` (Op: ${opMatch[1]})`;
    }
  }
  
  // If no name found, use cleaned description
  if (!info.name && info.cleanDescription) {
    info.name = info.cleanDescription;
  }
  
  return info;
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
  
  // Extract account holder name
  const holderMatch = text.match(/Titular(?:\/es)?:([^D]+)D\.N\.I\./);
  if (holderMatch) {
    accountInfo.name = holderMatch[1].trim();
  }
  
  // Extract IBAN
  const ibanMatch = text.match(/IBAN(ES\d{22})/);
  if (ibanMatch) {
    accountInfo.iban = ibanMatch[1];
    console.log(`💳 Found IBAN: ${accountInfo.iban}`);
  }
  
  // Extract BIC
  const bicMatch = text.match(/BIC:(\w+)/);
  if (bicMatch) {
    accountInfo.bic = bicMatch[1];
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
  
  // Extract balance information
  let startBalance = null;
  let endBalance = null;
  
  // Look for initial balance
  const initialBalanceMatch = text.match(/Saldoinicial:([\d.,]+)EUR/);
  if (initialBalanceMatch) {
    startBalance = initialBalanceMatch[1].replace(/\./g, '').replace(',', '.');
  }
  
  // Look for final balance
  const finalBalanceMatch = text.match(/Saldofinal:([\d.,]+)EUR/);
  if (finalBalanceMatch) {
    endBalance = finalBalanceMatch[1].replace(/\./g, '').replace(',', '.');
  }
  
  // If no final balance found, use the last transaction's balance
  if (!endBalance && transactions.length > 0) {
    endBalance = transactions[transactions.length - 1].metadata.balance_after;
  }
  
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
 * @param {string} dateStr - Date in DD/MM/YYYY format
 * @returns {string} ISO date string
 */
function parseSpanishDate(dateStr) {
  const parts = dateStr.split('/');
  if (parts.length === 3) {
    const [day, month, year] = parts;
    const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    return date.toISOString();
  }
  return new Date().toISOString();
}

/**
 * Main execution
 */
async function main() {
  // Check for PDF password
  if (!PDF_PASSWORD) {
    console.warn('⚠️  Warning: PDF_PASSWORD environment variable not set.');
    console.warn('   Some PDFs may fail to open if they are password-protected.');
    console.warn('   Set it with: export PDF_PASSWORD=your_password');
    console.log();
  }
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log('Usage: node extract-pdf-transactions-improved.js <pdf-file-path>');
    console.log('Example: node extract-pdf-transactions-improved.js ../historic_transactions/2024_06_241593001540367.pdf');
    process.exit(1);
  }
  
  const pdfPath = path.resolve(args[0]);
  const outputPath = pdfPath.replace('.pdf', '.json');
  
  try {
    // Check if PDF exists
    await fs.access(pdfPath);
    
    // Extract transactions
    console.log('🚀 Starting transaction extraction...');
    const data = await extractTransactionsFromPDF(pdfPath);
    
    // Write JSON output
    await fs.writeFile(outputPath, JSON.stringify(data, null, 2));
    console.log(`✅ Successfully extracted ${data.transactions.length} transactions`);
    console.log(`📁 Output saved to: ${outputPath}`);
    
    // Print summary
    console.log('\n📊 Summary:');
    console.log(`- Account: ${data.account.name}`);
    if (data.account.iban) console.log(`- IBAN: ${data.account.iban}`);
    console.log(`- Total transactions: ${data.summary.totalTransactions}`);
    console.log(`- Total debits: €${data.summary.totalDebits}`);
    console.log(`- Total credits: €${data.summary.totalCredits}`);
    console.log(`- Net change: €${data.summary.netChange}`);
    console.log(`- Period: ${data.summary.startDate} to ${data.summary.endDate}`);
    if (data.summary.startBalance) console.log(`- Start balance: €${data.summary.startBalance}`);
    if (data.summary.endBalance) console.log(`- End balance: €${data.summary.endBalance}`);
    
    // Show sample transactions
    console.log('\n📝 Sample transactions:');
    data.transactions.slice(0, 3).forEach((tx, i) => {
      console.log(`\n${i + 1}. ${tx.date.split('T')[0]} | €${tx.amount} | ${tx.description}`);
      if (tx.counterpartyName !== tx.description) {
        console.log(`   Counterparty: ${tx.counterpartyName}`);
      }
    });
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = { extractTransactionsFromPDF };