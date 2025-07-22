import winston from 'winston';
import { config } from '../config';

// Create logger instance
export const logger = winston.createLogger({
  level: config.logging.level,
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'mcp-local' },
  transports: [
    // Write to stderr for MCP compatibility
    new winston.transports.Console({
      stderrLevels: ['debug', 'info', 'warn', 'error'],
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      ),
    }),
  ],
});