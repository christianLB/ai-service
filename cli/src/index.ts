#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import { config, initLogger } from './utils/config';
import { logger } from './utils/logger';
import type { GlobalOptions, CLIError } from './types';

// Import command modules
import { authCommands } from './commands/auth';
import { databaseCommands } from './commands/database';
import { testCommands } from './commands/test';

/**
 * Main CLI Application
 */
class AIServiceCLI {
  private program: Command;
  private initialized = false;

  constructor() {
    this.program = new Command();
    this.setupProgram();
    this.registerCommands();
    this.setupErrorHandling();
  }

  /**
   * Setup the main program configuration
   */
  private setupProgram(): void {
    this.program
      .name('ai')
      .description('AI Service CLI - Unified command-line interface replacing broken Makefiles')
      .version('1.0.0')
      .hook('preAction', async (thisCommand) => {
        await this.initializeConfig(thisCommand.opts());
      });

    // Global options
    this.program
      .option('-v, --verbose', 'Enable verbose output')
      .option('-c, --config <path>', 'Configuration file path')
      .option('-e, --env <env>', 'Environment override (development, production, test)')
      .option('--no-color', 'Disable colored output');
  }

  /**
   * Register all command modules
   */
  private registerCommands(): void {
    // Authentication commands
    this.program.addCommand(authCommands);

    // Database commands
    this.program.addCommand(databaseCommands);

    // Test commands
    this.program.addCommand(testCommands);

    // Add additional utility commands
    this.addUtilityCommands();
  }

  /**
   * Add utility commands
   */
  private addUtilityCommands(): void {
    // Config command - Show/manage configuration
    const configCommand = new Command('config')
      .description('Configuration management')
      .addCommand(
        new Command('show')
          .description('Show current configuration')
          .option('--json', 'Output in JSON format')
          .action(async (options: { json?: boolean }) => {
            try {
              const currentConfig = config.getConfig();
              
              if (options.json) {
                // Remove sensitive information from JSON output
                const safeConfig = { ...currentConfig };
                delete safeConfig.token;
                console.log(JSON.stringify(safeConfig, null, 2));
              } else {
                console.log(chalk.cyan('Current Configuration:'));
                console.log(`  API URL: ${currentConfig.apiUrl}`);
                console.log(`  Environment: ${currentConfig.environment}`);
                console.log(`  Database URL: ${currentConfig.database.url.replace(/:[^:]*@/, ':***@')}`);
                console.log(`  Database Schema: ${currentConfig.database.schema}`);
                console.log(`  Auto Backup: ${currentConfig.database.autoBackup ? 'enabled' : 'disabled'}`);
                console.log(`  Log Level: ${currentConfig.logging.level}`);
                console.log(`  Docker Compose: ${currentConfig.docker.composeFile}`);
                console.log(`  Authenticated: ${await config.isAuthenticated() ? 'yes' : 'no'}`);
              }
            } catch (error: any) {
              logger.error(`Failed to show configuration: ${error.message}`);
              process.exit(1);
            }
          })
      )
      .addCommand(
        new Command('set')
          .description('Set configuration value')
          .argument('<key>', 'Configuration key (dot notation supported)')
          .argument('<value>', 'Configuration value')
          .action(async (key: string, value: string) => {
            try {
              // Simple key-value setting (extend as needed)
              const currentConfig = config.getConfig();
              const updatedConfig = { ...currentConfig };
              
              // Handle common configuration keys
              switch (key) {
                case 'apiUrl':
                  updatedConfig.apiUrl = value;
                  break;
                case 'environment':
                  if (['development', 'production', 'test'].includes(value)) {
                    updatedConfig.environment = value as any;
                  } else {
                    throw new Error('Environment must be one of: development, production, test');
                  }
                  break;
                case 'database.url':
                  updatedConfig.database.url = value;
                  break;
                case 'database.schema':
                  updatedConfig.database.schema = value;
                  break;
                case 'logging.level':
                  if (['debug', 'info', 'warn', 'error'].includes(value)) {
                    updatedConfig.logging.level = value as any;
                  } else {
                    throw new Error('Log level must be one of: debug, info, warn, error');
                  }
                  break;
                default:
                  throw new Error(`Unknown configuration key: ${key}`);
              }
              
              await config.saveConfig(updatedConfig);
              logger.success(`Configuration updated: ${key} = ${value}`);
              
            } catch (error: any) {
              logger.error(`Failed to set configuration: ${error.message}`);
              process.exit(1);
            }
          })
      );

    this.program.addCommand(configCommand);

    // Health command - Check service health
    const healthCommand = new Command('health')
      .description('Check AI Service health')
      .option('--json', 'Output in JSON format')
      .action(async (options: { json?: boolean }) => {
        const { createAPIClient } = await import('./utils/api-client');
        
        try {
          const apiClient = createAPIClient();
          const healthData = await apiClient.healthCheck();
          
          if (options.json) {
            console.log(JSON.stringify(healthData, null, 2));
          } else {
            console.log(chalk.green('✅ AI Service is healthy'));
            console.log(`Status: ${healthData.status}`);
            console.log(`Uptime: ${healthData.uptime || 'N/A'}`);
            console.log(`Version: ${healthData.version || 'N/A'}`);
            
            if (healthData.services) {
              console.log(chalk.cyan('\nService Status:'));
              Object.entries(healthData.services).forEach(([name, status]) => {
                const icon = status === 'healthy' ? '✅' : '❌';
                console.log(`  ${icon} ${name}: ${status}`);
              });
            }
          }
          
        } catch (error: any) {
          if (options.json) {
            console.log(JSON.stringify({ status: 'unhealthy', error: error.message }, null, 2));
          } else {
            logger.error('❌ AI Service is unhealthy');
            logger.error(`Error: ${error.message}`);
          }
          
          process.exit(1);
        }
      });

    this.program.addCommand(healthCommand);

    // Version command (enhanced)
    const versionCommand = new Command('version')
      .description('Show version information')
      .option('--json', 'Output in JSON format')
      .action(async (options: { json?: boolean }) => {
        const packageJson = require('../package.json');
        
        const versionInfo = {
          cli: packageJson.version,
          node: process.version,
          platform: process.platform,
          arch: process.arch,
        };
        
        if (options.json) {
          console.log(JSON.stringify(versionInfo, null, 2));
        } else {
          console.log(chalk.cyan('AI Service CLI Version Information:'));
          console.log(`  CLI Version: ${versionInfo.cli}`);
          console.log(`  Node.js: ${versionInfo.node}`);
          console.log(`  Platform: ${versionInfo.platform}`);
          console.log(`  Architecture: ${versionInfo.arch}`);
        }
      });

    this.program.addCommand(versionCommand);
  }

