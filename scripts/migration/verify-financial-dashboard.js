#!/usr/bin/env node

/**
 * Financial Dashboard Migration Verification Script
 * 
 * This script validates that Prisma queries return identical results to SQL queries
 * CRITICAL: Must pass 100% before switching to Prisma in production
 */

const { PrismaClient } = require('@prisma/client');
const { Pool } = require('pg');
const crypto = require('crypto');
const fs = require('fs').promises;

// Initialize connections
const prisma = new PrismaClient();
const pool = new Pool({
  host: process.env.POSTGRES_HOST || 'localhost',
  port: process.env.POSTGRES_PORT || 5432,
  database: process.env.POSTGRES_DB || 'ai_service',
  user: process.env.POSTGRES_USER || 'ai_user',
  password: process.env.POSTGRES_PASSWORD || 'ultra_secure_password_2025'
});

// Color codes for output
const colors = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m'
};

// Test results tracking
const testResults = {
  passed: 0,
  failed: 0,
  warnings: 0,
  details: []
};

// Verification tests
const verificationTests = [
  {
    name: 'Invoice Count Verification',
    sql: 'SELECT COUNT(*) as count FROM financial.invoices',
    prisma: async () => await prisma.invoice.count()
  },
  {
    name: 'Total Revenue Verification',
    sql: `
      SELECT SUM(total_amount) as total 
      FROM financial.invoices 
      WHERE status IN ('PAID', 'PARTIALLY_PAID')
    `,
    prisma: async () => {
      const result = await prisma.invoice.aggregate({
        where: { status: { in: ['PAID', 'PARTIALLY_PAID'] } },
        _sum: { totalAmount: true }
      });
      return { total: result._sum.totalAmount };
    }
  },
  {
    name: 'Client Count Verification',
    sql: 'SELECT COUNT(*) as count FROM financial.clients WHERE is_active = true',
    prisma: async () => await prisma.client.count({ where: { isActive: true } })
  },
  {
    name: 'Transaction Count by Type',
    sql: `
      SELECT type, COUNT(*) as count 
      FROM financial.transactions 
      GROUP BY type 
      ORDER BY type
    `,
    prisma: async () => {
      const groups = await prisma.transaction.groupBy({
        by: ['type'],
        _count: { _all: true },
        orderBy: { type: 'asc' }
      });
      return groups.map(g => ({ type: g.type, count: g._count._all }));
    }
  },
  {
    name: 'Category Usage Verification',
    sql: `
      SELECT c.name, COUNT(t.id) as usage_count
      FROM financial.categories c
      LEFT JOIN financial.transactions t ON c.id = t.category_id
      GROUP BY c.id, c.name
      ORDER BY c.name
    `,
    prisma: async () => {
      const categories = await prisma.category.findMany({
        select: {
          name: true,
          transactions: {
            select: { id: true }
          }
        },
        orderBy: { name: 'asc' }
      });
      return categories.map(c => ({
        name: c.name,
        usage_count: c.transactions.length
      }));
    }
  }
];

// Data integrity checks
const integrityChecks = [
  {
    name: 'Invoice Number Sequence Check',
    check: async () => {
      const result = await pool.query(`
        SELECT invoice_number 
        FROM financial.invoices 
        ORDER BY CAST(SUBSTRING(invoice_number FROM '\\d+') AS INTEGER)
      `);
      
      const numbers = result.rows.map(r => 
        parseInt(r.invoice_number.match(/\d+/)[0])
      );
      
      // Check for gaps
      const gaps = [];
      for (let i = 1; i < numbers.length; i++) {
        if (numbers[i] - numbers[i-1] > 1) {
          gaps.push(`Gap between ${numbers[i-1]} and ${numbers[i]}`);
        }
      }
      
      return {
        passed: gaps.length === 0,
        message: gaps.length > 0 ? `Found gaps: ${gaps.join(', ')}` : 'No gaps found'
      };
    }
  },
  {
    name: 'Financial Totals Balance Check',
    check: async () => {
      const invoiceTotal = await pool.query(`
        SELECT SUM(total_amount) as total 
        FROM financial.invoices 
        WHERE status = 'PAID'
      `);
      
      const transactionTotal = await pool.query(`
        SELECT SUM(amount) as total 
        FROM financial.transactions 
        WHERE type = 'INCOME' 
        AND category_id IN (SELECT id FROM financial.categories WHERE name LIKE '%Invoice%')
      `);
      
      const invoiceSum = parseFloat(invoiceTotal.rows[0].total || 0);
      const transactionSum = parseFloat(transactionTotal.rows[0].total || 0);
      const difference = Math.abs(invoiceSum - transactionSum);
      
      return {
        passed: difference < 0.01, // Allow for rounding errors
        message: `Invoice total: ${invoiceSum}, Transaction total: ${transactionSum}, Difference: ${difference}`
      };
    }
  },
  {
    name: 'Client-Invoice Relationship Integrity',
    check: async () => {
      const orphanedInvoices = await pool.query(`
        SELECT COUNT(*) as count
        FROM financial.invoices i
        LEFT JOIN financial.clients c ON i.client_id = c.id
        WHERE c.id IS NULL
      `);
      
      const count = parseInt(orphanedInvoices.rows[0].count);
      
      return {
        passed: count === 0,
        message: count > 0 ? `Found ${count} orphaned invoices` : 'All invoices have valid clients'
      };
    }
  }
];

