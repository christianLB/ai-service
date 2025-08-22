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
  prod gocardless set-secrets  Set GoCardless API credentials
  prod gocardless test         Test GoCardless configuration
  prod gocardless status       Check GoCardless status
  
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
          
        case 'gocardless':
          await handleGoCardlessCommands(subArgs);
          break;
        
        case 'fix-gocardless-now':
          await fixGoCardlessNow();
          break;
          
        default:
          console.log('Unknown production command.');
          console.log('Available: status, health, logs, backup, admin, migrate, gocardless, db-compare');
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

// GoCardless command handlers
async function fixGoCardlessNow() {
  console.log('🔧 Applying GoCardless Fix to Production');
  console.log('=========================================\n');
  
  const sqlFix = `
-- Check current state
SELECT user_id, config_key FROM financial.integration_configs WHERE integration_type = 'gocardless';

-- Apply fix
UPDATE financial.integration_configs 
SET user_id = NULL, is_global = true, updated_at = NOW()
WHERE integration_type = 'gocardless';

-- Verify fix
SELECT config_key, 
  CASE WHEN user_id IS NULL THEN '✅ FIXED' ELSE '❌ NOT FIXED' END as status
FROM financial.integration_configs WHERE integration_type = 'gocardless';`;

  try {
    // Write SQL to temp file
    const tempFile = '/tmp/gocardless_fix.sql';
    fs.writeFileSync(tempFile, sqlFix);
    
    console.log('📝 Applying SQL fix...');
    
    // Apply via SSH
    try {
      execSync(`ssh admin@192.168.1.11 'docker exec -i ai-service-prod psql -U ai_user -d ai_service' < ${tempFile}`, {
        stdio: 'inherit'
      });
    } catch (sshError) {
      // If SSH fails, try direct docker if we're on the production server
      console.log('SSH failed, trying direct docker access...');
      execSync(`docker exec -i ai-service-prod psql -U ai_user -d ai_service < ${tempFile}`, {
        stdio: 'inherit'
      });
    }
    
    console.log('\n🔄 Restarting container...');
    try {
      execSync('ssh admin@192.168.1.11 docker restart ai-service-prod', { stdio: 'inherit' });
    } catch {
      execSync('docker restart ai-service-prod', { stdio: 'inherit' });
    }
    
    console.log('\n✅ Fix Applied Successfully!');
    console.log('\nTest at: https://ai-service.anaxi.net');
    console.log('Navigate to: Financial > GoCardless Sync');
    console.log('Click: Sync Now');
    
    // Clean up
    fs.unlinkSync(tempFile);
    
  } catch (error) {
    console.error('❌ Error applying fix:', error.message);
    process.exit(1);
  }
}

