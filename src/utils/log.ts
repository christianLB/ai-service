import * as fs from 'fs';
import { createLogger, format, transports } from 'winston';

const logDir = 'logs';
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir);
}

export const logger = createLogger({
  level: 'info',
  format: format.combine(
    format.timestamp(),
    format.printf(({ timestamp, level, message }) => `${timestamp} [${level}] ${message}`)
  ),
  transports: [
    new transports.Console(),
    new transports.File({ filename: `${logDir}/ai.log` })
  ]
});

