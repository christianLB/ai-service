export class Logger {
  private context: string;

  constructor(context: string) {
    this.context = context;
  }

  info(message: string, data?: any) {
    console.log(`[${this.context}] ${message}`, data || '');
  }

  debug(message: string, data?: any) {
    if (process.env.DEBUG === 'true') {
      console.log(`[${this.context}] DEBUG: ${message}`, data || '');
    }
  }

  warn(message: string, data?: any) {
    console.warn(`[${this.context}] WARN: ${message}`, data || '');
  }

  error(message: string, error?: any) {
    console.error(`[${this.context}] ERROR: ${message}`, error || '');
  }
}