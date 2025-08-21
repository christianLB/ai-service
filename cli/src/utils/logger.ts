import chalk from 'chalk';
import type { LoggingConfig } from '../types';

/**
 * Simple logger utility for CLI operations
 */
export class Logger {
  private config: LoggingConfig;

  constructor(config: LoggingConfig) {
    this.config = config;
  }

  debug(message: string, ...args: any[]): void {
    if (this.shouldLog('debug')) {
      console.log(chalk.gray(`[DEBUG] ${message}`), ...args);
    }
  }

  info(message: string, ...args: any[]): void {
    if (this.shouldLog('info')) {
      console.log(chalk.blue(`[INFO] ${message}`), ...args);
    }
  }

  success(message: string, ...args: any[]): void {
    if (this.shouldLog('info')) {
      console.log(chalk.green(`[SUCCESS] ${message}`), ...args);
    }
  }

  warn(message: string, ...args: any[]): void {
    if (this.shouldLog('warn')) {
      console.warn(chalk.yellow(`[WARN] ${message}`), ...args);
    }
  }

  error(message: string, ...args: any[]): void {
    if (this.shouldLog('error')) {
      console.error(chalk.red(`[ERROR] ${message}`), ...args);
    }
  }

  private shouldLog(level: string): boolean {
    const levels = ['debug', 'info', 'warn', 'error'];
    const currentIndex = levels.indexOf(this.config.level);
    const messageIndex = levels.indexOf(level);
    return messageIndex >= currentIndex;
  }
}

// Global logger instance (will be initialized with config)
let globalLogger: Logger;

export const initLogger = (config: LoggingConfig): void => {
  globalLogger = new Logger(config);
};

export const logger = {
  debug: (message: string, ...args: any[]) => globalLogger?.debug(message, ...args),
  info: (message: string, ...args: any[]) => globalLogger?.info(message, ...args),
  success: (message: string, ...args: any[]) => globalLogger?.success(message, ...args),
  warn: (message: string, ...args: any[]) => globalLogger?.warn(message, ...args),
  error: (message: string, ...args: any[]) => globalLogger?.error(message, ...args),
};