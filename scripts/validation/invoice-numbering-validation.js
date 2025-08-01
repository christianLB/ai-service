/**
 * Invoice Numbering Service Validation Script
 * 
 * Validates that the Prisma implementation produces identical results to the SQL version.
 * This is critical for ensuring no gaps in invoice numbering sequences.
 */

const { Pool } = require('pg');
const { PrismaClient } = require('@prisma/client');
const { InvoiceNumberingService } = require('../../src/services/financial/invoice-numbering.service');
const { InvoiceNumberingPrismaService } = require('../../src/services/financial/invoice-numbering-prisma.service');
const chalk = require('chalk');

const prisma = new PrismaClient();
const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

const sqlService = new InvoiceNumberingService(pool);
const prismaService = new InvoiceNumberingPrismaService(prisma);

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

function log(message, type = 'info') {
  const timestamp = new Date().toISOString();
  const prefix = `[${timestamp}]`;
  
  switch(type) {
    case 'success':
      console.log(chalk.green(`${prefix} ✓ ${message}`));
      break;
    case 'error':
      console.log(chalk.red(`${prefix} ✗ ${message}`));
      break;
    case 'warning':
      console.log(chalk.yellow(`${prefix} ⚠ ${message}`));
      break;
    case 'info':
      console.log(chalk.blue(`${prefix} ℹ ${message}`));
      break;
    default:
      console.log(`${prefix} ${message}`);
  }
}

async function validateNumberGeneration() {
  log('Testing invoice number generation...', 'info');
  totalTests++;
  
  try {
    // Test 1: Generate numbers in default series
    const sqlNumber1 = await sqlService.getNextInvoiceNumber();
    const prismaNumber1 = await prismaService.getNextInvoiceNumber();
    
    if (sqlNumber1 !== prismaNumber1) {
      throw new Error(`Number mismatch: SQL=${sqlNumber1}, Prisma=${prismaNumber1}`);
    }
    
    // Test 2: Generate with custom prefix
    const options = { prefix: 'TEST', series: 'VALIDATION' };
    const sqlNumber2 = await sqlService.getNextInvoiceNumber(options);
    const prismaNumber2 = await prismaService.getNextInvoiceNumber(options);
    
    if (sqlNumber2 !== prismaNumber2) {
      throw new Error(`Custom prefix mismatch: SQL=${sqlNumber2}, Prisma=${prismaNumber2}`);
    }
    
    // Test 3: Verify sequential numbering
    const sqlNumber3 = await sqlService.getNextInvoiceNumber();
    const prismaNumber3 = await prismaService.getNextInvoiceNumber();
    
    if (sqlNumber3 !== prismaNumber3) {
      throw new Error(`Sequential number mismatch: SQL=${sqlNumber3}, Prisma=${prismaNumber3}`);
    }
    
    log('Invoice number generation validation passed', 'success');
    passedTests++;
  } catch (error) {
    log(`Invoice number generation validation failed: ${error.message}`, 'error');
    failedTests++;
  }
}

async function validateSequenceInfo() {
  log('Testing sequence information retrieval...', 'info');
  totalTests++;
  
  try {
    // Get all sequences
    const sqlSequences = await sqlService.getAllSequences();
    const prismaSequences = await prismaService.getAllSequences();
    
    // Sort for comparison
    const sortSequences = (a, b) => {
      if (a.series !== b.series) return a.series.localeCompare(b.series);
      if (a.prefix !== b.prefix) return a.prefix.localeCompare(b.prefix);
      return a.currentYear - b.currentYear;
    };
    
    sqlSequences.sort(sortSequences);
    prismaSequences.sort(sortSequences);
    
    if (sqlSequences.length !== prismaSequences.length) {
      throw new Error(`Sequence count mismatch: SQL=${sqlSequences.length}, Prisma=${prismaSequences.length}`);
    }
    
    // Compare each sequence
    for (let i = 0; i < sqlSequences.length; i++) {
      const sql = sqlSequences[i];
      const prisma = prismaSequences[i];
      
      if (sql.series !== prisma.series ||
          sql.prefix !== prisma.prefix ||
          sql.currentNumber !== prisma.currentNumber ||
          sql.currentYear !== prisma.currentYear) {
        throw new Error(`Sequence mismatch at index ${i}: SQL=${JSON.stringify(sql)}, Prisma=${JSON.stringify(prisma)}`);
      }
    }
    
    log('Sequence information validation passed', 'success');
    passedTests++;
  } catch (error) {
    log(`Sequence information validation failed: ${error.message}`, 'error');
    failedTests++;
  }
}

