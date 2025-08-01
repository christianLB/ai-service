#!/usr/bin/env node

/**
 * Migration Status Update Script
 * 
 * Updates the MIGRATION-STATUS.md document with current migration progress
 * Can be run manually or via CI/CD pipeline
 */

const fs = require('fs').promises;
const path = require('path');
const { exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);

// Configuration
const CONFIG = {
  STATUS_FILE: path.join(__dirname, '../../docs/technical-debt/MIGRATION-STATUS.md'),
  PRISMA_SCHEMA: path.join(__dirname, '../../prisma/schema.prisma'),
  SERVICES_DIR: path.join(__dirname, '../../src/services'),
  VERIFICATION_REPORT_DIR: path.join(__dirname, '../../verification-reports')
};

// Service patterns to track
const SERVICE_PATTERNS = {
  financial: /\.(service|prisma\.service)\.ts$/,
  trading: /trading.*\.(service|prisma\.service)\.ts$/,
  auth: /auth.*\.(service|prisma\.service)\.ts$/,
  tagging: /tag.*\.(service|prisma\.service)\.ts$/
};

// Collect migration data
async function collectMigrationData() {
  const data = {
    timestamp: new Date().toISOString(),
    services: {
      total: 0,
      migrated: 0,
      inProgress: 0,
      remaining: 0,
      byModule: {}
    },
    performance: {
      avgQueryTime: null,
      memoryUsage: null,
      cpuUsage: null,
      errorRate: null
    },
    validation: {
      lastRun: null,
      results: {}
    },
    currentBranch: await getCurrentBranch(),
    featureFlags: await getFeatureFlags()
  };

  // Count services
  await countServices(data);

  // Get performance metrics (if available)
  await getPerformanceMetrics(data);

  // Get validation results
  await getValidationResults(data);

  return data;
}

// Count services and their migration status
async function countServices(data) {
  const servicesDir = CONFIG.SERVICES_DIR;
  
  async function scanDirectory(dir) {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      
      if (entry.isDirectory()) {
        await scanDirectory(fullPath);
      } else if (entry.name.endsWith('.service.ts')) {
        data.services.total++;
        
        // Check if it's a Prisma service
        const content = await fs.readFile(fullPath, 'utf8');
        const isPrismaService = entry.name.includes('prisma.service') || 
                               content.includes('PrismaClient') ||
                               content.includes('@prisma/client');
        
        if (isPrismaService) {
          data.services.migrated++;
        } else {
          // Check if there's a corresponding Prisma version
          const prismaVersion = fullPath.replace('.service.ts', '-prisma.service.ts');
          try {
            await fs.access(prismaVersion);
            // Both versions exist - in progress
            data.services.inProgress++;
          } catch {
            // Only SQL version exists
            data.services.remaining++;
          }
        }
        
        // Categorize by module
        const module = getModuleName(fullPath);
        if (!data.services.byModule[module]) {
          data.services.byModule[module] = { total: 0, migrated: 0 };
        }
        data.services.byModule[module].total++;
        if (isPrismaService) {
          data.services.byModule[module].migrated++;
        }
      }
    }
  }
  
  await scanDirectory(servicesDir);
}

// Get module name from file path
function getModuleName(filePath) {
  const parts = filePath.split(path.sep);
  const servicesIndex = parts.indexOf('services');
  if (servicesIndex >= 0 && servicesIndex < parts.length - 2) {
    return parts[servicesIndex + 1];
  }
  return 'other';
}

// Get current git branch
async function getCurrentBranch() {
  try {
    const { stdout } = await execAsync('git rev-parse --abbrev-ref HEAD');
    return stdout.trim();
  } catch {
    return 'unknown';
  }
}

// Get feature flag status
async function getFeatureFlags() {
  try {
    const envPath = path.join(__dirname, '../../.env');
    const envContent = await fs.readFile(envPath, 'utf8');
    
    const flags = {
      USE_PRISMA_DASHBOARD: envContent.includes('USE_PRISMA_DASHBOARD=true'),
      ENABLE_SQL_VALIDATION: envContent.includes('ENABLE_SQL_VALIDATION=true'),
      LOG_QUERY_PERFORMANCE: envContent.includes('LOG_QUERY_PERFORMANCE=true')
    };
    
    return flags;
  } catch {
    return {
      USE_PRISMA_DASHBOARD: false,
      ENABLE_SQL_VALIDATION: false,
      LOG_QUERY_PERFORMANCE: false
    };
  }
}

// Get performance metrics from logs or monitoring
async function getPerformanceMetrics(data) {
  // This would typically connect to your monitoring system
  // For now, we'll use placeholder data
  
  // Check if there's a performance log
  try {
    const perfLogPath = path.join(__dirname, '../../logs/performance.json');
    const perfData = JSON.parse(await fs.readFile(perfLogPath, 'utf8'));
    
    data.performance = {
      avgQueryTime: perfData.avgQueryTime || 'N/A',
      memoryUsage: perfData.memoryUsage || 'N/A',
      cpuUsage: perfData.cpuUsage || 'N/A',
      errorRate: perfData.errorRate || 'N/A'
    };
  } catch {
    // Use defaults if no performance data available
  }
}

