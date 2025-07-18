import winston from 'winston';
import config from '../config';

// Custom format for development
const devFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    const metaStr = Object.keys(meta).length ? JSON.stringify(meta, null, 2) : '';
    return `${timestamp} [${level}]: ${message} ${metaStr}`;
  })
);

// JSON format for production
const prodFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.json()
);

// Create logger instance
const logger = winston.createLogger({
  level: config.logging.level,
  format: config.logging.format === 'json' ? prodFormat : devFormat,
  defaultMeta: { service: 'mcp-bridge' },
  transports: [
    new winston.transports.Console(),
    // Add file transport for production
    ...(config.server.environment === 'production' 
      ? [new winston.transports.File({ filename: 'logs/mcp-bridge.log' })]
      : [])
  ],
});

// Helper functions for structured logging
export const logRequest = (method: string, path: string, meta?: any) => {
  logger.info(`HTTP ${method} ${path}`, { type: 'request', ...meta });
};

export const logToolExecution = (toolName: string, duration: number, success: boolean, meta?: any) => {
  logger.info(`Tool execution: ${toolName}`, {
    type: 'tool_execution',
    tool: toolName,
    duration_ms: duration,
    success,
    ...meta
  });
};

export const logError = (error: Error, context?: any) => {
  logger.error(error.message, {
    type: 'error',
    stack: error.stack,
    ...context
  });
};

export default logger;