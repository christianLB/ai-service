#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const prodHelpers = require('./lib/prod-helpers');

// AI Service CLI v2.1.0 - Now with Production Support!
const command = process.argv[2];
const args = process.argv.slice(3);

// Helper functions
function runCommand(cmd) {
  try {
    return execSync(cmd, { encoding: 'utf8', stdio: 'pipe' });
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

function getToken() {
  try {
    const result = execSync('npx ts-node scripts/token.ts 2>/dev/null', { 
      encoding: 'utf8',
      cwd: __dirname 
    });
    return result.trim().split('\n').pop();
  } catch (error) {
    console.error('Error getting token:', error.message);
    process.exit(1);
  }
}

// Command handlers
const commands = {
  '--version': () => {
    console.log('AI Service CLI v2.1.0 - Production Ready');
  },
  
  '--help': () => {
    console.log(`
AI Service CLI - Professional replacement for broken Makefiles

Usage: ai <command> [options]

Development Commands:
  token                Get authentication token
  dev start            Start development environment
  dev stop             Stop development environment
  dev status           Check service status
  dev logs [service]   View logs
  db status            Check database status
  db migrate           Run migrations
  db backup [name]     Create database backup
  test [suite]         Run tests

Production Commands:
  prod status          Check production system status
  prod health          Comprehensive health check
  prod logs [service]  View production logs
  prod backup [name]   Create production backup
  prod db-compare      Compare dev and prod databases
  prod admin create    Create admin user
  prod admin list      List production users
  prod admin reset     Reset user password
  prod migrate status  Check migration status
  prod migrate deploy  Deploy migrations
  
Examples:
  ai token             # Get auth token
  ai dev start         # Start all services
  ai prod status       # Check production status
  ai prod health       # Run health check
  ai prod backup       # Create production backup
  ai prod admin create # Create production admin user

For detailed help: ai <command> --help
`);
  },
  
  'token': () => {
    const token = getToken();
    console.log(token);
  },
  
  'dev': () => {
    const subCommand = args[0];
    switch (subCommand) {
      case 'start':
        console.log('Starting development environment...');
        runCommand('docker-compose up -d');
        console.log('✅ Development environment started');
        break;
        
      case 'stop':
        console.log('Stopping development environment...');
        runCommand('docker-compose down');
        console.log('✅ Development environment stopped');
        break;
        
      case 'status':
        console.log('Service Status:');
        const result = runCommand('docker-compose ps --format json 2>/dev/null || docker-compose ps');
        console.log(result);
        break;
        
      case 'logs':
        const service = args[1] || '';
        runCommand(`docker-compose logs --tail=100 ${service}`);
        break;
        
      default:
        console.log('Unknown dev command. Use: start, stop, status, logs');
    }
  },
  
  'db': () => {
    const subCommand = args[0];
    switch (subCommand) {
      case 'status':
        console.log('Checking database status...');
        runCommand('npx prisma migrate status');
        break;
        
      case 'migrate':
        console.log('Running migrations...');
        runCommand('npx prisma migrate deploy');
        console.log('✅ Migrations applied');
        break;
        
      case 'backup':
        const name = args[1] || `backup-${Date.now()}`;
        console.log(`Creating backup: ${name}...`);
        runCommand(`pg_dump $DATABASE_URL > backups/${name}.sql`);
        console.log(`✅ Backup created: backups/${name}.sql`);
        break;
        
      case 'studio':
        console.log('Opening Prisma Studio...');
        execSync('npx prisma studio', { stdio: 'inherit' });
        break;
        
      default:
        console.log('Unknown db command. Use: status, migrate, backup, studio');
    }
  },
  
  'test': () => {
    const suite = args[0] || 'all';
    console.log(`Running ${suite} tests...`);
    if (suite === 'all') {
      runCommand('npm test');
    } else {
      runCommand(`npm test -- --testPathPattern=${suite}`);
    }
    console.log('✅ Tests completed');
  },

  'prod': async () => {
    const subCommand = args[0];
    const subArgs = args.slice(1);
    
    try {
      switch (subCommand) {
        case 'db-compare':
          console.log('🔍 Comparing development and production databases...');
          const comparison = await prodHelpers.compareDatabase();
          
          // Print the detailed report
          console.log(comparison.detailedReport);
          
          // Exit with appropriate code
          if (comparison.overall === 'match') {
            process.exit(0);
          } else {
            process.exit(1);
          }
          break;
          
        case 'status':
          console.log('🔍 Checking production status...');
          const status = await prodHelpers.getProductionStatus();
          console.log('\n=== PRODUCTION STATUS ===');
          console.log(`Database: ${status.database}`);
          console.log(`API: ${status.api}`);
          console.log('\nContainers:');
          status.containers.forEach(line => console.log(`  ${line}`));
          break;
          
        case 'health':
          console.log('🏥 Running comprehensive health check...');
          const health = await prodHelpers.performHealthCheck();
          console.log('\n=== HEALTH REPORT ===');
          console.log(`Overall Status: ${health.overall.toUpperCase()}`);
          console.log(`Database: ${health.database.healthy ? '✅ Healthy' : '❌ Unhealthy'}`);
          console.log(`API: ${health.services.api?.healthy ? '✅ Healthy' : '❌ Unhealthy'}`);
          console.log(`System: ${health.system.healthy ? '✅ Healthy' : '❌ Unhealthy'}`);
          
          if (health.recommendations.length > 0) {
            console.log('\n🔧 Recommendations:');
            health.recommendations.forEach(rec => console.log(`  • ${rec}`));
          }
          break;
          
        case 'logs':
          const service = subArgs[0] || 'all';
          const lines = subArgs[1] || 50;
          console.log(`📋 Getting production logs for ${service}...`);
          const logs = await prodHelpers.getProductionLogs(service, lines);
          console.log(logs);
          break;
          
        case 'backup':
          const backupName = subArgs[0] || null;
          console.log('💾 Creating production backup...');
          const filename = await prodHelpers.createBackup(backupName);
          console.log(`✅ Backup created: ${filename}`);
          break;
          
        case 'admin':
          await handleAdminCommands(subArgs);
          break;
          
        case 'migrate':
          await handleMigrateCommands(subArgs);
          break;
          
        default:
          console.log('Unknown production command.');
          console.log('Available: status, health, logs, backup, admin, migrate, db-compare');
      }
    } catch (error) {
      console.error('❌ Production command failed:', error.message);
      process.exit(1);
    }
  }
};

// Admin command handlers
async function handleAdminCommands(subArgs) {
  const adminCommand = subArgs[0];
  
  switch (adminCommand) {
    case 'create':
      console.log('👤 Creating production admin user...');
      const confirmed = await prodHelpers.promptConfirmation(
        'This will create/update the admin user in production.', 
        { dangerLevel: 'medium' }
      );
      
      if (!confirmed) {
        console.log('❌ Admin user creation cancelled');
        return;
      }
      
      try {
        // Create admin user via SQL
        const createUserSQL = "INSERT INTO users (email, password_hash, full_name, role, is_active) VALUES ('admin@ai-service.local', '$2b$10$8YzH7X1vKpFdKjb8rqOAOe8uEpZ4UjQn9mGxK7bgQqFvI9o1aWVKq', 'System Administrator', 'admin', true) ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash, role = 'admin', is_active = true;";
        
        await prodHelpers.executeDockerSSH(`exec ai-postgres psql -U ai_user -d ai_service -c "${createUserSQL}"`);
        
        console.log('✅ Admin user created/updated successfully');
        console.log('📧 Email: admin@ai-service.local');
        console.log('🔑 Password: admin123');
        console.log('⚠️  Please change the password after first login');
      } catch (error) {
        console.error('❌ Failed to create admin user:', error.message);
      }
      break;
      
    case 'list':
      console.log('👥 Listing production users...');
      try {
        const users = await prodHelpers.executeDockerSSH(
          `exec ai-postgres psql -U ai_user -d ai_service -c "SELECT email, full_name, role, is_active, created_at FROM users ORDER BY created_at DESC;"`
        );
        console.log(users);
      } catch (error) {
        console.error('❌ Failed to list users:', error.message);
      }
      break;
      
    case 'reset':
      console.log('🔑 Password reset functionality not yet implemented');
      console.log('💡 Use: ai prod admin create (to reset admin password)');
      break;
      
    default:
      console.log('Unknown admin command.');
      console.log('Available: create, list, reset');
  }
}

// Migration command handlers
async function handleMigrateCommands(subArgs) {
  const migrateCommand = subArgs[0];
  
  switch (migrateCommand) {
    case 'status':
      console.log('🔍 Checking migration status...');
      try {
        const status = await prodHelpers.getMigrationStatus();
        console.log(status);
      } catch (error) {
        console.error('❌ Failed to check migration status:', error.message);
      }
      break;
      
    case 'deploy':
      console.log('🚀 Deploying migrations to production...');
      const confirmed = await prodHelpers.promptConfirmation(
        'This will apply pending migrations to production database.',
        { dangerLevel: 'high' }
      );
      
      if (!confirmed) {
        console.log('❌ Migration deployment cancelled');
        return;
      }
      
      try {
        const result = await prodHelpers.deployMigrations(true);
        console.log('✅ Migrations deployed successfully');
        console.log(result);
      } catch (error) {
        console.error('❌ Migration deployment failed:', error.message);
      }
      break;
      
    default:
      console.log('Unknown migration command.');
      console.log('Available: status, deploy');
  }
}

// Main execution
async function main() {
  if (!command || command === '--help' || command === '-h') {
    commands['--help']();
  } else if (command === '--version' || command === '-v') {
    commands['--version']();
  } else if (commands[command]) {
    if (command === 'prod') {
      await commands[command]();
    } else {
      commands[command]();
    }
  } else {
    console.error(`Unknown command: ${command}`);
    console.log('Run "ai --help" for usage information');
    process.exit(1);
  }
}

// Run main function
main().catch(error => {
  console.error('CLI Error:', error.message);
  process.exit(1);
});