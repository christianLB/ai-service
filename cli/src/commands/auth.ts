import { Command, Option } from 'commander';
import inquirer from 'inquirer';
import chalk from 'chalk';
import ora from 'ora';
import type { AuthCommandOptions, AuthTokens } from '../types';
import { config } from '../utils/config';
import { logger } from '../utils/logger';
import { createAPIClient } from '../utils/api-client';

/**
 * Login command - Authenticate with API
 */
const loginCommand = new Command('login')
  .description('Authenticate with AI Service API')
  .addOption(new Option('--api-url <url>', 'API URL override'))
  .addOption(new Option('--skip-validation', 'Skip token validation'))
  .action(async (options: AuthCommandOptions) => {
    const spinner = ora('Authenticating...').start();
    
    try {
      // Check if already authenticated
      if (await config.isAuthenticated() && !options.skipValidation) {
        const tokens = await config.loadTokens();
        spinner.succeed('Already authenticated');
        logger.info(`Logged in as: ${tokens?.user?.email || 'unknown'}`);
        return;
      }

      // Prompt for credentials
      spinner.stop();
      const credentials = await inquirer.prompt([
        {
          type: 'input',
          name: 'email',
          message: 'Email:',
          validate: (input) => {
            if (!input || !input.includes('@')) {
              return 'Please enter a valid email address';
            }
            return true;
          },
        },
        {
          type: 'password',
          name: 'password',
          message: 'Password:',
          mask: '*',
          validate: (input) => {
            if (!input || input.length < 1) {
              return 'Password cannot be empty';
            }
            return true;
          },
        },
      ]);

      spinner.start('Logging in...');
      
      // Create API client
      const apiClient = createAPIClient(options.apiUrl);
      
      // Attempt login
      const tokens = await apiClient.login(credentials.email, credentials.password);
      
      // Save tokens
      await config.saveTokens(tokens);
      
      spinner.succeed('Successfully logged in');
      logger.success(`Welcome, ${tokens.user?.email || 'user'}!`);
      
      if (tokens.user?.role) {
        logger.info(`Role: ${tokens.user.role}`);
      }
      
    } catch (error: any) {
      spinner.fail('Login failed');
      
      if (error.code === 'AUTH_LOGIN_FAILED') {
        logger.error('Invalid credentials or server error');
        logger.debug('Error details:', error.context);
      } else if (error.code === 'API_SERVER_ERROR') {
        logger.error('Server is unavailable. Please check your API URL and try again.');
        logger.debug(`API URL: ${options.apiUrl || config.getApiUrl()}`);
      } else {
        logger.error(`Authentication failed: ${error.message}`);
      }
      
      process.exit(1);
    }
  });

/**
 * Logout command - Clear authentication tokens
 */
const logoutCommand = new Command('logout')
  .description('Clear authentication tokens and logout')
  .action(async () => {
    const spinner = ora('Logging out...').start();
    
    try {
      // Try to logout from server first
      if (await config.isAuthenticated()) {
        const apiClient = createAPIClient();
        const tokens = await config.loadTokens();
        
        if (tokens) {
          apiClient.setTokens(tokens);
          await apiClient.logout();
        }
      }
      
      // Clear local tokens
      await config.clearTokens();
      
      spinner.succeed('Successfully logged out');
      logger.info('All authentication tokens have been cleared');
      
    } catch (error: any) {
      // Even if server logout fails, we clear local tokens
      await config.clearTokens();
      
      spinner.succeed('Logged out locally');
      logger.warn('Server logout failed, but local tokens were cleared');
      logger.debug('Error:', error.message);
    }
  });

/**
 * Token command - Show current authentication token
 */
