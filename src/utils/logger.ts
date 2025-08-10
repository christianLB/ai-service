export class Logger {
  private context: string;

  constructor(context: string) {
    this.context = context;
  }

  private formatMessage(level: string, message: string, ...args: any[]): void {
    const timestamp = new Date().toISOString();
    // console.log(`${timestamp} [${level}] [${this.context}] ${message}`, ...args);
  }

  info(message: string, ...args: any[]): void {
    this.formatMessage('info', message, ...args);
  }

  warn(message: string, ...args: any[]): void {
    this.formatMessage('warn', message, ...args);
  }

  error(message: string, error?: any, ...args: any[]): void {
    if (error) {
      this.formatMessage('error', message, error, ...args);
    } else {
      this.formatMessage('error', message, ...args);
    }
  }

  debug(message: string, ...args: any[]): void {
    if (process.env.NODE_ENV === 'development') {
      this.formatMessage('debug', message, ...args);
    }
  }
}

// Create a default logger instance
const logger = new Logger('App');
export default logger;
export { logger };