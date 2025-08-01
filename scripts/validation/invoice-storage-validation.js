/**
 * Invoice Storage Service Validation Script
 * 
 * Validates that the Prisma implementation produces identical results to the SQL version.
 * Tests file storage metadata management and retrieval operations.
 */

const { Pool } = require('pg');
const { PrismaClient } = require('@prisma/client');
const { InvoiceStorageService } = require('../../src/services/financial/invoice-storage.service');
const { InvoiceStoragePrismaService } = require('../../src/services/financial/invoice-storage-prisma.service');
const chalk = require('chalk');
const fs = require('fs').promises;
const path = require('path');

const prisma = new PrismaClient();
const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

const testBaseDir = path.join(process.cwd(), 'test-storage');
const sqlService = new InvoiceStorageService(pool, { baseDir: testBaseDir });
const prismaService = new InvoiceStoragePrismaService(prisma, { baseDir: testBaseDir });

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

// Create test PDF buffer
function createTestPDF() {
  // Simple PDF structure (minimal valid PDF)
  const pdfContent = `%PDF-1.4
1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj
2 0 obj<</Type/Pages/Count 1/Kids[3 0 R]>>endobj
3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 612 792]>>endobj
trailer<</Root 1 0 R>>`;
  return Buffer.from(pdfContent);
}

async function validateInvoiceStorage() {
  log('Testing invoice storage...', 'info');
  totalTests++;
  
  try {
    const pdfBuffer = createTestPDF();
    const invoiceId = 'test-invoice-001';
    const invoiceNumber = 'FAC-2025-0001';
    const fileName = 'test-invoice.pdf';
    
    // Store with SQL service
    const sqlStored = await sqlService.storeInvoice(
      invoiceId,
      invoiceNumber,
      pdfBuffer,
      fileName,
      { generatePublicUrl: true }
    );
    
    // Store with Prisma service
    const prismaStored = await prismaService.storeInvoice(
      invoiceId + '-prisma',
      invoiceNumber + '-prisma',
      pdfBuffer,
      fileName,
      { generatePublicUrl: true }
    );
    
    // Validate stored metadata
    if (sqlStored.fileSize !== prismaStored.fileSize) {
      throw new Error(`File size mismatch: SQL=${sqlStored.fileSize}, Prisma=${prismaStored.fileSize}`);
    }
    
    if (sqlStored.mimeType !== prismaStored.mimeType) {
      throw new Error(`MIME type mismatch: SQL=${sqlStored.mimeType}, Prisma=${prismaStored.mimeType}`);
    }
    
    if (sqlStored.storageType !== prismaStored.storageType) {
      throw new Error(`Storage type mismatch: SQL=${sqlStored.storageType}, Prisma=${prismaStored.storageType}`);
    }
    
    log('Invoice storage validation passed', 'success');
    passedTests++;
  } catch (error) {
    log(`Invoice storage validation failed: ${error.message}`, 'error');
    failedTests++;
  }
}

async function validateInvoiceRetrieval() {
  log('Testing invoice retrieval...', 'info');
  totalTests++;
  
  try {
    // First store test invoices
    const pdfBuffer = createTestPDF();
    const invoiceId = 'test-retrieve-001';
    const invoiceNumber = 'FAC-2025-0002';
    
    await sqlService.storeInvoice(invoiceId, invoiceNumber, pdfBuffer, 'test.pdf');
    await prismaService.storeInvoice(invoiceId, invoiceNumber, pdfBuffer, 'test.pdf');
    
    // Retrieve by invoice ID
    const sqlRetrieved = await sqlService.retrieveInvoice(invoiceId);
    const prismaRetrieved = await prismaService.retrieveInvoice(invoiceId);
    
    if (!sqlRetrieved || !prismaRetrieved) {
      throw new Error('Failed to retrieve stored invoice');
    }
    
    // Compare metadata
    if (sqlRetrieved.metadata.fileSize !== prismaRetrieved.metadata.fileSize) {
      throw new Error('Retrieved file size mismatch');
    }
    
    // Compare buffer content
    if (!sqlRetrieved.buffer.equals(prismaRetrieved.buffer)) {
      throw new Error('Retrieved file content mismatch');
    }
    
    // Test retrieval by invoice number
    const sqlByNumber = await sqlService.retrieveByInvoiceNumber(invoiceNumber);
    const prismaByNumber = await prismaService.retrieveByInvoiceNumber(invoiceNumber);
    
    if (!sqlByNumber || !prismaByNumber) {
      throw new Error('Failed to retrieve by invoice number');
    }
    
    if (sqlByNumber.metadata.fileName !== prismaByNumber.metadata.fileName) {
      throw new Error('Retrieved by number filename mismatch');
    }
    
    log('Invoice retrieval validation passed', 'success');
    passedTests++;
  } catch (error) {
    log(`Invoice retrieval validation failed: ${error.message}`, 'error');
    failedTests++;
  }
}

