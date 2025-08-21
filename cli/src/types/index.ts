/**
 * CLI Types and Interfaces
 */

export interface CLIConfig {
  /** AI Service API base URL */
  apiUrl: string;
  /** Authentication token */
  token?: string;
  /** Current environment */
  environment: 'development' | 'production' | 'test';
  /** Docker configuration */
  docker: DockerConfig;
  /** Database configuration */
  database: DatabaseConfig;
  /** Logging configuration */
  logging: LoggingConfig;
}

export interface DockerConfig {
  /** Docker compose file to use */
  composeFile: string;
  /** Services to manage */
  services: string[];
  /** Docker registry configuration */
  registry?: {
    url: string;
    username?: string;
    token?: string;
  };
}

export interface DatabaseConfig {
  /** Database connection URL */
  url: string;
  /** Schema to use */
  schema: string;
  /** Backup directory */
  backupDir: string;
  /** Auto backup before migrations */
  autoBackup: boolean;
}

export interface LoggingConfig {
  /** Log level */
  level: 'debug' | 'info' | 'warn' | 'error';
  /** Log output format */
  format: 'json' | 'pretty';
  /** Log file path */
  file?: string;
}

export interface AuthTokens {
  /** Access token */
  access: string;
  /** Refresh token */
  refresh?: string;
  /** Token expiration */
  expires?: number;
  /** User information */
  user?: {
    id: string;
    email?: string;
    role?: string;
  };
}

export interface CommandResult<T = any> {
  /** Command succeeded */
  success: boolean;
  /** Result data */
  data?: T;
  /** Error message if failed */
  error?: string;
  /** Additional metadata */
  metadata?: {
    duration?: number;
    warnings?: string[];
    info?: string[];
  };
}

export interface DatabaseMigration {
  /** Migration ID */
  id: string;
  /** Migration name */
  name: string;
  /** Applied timestamp */
  appliedAt?: string;
  /** Migration status */
  status: 'pending' | 'applied' | 'failed';
  /** Migration file path */
  file?: string;
}

export interface TestResult {
  /** Test suite name */
  suite: string;
  /** Number of tests */
  total: number;
  /** Number of passed tests */
  passed: number;
  /** Number of failed tests */
  failed: number;
  /** Number of skipped tests */
  skipped: number;
  /** Test duration in milliseconds */
  duration: number;
  /** Failed test details */
  failures?: Array<{
    test: string;
    error: string;
  }>;
}

export interface ServiceStatus {
  /** Service name */
  name: string;
  /** Service status */
  status: 'running' | 'stopped' | 'error' | 'starting' | 'stopping';
  /** Service health */
  health: 'healthy' | 'unhealthy' | 'unknown';
  /** Port mappings */
  ports?: string[];
  /** CPU usage */
  cpu?: number;
  /** Memory usage */
  memory?: number;
  /** Uptime in seconds */
  uptime?: number;
}

export interface CLIError extends Error {
  /** Error code */
  code: string;
  /** HTTP status code if applicable */
  statusCode?: number;
  /** Additional context */
  context?: Record<string, any>;
}

// Command option types
export interface GlobalOptions {
  /** Enable verbose output */
  verbose?: boolean;
  /** Configuration file path */
  config?: string;
  /** Environment override */
  env?: string;
  /** Disable colored output */
  noColor?: boolean;
}

export interface AuthCommandOptions extends GlobalOptions {
  /** API URL override */
  apiUrl?: string;
  /** Skip token validation */
  skipValidation?: boolean;
}

export interface DatabaseCommandOptions extends GlobalOptions {
  /** Database URL override */
  url?: string;
  /** Schema override */
  schema?: string;
  /** Force operation without confirmation */
  force?: boolean;
  /** Dry run mode */
  dryRun?: boolean;
}

export interface TestCommandOptions extends GlobalOptions {
  /** Test pattern to match */
  pattern?: string;
  /** Run tests in watch mode */
  watch?: boolean;
  /** Generate coverage report */
  coverage?: boolean;
  /** Test timeout in milliseconds */
  timeout?: number;
  /** Number of test workers */
  workers?: number;
}

// Validation schemas (for runtime validation with zod)
export type ConfigValidationSchema = CLIConfig;
export type AuthTokenValidationSchema = AuthTokens;
export type CommandResultValidationSchema = CommandResult;