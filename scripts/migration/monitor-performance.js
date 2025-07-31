#!/usr/bin/env node

/**
 * Performance Monitoring Script for Prisma Migration
 * 
 * Monitors query performance, memory usage, and error rates during migration testing
 */

const fs = require('fs').promises;
const path = require('path');
const { exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);

// Configuration
const CONFIG = {
  LOG_FILE: path.join(__dirname, '../../logs/performance.json'),
  METRICS_FILE: path.join(__dirname, '../../logs/migration-metrics.json'),
  DOCKER_CONTAINER: 'ai-service-api-dev',
  CHECK_INTERVAL: 5000, // 5 seconds
  API_BASE_URL: process.env.API_URL || 'http://localhost:3001'
};

// Metrics storage
let metrics = {
  startTime: new Date().toISOString(),
  samples: [],
  summary: {
    avgQueryTime: 0,
    maxQueryTime: 0,
    minQueryTime: Infinity,
    avgMemoryUsage: 0,
    maxMemoryUsage: 0,
    errorCount: 0,
    requestCount: 0,
    prismaRequests: 0,
    sqlRequests: 0
  }
};

// Get Docker stats
async function getDockerStats() {
  try {
    const { stdout } = await execAsync(`docker stats ${CONFIG.DOCKER_CONTAINER} --no-stream --format "{{json .}}"`);
    const stats = JSON.parse(stdout);
    
    return {
      memoryUsage: stats.MemUsage,
      memoryPercentage: parseFloat(stats.MemPerc),
      cpuPercentage: parseFloat(stats.CPUPerc)
    };
  } catch (error) {
    console.error('Failed to get Docker stats:', error.message);
    return null;
  }
}

// Parse logs for performance metrics
async function parseRecentLogs() {
  try {
    // Get last 100 lines of logs
    const { stdout } = await execAsync(`docker logs ${CONFIG.DOCKER_CONTAINER} --tail 100 2>&1`);
    
    const lines = stdout.split('\n');
    const queryTimes = [];
    let errorCount = 0;
    let prismaCount = 0;
    let sqlCount = 0;
    
    for (const line of lines) {
      // Look for query performance logs
      if (line.includes('Query performance')) {
        const match = line.match(/duration: (\d+\.?\d*)ms/);
        if (match) {
          queryTimes.push(parseFloat(match[1]));
        }
      }
      
      // Count errors
      if (line.includes('ERROR') || line.includes('Error')) {
        errorCount++;
      }
      
      // Count service usage
      if (line.includes('Using Prisma')) {
        prismaCount++;
      } else if (line.includes('Using SQL')) {
        sqlCount++;
      }
    }
    
    return {
      queryTimes,
      errorCount,
      prismaCount,
      sqlCount
    };
  } catch (error) {
    console.error('Failed to parse logs:', error.message);
    return {
      queryTimes: [],
      errorCount: 0,
      prismaCount: 0,
      sqlCount: 0
    };
  }
}

// Test API endpoints
async function testEndpoints() {
  const endpoints = [
    '/api/financial/dashboard/health',
    '/api/financial/dashboard/revenue-metrics',
    '/api/financial/dashboard/invoice-stats',
    '/api/financial/dashboard/client-metrics'
  ];
  
  const results = {
    successful: 0,
    failed: 0,
    avgResponseTime: 0
  };
  
  const responseTimes = [];
  
  for (const endpoint of endpoints) {
    const startTime = Date.now();
    
    try {
      const response = await fetch(`${CONFIG.API_BASE_URL}${endpoint}`, {
        headers: {
          'Authorization': `Bearer ${process.env.AUTH_TOKEN || ''}`
        }
      });
      
      const responseTime = Date.now() - startTime;
      responseTimes.push(responseTime);
      
      if (response.ok) {
        results.successful++;
      } else {
        results.failed++;
      }
    } catch (error) {
      results.failed++;
    }
  }
  
  if (responseTimes.length > 0) {
    results.avgResponseTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
  }
  
  return results;
}

// Collect metrics
async function collectMetrics() {
  const timestamp = new Date().toISOString();
  
  // Get Docker stats
  const dockerStats = await getDockerStats();
  
  // Parse recent logs
  const logMetrics = await parseRecentLogs();
  
  // Test endpoints (optional - only if AUTH_TOKEN is set)
  let apiMetrics = null;
  if (process.env.AUTH_TOKEN) {
    apiMetrics = await testEndpoints();
  }
  
  // Create sample
  const sample = {
    timestamp,
    docker: dockerStats,
    queries: {
      count: logMetrics.queryTimes.length,
      avgTime: logMetrics.queryTimes.length > 0 
        ? logMetrics.queryTimes.reduce((a, b) => a + b, 0) / logMetrics.queryTimes.length
        : 0,
      maxTime: logMetrics.queryTimes.length > 0 
        ? Math.max(...logMetrics.queryTimes)
        : 0,
      minTime: logMetrics.queryTimes.length > 0
        ? Math.min(...logMetrics.queryTimes)
        : 0
    },
    errors: logMetrics.errorCount,
    serviceUsage: {
      prisma: logMetrics.prismaCount,
      sql: logMetrics.sqlCount
    },
    api: apiMetrics
  };
  
  // Add to metrics
  metrics.samples.push(sample);
  
  // Update summary
  updateSummary();
  
  // Display current metrics
  displayMetrics(sample);
  
  // Save metrics
  await saveMetrics();
}