// Calculate checksum for a dataset
function calculateChecksum(data) {
  const jsonString = JSON.stringify(data, Object.keys(data).sort());
  return crypto.createHash('sha256').update(jsonString).digest('hex');
}

// Compare two datasets
function compareData(sqlData, prismaData, testName) {
  const sqlChecksum = calculateChecksum(sqlData);
  const prismaChecksum = calculateChecksum(prismaData);
  
  if (sqlChecksum === prismaChecksum) {
    console.log(`${colors.green}✓${colors.reset} ${testName}: Data matches`);
    testResults.passed++;
    return true;
  } else {
    console.log(`${colors.red}✗${colors.reset} ${testName}: Data mismatch`);
    console.log(`  SQL Checksum: ${sqlChecksum}`);
    console.log(`  Prisma Checksum: ${prismaChecksum}`);
    console.log(`  SQL Data: ${JSON.stringify(sqlData).substring(0, 100)}...`);
    console.log(`  Prisma Data: ${JSON.stringify(prismaData).substring(0, 100)}...`);
    
    testResults.failed++;
    testResults.details.push({
      test: testName,
      sqlData: sqlData,
      prismaData: prismaData,
      sqlChecksum,
      prismaChecksum
    });
    
    return false;
  }
}

// Run verification test
async function runVerificationTest(test) {
  try {
    console.log(`\nRunning: ${test.name}`);
    
    // Execute SQL query
    const sqlResult = await pool.query(test.sql);
    const sqlData = sqlResult.rows;
    
    // Execute Prisma query
    const prismaData = await test.prisma();
    
    // Normalize data for comparison
    const normalizedSqlData = Array.isArray(sqlData) ? sqlData : [sqlData];
    const normalizedPrismaData = Array.isArray(prismaData) ? prismaData : [{ count: prismaData }];
    
    // Compare results
    compareData(normalizedSqlData, normalizedPrismaData, test.name);
    
  } catch (error) {
    console.log(`${colors.red}✗${colors.reset} ${test.name}: Error - ${error.message}`);
    testResults.failed++;
  }
}

// Run integrity check
async function runIntegrityCheck(check) {
  try {
    console.log(`\nRunning: ${check.name}`);
    
    const result = await check.check();
    
    if (result.passed) {
      console.log(`${colors.green}✓${colors.reset} ${check.name}: ${result.message}`);
      testResults.passed++;
    } else {
      console.log(`${colors.yellow}⚠${colors.reset} ${check.name}: ${result.message}`);
      testResults.warnings++;
    }
    
  } catch (error) {
    console.log(`${colors.red}✗${colors.reset} ${check.name}: Error - ${error.message}`);
    testResults.failed++;
  }
}

// Generate detailed report
async function generateReport() {
  const report = {
    timestamp: new Date().toISOString(),
    summary: {
      total: testResults.passed + testResults.failed + testResults.warnings,
      passed: testResults.passed,
      failed: testResults.failed,
      warnings: testResults.warnings,
      passRate: ((testResults.passed / (testResults.passed + testResults.failed)) * 100).toFixed(2) + '%'
    },
    failedTests: testResults.details,
    environment: {
      nodeVersion: process.version,
      database: process.env.DB_NAME || 'ai_service',
      prismaVersion: require('@prisma/client/package.json').version
    }
  };
  
  const reportPath = `verification-report-${Date.now()}.json`;
  await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
  
  console.log(`\nDetailed report saved to: ${reportPath}`);
  
  return report;
}

// Main verification function
async function verify() {
  console.log(`${colors.blue}Starting Financial Dashboard Migration Verification${colors.reset}`);
  console.log('=' .repeat(60));
  
  try {
    // Run verification tests
    console.log('\n📊 Data Comparison Tests:');
    for (const test of verificationTests) {
      await runVerificationTest(test);
    }
    
    // Run integrity checks
    console.log('\n🔍 Data Integrity Checks:');
    for (const check of integrityChecks) {
      await runIntegrityCheck(check);
    }
    
    // Generate report
    const report = await generateReport();
    
    // Summary
    console.log('\n' + '='.repeat(60));
    console.log(`${colors.blue}Verification Summary:${colors.reset}`);
    console.log(`Total Tests: ${report.summary.total}`);
    console.log(`${colors.green}Passed: ${report.summary.passed}${colors.reset}`);
    console.log(`${colors.red}Failed: ${report.summary.failed}${colors.reset}`);
    console.log(`${colors.yellow}Warnings: ${report.summary.warnings}${colors.reset}`);
    console.log(`Pass Rate: ${report.summary.passRate}`);
    
    // Final verdict
    if (report.summary.failed === 0 && report.summary.warnings === 0) {
      console.log(`\n${colors.green}✅ VERIFICATION PASSED - Safe to migrate!${colors.reset}`);
      process.exit(0);
    } else if (report.summary.failed === 0) {
      console.log(`\n${colors.yellow}⚠️  VERIFICATION PASSED WITH WARNINGS - Review before migrating${colors.reset}`);
      process.exit(0);
    } else {
      console.log(`\n${colors.red}❌ VERIFICATION FAILED - DO NOT MIGRATE!${colors.reset}`);
      process.exit(1);
    }
    
  } catch (error) {
    console.error(`${colors.red}Fatal error during verification: ${error.message}${colors.reset}`);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

// Handle errors
process.on('unhandledRejection', (error) => {
  console.error(`${colors.red}Unhandled error: ${error.message}${colors.reset}`);
  process.exit(1);
});

// Run verification
verify();