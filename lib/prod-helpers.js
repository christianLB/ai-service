#!/usr/bin/env node

/**
 * Production Helpers Library
 * 
 * This library provides safe, reliable production command execution helpers
 * Replaces the broken Makefile system with reliable Node.js operations
 * 
 * @version 1.0.0
 * @author AI CLI Specialist
 */

const { execSync, exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

/**
 * Load production configuration
 * @returns {Object} Production configuration
 */
function loadProductionConfig() {
  const configPath = path.join(__dirname, '../config/production.json');
  try {
    if (fs.existsSync(configPath)) {
      return JSON.parse(fs.readFileSync(configPath, 'utf8'));
    }
    
    // Default fallback configuration
    return {
      host: '192.168.1.11',
      user: 'k2600x',
      path: '/volume1/docker/ai-service',
      database: {
        name: 'ai_service',
        user: 'ai_user',
        container: 'ai-postgres'
      },
      containers: {
        api: 'ai-service',
        database: 'ai-postgres', 
        redis: 'ai-redis'
      },
      safety: {
        requireConfirmation: true,
        backupBeforeDestruction: true,
        maxRetries: 3
      }
    };
  } catch (error) {
    console.error('⚠️  Failed to load production config:', error.message);
    console.error('Using default configuration...');
    return loadProductionConfig(); // Return default
  }
}

/**
 * Execute SSH command safely
 * @param {string} command - Command to execute
 * @param {Object} options - Execution options
 * @returns {Promise<string>} Command output
 */
async function executeSSH(command, options = {}) {
  const config = loadProductionConfig();
  const { timeout = 30000, retries = 1 } = options;
  
  const sshCommand = `ssh ${config.user}@${config.host} "${command}"`;
  
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      console.log(`🔄 Executing (attempt ${attempt}/${retries}): ${command}`);
      
      const result = execSync(sshCommand, {
        encoding: 'utf8',
        timeout,
        stdio: 'pipe'
      });
      
      return result.trim();
    } catch (error) {
      if (attempt === retries) {
        throw new Error(`SSH execution failed after ${retries} attempts: ${error.message}`);
      }
      console.log(`⚠️  Attempt ${attempt} failed, retrying...`);
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
}

/**
 * Execute SSH command with sudo
 * @param {string} command - Command to execute
 * @param {Object} options - Execution options
 * @returns {Promise<string>} Command output
 */
async function executeSudoSSH(command, options = {}) {
  const sudoCommand = `sudo ${command}`;
  return executeSSH(sudoCommand, options);
}

/**
 * Execute Docker command on production
 * @param {string} dockerCommand - Docker command to execute
 * @param {Object} options - Execution options
 * @returns {Promise<string>} Command output
 */
async function executeDockerSSH(dockerCommand, options = {}) {
  const command = `sudo /usr/local/bin/docker ${dockerCommand}`;
  return executeSSH(command, options);
}

/**
 * Prompt for confirmation with safety features
 * @param {string} message - Confirmation message
 * @param {Object} options - Prompt options
 * @returns {Promise<boolean>} User confirmation
 */
async function promptConfirmation(message, options = {}) {
  const { 
    requiredPhrase = null, 
    timeout = 60000,
    dangerLevel = 'medium'
  } = options;
  
  return new Promise((resolve, reject) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    
    // Add colored warnings based on danger level
    const colors = {
      low: '\x1b[33m',      // Yellow
      medium: '\x1b[31m',   // Red
      high: '\x1b[41m',     // Red background
      reset: '\x1b[0m'
    };
    
    const color = colors[dangerLevel] || colors.medium;
    console.log(`${color}${message}${colors.reset}`);
    
    if (requiredPhrase) {
      console.log(`${colors.high}⚠️  Type exactly '${requiredPhrase}' to continue:${colors.reset}`);
    } else {
      console.log('Continue? (y/N):');
    }
    
    const timeoutId = setTimeout(() => {
      rl.close();
      resolve(false);
    }, timeout);
    
    rl.question('', (answer) => {
      clearTimeout(timeoutId);
      rl.close();
      
      if (requiredPhrase) {
        resolve(answer.trim() === requiredPhrase);
      } else {
        resolve(answer.trim().toLowerCase() === 'y' || answer.trim().toLowerCase() === 'yes');
      }
    });
  });
}

