#!/usr/bin/env node

/**
 * Test script for enhanced financial dashboard API endpoints
 * Tests all new revenue dashboard endpoints
 */

const axios = require('axios');

// Configuration
const BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000';
const API_ENDPOINTS = {
  revenueMetrics: '/api/financial/dashboard/revenue-metrics',
  invoiceStats: '/api/financial/dashboard/invoice-stats',
  clientMetrics: '/api/financial/dashboard/client-metrics',
  cashFlow: '/api/financial/dashboard/cash-flow',
  health: '/api/financial/dashboard/health'
};

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logHeader(message) {
  log(`\n${'='.repeat(60)}`, 'cyan');
  log(`${message}`, 'bright');
  log(`${'='.repeat(60)}`, 'cyan');
}

function logSuccess(message) {
  log(`✅ ${message}`, 'green');
}

function logError(message) {
  log(`❌ ${message}`, 'red');
}

function logWarning(message) {
  log(`⚠️  ${message}`, 'yellow');
}

function logInfo(message) {
  log(`ℹ️  ${message}`, 'blue');
}

async function testEndpoint(name, url, params = {}) {
  try {
    logInfo(`Testing ${name}...`);
    
    const response = await axios.get(`${BASE_URL}${url}`, {
      params,
      timeout: 10000
    });

    if (response.data.success) {
      logSuccess(`${name} - Status: ${response.status}`);
      
      // Log key metrics from response
      const data = response.data.data;
      if (data) {
        if (data.currentPeriod) {
          log(`  📊 Total Revenue: ${data.currentPeriod.totalRevenue} ${data.currency}`, 'cyan');
          log(`  📈 Revenue Growth: ${data.growth?.revenueGrowth}%`, 'cyan');
        }
        if (data.overview) {
          log(`  📋 Total Invoices: ${data.overview.totalInvoices}`, 'cyan');
          log(`  💰 Total Amount: ${data.overview.totalAmount} ${data.currency}`, 'cyan');
        }
        if (data.summary) {
          log(`  👥 Total Clients: ${data.summary.totalClients}`, 'cyan');
          log(`  💸 Total Client Revenue: ${data.summary.totalClientRevenue} ${data.currency}`, 'cyan');
        }
        if (data.currentPosition) {
          log(`  💳 Current Cash: ${data.currentPosition.currentCashBalance} ${data.currency}`, 'cyan');
          log(`  📊 Collection Rate: ${data.currentPosition.collectionRate}%`, 'cyan');
        }
      }
      
      return { success: true, data: response.data };
    } else {
      logError(`${name} - API returned success: false`);
      logError(`Error: ${response.data.error}`);
      return { success: false, error: response.data.error };
    }
  } catch (error) {
    logError(`${name} - Request failed`);
    if (error.response) {
      logError(`Status: ${error.response.status}`);
      logError(`Error: ${error.response.data?.error || error.response.statusText}`);
    } else if (error.request) {
      logError('No response received - server might be down');
    } else {
      logError(`Error: ${error.message}`);
    }
    return { success: false, error: error.message };
  }
}

