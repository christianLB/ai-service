#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Simple CLI for AI Service
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
    console.log('AI Service CLI v2.0.0');
  },
  
  '--help': () => {
    console.log(`
AI Service CLI - Professional replacement for broken Makefiles

Usage: ai <command> [options]

Commands:
  token                Get authentication token
  dev start            Start development environment
  dev stop             Stop development environment
  dev status           Check service status
  dev logs [service]   View logs
  db status            Check database status
  db migrate           Run migrations
  db backup [name]     Create database backup
  test [suite]         Run tests
  
Examples:
  ai token             # Get auth token
  ai dev start         # Start all services
  ai dev status        # Check status
  ai db migrate        # Run migrations

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
  }
};

// Main execution
if (!command || command === '--help' || command === '-h') {
  commands['--help']();
} else if (command === '--version' || command === '-v') {
  commands['--version']();
} else if (commands[command]) {
  commands[command]();
} else {
  console.error(`Unknown command: ${command}`);
  console.log('Run "ai --help" for usage information');
  process.exit(1);
}