/**
 * Create database backup
 * @param {string} backupName - Optional backup name
 * @returns {Promise<string>} Backup filename
 */
async function createBackup(backupName = null) {
  const config = loadProductionConfig();
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0] + '_' + 
                   new Date().toISOString().replace(/[:.]/g, '-').split('T')[1].split('.')[0];
  const filename = backupName || `backup_${timestamp}.sql.gz`;
  
  console.log('💾 Creating production backup...');
  
  try {
    // Ensure backup directory exists
    await executeSSH(`sudo mkdir -p ${config.path}/backups`);
    
    // Create backup
    const backupCommand = `sudo /usr/local/bin/docker exec ${config.containers.database} ` +
                         `pg_dump -U ${config.database.user} -d ${config.database.name} | gzip > /tmp/${filename}`;
    
    await executeSSH(backupCommand);
    
    // Move to backups directory
    await executeSSH(`sudo mv /tmp/${filename} ${config.path}/backups/`);
    
    // Get backup size
    const size = await executeSSH(`du -h ${config.path}/backups/${filename} | cut -f1`);
    
    console.log(`✅ Backup created: ${filename} (${size.trim()})`);
    return filename;
  } catch (error) {
    throw new Error(`Backup failed: ${error.message}`);
  }
}

/**
 * List available backups
 * @returns {Promise<Array>} List of backup files with details
 */
async function listBackups() {
  const config = loadProductionConfig();
  
  try {
    const backupList = await executeSSH(`ls -lh ${config.path}/backups/*.sql.gz 2>/dev/null || echo "No backups found"`);
    
    if (backupList === "No backups found") {
      return [];
    }
    
    // Parse backup list
    const backups = backupList.split('\n').map(line => {
      const parts = line.split(/\s+/);
      if (parts.length >= 9) {
        return {
          name: parts[8],
          size: parts[4],
          date: `${parts[5]} ${parts[6]} ${parts[7]}`
        };
      }
      return null;
    }).filter(backup => backup !== null);
    
    return backups;
  } catch (error) {
    console.error('Failed to list backups:', error.message);
    return [];
  }
}

/**
 * Get production system status
 * @returns {Promise<Object>} System status information
 */
