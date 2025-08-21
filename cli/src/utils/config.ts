import { z } from 'zod';
import fs from 'fs-extra';
import path from 'path';
import os from 'os';
import dotenv from 'dotenv';
import type { 
  CLIConfig, 
  DockerConfig, 
  DatabaseConfig, 
  LoggingConfig,
  AuthTokens,
  CLIError 
} from '../types';

// Zod schemas for validation
const DockerConfigSchema = z.object({
  composeFile: z.string().default('docker-compose.yml'),
  services: z.array(z.string()).default([]),
  registry: z.object({
    url: z.string(),
    username: z.string().optional(),
    token: z.string().optional(),
  }).optional(),
});

const DatabaseConfigSchema = z.object({
  url: z.string(),
  schema: z.string().default('public'),
  backupDir: z.string().default('./backups'),
  autoBackup: z.boolean().default(true),
});

const LoggingConfigSchema = z.object({
  level: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
  format: z.enum(['json', 'pretty']).default('pretty'),
  file: z.string().optional(),
});

const CLIConfigSchema = z.object({
  apiUrl: z.string().url(),
  token: z.string().optional(),
  environment: z.enum(['development', 'production', 'test']).default('development'),
  docker: DockerConfigSchema,
  database: DatabaseConfigSchema,
  logging: LoggingConfigSchema,
});

const AuthTokensSchema = z.object({
  access: z.string(),
  refresh: z.string().optional(),
  expires: z.number().optional(),
  user: z.object({
    id: z.string(),
    email: z.string().optional(),
    role: z.string().optional(),
  }).optional(),
});

/**
 * Configuration Manager
 */
export class ConfigManager {
  private static instance: ConfigManager;
  private config: CLIConfig | null = null;
  private configPath: string;
  private credentialsPath: string;

  private constructor() {
    const configDir = path.join(os.homedir(), '.ai-service');
    this.configPath = path.join(configDir, 'config.json');
    this.credentialsPath = path.join(configDir, 'credentials.json');
  }

  static getInstance(): ConfigManager {
    if (!ConfigManager.instance) {
      ConfigManager.instance = new ConfigManager();
    }
    return ConfigManager.instance;
  }

  /**
   * Load configuration from file and environment
   */
  async loadConfig(configFile?: string): Promise<CLIConfig> {
    try {
      // Load from custom path if provided
      const actualConfigPath = configFile || this.configPath;
      
      // Create default config if doesn't exist
      if (!await fs.pathExists(actualConfigPath)) {
        await this.createDefaultConfig(actualConfigPath);
      }

      // Read config file
      const configData = await fs.readJson(actualConfigPath);
      
      // Load environment variables
      await this.loadEnvironmentVariables();
      
      // Merge with environment overrides
      const mergedConfig = this.mergeEnvironmentOverrides(configData);
      
      // Validate configuration
      this.config = CLIConfigSchema.parse(mergedConfig);
      
      return this.config;
    } catch (error) {
      throw this.createError(
        'CONFIG_LOAD_FAILED', 
        `Failed to load configuration: ${error instanceof Error ? error.message : 'Unknown error'}`,
        { configFile }
      );
    }
  }