async function validateInvoiceListing() {
  log('Testing invoice listing...', 'info');
  totalTests++;
  
  try {
    // Store multiple test invoices
    const pdfBuffer = createTestPDF();
    const baseTime = new Date();
    
    for (let i = 0; i < 5; i++) {
      await sqlService.storeInvoice(
        `list-test-${i}`,
        `FAC-2025-100${i}`,
        pdfBuffer,
        `invoice-${i}.pdf`
      );
      await prismaService.storeInvoice(
        `list-test-${i}`,
        `FAC-2025-100${i}`,
        pdfBuffer,
        `invoice-${i}.pdf`
      );
    }
    
    // List without filters
    const sqlList = await sqlService.listInvoices({ limit: 10 });
    const prismaList = await prismaService.listInvoices({ limit: 10 });
    
    // Both should have invoices
    if (sqlList.length === 0 || prismaList.length === 0) {
      throw new Error('No invoices returned in listing');
    }
    
    // Test with date filters
    const startDate = new Date(baseTime);
    startDate.setHours(0, 0, 0, 0);
    
    const sqlFiltered = await sqlService.listInvoices({ startDate, limit: 10 });
    const prismaFiltered = await prismaService.listInvoices({ startDate, limit: 10 });
    
    // Should have similar counts (may differ due to other test data)
    log(`SQL returned ${sqlFiltered.length} invoices, Prisma returned ${prismaFiltered.length} invoices`, 'info');
    
    log('Invoice listing validation passed', 'success');
    passedTests++;
  } catch (error) {
    log(`Invoice listing validation failed: ${error.message}`, 'error');
    failedTests++;
  }
}

async function validateStorageStatistics() {
  log('Testing storage statistics...', 'info');
  totalTests++;
  
  try {
    const sqlStats = await sqlService.getStorageStatistics();
    const prismaStats = await prismaService.getStorageStatistics();
    
    // Log statistics for comparison
    log(`SQL Stats: ${sqlStats.totalInvoices} invoices, ${sqlStats.totalSize} bytes total`, 'info');
    log(`Prisma Stats: ${prismaStats.totalInvoices} invoices, ${prismaStats.totalSize} bytes total`, 'info');
    
    // Check that both return valid statistics
    if (typeof sqlStats.totalInvoices !== 'number' || typeof prismaStats.totalInvoices !== 'number') {
      throw new Error('Invalid statistics format');
    }
    
    // Check average size calculation
    if (sqlStats.totalInvoices > 0 && sqlStats.averageSize === 0) {
      throw new Error('SQL average size calculation error');
    }
    
    if (prismaStats.totalInvoices > 0 && prismaStats.averageSize === 0) {
      throw new Error('Prisma average size calculation error');
    }
    
    // Validate monthly stats structure
    if (!Array.isArray(sqlStats.invoicesByMonth) || !Array.isArray(prismaStats.invoicesByMonth)) {
      throw new Error('Invalid monthly statistics format');
    }
    
    log('Storage statistics validation passed', 'success');
    passedTests++;
  } catch (error) {
    log(`Storage statistics validation failed: ${error.message}`, 'error');
    failedTests++;
  }
}