async function getProductionStatus() {
  const config = loadProductionConfig();
  
  try {
    console.log('📊 Checking production status...');
    
    // Check containers
    const containers = await executeDockerSSH('ps -a --format "table {{.Names}}\\t{{.Status}}\\t{{.Ports}}"');
    
    // Check database
    let dbStatus = 'Unknown';
    try {
      await executeDockerSSH(`exec ${config.containers.database} pg_isready -U ${config.database.user} -d ${config.database.name}`);
      dbStatus = 'Connected';
    } catch (error) {
      dbStatus = 'Connection Failed';
    }
    
    // Check API health
    let apiHealth = 'Unknown';
    try {
      const healthCheck = await executeSSH(`curl -s http://localhost:3001/health`);
      apiHealth = JSON.parse(healthCheck).status || 'Unknown';
    } catch (error) {
      apiHealth = 'Health Check Failed';
    }
    
    return {
      containers: containers.split('\n'),
      database: dbStatus,
      api: apiHealth,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    throw new Error(`Status check failed: ${error.message}`);
  }
}

/**
 * Get production logs
 * @param {string} service - Service name or 'all' for all services
 * @param {number} lines - Number of lines to retrieve
 * @returns {Promise<string>} Log output
 */
async function getProductionLogs(service = 'all', lines = 50) {
  const config = loadProductionConfig();
  
  try {
    if (service === 'all') {
      // Get logs from all main containers
      const services = [config.containers.api, config.containers.database];
      let allLogs = '';
      
      for (const svc of services) {
        try {
          console.log(`📋 Getting logs for ${svc}...`);
          const logs = await executeDockerSSH(`logs ${svc} --tail=${lines}`);
          allLogs += `\n=== ${svc.toUpperCase()} LOGS ===\n${logs}\n`;
        } catch (error) {
          allLogs += `\n=== ${svc.toUpperCase()} LOGS ===\nError: ${error.message}\n`;
        }
      }
      
      return allLogs;
    } else {
      console.log(`📋 Getting logs for ${service}...`);
      return await executeDockerSSH(`logs ${service} --tail=${lines}`);
    }
  } catch (error) {
    throw new Error(`Failed to get logs: ${error.message}`);
  }
}

/**
 * Perform health check on production system
 * @returns {Promise<Object>} Comprehensive health report
 */
async function performHealthCheck() {
  const config = loadProductionConfig();
  
  console.log('🏥 Running comprehensive health check...');
  
  const health = {
    timestamp: new Date().toISOString(),
    overall: 'checking',
    services: {},
    database: {},
    system: {},
    recommendations: []
  };
  
  try {
    // Check containers
    const containerStatus = await executeDockerSSH('ps --format "{{.Names}},{{.Status}}"');
    const containers = containerStatus.split('\n').map(line => {
      const [name, status] = line.split(',');
      return { name, status, healthy: status.includes('Up') };
    });
    
    health.services.containers = containers;
    health.services.healthy = containers.every(c => c.healthy);
    
    // Check database connection and performance
    try {
      await executeDockerSSH(`exec ${config.containers.database} pg_isready -U ${config.database.user} -d ${config.database.name}`);
      
      // Get database stats
      const dbStats = await executeDockerSSH(
        `exec ${config.containers.database} psql -U ${config.database.user} -d ${config.database.name} ` +
        `-c "SELECT current_database(), version();" -t`
      );
      
      health.database.connected = true;
      health.database.info = dbStats.trim();
      
      // Check table count
      const tableCount = await executeDockerSSH(
        `exec ${config.containers.database} psql -U ${config.database.user} -d ${config.database.name} ` +
        `-c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'financial';" -t`
      );
      
      health.database.tables = parseInt(tableCount.trim());
      health.database.healthy = health.database.tables > 0;
      
    } catch (error) {
      health.database.connected = false;
      health.database.error = error.message;
      health.database.healthy = false;
      health.recommendations.push('Database connection failed - check PostgreSQL container');
    }
    
    // Check API endpoint
    try {
      const apiResponse = await executeSSH('curl -s http://localhost:3001/health');
      const apiData = JSON.parse(apiResponse);
      health.services.api = {
        responding: true,
        status: apiData.status,
        healthy: apiData.status === 'healthy'
      };
    } catch (error) {
      health.services.api = {
        responding: false,
        error: error.message,
        healthy: false
      };
      health.recommendations.push('API health endpoint not responding - check API container');
    }
    
    // Check system resources
    try {
      const diskSpace = await executeSSH(`df -h ${config.path} | tail -1 | awk '{print $5}' | sed 's/%//'`);
      const memoryUsage = await executeSSH("free | grep Mem | awk '{printf \"%.0f\", $3/$2 * 100.0}'");
      
      health.system.diskUsage = parseInt(diskSpace.trim());
      health.system.memoryUsage = parseInt(memoryUsage.trim());
      health.system.healthy = health.system.diskUsage < 90 && health.system.memoryUsage < 90;
      
      if (health.system.diskUsage > 80) {
        health.recommendations.push('Disk usage high - consider cleanup');
      }
      if (health.system.memoryUsage > 80) {
        health.recommendations.push('Memory usage high - check for memory leaks');
      }
    } catch (error) {
      health.system.error = error.message;
      health.system.healthy = false;
    }
    
    // Determine overall health
    const components = [
      health.services.healthy,
      health.database.healthy,
      health.services.api?.healthy,
      health.system.healthy
    ];
    
    const healthyComponents = components.filter(Boolean).length;
    const totalComponents = components.length;
    
    if (healthyComponents === totalComponents) {
      health.overall = 'healthy';
    } else if (healthyComponents >= totalComponents * 0.7) {
      health.overall = 'degraded';
    } else {
      health.overall = 'unhealthy';
    }
    
    return health;
    
  } catch (error) {
    health.overall = 'error';
    health.error = error.message;
    return health;
  }
}

/**
 * Get Prisma migration status in production
 * @returns {Promise<string>} Migration status output
 */
async function getMigrationStatus() {
  const config = loadProductionConfig();
  
  try {
    console.log('🔍 Checking Prisma migration status...');
    
    const migrationStatus = await executeDockerSSH(
      `exec ${config.containers.api} sh -c 'DATABASE_URL=postgresql://${config.database.user}:$POSTGRES_PASSWORD@${config.containers.database}:5432/${config.database.name} npx prisma migrate status'`
    );
    
    return migrationStatus;
  } catch (error) {
    throw new Error(`Migration status check failed: ${error.message}`);
  }
}

/**
 * Deploy Prisma migrations to production
 * @param {boolean} createBackup - Whether to create backup before migration
 * @returns {Promise<string>} Migration deployment result
 */
async function deployMigrations(createBackup = true) {
  const config = loadProductionConfig();
  
  try {
    if (createBackup) {
      console.log('📦 Creating backup before migration...');
      await createBackup(`pre-migration-${Date.now()}`);
    }
    
    console.log('🚀 Deploying Prisma migrations...');
    
    const deployResult = await executeDockerSSH(
      `exec ${config.containers.api} sh -c 'DATABASE_URL=postgresql://${config.database.user}:$POSTGRES_PASSWORD@${config.containers.database}:5432/${config.database.name} npx prisma migrate deploy'`
    );
    
    console.log('✅ Migrations deployed successfully');
    return deployResult;
  } catch (error) {
    throw new Error(`Migration deployment failed: ${error.message}`);
  }
}

/**
 * Format output with colors and structure
 * @param {string} type - Output type (success, error, warning, info)
 * @param {string} message - Message to format
 */
function formatOutput(type, message) {
  const colors = {
    success: '\x1b[32m✅',
    error: '\x1b[31m❌',
    warning: '\x1b[33m⚠️ ',
    info: '\x1b[34mℹ️ ',
    reset: '\x1b[0m'
  };
  
  const icon = colors[type] || colors.info;
  console.log(`${icon} ${message}${colors.reset}`);
}

/**
 * Compare development and production databases for parity
 * @returns {Promise<Object>} Comprehensive comparison result
 */
async function compareDatabase() {
  const config = loadProductionConfig();
  
  console.log('🔍 Starting database parity comparison...');
  
  const comparison = {
    timestamp: new Date().toISOString(),
    overall: 'checking',
    migrations: {},
    tables: {},
    schema: {},
    detailedReport: '',
    errors: []
  };
  
  try {
    // Compare migration status
    console.log('📋 Comparing migration status...');
    comparison.migrations = await compareMigrationStatus();
    
    // Compare table counts
    console.log('📊 Comparing table counts...');
    comparison.tables = await compareTableCounts();
    
    // Compare schema structure
    console.log('🏗️  Comparing schema structure...');
    comparison.schema = await compareSchemaStructure();
    
    // Generate detailed report
    comparison.detailedReport = generateParityReport(comparison);
    
    // Determine overall status
    const hasDifferences = comparison.migrations.different || 
                          comparison.tables.different || 
                          comparison.schema.different;
    
    comparison.overall = hasDifferences ? 'different' : 'match';
    
    return comparison;
    
  } catch (error) {
    comparison.overall = 'error';
    comparison.errors.push(error.message);
    return comparison;
  }
}

/**
 * Compare migration status between development and production
 * @returns {Promise<Object>} Migration comparison result
 */
async function compareMigrationStatus() {
  const config = loadProductionConfig();
  
  try {
    // Get development migration status
    console.log('  📝 Checking development migrations...');
    const devMigrations = execSync('npx prisma migrate status', { 
      encoding: 'utf8', 
      stdio: 'pipe',
      cwd: process.cwd()
    }).trim();
    
    // Get production migration status
    console.log('  📝 Checking production migrations...');
    const prodMigrations = await executeDockerSSH(
      `exec ${config.containers.api} sh -c 'DATABASE_URL=postgresql://${config.database.user}:$POSTGRES_PASSWORD@${config.containers.database}:5432/${config.database.name} npx prisma migrate status'`
    );
    
    // Parse migration lists
    const devMigrationList = extractMigrationList(devMigrations);
    const prodMigrationList = extractMigrationList(prodMigrations);
    
    // Compare migration lists
    const devOnly = devMigrationList.filter(m => !prodMigrationList.includes(m));
    const prodOnly = prodMigrationList.filter(m => !devMigrationList.includes(m));
    const common = devMigrationList.filter(m => prodMigrationList.includes(m));
    
    const different = devOnly.length > 0 || prodOnly.length > 0;
    
    let report = `Development migrations: ${devMigrationList.length}\n`;
    report += `Production migrations: ${prodMigrationList.length}\n`;
    report += `Common migrations: ${common.length}\n`;
    
    if (devOnly.length > 0) {
      report += `\n🟡 Dev only (${devOnly.length}):\n`;
      devOnly.forEach(m => report += `  • ${m}\n`);
    }
    
    if (prodOnly.length > 0) {
      report += `\n🔴 Prod only (${prodOnly.length}):\n`;
      prodOnly.forEach(m => report += `  • ${m}\n`);
    }
    
    return {
      different,
      devCount: devMigrationList.length,
      prodCount: prodMigrationList.length,
      devOnly,
      prodOnly,
      common,
      report
    };
    
  } catch (error) {
    return {
      different: true,
      error: error.message,
      report: `Migration comparison failed: ${error.message}`
    };
  }
}

/**
 * Extract migration names from prisma migrate status output
 * @param {string} statusOutput - Raw output from prisma migrate status
 * @returns {Array<string>} List of migration names
 */
function extractMigrationList(statusOutput) {
  const migrations = [];
  const lines = statusOutput.split('\n');
  
  let inMigrationList = false;
  for (const line of lines) {
    // Look for migration entries (typically start with timestamp)
    if (line.match(/^\d{14}_/)) {
      const migrationName = line.trim().split(' ')[0];
      if (migrationName && migrationName.length > 0) {
        migrations.push(migrationName);
      }
    }
    
    // Alternative pattern - look for lines with migration files
    if (line.includes('.sql') && line.includes('_')) {
      const match = line.match(/(\d{14}_[^.\s]+)/);
      if (match && match[1]) {
        migrations.push(match[1]);
      }
    }
  }
  
  return [...new Set(migrations)]; // Remove duplicates
}

/**
 * Compare table counts between development and production
 * @returns {Promise<Object>} Table count comparison result
 */
async function compareTableCounts() {
  const config = loadProductionConfig();
  
  try {
    // Get development table counts
    console.log('  📊 Counting development tables...');
    const devTablesQuery = `
      SELECT schemaname, COUNT(*) as table_count
      FROM pg_tables 
      WHERE schemaname IN ('public', 'financial', 'trading')
      GROUP BY schemaname
      ORDER BY schemaname;
    `;
    
    const devCounts = execSync(
      `psql "${process.env.DATABASE_URL}" -c "${devTablesQuery}" -t`,
      { encoding: 'utf8', stdio: 'pipe' }
    ).trim();
    
    // Get production table counts
    console.log('  📊 Counting production tables...');
    const prodCounts = await executeDockerSSH(
      `exec ${config.containers.database} psql -U ${config.database.user} -d ${config.database.name} -c "${devTablesQuery}" -t`
    );
    
    // Parse counts
    const devTableCounts = parseTableCounts(devCounts);
    const prodTableCounts = parseTableCounts(prodCounts);
    
    // Compare counts
    const schemas = [...new Set([...Object.keys(devTableCounts), ...Object.keys(prodTableCounts)])];
    let different = false;
    let report = 'Schema table counts:\n';
    
    for (const schema of schemas.sort()) {
      const devCount = devTableCounts[schema] || 0;
      const prodCount = prodTableCounts[schema] || 0;
      const status = devCount === prodCount ? '✅' : '❌';
      
      if (devCount !== prodCount) {
        different = true;
      }
      
      report += `  ${status} ${schema}: Dev=${devCount}, Prod=${prodCount}\n`;
    }
    
    // Get total counts
    const devTotal = Object.values(devTableCounts).reduce((a, b) => a + b, 0);
    const prodTotal = Object.values(prodTableCounts).reduce((a, b) => a + b, 0);
    
    report += `\nTotal tables: Dev=${devTotal}, Prod=${prodTotal}`;
    
    if (devTotal !== prodTotal) {
      different = true;
    }
    
    return {
      different,
      devTableCounts,
      prodTableCounts,
      devTotal,
      prodTotal,
      report
    };
    
  } catch (error) {
    return {
      different: true,
      error: error.message,
      report: `Table count comparison failed: ${error.message}`
    };
  }
}

/**
 * Parse table count output from PostgreSQL
 * @param {string} output - Raw output from table count query
 * @returns {Object} Schema name to count mapping
 */
function parseTableCounts(output) {
  const counts = {};
  const lines = output.split('\n').filter(line => line.trim().length > 0);
  
  for (const line of lines) {
    const parts = line.trim().split('|');
    if (parts.length >= 2) {
      const schema = parts[0].trim();
      const count = parseInt(parts[1].trim());
      if (!isNaN(count)) {
        counts[schema] = count;
      }
    }
  }
  
  return counts;
}

/**
 * Compare schema structure between development and production
 * @returns {Promise<Object>} Schema structure comparison result
 */
async function compareSchemaStructure() {
  const config = loadProductionConfig();
  
  try {
    // Get schema structure from both environments
    console.log('  🏗️  Analyzing development schema structure...');
    const devSchema = await getSchemaStructure('development');
    
    console.log('  🏗️  Analyzing production schema structure...');
    const prodSchema = await getSchemaStructure('production', config);
    
    // Compare structures
    const differences = [];
    let different = false;
    
    // Compare tables
    const allTables = new Set([...Object.keys(devSchema.tables), ...Object.keys(prodSchema.tables)]);
    
    for (const tableName of allTables) {
      const devTable = devSchema.tables[tableName];
      const prodTable = prodSchema.tables[tableName];
      
      if (!devTable) {
        differences.push(`❌ Table '${tableName}' exists in production but not in development`);
        different = true;
      } else if (!prodTable) {
        differences.push(`❌ Table '${tableName}' exists in development but not in production`);
        different = true;
      } else {
        // Compare columns
        const devCols = new Set(devTable.columns.map(c => `${c.name}:${c.type}`));
        const prodCols = new Set(prodTable.columns.map(c => `${c.name}:${c.type}`));
        
        const devOnlyCols = [...devCols].filter(c => !prodCols.has(c));
        const prodOnlyCols = [...prodCols].filter(c => !devCols.has(c));
        
        if (devOnlyCols.length > 0 || prodOnlyCols.length > 0) {
          different = true;
          if (devOnlyCols.length > 0) {
            differences.push(`⚠️  Table '${tableName}' has dev-only columns: ${devOnlyCols.join(', ')}`);
          }
          if (prodOnlyCols.length > 0) {
            differences.push(`⚠️  Table '${tableName}' has prod-only columns: ${prodOnlyCols.join(', ')}`);
          }
        }
      }
    }
    
    let report = 'Schema structure comparison:\n';
    report += `Development tables: ${Object.keys(devSchema.tables).length}\n`;
    report += `Production tables: ${Object.keys(prodSchema.tables).length}\n`;
    
    if (differences.length > 0) {
      report += '\nDifferences found:\n';
      differences.forEach(diff => report += `  ${diff}\n`);
    } else {
      report += '\n✅ Schema structures match perfectly';
    }
    
    return {
      different,
      differences,
      devTables: Object.keys(devSchema.tables).length,
      prodTables: Object.keys(prodSchema.tables).length,
      report
    };
    
  } catch (error) {
    return {
      different: true,
      error: error.message,
      report: `Schema structure comparison failed: ${error.message}`
    };
  }
}

/**
 * Get schema structure from database
 * @param {string} environment - Environment name (development/production)
 * @param {Object} config - Production configuration (for production only)
 * @returns {Promise<Object>} Schema structure
 */
async function getSchemaStructure(environment, config = null) {
  const schemaQuery = `
    SELECT 
      t.table_schema,
      t.table_name,
      c.column_name,
      c.data_type,
      c.is_nullable,
      c.column_default
    FROM information_schema.tables t
    JOIN information_schema.columns c ON t.table_name = c.table_name AND t.table_schema = c.table_schema
    WHERE t.table_schema IN ('public', 'financial', 'trading')
    ORDER BY t.table_schema, t.table_name, c.ordinal_position;
  `;
  
  let result;
  
  if (environment === 'development') {
    result = execSync(
      `psql "${process.env.DATABASE_URL}" -c "${schemaQuery}" -t`,
      { encoding: 'utf8', stdio: 'pipe' }
    );
  } else {
    result = await executeDockerSSH(
      `exec ${config.containers.database} psql -U ${config.database.user} -d ${config.database.name} -c "${schemaQuery}" -t`
    );
  }
  
  // Parse schema structure
  const tables = {};
  const lines = result.split('\n').filter(line => line.trim().length > 0);
  
  for (const line of lines) {
    const parts = line.split('|').map(p => p.trim());
    if (parts.length >= 6) {
      const [schema, tableName, columnName, dataType, isNullable, columnDefault] = parts;
      const fullTableName = `${schema}.${tableName}`;
      
      if (!tables[fullTableName]) {
        tables[fullTableName] = {
          schema,
          name: tableName,
          columns: []
        };
      }
      
      tables[fullTableName].columns.push({
        name: columnName,
        type: dataType,
        nullable: isNullable === 'YES',
        default: columnDefault || null
      });
    }
  }
  
  return { tables };
}

/**
 * Generate detailed parity report
 * @param {Object} comparison - Comparison results
 * @returns {string} Formatted detailed report
 */
function generateParityReport(comparison) {
  let report = '=== DETAILED DATABASE PARITY REPORT ===\n\n';
  
  report += `Generated: ${comparison.timestamp}\n`;
  report += `Overall Status: ${comparison.overall.toUpperCase()}\n\n`;
  
  // Migration summary
  report += '🔄 MIGRATION ANALYSIS:\n';
  if (comparison.migrations.different) {
    report += `❌ Migration differences detected\n`;
    if (comparison.migrations.devOnly?.length > 0) {
      report += `   Dev-only migrations: ${comparison.migrations.devOnly.length}\n`;
    }
    if (comparison.migrations.prodOnly?.length > 0) {
      report += `   Prod-only migrations: ${comparison.migrations.prodOnly.length}\n`;
    }
  } else {
    report += `✅ Migrations are in sync (${comparison.migrations.devCount || 0} total)\n`;
  }
  report += '\n';
  
  // Table count summary
  report += '📊 TABLE COUNT ANALYSIS:\n';
  if (comparison.tables.different) {
    report += `❌ Table count differences detected\n`;
    report += `   Development total: ${comparison.tables.devTotal || 0}\n`;
    report += `   Production total: ${comparison.tables.prodTotal || 0}\n`;
  } else {
    report += `✅ Table counts match (${comparison.tables.devTotal || 0} total)\n`;
  }
  report += '\n';
  
  // Schema structure summary
  report += '🏗️  SCHEMA STRUCTURE ANALYSIS:\n';
  if (comparison.schema.different) {
    report += `❌ Schema structure differences detected\n`;
    report += `   Differences found: ${comparison.schema.differences?.length || 0}\n`;
  } else {
    report += `✅ Schema structures match perfectly\n`;
  }
  report += '\n';
  
  // Recommendations
  report += '💡 RECOMMENDATIONS:\n';
  if (comparison.overall === 'match') {
    report += '✅ No action required - databases are in perfect sync\n';
  } else {
    if (comparison.migrations.different) {
      if (comparison.migrations.devOnly?.length > 0) {
        report += '🔄 Deploy pending migrations to production\n';
      }
      if (comparison.migrations.prodOnly?.length > 0) {
        report += '⚠️  Review production-only migrations for consistency\n';
      }
    }
    
    if (comparison.tables.different || comparison.schema.different) {
      report += '🏗️  Review schema differences and ensure proper migration\n';
      report += '📋 Consider running a full schema comparison tool\n';
    }
  }
  
  // Error summary
  if (comparison.errors?.length > 0) {
    report += '\n❌ ERRORS ENCOUNTERED:\n';
    comparison.errors.forEach(error => report += `   • ${error}\n`);
  }
  
  return report;
}

module.exports = {
  loadProductionConfig,
  executeSSH,
  executeSudoSSH,
  executeDockerSSH,
  promptConfirmation,
  createBackup,
  listBackups,
  getProductionStatus,
  getProductionLogs,
  performHealthCheck,
  getMigrationStatus,
  deployMigrations,
  formatOutput,
  compareDatabase,
  compareMigrationStatus,
  compareTableCounts,
  compareSchemaStructure,
  generateParityReport
};