// Update summary statistics
function updateSummary() {
  const samples = metrics.samples;
  if (samples.length === 0) return;
  
  // Query times
  const allQueryTimes = samples.flatMap(s => s.queries.avgTime || 0).filter(t => t > 0);
  if (allQueryTimes.length > 0) {
    metrics.summary.avgQueryTime = allQueryTimes.reduce((a, b) => a + b, 0) / allQueryTimes.length;
    metrics.summary.maxQueryTime = Math.max(...samples.map(s => s.queries.maxTime || 0));
    metrics.summary.minQueryTime = Math.min(...samples.map(s => s.queries.minTime || Infinity).filter(t => t < Infinity));
  }
  
  // Memory usage
  const memoryUsages = samples.map(s => s.docker?.memoryPercentage || 0).filter(m => m > 0);
  if (memoryUsages.length > 0) {
    metrics.summary.avgMemoryUsage = memoryUsages.reduce((a, b) => a + b, 0) / memoryUsages.length;
    metrics.summary.maxMemoryUsage = Math.max(...memoryUsages);
  }
  
  // Errors and requests
  metrics.summary.errorCount = samples.reduce((sum, s) => sum + (s.errors || 0), 0);
  metrics.summary.requestCount = samples.reduce((sum, s) => sum + (s.queries.count || 0), 0);
  metrics.summary.prismaRequests = samples.reduce((sum, s) => sum + (s.serviceUsage?.prisma || 0), 0);
  metrics.summary.sqlRequests = samples.reduce((sum, s) => sum + (s.serviceUsage?.sql || 0), 0);
}

// Display current metrics
function displayMetrics(sample) {
  console.clear();
  console.log('🔍 Prisma Migration Performance Monitor');
  console.log('=====================================');
  console.log(`Started: ${metrics.startTime}`);
  console.log(`Samples: ${metrics.samples.length}`);
  console.log('');
  
  console.log('📊 Current Sample:');
  console.log(`  Timestamp: ${sample.timestamp}`);
  
  if (sample.docker) {
    console.log(`  Memory: ${sample.docker.memoryUsage} (${sample.docker.memoryPercentage.toFixed(2)}%)`);
    console.log(`  CPU: ${sample.docker.cpuPercentage.toFixed(2)}%`);
  }
  
  console.log(`  Queries: ${sample.queries.count}`);
  if (sample.queries.count > 0) {
    console.log(`    Avg: ${sample.queries.avgTime.toFixed(2)}ms`);
    console.log(`    Max: ${sample.queries.maxTime.toFixed(2)}ms`);
    console.log(`    Min: ${sample.queries.minTime.toFixed(2)}ms`);
  }
  
  console.log(`  Errors: ${sample.errors}`);
  console.log(`  Service Usage:`);
  console.log(`    Prisma: ${sample.serviceUsage.prisma}`);
  console.log(`    SQL: ${sample.serviceUsage.sql}`);
  
  console.log('');
  console.log('📈 Summary:');
  console.log(`  Avg Query Time: ${metrics.summary.avgQueryTime.toFixed(2)}ms`);
  console.log(`  Max Query Time: ${metrics.summary.maxQueryTime.toFixed(2)}ms`);
  console.log(`  Avg Memory: ${metrics.summary.avgMemoryUsage.toFixed(2)}%`);
  console.log(`  Total Errors: ${metrics.summary.errorCount}`);
  console.log(`  Total Requests: ${metrics.summary.requestCount}`);
  console.log(`  Service Distribution:`);
  const total = metrics.summary.prismaRequests + metrics.summary.sqlRequests;
  if (total > 0) {
    console.log(`    Prisma: ${((metrics.summary.prismaRequests / total) * 100).toFixed(1)}%`);
    console.log(`    SQL: ${((metrics.summary.sqlRequests / total) * 100).toFixed(1)}%`);
  }
  
  console.log('');
  console.log('Press Ctrl+C to stop monitoring...');
}

// Save metrics to file
async function saveMetrics() {
  try {
    await fs.mkdir(path.dirname(CONFIG.METRICS_FILE), { recursive: true });
    await fs.writeFile(CONFIG.METRICS_FILE, JSON.stringify(metrics, null, 2));
    
    // Also save summary for status updates
    await fs.writeFile(CONFIG.LOG_FILE, JSON.stringify({
      ...metrics.summary,
      lastUpdated: new Date().toISOString()
    }, null, 2));
  } catch (error) {
    console.error('Failed to save metrics:', error.message);
  }
}

// Load previous metrics if they exist
async function loadMetrics() {
  try {
    const data = await fs.readFile(CONFIG.METRICS_FILE, 'utf8');
    const loaded = JSON.parse(data);
    
    // Only load if from the same session (within last hour)
    const startTime = new Date(loaded.startTime);
    const now = new Date();
    if (now - startTime < 3600000) { // 1 hour
      metrics = loaded;
      console.log('Loaded previous metrics from this session');
    }
  } catch (error) {
    // File doesn't exist or is invalid, start fresh
  }
}

// Graceful shutdown
function shutdown() {
  console.log('\n\nStopping performance monitor...');
  console.log(`Final metrics saved to: ${CONFIG.METRICS_FILE}`);
  process.exit(0);
}

// Main monitoring loop
async function main() {
  // Load previous metrics
  await loadMetrics();
  
  // Set up signal handlers
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
  
  console.log('Starting performance monitor...');
  console.log(`Monitoring container: ${CONFIG.DOCKER_CONTAINER}`);
  console.log(`Check interval: ${CONFIG.CHECK_INTERVAL}ms`);
  console.log('');
  
  // Initial collection
  await collectMetrics();
  
  // Start monitoring loop
  setInterval(collectMetrics, CONFIG.CHECK_INTERVAL);
}

// Run the monitor
main().catch(error => {
  console.error('Monitor failed:', error);
  process.exit(1);
});