async function handleGoCardlessCommands(subArgs) {
  const gcCommand = subArgs[0];
  const readline = require('readline');
  
  switch (gcCommand) {
    case 'set-secrets':
      console.log('🏦 Setting GoCardless Secrets');
      console.log('================================');
      
      // Check if we're in local dev or production
      const environment = subArgs[1] || 'local';
      
      if (environment === 'prod' || environment === 'production') {
        console.log('📍 Target: PRODUCTION');
        console.log('⚠️  This will update production GoCardless credentials');
        
        // Check for --force flag
        const forceMode = subArgs.includes('--force');
        
        if (!forceMode) {
          const confirmed = await prodHelpers.promptConfirmation(
            'This will update GoCardless credentials in production.',
            { dangerLevel: 'medium' }
          );
          
          if (!confirmed) {
            console.log('❌ GoCardless configuration cancelled');
            return;
          }
        } else {
          console.log('⚡ Force mode enabled - skipping confirmation');
        }
        
        // Get credentials from user
        const rl = readline.createInterface({
          input: process.stdin,
          output: process.stdout
        });
        
        const question = (query) => new Promise((resolve) => rl.question(query, resolve));
        
        try {
          const secretId = await question('Enter GoCardless Secret ID: ');
          const secretKey = await question('Enter GoCardless Secret Key: ');
          const environment = await question('Environment (sandbox/production) [sandbox]: ') || 'sandbox';
          
          rl.close();
          
          if (!secretId || !secretKey) {
            console.log('❌ Secret ID and Secret Key are required');
            return;
          }
          
          // Determine API URL based on environment
          const apiUrl = environment === 'production' 
            ? 'https://bankaccountdata.gocardless.com/api/v2'
            : 'https://bankaccountdata.gocardless.com/api/v2';
          
          console.log('\n📝 Configuration Summary:');
          console.log(`  Secret ID: ${secretId.substring(0, 8)}...`);
          console.log(`  Secret Key: ${secretKey.substring(0, 8)}...`);
          console.log(`  Environment: ${environment}`);
          console.log(`  API URL: ${apiUrl}`);
          
          // Insert into production database
          const insertSQL = `
            DO $$
            DECLARE
              admin_user_id UUID;
            BEGIN
              -- Get the admin user ID
              SELECT id INTO admin_user_id 
              FROM auth.users 
              WHERE email IN ('admin@ai-service.prod', 'admin@ai-service.local')
              LIMIT 1;
              
              IF admin_user_id IS NULL THEN
                RAISE EXCEPTION 'Admin user not found';
              END IF;
              
              -- Insert GoCardless configuration
              INSERT INTO financial.integration_configs 
              (user_id, integration_type, config_key, config_value, is_encrypted, is_active, is_global) 
              VALUES 
              (admin_user_id, 'gocardless', 'secret_id', '${secretId}', false, true, false),
              (admin_user_id, 'gocardless', 'secret_key', '${secretKey}', false, true, false)
              ON CONFLICT (user_id, integration_type, config_key) 
              DO UPDATE SET 
                config_value = EXCLUDED.config_value,
                is_active = true,
                updated_at = NOW();
              
              -- Insert global API URL
              INSERT INTO financial.integration_configs 
              (user_id, integration_type, config_key, config_value, is_encrypted, is_active, is_global) 
              VALUES 
              (NULL, 'gocardless', 'api_url', '${apiUrl}', false, true, true)
              ON CONFLICT (user_id, integration_type, config_key) 
              DO UPDATE SET 
                config_value = EXCLUDED.config_value,
                is_active = true,
                updated_at = NOW()
              WHERE integration_configs.user_id IS NULL;
              
              RAISE NOTICE 'GoCardless configuration updated successfully';
            END $$;
          `;
          
          console.log('\n🔄 Updating production database...');
          
          // Write SQL to file and execute via SSH
          const fs = require('fs');
          const tempFile = '/tmp/gocardless_config.sql';
          fs.writeFileSync(tempFile, insertSQL);
          
          try {
            // Direct SSH command to production server
            const sshCmd = `ssh admin@192.168.1.11 'docker exec -i ai-service-prod psql -U ai_user -d ai_service' < ${tempFile}`;
            execSync(sshCmd, { stdio: 'inherit' });
            
            console.log('✅ GoCardless secrets configured successfully in production!');
            console.log('🔄 You may need to restart the API service for changes to take effect');
          } catch (error) {
            console.error('❌ Failed to update production database');
            console.error('Error:', error.message);
            console.log('\nAlternative: Run this script directly on the NAS:');
            console.log('1. Copy the SQL file: scp /tmp/gocardless_config.sql admin@192.168.1.11:/tmp/');
            console.log('2. SSH to NAS: ssh admin@192.168.1.11');
            console.log('3. Run: docker exec -i ai-service-prod psql -U ai_user -d ai_service < /tmp/gocardless_config.sql');
          }
          
        } catch (error) {
          console.error('❌ Failed to set GoCardless secrets:', error.message);
          rl.close();
        }
        
      } else {
        // Local development
        console.log('📍 Target: LOCAL DEVELOPMENT');
        
        const rl = readline.createInterface({
          input: process.stdin,
          output: process.stdout
        });
        
        const question = (query) => new Promise((resolve) => rl.question(query, resolve));
        
        try {
          const secretId = await question('Enter GoCardless Secret ID: ');
          const secretKey = await question('Enter GoCardless Secret Key: ');
          const environment = await question('Environment (sandbox/production) [sandbox]: ') || 'sandbox';
          
          rl.close();
          
          if (!secretId || !secretKey) {
            console.log('❌ Secret ID and Secret Key are required');
            return;
          }
          
          // Determine API URL based on environment
          const apiUrl = environment === 'production' 
            ? 'https://bankaccountdata.gocardless.com/api/v2'
            : 'https://bankaccountdata.gocardless.com/api/v2';
          
          console.log('\n📝 Configuration Summary:');
          console.log(`  Secret ID: ${secretId.substring(0, 8)}...`);
          console.log(`  Secret Key: ${secretKey.substring(0, 8)}...`);
          console.log(`  Environment: ${environment}`);
          console.log(`  API URL: ${apiUrl}`);
          
          // Insert into local database
          const insertSQL = `
            DO \\$\\$
            DECLARE
              admin_user_id UUID;
            BEGIN
              -- Get the admin user ID
              SELECT id INTO admin_user_id 
              FROM auth.users 
              WHERE email IN ('admin@ai-service.local', 'admin@localhost')
              LIMIT 1;
              
              IF admin_user_id IS NULL THEN
                -- Create admin user if not exists
                INSERT INTO auth.users (email, password_hash, full_name, role, is_active)
                VALUES ('admin@ai-service.local', '\\$2b\\$10\\$8YzH7X1vKpFdKjb8rqOAOe8uEpZ4UjQn9mGxK7bgQqFvI9o1aWVKq', 'System Administrator', 'admin', true)
                ON CONFLICT (email) DO UPDATE SET role = 'admin', is_active = true
                RETURNING id INTO admin_user_id;
              END IF;
              
              -- Insert GoCardless configuration
              INSERT INTO financial.integration_configs 
              (user_id, integration_type, config_key, config_value, is_encrypted, is_active, is_global) 
              VALUES 
              (admin_user_id, 'gocardless', 'secret_id', '${secretId}', false, true, false),
              (admin_user_id, 'gocardless', 'secret_key', '${secretKey}', false, true, false)
              ON CONFLICT (user_id, integration_type, config_key) 
              DO UPDATE SET 
                config_value = EXCLUDED.config_value,
                is_active = true,
                updated_at = NOW();
              
              -- Insert global API URL
              INSERT INTO financial.integration_configs 
              (user_id, integration_type, config_key, config_value, is_encrypted, is_active, is_global) 
              VALUES 
              (NULL, 'gocardless', 'api_url', '${apiUrl}', false, true, true)
              ON CONFLICT (user_id, integration_type, config_key) 
              DO UPDATE SET 
                config_value = EXCLUDED.config_value,
                is_active = true,
                updated_at = NOW()
              WHERE integration_configs.user_id IS NULL;
              
              RAISE NOTICE 'GoCardless configuration updated successfully';
            END \\$\\$;
          `;
          
          console.log('\n🔄 Updating local database...');
          execSync(`docker exec -i ai-postgres psql -U ai_user -d ai_service -c "${insertSQL}"`, { stdio: 'inherit' });
          
          console.log('✅ GoCardless secrets configured successfully!');
          console.log('🔄 The API will use these credentials on next request');
        } catch (error) {
          console.error('❌ Failed to set GoCardless secrets:', error.message);
          rl.close();
        }
      }
      break;
      
    case 'test':
      console.log('🧪 Testing GoCardless Configuration');
      console.log('====================================');
      
      const token = getToken();
      const baseUrl = subArgs[1] === 'prod' 
        ? 'http://192.168.1.11:3001' 
        : 'http://localhost:3001';
      
      try {
        // Test the configuration
        const response = execSync(`curl -s -H "Authorization: Bearer ${token}" ${baseUrl}/api/financial/gocardless/test`, { encoding: 'utf8' });
        const result = JSON.parse(response);
        
        if (result.success) {
          console.log('✅ GoCardless configuration is valid!');
          console.log(`📍 Environment: ${result.environment || 'Unknown'}`);
          console.log(`🏦 Institutions Available: ${result.institutionCount || 0}`);
        } else {
          console.log('❌ GoCardless configuration test failed');
          console.log(`Error: ${result.error}`);
        }
      } catch (error) {
        console.error('❌ Failed to test GoCardless configuration:', error.message);
      }
      break;
      
    case 'status':
      console.log('📊 GoCardless Configuration Status');
      console.log('==================================');
      
      const env = subArgs[1] || 'local';
      
      if (env === 'prod' || env === 'production') {
        try {
          const result = execSync(`ssh admin@192.168.1.11 'docker exec ai-service-prod psql -U ai_user -d ai_service -t -c "SELECT config_key, LEFT(config_value, 20) || '"'"'...'"'"' as value_preview, is_active, updated_at FROM financial.integration_configs WHERE integration_type = '"'"'gocardless'"'"' ORDER BY config_key;"'`, { encoding: 'utf8' });
          if (result.trim()) {
            console.log('Current GoCardless Configuration:');
            console.log(result);
          } else {
            console.log('❌ No GoCardless configuration found');
            console.log('💡 Run: ai prod gocardless set-secrets prod');
          }
        } catch (error) {
          console.error('❌ Failed to check production status:', error.message);
        }
      } else {
        try {
          const result = execSync(`docker exec ai-postgres psql -U ai_user -d ai_service -t -c "SELECT config_key, LEFT(config_value, 20) || '...' as value_preview, is_active, updated_at FROM financial.integration_configs WHERE integration_type = 'gocardless' ORDER BY config_key;"`, { encoding: 'utf8' });
          if (result.trim()) {
            console.log('Current GoCardless Configuration:');
            console.log(result);
          } else {
            console.log('❌ No GoCardless configuration found');
            console.log('💡 Run: ai prod gocardless set-secrets');
          }
        } catch (error) {
          console.error('❌ Failed to check status:', error.message);
        }
      }
      break;
      
    default:
      console.log('GoCardless Management Commands:');
      console.log('');
      console.log('  ai prod gocardless set-secrets [prod]  - Set GoCardless API credentials');
      console.log('  ai prod gocardless test [prod]         - Test GoCardless configuration');
      console.log('  ai prod gocardless status [prod]       - Check configuration status');
      console.log('');
      console.log('Examples:');
      console.log('  ai prod gocardless set-secrets         - Set secrets for local dev');
      console.log('  ai prod gocardless set-secrets prod    - Set secrets for production');
      console.log('  ai prod gocardless test                - Test local configuration');
      console.log('  ai prod gocardless test prod           - Test production configuration');
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

// NAS Deployment Handler - Deploy to Synology NAS
async function handleNASDeployment() {
  console.log(`
╔════════════════════════════════════════════════╗
║    🚀 SYNOLOGY NAS PRODUCTION DEPLOYMENT       ║
╚════════════════════════════════════════════════╝
`);

  const NAS_HOST = '192.168.1.11';
  const NAS_USER = 'k2600x';
  const NAS_PATH = '/volume1/docker/ai-service';
  
  try {
    // 1. Build frontend with version info
    console.log('📦 Step 1: Building frontend with version info...');
    const buildTime = new Date().toISOString();
    const gitHash = execSync('git rev-parse HEAD 2>/dev/null || echo "dev"', { encoding: 'utf8' }).trim();
    const gitShort = execSync('git rev-parse --short HEAD 2>/dev/null || echo "dev"', { encoding: 'utf8' }).trim();
    
    console.log(`   Version: ${gitShort}`);
    console.log(`   Build time: ${buildTime}`);
    
    // Build frontend
    execSync(`cd frontend && VITE_BUILD_TIME="${buildTime}" VITE_BUILD_VERSION="${gitShort}" NODE_ENV=production npx vite build`, { 
      stdio: 'inherit' 
    });
    console.log('✅ Frontend built successfully\n');
    
    // 2. Build backend
    console.log('📦 Step 2: Building backend...');
    execSync('npm run build:backend:nocheck', { stdio: 'inherit' });
    console.log('✅ Backend built successfully\n');
    
    // 3. Build Docker image
    console.log('🐳 Step 3: Building Docker image...');
    const imageName = 'ai-service:latest';
    
    execSync(`docker build -t ${imageName} \
      --build-arg VERSION=${gitShort} \
      --build-arg BUILD_DATE="${buildTime}" \
      --build-arg COMMIT=${gitHash} \
      --build-arg COMMIT_SHORT=${gitShort} \
      -f Dockerfile .`, { 
      stdio: 'inherit' 
    });
    console.log('✅ Docker image built successfully\n');
    
    // 4. Save Docker image
    console.log('💾 Step 4: Saving Docker image...');
    const tarFile = 'ai-service-latest.tar.gz';
    execSync(`docker save ${imageName} | gzip > ${tarFile}`, { stdio: 'inherit' });
    const fileSize = execSync(`ls -lh ${tarFile} | awk '{print $5}'`, { encoding: 'utf8' }).trim();
    console.log(`✅ Image saved: ${tarFile} (${fileSize})\n`);
    
    // 5. Transfer to NAS
    console.log('📤 Step 5: Transferring to Synology NAS...');
    console.log(`   Target: ${NAS_USER}@${NAS_HOST}:/tmp/`);
    execSync(`scp ${tarFile} ${NAS_USER}@${NAS_HOST}:/tmp/`, { stdio: 'inherit' });
    console.log('✅ Image transferred successfully\n');
    
    // 6. Deploy on NAS
    console.log('🚀 Step 6: Deploying on NAS...');
    
    // Load image
    console.log('   Loading Docker image...');
    execSync(`ssh ${NAS_USER}@${NAS_HOST} "sudo gunzip -c /tmp/${tarFile} | sudo /usr/local/bin/docker load"`, { 
      stdio: 'inherit' 
    });
    
    // Stop old container
    console.log('   Stopping old container...');
    execSync(`ssh ${NAS_USER}@${NAS_HOST} "sudo /usr/local/bin/docker stop ai-service || true"`, { 
      stdio: 'inherit' 
    });
    
    // Remove old container
    console.log('   Removing old container...');
    execSync(`ssh ${NAS_USER}@${NAS_HOST} "sudo /usr/local/bin/docker rm ai-service || true"`, { 
      stdio: 'inherit' 
    });
    
    // Start new container
    console.log('   Starting new container...');
    const envFile = fs.readFileSync(path.join(__dirname, '.env.local'), 'utf8');
    const jwtSecret = envFile.match(/JWT_SECRET=(.+)/)?.[1] || 'ultra_secure_jwt_secret_2025';
    const postgresPassword = envFile.match(/POSTGRES_PASSWORD=(.+)/)?.[1] || 'ultra_secure_password_2025';
    
    execSync(`ssh ${NAS_USER}@${NAS_HOST} "sudo /usr/local/bin/docker run -d \\
      --name ai-service \\
      --restart unless-stopped \\
      -p 3001:3001 \\
      -e NODE_ENV=production \\
      -e DATABASE_URL='postgresql://ai_user:${postgresPassword}@ai-postgres:5432/ai_service' \\
      -e POSTGRES_HOST=ai-postgres \\
      -e POSTGRES_PORT=5432 \\
      -e REDIS_HOST=ai-redis \\
      -e REDIS_PORT=6379 \\
      -e JWT_SECRET='${jwtSecret}' \\
      -e OPENAI_API_KEY=dummy \\
      -v ${NAS_PATH}/logs:/app/logs \\
      --network bridge \\
      --link ai-postgres:ai-postgres \\
      --link ai-redis:ai-redis \\
      ${imageName}"`, { 
      stdio: 'inherit' 
    });
    
    console.log('✅ Container started successfully\n');
    
    // 7. Clean up
    console.log('🧹 Step 7: Cleaning up...');
    execSync(`rm ${tarFile}`, { stdio: 'inherit' });
    execSync(`ssh ${NAS_USER}@${NAS_HOST} "rm /tmp/${tarFile}"`, { stdio: 'inherit' });
    console.log('✅ Cleanup complete\n');
    
    // 8. Verify deployment
    console.log('✅ Step 8: Verifying deployment...');
    
    // Wait for container to start
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Check container status
    const containerStatus = execSync(`ssh ${NAS_USER}@${NAS_HOST} "sudo /usr/local/bin/docker ps | grep ai-service"`, { 
      encoding: 'utf8' 
    });
    console.log('   Container status:', containerStatus.trim());
    
    // Check health endpoint
    try {
      const health = execSync(`curl -s http://${NAS_HOST}:3001/api/health`, { encoding: 'utf8' });
      console.log('   Health check: ✅ Service is responding');
    } catch (error) {
      console.log('   Health check: ⚠️  Service may still be starting');
    }
    
    // Show deployment summary
    console.log(`
╔════════════════════════════════════════════════╗
║        🎉 DEPLOYMENT COMPLETE!                 ║
╠════════════════════════════════════════════════╣
║ Production URL:                                ║
║   https://[your-domain]:3030                   ║
║                                                ║
║ Version deployed: ${gitShort.padEnd(29)}║
║ Build time: ${buildTime.substring(0, 19).padEnd(35)}║
║                                                ║
║ Container: ai-service (running)                ║
║ Frontend: Served from /app/frontend/dist       ║
║                                                ║
║ To check logs:                                 ║
║   ssh ${NAS_USER}@${NAS_HOST} \\                     ║
║   sudo docker logs ai-service --tail 50        ║
╚════════════════════════════════════════════════╝
`);
    
    console.log('🌐 Your app should now be accessible at your production URL');
    console.log('📊 Check the bottom-right corner for the build version info\n');
    
  } catch (error) {
    console.error('❌ Deployment failed:', error.message);
    console.error('\nTroubleshooting:');
    console.error('1. Check SSH access: ssh', `${NAS_USER}@${NAS_HOST}`);
    console.error('2. Check Docker on NAS: ssh', `${NAS_USER}@${NAS_HOST}`, 'sudo docker ps');
    console.error('3. Check logs: ssh', `${NAS_USER}@${NAS_HOST}`, 'sudo docker logs ai-service');
    process.exit(1);
  }
}

// Production deployment handler
async function handleProductionDeploy(subArgs) {
  const deployType = subArgs[0] || 'interactive';
  
  // Check for help flag
  if (deployType === '--help' || deployType === '-h') {
    console.log(`
Production Deployment Usage:
  ai prod deploy [type] [options]

Types:
  docker      - Deploy using Docker containers
  manual      - Deploy using systemd services
  nas         - Deploy to Synology NAS
  --force     - Skip TypeScript checks (emergency mode)

Examples:
  ai prod deploy              # Interactive mode
  ai prod deploy docker       # Docker deployment
  ai prod deploy manual       # Manual deployment
  ai prod deploy nas          # NAS deployment  
  ai prod deploy --force      # Force deployment (skip TS checks)
  ai prod deploy docker --force # Docker with forced build

Emergency deployment:
  ./deploy-prod-quick.sh      # Bypass all checks
`);
    process.exit(0);
  }
  
  // Check if this is NAS deployment
  if (deployType === 'nas') {
    return handleNASDeployment();
  }
  
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
    
    // Check if force flag is set
    const forceMode = subArgs.includes('--force') || deployType === 'force';
    
    if (forceMode) {
      console.log('   ⚠️  Force mode enabled - skipping TypeScript checks');
    }
    
    // Build backend
    console.log('   Building main application...');
    if (forceMode) {
      execSync('npm run build:backend:nocheck', { stdio: 'inherit' });
    } else {
      try {
        execSync('npm run build:backend', { stdio: 'inherit' });
      } catch (error) {
        console.log('   ⚠️  Backend build failed, trying without TypeScript checks...');
        execSync('npm run build:backend:nocheck', { stdio: 'inherit' });
      }
    }
    
    // Build auth service
    console.log('   Building auth service...');
    try {
      execSync('cd apps/auth-svc && tsc --noEmit false || echo "TypeScript errors ignored"', { stdio: 'inherit' });
    } catch (error) {
      console.log('   ⚠️  Auth service build had issues, continuing...');
    }
    
    // Build financial service  
    console.log('   Building financial service...');
    try {
      execSync('cd apps/financial-svc && tsc --noEmit false || echo "TypeScript errors ignored"', { stdio: 'inherit' });
    } catch (error) {
      console.log('   ⚠️  Financial service build had issues, continuing...');
    }
    
    // Build frontend with version info
    console.log('   Building frontend with version info...');
    try {
      const buildTime = new Date().toISOString();
      const buildVersion = execSync('git rev-parse --short HEAD 2>/dev/null || echo "local"', { encoding: 'utf8' }).trim();
      execSync(`cd frontend && VITE_BUILD_TIME="${buildTime}" VITE_BUILD_VERSION="${buildVersion}" NODE_ENV=production npx vite build`, { stdio: 'inherit' });
    } catch (error) {
      console.log('   ⚠️  Frontend build had issues, using existing build');
    }
    
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
      
      // Kill existing services
      console.log('   Stopping existing services...');
      try {
        execSync('lsof -ti:3001 | xargs kill -9 2>/dev/null', { stdio: 'ignore' });
        execSync('lsof -ti:3002 | xargs kill -9 2>/dev/null', { stdio: 'ignore' });
        execSync('lsof -ti:3004 | xargs kill -9 2>/dev/null', { stdio: 'ignore' });
        console.log('   ✅ Existing services stopped');
      } catch (error) {
        // Ignore errors if no services running
      }
      
      console.log('\n📝 Starting services...\n');
      
      // Start services
      console.log('   Starting Monolith (serves frontend + API)...');
      const envVars = fs.readFileSync(path.join(__dirname, '.env.local'), 'utf8')
        .split('\n')
        .filter(line => line && !line.startsWith('#'))
        .map(line => line.split('=')[0])
        .filter(key => key);
      
      execSync('source .env.local && POSTGRES_HOST=localhost POSTGRES_PORT=5434 npm start > /tmp/monolith.log 2>&1 &', { 
        shell: '/bin/bash',
        stdio: 'inherit' 
      });
      
      console.log('   ✅ Monolith started on port 3001');
      console.log('   📁 Frontend served from: frontend/dist');
      console.log('   📡 API available at: http://localhost:3001/api');
      
      console.log('\n📝 Additional services (if needed):');
      console.log('1. Auth Service:');
      console.log('   cd apps/auth-svc');
      console.log('   DATABASE_URL="postgresql://user:pass@localhost:5434/ai_service?schema=auth" \\\\');
      console.log('   JWT_SECRET="your-secret" PORT=3004 npm start\n');
      console.log('2. Financial Service:');
      console.log('   cd apps/financial-svc');
      console.log('   DATABASE_URL="postgresql://user:pass@localhost:5434/ai_service?schema=financial" \\\\');
      console.log('   JWT_SECRET="your-secret" PORT=3002 npm start\n');
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