  /**
   * Initialize configuration and logging
   */
  private async initializeConfig(options: GlobalOptions): Promise<void> {
    if (this.initialized) return;
    
    try {
      // Load configuration
      await config.loadConfig(options.config);
      
      // Initialize logging
      const currentConfig = config.getConfig();
      
      // Override log level if verbose
      const loggingConfig = {
        ...currentConfig.logging,
        level: options.verbose ? 'debug' as const : currentConfig.logging.level,
      };
      
      initLogger(loggingConfig);
      
      this.initialized = true;
      
    } catch (error: any) {
      // Use basic console logging if logger isn't initialized
      console.error(chalk.red(`Configuration error: ${error.message}`));
      
      if (error.code === 'CONFIG_LOAD_FAILED') {
        console.error(chalk.yellow('Try running the command from your project root directory.'));
      }
      
      process.exit(1);
    }
  }

  /**
   * Setup global error handling
   */
  private setupErrorHandling(): void {
    // Handle CLI errors gracefully
    this.program.exitOverride((err) => {
      if (err.code === 'commander.helpDisplayed' || err.code === 'commander.version') {
        process.exit(0);
      }
      
      // Convert commander errors to user-friendly messages
      if (err.code === 'commander.unknownCommand') {
        logger.error('Unknown command. Use --help to see available commands.');
      } else if (err.code === 'commander.missingArgument') {
        logger.error('Missing required argument. Use --help for usage information.');
      } else if (err.code === 'commander.invalidArgument') {
        logger.error('Invalid argument. Use --help for usage information.');
      } else {
        logger.error(`Command error: ${err.message}`);
      }
      
      process.exit(1);
    });

    // Handle unhandled promise rejections
    process.on('unhandledRejection', (reason: any) => {
      if (reason instanceof Error && (reason as CLIError).code) {
        const cliError = reason as CLIError;
        logger.error(`${cliError.message}`);
        
        if (logger && config.getConfig()?.logging.level === 'debug') {
          logger.debug('Error context:', cliError.context);
        }
      } else {
        logger.error(`Unhandled error: ${reason}`);
      }
      
      process.exit(1);
    });

    // Handle uncaught exceptions
    process.on('uncaughtException', (error) => {
      logger.error(`Uncaught exception: ${error.message}`);
      process.exit(1);
    });

    // Handle SIGINT gracefully
    process.on('SIGINT', () => {
      logger.info('\nOperation cancelled by user');
      process.exit(0);
    });
  }

  /**
   * Parse command line arguments and execute
   */
  async parse(argv: string[]): Promise<void> {
    await this.program.parseAsync(argv);
  }

  /**
   * Get the commander program instance
   */
  getProgram(): Command {
    return this.program;
  }
}

// Create and run the CLI
const cli = new AIServiceCLI();

// If this file is run directly, parse command line arguments
if (require.main === module) {
  cli.parse(process.argv).catch((error) => {
    console.error(chalk.red(`Fatal error: ${error.message}`));
    process.exit(1);
  });
}

// Export for testing
export default cli;
export { AIServiceCLI };