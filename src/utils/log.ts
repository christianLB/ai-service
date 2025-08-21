import * as fs from 'fs';
import { createLogger, format, transports } from 'winston';

// Solo crear directorio y archivo de logs si no estamos en Docker
const isDocker = process.env.DOCKER_ENV === 'true' || fs.existsSync('/.dockerenv');
const logTransports: any[] = [
  new transports.Console({
    format: format.combine(
      format.colorize(),
      format.timestamp(),
      format.printf(({ timestamp, level, message }) => `${timestamp} [${level}] ${message}`)
    ),
  }),
];

// Solo agregar archivo de logs si no estamos en Docker o si el directorio existe
if (!isDocker) {
  const logDir = 'logs';
  try {
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir);
    }
    logTransports.push(new transports.File({ filename: `${logDir}/ai.log` }));
  } catch (error) {
    console.error('Warning: Could not create logs directory:', error);
  }
}

export const logger = createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: format.combine(
    format.timestamp(),
    format.errors({ stack: true }),
    format.splat(),
    format.json()
  ),
  transports: logTransports,
});
