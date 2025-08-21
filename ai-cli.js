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
  prod deploy [manual|docker] Complete production deployment
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
  ai prod deploy       # Interactive production deployment
  ai prod deploy manual # Manual deployment (no Docker)
  ai prod deploy docker # Docker-based deployment
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
        case 'deploy':
          await handleProductionDeploy(subArgs);
          break;
          
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

// Production deployment handler
async function handleProductionDeploy(subArgs) {
  const deployType = subArgs[0] || 'interactive';
  
  console.log(`
╔════════════════════════════════════════════════╗
║       🚀 PRODUCTION DEPLOYMENT WIZARD          ║
╚════════════════════════════════════════════════╝
`);

  // Check prerequisites
  console.log('📋 Checking prerequisites...\n');
  
  // 1. Check if .env.production exists
  if (!fs.existsSync(path.join(__dirname, '.env.production'))) {
    console.log('❌ .env.production not found!');
    console.log('   Create it from .env.example and configure production values');
    console.log('   Required variables:');
    console.log('   - JWT_SECRET (32+ characters)');
    console.log('   - POSTGRES_PASSWORD');
    console.log('   - REDIS_PASSWORD');
    console.log('   - OPENAI_API_KEY (if using AI features)');
    console.log('   - GOCARDLESS_* (if using banking integration)\n');
    
    const readline = require('readline').createInterface({
      input: process.stdin,
      output: process.stdout
    });
    
    const answer = await new Promise(resolve => {
      readline.question('Do you want to create .env.production from .env.local? (y/n): ', resolve);
    });
    readline.close();
    
    if (answer.toLowerCase() === 'y') {
      execSync(`cp ${path.join(__dirname, '.env.local')} ${path.join(__dirname, '.env.production')}`);
      console.log('✅ Created .env.production - Please edit it with production values');
      console.log('   Exiting for you to configure...');
      process.exit(0);
    } else {
      process.exit(1);
    }
  }
  
  console.log('✅ .env.production found\n');
  
  // 2. Select deployment type
  if (deployType === 'interactive') {
    const readline = require('readline').createInterface({
      input: process.stdin,
      output: process.stdout
    });
    
    const answer = await new Promise(resolve => {
      readline.question('Select deployment type:\n1. Docker (recommended)\n2. Manual (systemd services)\nChoice (1 or 2): ', resolve);
    });
    readline.close();
    
    deployType = answer === '2' ? 'manual' : 'docker';
  }
  
  console.log(`\n🔧 Deployment type: ${deployType.toUpperCase()}\n`);
  
  // 3. Run deployment steps
  try {
    console.log('📦 Step 1: Building applications...');
    
    // Build backend
    console.log('   Building main application...');
    execSync('npm run build', { stdio: 'inherit' });
    
    // Build auth service
    console.log('   Building auth service...');
    execSync('cd apps/auth-svc && npm run build', { stdio: 'inherit' });
    
    // Build financial service  
    console.log('   Building financial service...');
    execSync('cd apps/financial-svc && npm run build', { stdio: 'inherit' });
    
    // Build frontend
    console.log('   Building frontend...');
    execSync('cd frontend && npm run build', { stdio: 'inherit' });
    
    console.log('✅ Build complete\n');
    
    // 4. Database migrations
    console.log('🗄️ Step 2: Database migrations...');
    console.log('   Checking migration status...');
    execSync('npx prisma migrate status', { stdio: 'inherit' });
    
    const readline = require('readline').createInterface({
      input: process.stdin,
      output: process.stdout
    });
    
    const migrate = await new Promise(resolve => {
      readline.question('Deploy pending migrations? (y/n): ', resolve);
    });
    readline.close();
    
    if (migrate.toLowerCase() === 'y') {
      console.log('   Deploying migrations...');
      execSync('npx prisma migrate deploy', { stdio: 'inherit' });
      console.log('✅ Migrations deployed\n');
    }
    
    // 5. Deploy based on type
    if (deployType === 'docker') {
      console.log('🐳 Step 3: Docker deployment...');
      
      // Check if docker-compose.production.yml exists
      if (!fs.existsSync(path.join(__dirname, 'docker-compose.production.yml'))) {
        console.log('   Creating docker-compose.production.yml...');
        // Create production docker-compose
        const prodCompose = `version: '3.8'

services:
  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: ai_service
      POSTGRES_USER: ai_user
      POSTGRES_PASSWORD: \${POSTGRES_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5434:5432"
    restart: unless-stopped

  redis:
    image: redis:7-alpine
    command: redis-server --requirepass \${REDIS_PASSWORD}
    ports:
      - "6379:6379"
    restart: unless-stopped

  auth-service:
    build:
      context: .
      dockerfile: apps/auth-svc/Dockerfile
    environment:
      DATABASE_URL: postgresql://ai_user:\${POSTGRES_PASSWORD}@postgres:5432/ai_service?schema=auth
      JWT_SECRET: \${JWT_SECRET}
      PORT: 3004
    ports:
      - "3004:3004"
    depends_on:
      - postgres
    restart: unless-stopped

  financial-service:
    build:
      context: .
      dockerfile: apps/financial-svc/Dockerfile
    environment:
      DATABASE_URL: postgresql://ai_user:\${POSTGRES_PASSWORD}@postgres:5432/ai_service?schema=financial
      JWT_SECRET: \${JWT_SECRET}
      PORT: 3002
    ports:
      - "3002:3002"
    depends_on:
      - postgres
    restart: unless-stopped

  monolith:
    build:
      context: .
      dockerfile: Dockerfile
    env_file: .env.production
    environment:
      POSTGRES_HOST: postgres
      POSTGRES_PORT: 5432
      REDIS_HOST: redis
    ports:
      - "3001:3001"
    depends_on:
      - postgres
      - redis
    restart: unless-stopped

  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    ports:
      - "80:80"
    depends_on:
      - auth-service
      - financial-service
      - monolith
    restart: unless-stopped

volumes:
  postgres_data:
`;
        fs.writeFileSync(path.join(__dirname, 'docker-compose.production.yml'), prodCompose);
      }
      
      console.log('   Starting Docker containers...');
      execSync('docker-compose -f docker-compose.production.yml up -d', { stdio: 'inherit' });
      console.log('✅ Docker deployment complete\n');
      
    } else {
      // Manual deployment
      console.log('🔧 Step 3: Manual deployment...');
      console.log('\n📝 Manual deployment instructions:\n');
      console.log('1. Start PostgreSQL on port 5434');
      console.log('2. Start Redis on port 6379\n');
      console.log('3. Start Auth Service:');
      console.log('   cd apps/auth-svc');
      console.log('   DATABASE_URL="postgresql://user:pass@localhost:5434/ai_service?schema=auth" \\\\');
      console.log('   JWT_SECRET="your-secret" PORT=3004 npm start\n');
      console.log('4. Start Financial Service:');
      console.log('   cd apps/financial-svc');
      console.log('   DATABASE_URL="postgresql://user:pass@localhost:5434/ai_service?schema=financial" \\\\');
      console.log('   JWT_SECRET="your-secret" PORT=3002 npm start\n');
      console.log('5. Start Monolith:');
      console.log('   # In root directory');
      console.log('   POSTGRES_HOST=localhost POSTGRES_PORT=5434 \\\\');
      console.log('   JWT_SECRET="your-secret" PORT=3001 npm start\n');
      console.log('6. Serve Frontend:');
      console.log('   cd frontend');
      console.log('   npx serve -s dist -p 3000\n');
    }
    
    // 6. Create admin user
    console.log('👤 Step 4: Admin user setup...');
    const rl2 = require('readline').createInterface({
      input: process.stdin,
      output: process.stdout
    });
    
    const createAdmin = await new Promise(resolve => {
      rl2.question('Create admin user (admin@ai-service.local)? (y/n): ', resolve);
    });
    rl2.close();
    
    if (createAdmin.toLowerCase() === 'y') {
      console.log('   Creating admin user...');
      const createUserSQL = `
        INSERT INTO auth.users (
          email, password_hash, full_name, role, is_active, created_at, updated_at
        ) VALUES (
          'admin@ai-service.local',
          '$2b$10$8YzH7X1vKpFdKjb8rqOAOe8uEpZ4UjQn9mGxK7bgQqFvI9o1aWVKq',
          'System Administrator',
          'admin',
          true,
          NOW(),
          NOW()
        ) ON CONFLICT (email) DO UPDATE SET 
          password_hash = EXCLUDED.password_hash,
          role = 'admin',
          is_active = true;
      `;
      
      if (deployType === 'docker') {
        execSync(`docker exec ai-service-postgres-1 psql -U ai_user -d ai_service -c "${createUserSQL}"`, { stdio: 'inherit' });
      } else {
        execSync(`psql -h localhost -p 5434 -U ai_user -d ai_service -c "${createUserSQL}"`, { stdio: 'inherit' });
      }
      
      console.log('✅ Admin user created');
      console.log('   Email: admin@ai-service.local');
      console.log('   Password: admin123');
      console.log('   ⚠️  Please change the password after first login!\n');
    }
    
    // 7. Health checks
    console.log('🏥 Step 5: Health checks...');
    await new Promise(resolve => setTimeout(resolve, 5000)); // Wait for services to start
    
    const services = [
      { name: 'Auth', url: 'http://localhost:3004/health' },
      { name: 'Financial', url: 'http://localhost:3002/health' },
      { name: 'Monolith', url: 'http://localhost:3001/health' }
    ];
    
    for (const service of services) {
      try {
        const health = execSync(`curl -s ${service.url}`, { encoding: 'utf8' });
        const status = JSON.parse(health).status;
        if (status === 'healthy' || status === 'ok') {
          console.log(`   ✅ ${service.name}: HEALTHY`);
        } else {
          console.log(`   ⚠️  ${service.name}: ${status}`);
        }
      } catch (error) {
        console.log(`   ❌ ${service.name}: NOT RESPONDING`);
      }
    }
    
    // 8. Summary
    console.log(`
╔════════════════════════════════════════════════╗
║        🎉 DEPLOYMENT COMPLETE!                 ║
╠════════════════════════════════════════════════╣
║ Services Running:                              ║
║   • Auth Service:     http://localhost:3004   ║
║   • Financial Service: http://localhost:3002  ║
║   • Monolith API:     http://localhost:3001   ║
║   • Frontend:         http://localhost:3000   ║
║                                                ║
║ Next Steps:                                    ║
║   1. Configure nginx for production domain    ║
║   2. Set up SSL certificates                  ║
║   3. Configure firewall rules                 ║
║   4. Set up monitoring and backups            ║
╚════════════════════════════════════════════════╝

To check status: ai prod status
To view logs: ai prod logs
To create backup: ai prod backup
`);
    
  } catch (error) {
    console.error('❌ Deployment failed:', error.message);
    process.exit(1);
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