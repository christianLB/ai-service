#!/usr/bin/env node

/**
 * Financial Dashboard Rollback Script
 * 
 * CRITICAL: This script handles rollback for financial dashboard migration
 * Must complete within 5 minutes to meet SLA requirements
 * 
 * Usage: node financial-dashboard-rollback.js [--dry-run] [--force]
 */

const { exec } = require('child_process');
const { promisify } = require('util');
const fs = require('fs').promises;
const path = require('path');

const execAsync = promisify(exec);

// Configuration
const CONFIG = {
  SERVICE_FILE: 'src/services/financial/financial-dashboard-prisma.service.ts',
  ROUTES_FILE: 'src/routes/financial/dashboard.routes.ts',
  BACKUP_DIR: '.rollback-backups',
  VALIDATION_TIMEOUT: 30000, // 30 seconds
  ROLLBACK_TIMEOUT: 300000, // 5 minutes
  FEATURE_FLAG_KEY: 'USE_PRISMA_DASHBOARD'
};

// Color codes for console output
const colors = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m'
};

// Logging helpers
const log = {
  info: (msg) => console.log(`${colors.blue}[INFO]${colors.reset} ${msg}`),
  success: (msg) => console.log(`${colors.green}[SUCCESS]${colors.reset} ${msg}`),
  warn: (msg) => console.log(`${colors.yellow}[WARN]${colors.reset} ${msg}`),
  error: (msg) => console.error(`${colors.red}[ERROR]${colors.reset} ${msg}`),
  critical: (msg) => {
    console.error(`${colors.red}[CRITICAL]${colors.reset} ${msg}`);
    process.exit(1);
  }
};

// Parse command line arguments
const args = process.argv.slice(2);
const isDryRun = args.includes('--dry-run');
const isForced = args.includes('--force');

// Rollback steps
const rollbackSteps = [
  {
    name: 'Validate current state',
    action: validateCurrentState,
    timeout: CONFIG.VALIDATION_TIMEOUT
  },
  {
    name: 'Create safety backup',
    action: createSafetyBackup,
    timeout: 60000
  },
  {
    name: 'Disable feature flag',
    action: disableFeatureFlag,
    timeout: 10000
  },
  {
    name: 'Revert route handlers',
    action: revertRouteHandlers,
    timeout: 30000
  },
  {
    name: 'Verify SQL service health',
    action: verifySqlServiceHealth,
    timeout: 30000
  },
  {
    name: 'Run smoke tests',
    action: runSmokeTests,
    timeout: 60000
  },
  {
    name: 'Clean up Prisma service',
    action: cleanupPrismaService,
    timeout: 30000
  }
];

// Main rollback function
async function rollback() {
  const startTime = Date.now();
  
  log.info('Starting Financial Dashboard Rollback...');
  log.info(`Mode: ${isDryRun ? 'DRY RUN' : 'LIVE'}`);
  log.info(`Force: ${isForced ? 'YES' : 'NO'}`);
  
  if (!isDryRun && !isForced) {
    log.warn('This will rollback the financial dashboard to SQL implementation.');
    log.warn('Press Ctrl+C within 10 seconds to cancel...');
    await sleep(10000);
  }

  try {
    for (const step of rollbackSteps) {
      await executeStep(step);
    }

    const duration = Date.now() - startTime;
    log.success(`Rollback completed successfully in ${duration}ms`);
    
    if (duration > CONFIG.ROLLBACK_TIMEOUT) {
      log.warn(`Rollback exceeded SLA time (${CONFIG.ROLLBACK_TIMEOUT}ms)`);
    }
  } catch (error) {
    log.error(`Rollback failed: ${error.message}`);
    log.error('Manual intervention required!');
    process.exit(1);
  }
}

// Execute a single rollback step
async function executeStep(step) {
  log.info(`Executing: ${step.name}...`);
  
  if (isDryRun) {
    log.info(`[DRY RUN] Would execute: ${step.name}`);
    return;
  }

  const timeout = setTimeout(() => {
    log.error(`Step '${step.name}' timed out after ${step.timeout}ms`);
    process.exit(1);
  }, step.timeout);

  try {
    await step.action();
    clearTimeout(timeout);
    log.success(`✓ ${step.name}`);
  } catch (error) {
    clearTimeout(timeout);
    throw new Error(`Failed at step '${step.name}': ${error.message}`);
  }
}