// Get latest validation results
async function getValidationResults(data) {
  try {
    // Find the latest verification report
    const reports = await fs.readdir(CONFIG.VERIFICATION_REPORT_DIR);
    const jsonReports = reports.filter(f => f.startsWith('verification-report-') && f.endsWith('.json'));
    
    if (jsonReports.length > 0) {
      // Sort by timestamp in filename
      jsonReports.sort((a, b) => b.localeCompare(a));
      const latestReport = jsonReports[0];
      
      const reportData = JSON.parse(
        await fs.readFile(path.join(CONFIG.VERIFICATION_REPORT_DIR, latestReport), 'utf8')
      );
      
      data.validation.lastRun = reportData.timestamp;
      data.validation.results = reportData.summary;
    }
  } catch {
    // No validation results available yet
  }
}

// Update the status document
async function updateStatusDocument(data) {
  const template = await fs.readFile(CONFIG.STATUS_FILE, 'utf8');
  
  // Calculate percentages
  const migrationPercentage = ((data.services.migrated / data.services.total) * 100).toFixed(1);
  const progressBar = generateProgressBar(migrationPercentage);
  
  // Format current date
  const now = new Date();
  const formattedDate = now.toISOString().replace('T', ' ').substring(0, 19) + ' UTC';
  
  // Build module status tables
  let moduleStatus = '';
  for (const [module, stats] of Object.entries(data.services.byModule)) {
    const percentage = ((stats.migrated / stats.total) * 100).toFixed(0);
    moduleStatus += `| ${module} | ${stats.migrated}/${stats.total} | ${percentage}% |\n`;
  }
  
  // Update the document
  let updated = template;
  
  // Update timestamp
  updated = updated.replace(/\*\*Last Updated\*\*: .+/, `**Last Updated**: ${formattedDate}`);
  
  // Update overall progress
  updated = updated.replace(/\| \*\*Total Services\*\* \| \d+ \|/, `| **Total Services** | ${data.services.total} |`);
  updated = updated.replace(/\| \*\*Migrated Services\*\* \| \d+ \| .+ \|/, `| **Migrated Services** | ${data.services.migrated} | 🟡 ${migrationPercentage}% |`);
  updated = updated.replace(/\| \*\*In Progress\*\* \| \d+ \|/, `| **In Progress** | ${data.services.inProgress} |`);
  updated = updated.replace(/\| \*\*Remaining\*\* \| \d+ \|/, `| **Remaining** | ${data.services.remaining} |`);
  
  // Update progress bar
  updated = updated.replace(/\[█+░*\] [\d.]+%/, `${progressBar} ${migrationPercentage}%`);
  
  // Update performance metrics if available
  if (data.performance.avgQueryTime !== null) {
    updated = updated.replace(/\| Avg Query Time \| .+ \|/, `| Avg Query Time | ${data.performance.avgQueryTime} |`);
    updated = updated.replace(/\| Memory Usage \| .+ \|/, `| Memory Usage | ${data.performance.memoryUsage} |`);
    updated = updated.replace(/\| CPU Usage \| .+ \|/, `| CPU Usage | ${data.performance.cpuUsage} |`);
    updated = updated.replace(/\| Error Rate \| .+ \|/, `| Error Rate | ${data.performance.errorRate} |`);
  }
  
  // Update validation results if available
  if (data.validation.lastRun) {
    const validationDate = new Date(data.validation.lastRun).toISOString().substring(0, 19);
    updated = updated.replace(/\| Row Count Match \| .+ \| .+ \|/, `| Row Count Match | ${data.validation.results.passed > 0 ? '✅' : '❌'} | ${validationDate} |`);
  }
  
  // Update automation timestamp
  const automationSection = `<!-- AUTOMATION_START -->
Last automatic update: ${formattedDate}
Next scheduled update: ${new Date(now.getTime() + 15 * 60 * 1000).toISOString().replace('T', ' ').substring(0, 19)} UTC
<!-- AUTOMATION_END -->`;
  
  updated = updated.replace(/<!-- AUTOMATION_START -->[\s\S]*<!-- AUTOMATION_END -->/, automationSection);
  
  // Write the updated document
  await fs.writeFile(CONFIG.STATUS_FILE, updated);
  
  console.log(`✅ Migration status updated at ${formattedDate}`);
  console.log(`   Total services: ${data.services.total}`);
  console.log(`   Migrated: ${data.services.migrated} (${migrationPercentage}%)`);
  console.log(`   In progress: ${data.services.inProgress}`);
  console.log(`   Remaining: ${data.services.remaining}`);
}

// Generate progress bar
function generateProgressBar(percentage) {
  const filled = Math.round(percentage / 2.5); // 40 characters total
  const empty = 40 - filled;
  return '[' + '█'.repeat(filled) + '░'.repeat(empty) + ']';
}

// Main execution
async function main() {
  try {
    console.log('📊 Collecting migration data...');
    const data = await collectMigrationData();
    
    console.log('📝 Updating status document...');
    await updateStatusDocument(data);
    
    console.log('✨ Migration status update complete!');
  } catch (error) {
    console.error('❌ Error updating migration status:', error);
    process.exit(1);
  }
}

// Run the script
main();