const tokenCommand = new Command('token')
  .description('Show current authentication token')
  .option('--raw', 'Output raw token without formatting')
  .action(async (options: { raw?: boolean }) => {
    try {
      if (!await config.isAuthenticated()) {
        logger.error('Not authenticated. Run `ai auth login` first.');
        process.exit(1);
      }
      
      const tokens = await config.loadTokens();
      
      if (!tokens) {
        logger.error('No valid tokens found');
        process.exit(1);
      }
      
      if (options.raw) {
        console.log(tokens.access);
      } else {
        console.log(chalk.cyan('Authentication Token:'));
        console.log(tokens.access);
        
        if (tokens.expires) {
          const expiresAt = new Date(tokens.expires);
          const isExpired = expiresAt < new Date();
          
          console.log(chalk.gray(`Expires: ${expiresAt.toISOString()}`));
          
          if (isExpired) {
            console.log(chalk.red('⚠️  Token has expired'));
          } else {
            const timeLeft = Math.round((expiresAt.getTime() - Date.now()) / (1000 * 60 * 60));
            console.log(chalk.green(`✅ Valid for ${timeLeft} hours`));
          }
        }
      }
      
    } catch (error: any) {
      logger.error(`Failed to get token: ${error.message}`);
      process.exit(1);
    }
  });

/**
 * Whoami command - Show current user information
 */
const whoamiCommand = new Command('whoami')
  .description('Show current user information')
  .addOption(new Option('--json', 'Output in JSON format'))
  .action(async (options: { json?: boolean }) => {
    const spinner = ora('Getting user info...').start();
    
    try {
      if (!await config.isAuthenticated()) {
        spinner.fail('Not authenticated');
        logger.error('Please run `ai auth login` first');
        process.exit(1);
      }
      
      const apiClient = createAPIClient();
      const tokens = await config.loadTokens();
      
      if (tokens) {
        apiClient.setTokens(tokens);
      }
      
      const userInfo = await apiClient.whoami();
      spinner.succeed('User info retrieved');
      
      if (options.json) {
        console.log(JSON.stringify(userInfo, null, 2));
      } else {
        console.log(chalk.cyan('Current User:'));
        console.log(`  ID: ${userInfo.id}`);
        console.log(`  Email: ${userInfo.email}`);
        console.log(`  Role: ${userInfo.role || 'N/A'}`);
        
        if (userInfo.createdAt) {
          console.log(`  Created: ${new Date(userInfo.createdAt).toISOString()}`);
        }
        
        if (userInfo.lastLoginAt) {
          console.log(`  Last Login: ${new Date(userInfo.lastLoginAt).toISOString()}`);
        }
      }
      
    } catch (error: any) {
      spinner.fail('Failed to get user info');
      
      if (error.code === 'AUTH_UNAUTHORIZED') {
        logger.error('Authentication token is invalid or expired');
        logger.info('Please run `ai auth login` to re-authenticate');
      } else {
        logger.error(`Error: ${error.message}`);
        logger.debug('Error details:', error.context);
      }
      
      process.exit(1);
    }
  });

/**
 * Refresh command - Refresh authentication token
 */
const refreshCommand = new Command('refresh')
  .description('Refresh authentication token')
  .action(async () => {
    const spinner = ora('Refreshing token...').start();
    
    try {
      const tokens = await config.loadTokens();
      
      if (!tokens?.refresh) {
        spinner.fail('No refresh token available');
        logger.error('Please run `ai auth login` to authenticate');
        process.exit(1);
      }
      
      const apiClient = createAPIClient();
      apiClient.setTokens(tokens);
      
      const newTokens = await apiClient.refreshToken();
      await config.saveTokens(newTokens);
      
      spinner.succeed('Token refreshed successfully');
      
      if (newTokens.expires) {
        const expiresAt = new Date(newTokens.expires);
        logger.info(`New token expires at: ${expiresAt.toISOString()}`);
      }
      
    } catch (error: any) {
      spinner.fail('Token refresh failed');
      
      if (error.code === 'AUTH_REFRESH_FAILED') {
        logger.error('Refresh token is invalid or expired');
        logger.info('Please run `ai auth login` to re-authenticate');
      } else {
        logger.error(`Error: ${error.message}`);
      }
      
      process.exit(1);
    }
  });

/**
 * Main auth command with subcommands
 */
export const authCommands = new Command('auth')
  .description('Authentication management')
  .addCommand(loginCommand)
  .addCommand(logoutCommand)
  .addCommand(tokenCommand)
  .addCommand(whoamiCommand)
  .addCommand(refreshCommand);

// Command aliases
authCommands.alias('a');
// Individual subcommand aliases removed to avoid conflicts