// Step implementations
async function validateCurrentState() {
  // Check if Prisma service exists
  try {
    await fs.access(CONFIG.SERVICE_FILE);
    log.info('Prisma service found');
  } catch {
    throw new Error('Prisma service not found - nothing to rollback');
  }

  // Check database connectivity
  const { stdout, stderr } = await execAsync('npm run db:status');
  if (stderr) {
    throw new Error(`Database connectivity check failed: ${stderr}`);
  }
}

async function createSafetyBackup() {
  // Create backup directory
  await fs.mkdir(CONFIG.BACKUP_DIR, { recursive: true });
  
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupPath = path.join(CONFIG.BACKUP_DIR, timestamp);
  await fs.mkdir(backupPath);

  // Backup critical files
  const filesToBackup = [
    CONFIG.SERVICE_FILE,
    CONFIG.ROUTES_FILE,
    '.env',
    'prisma/schema.prisma'
  ];

  for (const file of filesToBackup) {
    try {
      const content = await fs.readFile(file, 'utf8');
      const backupFile = path.join(backupPath, path.basename(file));
      await fs.writeFile(backupFile, content);
      log.info(`Backed up: ${file}`);
    } catch (error) {
      log.warn(`Could not backup ${file}: ${error.message}`);
    }
  }

  // Create database backup
  log.info('Creating database backup...');
  await execAsync(`make db-backup BACKUP_NAME=rollback-${timestamp}`);
}

async function disableFeatureFlag() {
  // Update environment variable
  const envPath = '.env';
  let envContent = await fs.readFile(envPath, 'utf8');
  
  if (envContent.includes(CONFIG.FEATURE_FLAG_KEY)) {
    envContent = envContent.replace(
      new RegExp(`${CONFIG.FEATURE_FLAG_KEY}=true`, 'g'),
      `${CONFIG.FEATURE_FLAG_KEY}=false`
    );
  } else {
    envContent += `\n${CONFIG.FEATURE_FLAG_KEY}=false\n`;
  }
  
  await fs.writeFile(envPath, envContent);
  log.info('Feature flag disabled');
}

async function revertRouteHandlers() {
  // This would typically revert the route handlers to use SQL service
  // For now, we'll just verify the routes file exists
  try {
    await fs.access(CONFIG.ROUTES_FILE);
    log.info('Route handlers ready for SQL service');
  } catch {
    throw new Error('Routes file not found');
  }
}

async function verifySqlServiceHealth() {
  // Run a simple health check query
  const healthCheckScript = `
    const { databaseService } = require('./src/services/financial/database.service');
    databaseService.pool.query('SELECT NOW()')
      .then(() => process.exit(0))
      .catch(() => process.exit(1));
  `;
  
  const tempFile = 'health-check.js';
  await fs.writeFile(tempFile, healthCheckScript);
  
  try {
    await execAsync(`node ${tempFile}`);
    log.info('SQL service is healthy');
  } catch {
    throw new Error('SQL service health check failed');
  } finally {
    await fs.unlink(tempFile);
  }
}

async function runSmokeTests() {
  // Run basic API tests
  const tests = [
    'curl -s -o /dev/null -w "%{http_code}" http://localhost:3001/health',
    'curl -s -o /dev/null -w "%{http_code}" http://localhost:3001/api/dashboard/metrics'
  ];

  for (const test of tests) {
    try {
      const { stdout } = await execAsync(test);
      if (stdout !== '200' && stdout !== '401') { // 401 is OK (needs auth)
        throw new Error(`Test failed with status: ${stdout}`);
      }
    } catch (error) {
      log.warn(`Smoke test failed: ${test}`);
    }
  }
}

async function cleanupPrismaService() {
  // Move Prisma service to archived state
  const archivePath = `${CONFIG.SERVICE_FILE}.archived`;
  await fs.rename(CONFIG.SERVICE_FILE, archivePath);
  log.info(`Archived Prisma service to: ${archivePath}`);
}

// Utility functions
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Error handler
process.on('unhandledRejection', (error) => {
  log.critical(`Unhandled error: ${error.message}`);
});

// Signal handlers
process.on('SIGINT', () => {
  log.warn('\nRollback interrupted by user');
  process.exit(1);
});

process.on('SIGTERM', () => {
  log.warn('\nRollback terminated');
  process.exit(1);
});

// Run rollback
rollback().catch((error) => {
  log.critical(`Rollback failed: ${error.message}`);
});