async function validateStatistics() {
  log('Testing statistics generation...', 'info');
  totalTests++;
  
  try {
    const sqlStats = await sqlService.getStatistics();
    const prismaStats = await prismaService.getStatistics();
    
    // Compare total sequences
    if (sqlStats.totalSequences !== prismaStats.totalSequences) {
      throw new Error(`Total sequences mismatch: SQL=${sqlStats.totalSequences}, Prisma=${prismaStats.totalSequences}`);
    }
    
    // Compare sequences by year
    if (sqlStats.sequencesByYear.length !== prismaStats.sequencesByYear.length) {
      throw new Error(`Year stats count mismatch`);
    }
    
    // Sort and compare
    const sortByYear = (a, b) => b.year - a.year;
    sqlStats.sequencesByYear.sort(sortByYear);
    prismaStats.sequencesByYear.sort(sortByYear);
    
    for (let i = 0; i < sqlStats.sequencesByYear.length; i++) {
      const sql = sqlStats.sequencesByYear[i];
      const prisma = prismaStats.sequencesByYear[i];
      
      if (sql.year !== prisma.year || sql.count !== prisma.count) {
        throw new Error(`Year stats mismatch at index ${i}`);
      }
    }
    
    log('Statistics validation passed', 'success');
    passedTests++;
  } catch (error) {
    log(`Statistics validation failed: ${error.message}`, 'error');
    failedTests++;
  }
}

async function validateLastUsedNumber() {
  log('Testing last used number retrieval...', 'info');
  totalTests++;
  
  try {
    // Test with default series
    const sqlLast = await sqlService.getLastUsedNumber();
    const prismaLast = await prismaService.getLastUsedNumber();
    
    if (sqlLast !== prismaLast) {
      throw new Error(`Last used number mismatch: SQL=${sqlLast}, Prisma=${prismaLast}`);
    }
    
    // Test with specific series
    const sqlLastCustom = await sqlService.getLastUsedNumber('VALIDATION', 'TEST');
    const prismaLastCustom = await prismaService.getLastUsedNumber('VALIDATION', 'TEST');
    
    if (sqlLastCustom !== prismaLastCustom) {
      throw new Error(`Custom last used number mismatch: SQL=${sqlLastCustom}, Prisma=${prismaLastCustom}`);
    }
    
    log('Last used number validation passed', 'success');
    passedTests++;
  } catch (error) {
    log(`Last used number validation failed: ${error.message}`, 'error');
    failedTests++;
  }
}

async function validateConcurrency() {
  log('Testing concurrent number generation (CRITICAL TEST)...', 'info');
  totalTests++;
  
  try {
    // Generate multiple numbers concurrently to test locking
    const concurrentRequests = 10;
    const series = 'CONCURRENT_TEST';
    const prefix = 'LOCK';
    
    // Reset sequence first
    await sqlService.resetSequence(series, prefix);
    await prismaService.resetSequence(series, prefix);
    
    // SQL concurrent generation
    const sqlPromises = [];
    for (let i = 0; i < concurrentRequests; i++) {
      sqlPromises.push(sqlService.getNextInvoiceNumber({ series, prefix }));
    }
    const sqlNumbers = await Promise.all(sqlPromises);
    
    // Prisma concurrent generation
    const prismaPromises = [];
    for (let i = 0; i < concurrentRequests; i++) {
      prismaPromises.push(prismaService.getNextInvoiceNumber({ series, prefix }));
    }
    const prismaNumbers = await Promise.all(prismaPromises);
    
    // Sort and check for uniqueness and sequence
    sqlNumbers.sort();
    prismaNumbers.sort();
    
    // Check that we have no duplicates
    const sqlUnique = new Set(sqlNumbers);
    const prismaUnique = new Set(prismaNumbers);
    
    if (sqlUnique.size !== concurrentRequests) {
      throw new Error(`SQL generated duplicate numbers: ${sqlNumbers.join(', ')}`);
    }
    
    if (prismaUnique.size !== concurrentRequests) {
      throw new Error(`Prisma generated duplicate numbers: ${prismaNumbers.join(', ')}`);
    }
    
    log('Concurrent number generation validation passed (NO DUPLICATES!)', 'success');
    passedTests++;
  } catch (error) {
    log(`Concurrent number generation validation failed: ${error.message}`, 'error');
    failedTests++;
  }
}

async function runValidation() {
  console.log(chalk.cyan('\n=== Invoice Numbering Service Validation ===\n'));
  
  try {
    // Initialize schemas
    await sqlService.initializeSchema();
    
    // Run all validations
    await validateNumberGeneration();
    await validateSequenceInfo();
    await validateStatistics();
    await validateLastUsedNumber();
    await validateConcurrency();
    
    // Summary
    console.log(chalk.cyan('\n=== Validation Summary ==='));
    console.log(chalk.blue(`Total Tests: ${totalTests}`));
    console.log(chalk.green(`Passed: ${passedTests}`));
    console.log(chalk.red(`Failed: ${failedTests}`));
    
    if (failedTests === 0) {
      console.log(chalk.green.bold('\n✅ ALL VALIDATIONS PASSED! Safe to migrate.\n'));
      process.exit(0);
    } else {
      console.log(chalk.red.bold('\n❌ VALIDATION FAILED! DO NOT MIGRATE.\n'));
      process.exit(1);
    }
  } catch (error) {
    console.error(chalk.red('\nFATAL ERROR:'), error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

// Run validation
runValidation();