async function runTests() {
  logHeader('ENHANCED FINANCIAL DASHBOARD API TESTS');
  
  const results = {
    passed: 0,
    failed: 0,
    details: []
  };

  // Test 1: Health Check
  logHeader('1. HEALTH CHECK');
  const healthResult = await testEndpoint(
    'Dashboard Health Check',
    API_ENDPOINTS.health
  );
  
  if (healthResult.success) {
    results.passed++;
    results.details.push({ test: 'Health Check', status: 'PASSED' });
  } else {
    results.failed++;
    results.details.push({ test: 'Health Check', status: 'FAILED', error: healthResult.error });
    logWarning('Skipping remaining tests due to health check failure');
    return results;
  }

  // Test 2: Revenue Metrics
  logHeader('2. REVENUE METRICS');
  const revenueResult = await testEndpoint(
    'Revenue Metrics (Monthly)',
    API_ENDPOINTS.revenueMetrics,
    { period: 'monthly', currency: 'EUR' }
  );
  
  if (revenueResult.success) {
    results.passed++;
    results.details.push({ test: 'Revenue Metrics', status: 'PASSED' });
  } else {
    results.failed++;
    results.details.push({ test: 'Revenue Metrics', status: 'FAILED', error: revenueResult.error });
  }

  // Test 3: Revenue Metrics - Quarterly
  const revenueQuarterlyResult = await testEndpoint(
    'Revenue Metrics (Quarterly)',
    API_ENDPOINTS.revenueMetrics,
    { period: 'quarterly', currency: 'EUR' }
  );
  
  if (revenueQuarterlyResult.success) {
    results.passed++;
    results.details.push({ test: 'Revenue Metrics (Quarterly)', status: 'PASSED' });
  } else {
    results.failed++;
    results.details.push({ test: 'Revenue Metrics (Quarterly)', status: 'FAILED', error: revenueQuarterlyResult.error });
  }

  // Test 4: Invoice Statistics
  logHeader('3. INVOICE STATISTICS');
  const invoiceStatsResult = await testEndpoint(
    'Invoice Statistics',
    API_ENDPOINTS.invoiceStats,
    { currency: 'EUR', includeAging: 'true' }
  );
  
  if (invoiceStatsResult.success) {
    results.passed++;
    results.details.push({ test: 'Invoice Statistics', status: 'PASSED' });
  } else {
    results.failed++;
    results.details.push({ test: 'Invoice Statistics', status: 'FAILED', error: invoiceStatsResult.error });
  }

  // Test 5: Client Metrics
  logHeader('4. CLIENT PERFORMANCE METRICS');
  const clientMetricsResult = await testEndpoint(
    'Client Metrics',
    API_ENDPOINTS.clientMetrics,
    { currency: 'EUR', limit: 10, sortBy: 'total_revenue' }
  );
  
  if (clientMetricsResult.success) {
    results.passed++;
    results.details.push({ test: 'Client Metrics', status: 'PASSED' });
  } else {
    results.failed++;
    results.details.push({ test: 'Client Metrics', status: 'FAILED', error: clientMetricsResult.error });
  }

  // Test 6: Client Metrics by Risk Score
  const clientMetricsRiskResult = await testEndpoint(
    'Client Metrics (Risk Sorted)',
    API_ENDPOINTS.clientMetrics,
    { currency: 'EUR', limit: 10, sortBy: 'risk_score', includeInactive: 'false' }
  );
  
  if (clientMetricsRiskResult.success) {
    results.passed++;
    results.details.push({ test: 'Client Metrics (Risk)', status: 'PASSED' });
  } else {
    results.failed++;
    results.details.push({ test: 'Client Metrics (Risk)', status: 'FAILED', error: clientMetricsRiskResult.error });
  }

  // Test 7: Cash Flow Projections
  logHeader('5. CASH FLOW PROJECTIONS');
  const cashFlowResult = await testEndpoint(
    'Cash Flow Projections',
    API_ENDPOINTS.cashFlow,
    { currency: 'EUR', daysAhead: 90, includeTransactions: 'true' }
  );
  
  if (cashFlowResult.success) {
    results.passed++;
    results.details.push({ test: 'Cash Flow Projections', status: 'PASSED' });
  } else {
    results.failed++;
    results.details.push({ test: 'Cash Flow Projections', status: 'FAILED', error: cashFlowResult.error });
  }

  // Test 8: Cash Flow Projections (Short term)
  const cashFlowShortResult = await testEndpoint(
    'Cash Flow Projections (30 days)',
    API_ENDPOINTS.cashFlow,
    { currency: 'EUR', daysAhead: 30, includeTransactions: 'false' }
  );
  
  if (cashFlowShortResult.success) {
    results.passed++;
    results.details.push({ test: 'Cash Flow (30 days)', status: 'PASSED' });
  } else {
    results.failed++;
    results.details.push({ test: 'Cash Flow (30 days)', status: 'FAILED', error: cashFlowShortResult.error });
  }

  return results;
}

async function main() {
  try {
    const startTime = Date.now();
    const results = await runTests();
    const endTime = Date.now();
    const duration = (endTime - startTime) / 1000;

    // Final Results
    logHeader('TEST RESULTS SUMMARY');
    
    log(`Total Tests Run: ${results.passed + results.failed}`, 'blue');
    logSuccess(`Tests Passed: ${results.passed}`);
    if (results.failed > 0) {
      logError(`Tests Failed: ${results.failed}`);
    }
    log(`Duration: ${duration.toFixed(2)} seconds`, 'blue');

    // Detailed Results
    log('\nDetailed Results:', 'bright');
    results.details.forEach((detail, index) => {
      const status = detail.status === 'PASSED' ? '✅' : '❌';
      log(`${index + 1}. ${detail.test}: ${status}`, detail.status === 'PASSED' ? 'green' : 'red');
      if (detail.error) {
        log(`   Error: ${detail.error}`, 'red');
      }
    });

    // API Endpoints tested
    log('\nAPI Endpoints Tested:', 'bright');
    Object.entries(API_ENDPOINTS).forEach(([name, url]) => {
      log(`• ${name}: ${BASE_URL}${url}`, 'cyan');
    });

    // Exit code
    process.exit(results.failed > 0 ? 1 : 0);

  } catch (error) {
    logError('Test runner failed');
    logError(error.message);
    process.exit(1);
  }
}

// Handle interruption
process.on('SIGINT', () => {
  log('\nTest interrupted by user', 'yellow');
  process.exit(130);
});

// Run the tests
if (require.main === module) {
  main();
}

module.exports = { runTests, testEndpoint };