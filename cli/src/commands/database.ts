import { Command, Option } from 'commander';
import { execSync, spawn, SpawnOptions } from 'child_process';
import inquirer from 'inquirer';
import chalk from 'chalk';
import ora from 'ora';
import fs from 'fs-extra';
import path from 'path';
import { format } from 'date-fns';
import type { DatabaseCommandOptions, DatabaseMigration, CommandResult } from '../types';
import { config } from '../utils/config';
import { logger } from '../utils/logger';
import { createAPIClient } from '../utils/api-client';

/**
 * Execute shell command with proper error handling
 */
function executeCommand(command: string, options: { cwd?: string; env?: Record<string, string> } = {}): string {
  try {
    return execSync(command, {
      encoding: 'utf8',
      stdio: 'pipe',
      cwd: options.cwd || process.cwd(),
      env: { ...process.env, ...options.env },
    });
  } catch (error: any) {
    throw new Error(`Command failed: ${command}\n${error.message}`);
  }
}

/**
 * Execute command with live output
 */
function executeCommandLive(command: string, args: string[], options: SpawnOptions = {}): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: 'inherit',
      cwd: options.cwd || process.cwd(),
      env: { ...process.env, ...options.env },
      ...options,
    });

    child.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Command failed with exit code ${code}: ${command} ${args.join(' ')}`));
      }
    });

    child.on('error', (error) => {
      reject(error);
    });
  });
}

/**
 * Migrate command - Run database migrations
 */
const migrateCommand = new Command('migrate')
  .description('Run pending database migrations')
  .addOption(new Option('--url <url>', 'Database URL override'))
  .addOption(new Option('--schema <schema>', 'Schema override'))
  .addOption(new Option('--force', 'Force migration without confirmation'))
  .addOption(new Option('--dry-run', 'Show what would be migrated without applying'))
  .action(async (options: DatabaseCommandOptions) => {
    const spinner = ora('Checking migration status...').start();
    
    try {
      const dbConfig = config.getDatabaseConfig();
      const databaseUrl = options.url || dbConfig.url;
      
      // Check current migration status
      const statusOutput = executeCommand('npx prisma migrate status', {
        env: { DATABASE_URL: databaseUrl },
      });
      
      spinner.succeed('Migration status checked');
      console.log(statusOutput);
      
      // Check if migrations are needed
      if (statusOutput.includes('Database schema is up to date!')) {
        logger.info('No pending migrations');
        return;
      }
      
      if (options.dryRun) {
        logger.info('Dry run mode - would apply pending migrations');
        return;
      }
      
      // Confirm migration
      if (!options.force) {
        const { proceed } = await inquirer.prompt([
          {
            type: 'confirm',
            name: 'proceed',
            message: 'Do you want to apply pending migrations?',
            default: false,
          },
        ]);
        
        if (!proceed) {
          logger.info('Migration cancelled');
          return;
        }
      }
      
      // Create backup if enabled
      if (dbConfig.autoBackup) {
        await backupDatabase(databaseUrl, dbConfig.backupDir);
      }
      
      // Run migrations
      spinner.start('Running migrations...');
      
      await executeCommandLive('npx', ['prisma', 'migrate', 'deploy'], {
        env: { DATABASE_URL: databaseUrl },
      });
      
      spinner.succeed('Migrations completed successfully');
      
    } catch (error: any) {
      spinner.fail('Migration failed');
      logger.error(`Migration error: ${error.message}`);
      process.exit(1);
    }
  });

/**
 * Rollback command - Rollback database migration
 */
const rollbackCommand = new Command('rollback')
  .description('Rollback database migration')
  .argument('[migration-id]', 'Specific migration ID to rollback to')
  .addOption(new Option('--url <url>', 'Database URL override'))
  .addOption(new Option('--force', 'Force rollback without confirmation'))
  .addOption(new Option('--dry-run', 'Show what would be rolled back'))
  .action(async (migrationId: string | undefined, options: DatabaseCommandOptions) => {
    const spinner = ora('Preparing rollback...').start();
    
    try {
      // Check if authenticated for API-based rollback
      if (await config.isAuthenticated()) {
        // Use API for rollback
        const apiClient = createAPIClient();
        const tokens = await config.loadTokens();
        
        if (tokens) {
          apiClient.setTokens(tokens);
        }
        
        if (options.dryRun) {
          spinner.succeed('Dry run mode - would rollback via API');
          logger.info(`Target migration: ${migrationId || 'previous'}`);
          return;
        }
        
        if (!options.force) {
          const { proceed } = await inquirer.prompt([
            {
              type: 'confirm',
              name: 'proceed',
              message: `Rollback migration${migrationId ? ` to ${migrationId}` : ''}?`,
              default: false,
            },
          ]);
          
          if (!proceed) {
            logger.info('Rollback cancelled');
            return;
          }
        }
        
        spinner.text = 'Rolling back migration...';
        const result = await apiClient.rollbackMigration(migrationId);
        
        spinner.succeed('Rollback completed via API');
        
        if (result.metadata?.warnings?.length) {
          result.metadata.warnings.forEach(warning => logger.warn(warning));
        }
        
      } else {
        // Manual rollback (limited functionality)
        spinner.warn('Not authenticated - manual rollback mode');
        
        logger.warn('Manual rollback is limited. For full functionality, run `ai auth login` first.');
        logger.info('For manual rollback, use: npx prisma migrate reset');
        
        if (!options.force) {
          const { proceed } = await inquirer.prompt([
            {
              type: 'confirm',
              name: 'proceed',
              message: 'Continue with manual reset? This will reset the entire database!',
              default: false,
            },
          ]);
          
          if (!proceed) {
            logger.info('Rollback cancelled');
            return;
          }
        }
        
        const dbConfig = config.getDatabaseConfig();
        const databaseUrl = options.url || dbConfig.url;
        
        // Create backup first
        if (dbConfig.autoBackup) {
          await backupDatabase(databaseUrl, dbConfig.backupDir);
        }
        
        spinner.start('Resetting database...');
        
        await executeCommandLive('npx', ['prisma', 'migrate', 'reset', '--force'], {
          env: { DATABASE_URL: databaseUrl },
        });
        
        spinner.succeed('Database reset completed');
      }
      
    } catch (error: any) {
      spinner.fail('Rollback failed');
      logger.error(`Rollback error: ${error.message}`);
      process.exit(1);
    }
  });

/**
 * Status command - Show migration status
 */
const statusCommand = new Command('status')
  .description('Show database migration status')
  .addOption(new Option('--url <url>', 'Database URL override'))
  .addOption(new Option('--json', 'Output in JSON format'))
  .action(async (options: DatabaseCommandOptions & { json?: boolean }) => {
    const spinner = ora('Getting migration status...').start();
    
    try {
      const dbConfig = config.getDatabaseConfig();
      const databaseUrl = options.url || dbConfig.url;
      
      // Try API first if authenticated
      if (await config.isAuthenticated()) {
        try {
          const apiClient = createAPIClient();
          const tokens = await config.loadTokens();
          
          if (tokens) {
            apiClient.setTokens(tokens);
          }
          
          const migrations = await apiClient.getMigrationStatus();
          
          spinner.succeed('Migration status retrieved via API');
          
          if (options.json) {
            console.log(JSON.stringify(migrations, null, 2));
          } else {
            console.log(chalk.cyan('Database Migration Status:'));
            migrations.forEach((migration: DatabaseMigration) => {
              const status = migration.status === 'applied' ? 
                chalk.green('✅ Applied') : 
                chalk.yellow('⏳ Pending');
              
              console.log(`  ${status} ${migration.name} ${migration.appliedAt ? `(${migration.appliedAt})` : ''}`);
            });
          }
          
          return;
        } catch (error) {
          // Fall back to local check
          spinner.text = 'API failed, checking locally...';
        }
      }
      
      // Local status check
      const statusOutput = executeCommand('npx prisma migrate status', {
        env: { DATABASE_URL: databaseUrl },
      });
      
      spinner.succeed('Migration status retrieved locally');
      
      if (options.json) {
        // Parse status output into JSON format
        const lines = statusOutput.split('\n');
        const migrations = lines
          .filter(line => line.includes('migration'))
          .map(line => ({
            name: line.trim(),
            status: line.includes('applied') ? 'applied' : 'pending',
          }));
        
        console.log(JSON.stringify(migrations, null, 2));
      } else {
        console.log(statusOutput);
      }
      
    } catch (error: any) {
      spinner.fail('Failed to get migration status');
      logger.error(`Status check error: ${error.message}`);
      process.exit(1);
    }
  });

/**
 * Studio command - Open Prisma Studio
 */
const studioCommand = new Command('studio')
  .description('Open Prisma Studio for database inspection')
  .addOption(new Option('--url <url>', 'Database URL override'))
  .addOption(new Option('--port <port>', 'Studio port override'))
  .action(async (options: DatabaseCommandOptions & { port?: string }) => {
    const spinner = ora('Starting Prisma Studio...').start();
    
    try {
      const dbConfig = config.getDatabaseConfig();
      const databaseUrl = options.url || dbConfig.url;
      
      const args = ['prisma', 'studio'];
      
      if (options.port) {
        args.push('--port', options.port);
      }
      
      spinner.succeed('Starting Prisma Studio...');
      logger.info('Press Ctrl+C to stop Studio');
      
      await executeCommandLive('npx', args, {
        env: { DATABASE_URL: databaseUrl },
      });
      
    } catch (error: any) {
      spinner.fail('Failed to start Prisma Studio');
      logger.error(`Studio error: ${error.message}`);
      process.exit(1);
    }
  });

/**
 * Seed command - Seed the database
 */
const seedCommand = new Command('seed')
  .description('Seed the database with initial data')
  .addOption(new Option('--url <url>', 'Database URL override'))
  .addOption(new Option('--force', 'Force seed without confirmation'))
  .action(async (options: DatabaseCommandOptions) => {
    const spinner = ora('Seeding database...').start();
    
    try {
      const dbConfig = config.getDatabaseConfig();
      const databaseUrl = options.url || dbConfig.url;
      
      if (!options.force) {
        const { proceed } = await inquirer.prompt([
          {
            type: 'confirm',
            name: 'proceed',
            message: 'This will add seed data to the database. Continue?',
            default: true,
          },
        ]);
        
        if (!proceed) {
          logger.info('Seed cancelled');
          return;
        }
      }
      
      await executeCommandLive('npx', ['prisma', 'db', 'seed'], {
        env: { DATABASE_URL: databaseUrl },
      });
      
      spinner.succeed('Database seeded successfully');
      
    } catch (error: any) {
      spinner.fail('Database seed failed');
      logger.error(`Seed error: ${error.message}`);
      process.exit(1);
    }
  });

/**
 * Backup command - Create database backup
 */
const backupCommand = new Command('backup')
  .description('Create database backup')
  .argument('[name]', 'Backup name (optional)')
  .addOption(new Option('--url <url>', 'Database URL override'))
  .addOption(new Option('--output <dir>', 'Output directory override'))
  .action(async (name: string | undefined, options: DatabaseCommandOptions & { output?: string }) => {
    const spinner = ora('Creating database backup...').start();
    
    try {
      const dbConfig = config.getDatabaseConfig();
      const databaseUrl = options.url || dbConfig.url;
      const outputDir = options.output || dbConfig.backupDir;
      
      const backupFile = await backupDatabase(databaseUrl, outputDir, name);
      
      spinner.succeed('Database backup created');
      logger.success(`Backup saved to: ${backupFile}`);
      
    } catch (error: any) {
      spinner.fail('Backup failed');
      logger.error(`Backup error: ${error.message}`);
      process.exit(1);
    }
  });

/**
 * Helper function to create database backup
 */
async function backupDatabase(databaseUrl: string, outputDir: string, name?: string): Promise<string> {
  // Parse database URL
  const dbUrl = new URL(databaseUrl);
  const timestamp = format(new Date(), 'yyyyMMdd_HHmmss');
  const backupName = name ? `${name}_${timestamp}` : `backup_${timestamp}`;
  const backupFile = path.join(outputDir, `${backupName}.sql`);
  
  // Ensure backup directory exists
  await fs.ensureDir(outputDir);
  
  // Create backup using pg_dump
  const pgDumpCmd = [
    'pg_dump',
    '--clean',
    '--create',
    '--verbose',
    '--file', backupFile,
    databaseUrl,
  ];
  
  await executeCommandLive(pgDumpCmd[0], pgDumpCmd.slice(1));
  
  return backupFile;
}

/**
 * Main database command with subcommands
 */
export const databaseCommands = new Command('database')
  .description('Database management and migrations')
  .addCommand(migrateCommand)
  .addCommand(rollbackCommand)
  .addCommand(statusCommand)
  .addCommand(studioCommand)
  .addCommand(seedCommand)
  .addCommand(backupCommand);

// Command aliases
databaseCommands.alias('db');
// Individual subcommand aliases removed to avoid conflicts