  /**
   * Save configuration to file
   */
  async saveConfig(config: Partial<CLIConfig>): Promise<void> {
    try {
      await fs.ensureDir(path.dirname(this.configPath));
      
      // Merge with existing config
      const currentConfig = this.config || await this.loadConfig();
      const updatedConfig = { ...currentConfig, ...config };
      
      // Validate before saving
      const validatedConfig = CLIConfigSchema.parse(updatedConfig);
      
      await fs.writeJson(this.configPath, validatedConfig, { spaces: 2 });
      this.config = validatedConfig;
    } catch (error) {
      throw this.createError(
        'CONFIG_SAVE_FAILED',
        `Failed to save configuration: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Get current configuration
   */
  getConfig(): CLIConfig {
    if (!this.config) {
      throw this.createError('CONFIG_NOT_LOADED', 'Configuration not loaded. Call loadConfig() first.');
    }
    return this.config;
  }

  /**
   * Load and validate authentication tokens
   */
  async loadTokens(): Promise<AuthTokens | null> {
    try {
      if (!await fs.pathExists(this.credentialsPath)) {
        return null;
      }

      const tokenData = await fs.readJson(this.credentialsPath);
      return AuthTokensSchema.parse(tokenData);
    } catch (error) {
      // Invalid token file - return null to force re-authentication
      return null;
    }
  }

  /**
   * Save authentication tokens
   */
  async saveTokens(tokens: AuthTokens): Promise<void> {
    try {
      await fs.ensureDir(path.dirname(this.credentialsPath));
      
      // Validate tokens before saving
      const validatedTokens = AuthTokensSchema.parse(tokens);
      
      await fs.writeJson(this.credentialsPath, validatedTokens, { spaces: 2 });
      
      // Set restrictive permissions on credentials file
      await fs.chmod(this.credentialsPath, 0o600);
    } catch (error) {
      throw this.createError(
        'TOKENS_SAVE_FAILED',
        `Failed to save authentication tokens: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Clear authentication tokens
   */
  async clearTokens(): Promise<void> {
    try {
      if (await fs.pathExists(this.credentialsPath)) {
        await fs.remove(this.credentialsPath);
      }
    } catch (error) {
      throw this.createError(
        'TOKENS_CLEAR_FAILED',
        `Failed to clear authentication tokens: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Check if user is authenticated
   */
  async isAuthenticated(): Promise<boolean> {
    const tokens = await this.loadTokens();
    if (!tokens) return false;
    
    // Check if token is expired
    if (tokens.expires && tokens.expires < Date.now()) {
      return false;
    }
    
    return true;
  }

  /**
   * Get API URL with validation
   */
  getApiUrl(): string {
    const config = this.getConfig();
    return config.apiUrl;
  }

  /**
   * Get database configuration
   */
  getDatabaseConfig(): DatabaseConfig {
    const config = this.getConfig();
    return config.database;
  }

  /**
   * Get Docker configuration
   */
  getDockerConfig(): DockerConfig {
    const config = this.getConfig();
    return config.docker;
  }

  /**
   * Create default configuration file
   */
  private async createDefaultConfig(configPath: string): Promise<void> {
    const defaultConfig: CLIConfig = {
      apiUrl: 'http://localhost:3001',
      environment: 'development',
      docker: {
        composeFile: 'docker-compose.yml',
        services: ['ai-service-api', 'postgres', 'redis'],
      },
      database: {
        url: process.env.DATABASE_URL || 'postgres://postgres:postgres123@localhost:5432/ai_service',
        schema: 'public',
        backupDir: './backups',
        autoBackup: true,
      },
      logging: {
        level: 'info',
        format: 'pretty',
      },
    };

    await fs.ensureDir(path.dirname(configPath));
    await fs.writeJson(configPath, defaultConfig, { spaces: 2 });
  }

  /**
   * Load environment variables
   */
  private async loadEnvironmentVariables(): Promise<void> {
    // Try to load .env file from project root
    const projectRoot = process.cwd();
    const envPaths = [
      path.join(projectRoot, '.env.local'),
      path.join(projectRoot, '.env'),
    ];

    for (const envPath of envPaths) {
      if (await fs.pathExists(envPath)) {
        dotenv.config({ path: envPath });
        break;
      }
    }
  }

  /**
   * Merge environment variable overrides
   */
  private mergeEnvironmentOverrides(config: any): any {
    return {
      ...config,
      apiUrl: process.env.AI_SERVICE_API_URL || config.apiUrl,
      environment: process.env.NODE_ENV || config.environment,
      database: {
        ...config.database,
        url: process.env.DATABASE_URL || config.database?.url,
      },
    };
  }

  /**
   * Create a CLI error
   */
  private createError(code: string, message: string, context?: Record<string, any>): CLIError {
    const error = new Error(message) as CLIError;
    error.code = code;
    error.context = context;
    return error;
  }
}

/**
 * Get configuration manager instance
 */
export const config = ConfigManager.getInstance();

/**
 * Initialize logger with configuration
 */
export const initLogger = (loggingConfig: LoggingConfig): void => {
  // This will be imported from logger utils
  const { initLogger: initLoggerUtil } = require('./logger');
  initLoggerUtil(loggingConfig);
};

/**
 * Validation utilities
 */
export const validateConfig = (data: unknown): CLIConfig => {
  return CLIConfigSchema.parse(data);
};

export const validateTokens = (data: unknown): AuthTokens => {
  return AuthTokensSchema.parse(data);
};

// Export schemas for external use
export {
  CLIConfigSchema,
  AuthTokensSchema,
  DockerConfigSchema,
  DatabaseConfigSchema,
  LoggingConfigSchema,
};