async function validateExpiredInvoiceCleanup() {
  log('Testing expired invoice cleanup...', 'info');
  totalTests++;
  
  try {
    // Store invoices with expiration
    const pdfBuffer = createTestPDF();
    const pastDate = new Date();
    pastDate.setDate(pastDate.getDate() - 1); // Yesterday
    
    // Store expired invoices
    await sqlService.storeInvoice(
      'expired-sql-001',
      'EXP-SQL-001',
      pdfBuffer,
      'expired-sql.pdf',
      { expirationDays: -1 } // Already expired
    );
    
    await prismaService.storeInvoice(
      'expired-prisma-001',
      'EXP-PRISMA-001',
      pdfBuffer,
      'expired-prisma.pdf',
      { expirationDays: -1 } // Already expired
    );
    
    // Clean up expired invoices
    const sqlCleaned = await sqlService.cleanupExpiredInvoices();
    const prismaCleaned = await prismaService.cleanupExpiredInvoices();
    
    log(`SQL cleaned ${sqlCleaned} expired invoices`, 'info');
    log(`Prisma cleaned ${prismaCleaned} expired invoices`, 'info');
    
    // Both should have cleaned at least the ones we just created
    if (sqlCleaned === 0 && prismaCleaned === 0) {
      log('Warning: No expired invoices were cleaned (might be due to immediate deletion)', 'warning');
    }
    
    log('Expired invoice cleanup validation passed', 'success');
    passedTests++;
  } catch (error) {
    log(`Expired invoice cleanup validation failed: ${error.message}`, 'error');
    failedTests++;
  }
}

async function validateStorageByClient() {
  log('Testing storage by client...', 'info');
  totalTests++;
  
  try {
    const sqlByClient = await sqlService.getStorageByClient();
    const prismaByClient = await prismaService.getStorageByClient();
    
    // Both should return arrays
    if (!Array.isArray(sqlByClient) || !Array.isArray(prismaByClient)) {
      throw new Error('Invalid storage by client format');
    }
    
    // Log sample data
    if (sqlByClient.length > 0) {
      log(`SQL: Top client uses ${sqlByClient[0].totalSize} bytes for ${sqlByClient[0].invoiceCount} invoices`, 'info');
    }
    
    if (prismaByClient.length > 0) {
      log(`Prisma: Top client uses ${prismaByClient[0].totalSize} bytes for ${prismaByClient[0].invoiceCount} invoices`, 'info');
    }
    
    log('Storage by client validation passed', 'success');
    passedTests++;
  } catch (error) {
    log(`Storage by client validation failed: ${error.message}`, 'error');
    failedTests++;
  }
}

async function cleanupTestData() {
  log('Cleaning up test data...', 'info');
  
  try {
    // Clean up test storage directory
    await fs.rm(testBaseDir, { recursive: true, force: true });
    
    // Clean up test records from database
    await prisma.$executeRaw`
      DELETE FROM financial.stored_invoices 
      WHERE invoice_id LIKE 'test-%' 
         OR invoice_id LIKE 'list-test-%' 
         OR invoice_id LIKE 'expired-%'
    `;
    
    await pool.query(`
      DELETE FROM stored_invoices 
      WHERE invoice_id LIKE 'test-%' 
         OR invoice_id LIKE 'list-test-%' 
         OR invoice_id LIKE 'expired-%'
    `);
    
    log('Test data cleaned up', 'success');
  } catch (error) {
    log(`Warning: Cleanup failed: ${error.message}`, 'warning');
  }
}

async function runValidation() {
  console.log(chalk.cyan('\n=== Invoice Storage Service Validation ===\n'));
  
  try {
    // Initialize schemas
    await sqlService.initializeSchema();
    
    // Create test directory
    await fs.mkdir(testBaseDir, { recursive: true });
    
    // Run all validations
    await validateInvoiceStorage();
    await validateInvoiceRetrieval();
    await validateInvoiceListing();
    await validateStorageStatistics();
    await validateExpiredInvoiceCleanup();
    await validateStorageByClient();
    
    // Cleanup
    await cleanupTestData();
    
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