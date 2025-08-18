/**
 * FORENSIC LOGGER - Captura TODOS los logs y errores ocultos
 * Creado: 2025-07-08
 * Propósito: Interceptar y registrar todos los errores silenciados
 */

// Lazy load logger to avoid circular dependencies
let logger: any;
import * as fs from 'fs';
import * as path from 'path';
import { format } from 'date-fns';

interface ForensicEntry {
  timestamp: Date;
  type: 'error' | 'warning' | 'silent_catch' | 'unhandled' | 'promise_rejection' | 'event_error';
  location: string;
  message: string;
  stack?: string;
  metadata?: any;
}

class ForensicLogger {
  private entries: ForensicEntry[] = [];
  private logFile: string = '/dev/null';
  private originalConsoleError: typeof console.error = console.error;
  private originalConsoleWarn: typeof console.warn = console.warn;
  private interceptedCatches: Set<string> = new Set();
  private enabled: boolean = true;

  constructor() {
    // Disable in production to avoid permission issues
    if (process.env.NODE_ENV === 'production') {
      this.enabled = false;
      this.logFile = '/dev/null';
      return;
    }
    // En producción, usar /app/logs, en desarrollo usar process.cwd()
    const baseDir = process.env.NODE_ENV === 'production' ? '/app' : process.cwd();
    const logsDir = path.join(baseDir, 'logs', 'forensic');

    try {
      if (!fs.existsSync(logsDir)) {
        fs.mkdirSync(logsDir, { recursive: true });
      }
      this.logFile = path.join(
        logsDir,
        `forensic-${format(new Date(), 'yyyy-MM-dd-HH-mm-ss')}.log`
      );
    } catch (error: any) {
      // Si no podemos crear el directorio de logs, usar /tmp
      console.warn('Cannot create forensic logs directory, using /tmp:', error.message);
      this.logFile = path.join('/tmp', `forensic-${format(new Date(), 'yyyy-MM-dd-HH-mm-ss')}.log`);
    }

    // Guardar referencias originales
    this.originalConsoleError = console.error;
    this.originalConsoleWarn = console.warn;

    this.setupInterceptors();
    this.setupGlobalHandlers();
  }

  private setupInterceptors(): void {
    // Interceptar console.error
    console.error = (...args: any[]) => {
      this.captureLog('error', 'console.error', args);
      this.originalConsoleError.apply(console, args);
    };

    // Interceptar console.warn
    console.warn = (...args: any[]) => {
      this.captureLog('warning', 'console.warn', args);
      this.originalConsoleWarn.apply(console, args);
    };

    // Interceptar winston logger silencioso - lazy load
    setTimeout(() => {
      try {
        if (!logger) {
          logger = require('./log').logger;
        }
        if (logger && logger.error) {
          const originalLoggerError = logger.error.bind(logger);
          logger.error = (message: any, ...meta: any[]) => {
            this.captureLog('error', 'winston.error', [message, ...meta]);
            return originalLoggerError(message, ...meta);
          };
        }
      } catch (error) {
        // Silently ignore if logger is not available
      }
    }, 100);
  }

  private setupGlobalHandlers(): void {
    // Capturar errores no manejados
    process.on('uncaughtException', (error: Error) => {
      this.addEntry({
        timestamp: new Date(),
        type: 'unhandled',
        location: 'process.uncaughtException',
        message: error.message,
        stack: error.stack,
        metadata: { fatal: true },
      });
      this.flush();
      // Re-lanzar para no alterar el comportamiento
      throw error;
    });

    // Capturar promesas rechazadas
    process.on('unhandledRejection', (reason: any, promise: Promise<any>) => {
      this.addEntry({
        timestamp: new Date(),
        type: 'promise_rejection',
        location: 'process.unhandledRejection',
        message: reason?.message || String(reason),
        stack: reason?.stack,
        metadata: { promise: promise.toString() },
      });
    });

    // Capturar warnings del proceso
    process.on('warning', (warning: Error) => {
      this.addEntry({
        timestamp: new Date(),
        type: 'warning',
        location: 'process.warning',
        message: warning.message,
        stack: warning.stack,
      });
    });
  }

  private captureLog(type: 'error' | 'warning', source: string, args: any[]): void {
    const entry: ForensicEntry = {
      timestamp: new Date(),
      type: type,
      location: source,
      message: args
        .map((arg) => {
          if (typeof arg === 'object') {
            try {
              return JSON.stringify(arg, null, 2);
            } catch {
              return String(arg);
            }
          }
          return String(arg);
        })
        .join(' '),
      metadata: { args },
    };

    // Intentar capturar el stack trace
    const stack = new Error().stack;
    if (stack) {
      const lines = stack.split('\n');
      // Buscar la línea que no sea de este archivo
      const callerLine = lines.find(
        (line) =>
          (!line.includes('forensic-logger') &&
            !line.includes('console.') &&
            line.includes('.ts')) ||
          line.includes('.js')
      );
      if (callerLine) {
        entry.metadata.caller = callerLine.trim();
      }
    }

    this.addEntry(entry);
  }

  addEntry(entry: ForensicEntry): void {
    if (!this.enabled) {
      return;
    }

    this.entries.push(entry);

    // Escribir inmediatamente al archivo
    const logLine =
      `[${entry.timestamp.toISOString()}] ${entry.type.toUpperCase()} @ ${entry.location}\n` +
      `Message: ${entry.message}\n` +
      (entry.stack ? `Stack: ${entry.stack}\n` : '') +
      (entry.metadata ? `Metadata: ${JSON.stringify(entry.metadata, null, 2)}\n` : '') +
      '---\n';

    try {
      fs.appendFileSync(this.logFile, logLine);
    } catch (error) {
      // Ignore file write errors
    }
  }

  // Método para auditar try-catch específicos
  auditCatch(location: string, error: any, action: 'silenced' | 'logged' | 'rethrown'): void {
    const key = `${location}-${action}`;
    if (this.interceptedCatches.has(key)) {
      return;
    }

    this.interceptedCatches.add(key);
    this.addEntry({
      timestamp: new Date(),
      type: 'silent_catch',
      location: location,
      message: `Catch block ${action}: ${error?.message || error}`,
      stack: error?.stack,
      metadata: { action, errorType: error?.constructor?.name },
    });
  }

  // Obtener resumen de errores
  getSummary(): any {
    const summary = {
      totalEntries: this.entries.length,
      byType: {} as Record<string, number>,
      byLocation: {} as Record<string, number>,
      recentErrors: this.entries.slice(-10),
      silentCatches: [] as any[],
      criticalErrors: [] as any[],
    };

    this.entries.forEach((entry) => {
      // Por tipo
      summary.byType[entry.type] = (summary.byType[entry.type] || 0) + 1;

      // Por ubicación
      summary.byLocation[entry.location] = (summary.byLocation[entry.location] || 0) + 1;

      // Catches silenciosos
      if (entry.type === 'silent_catch') {
        summary.silentCatches.push(entry);
      }

      // Errores críticos
      if (entry.type === 'unhandled' || entry.metadata?.fatal) {
        summary.criticalErrors.push(entry);
      }
    });

    return summary;
  }

  // Guardar todos los logs pendientes
  flush(): void {
    // Don't flush if disabled or using /dev/null
    if (!this.enabled || this.logFile === '/dev/null') {
      return;
    }

    try {
      const summary = this.getSummary();
      const summaryFile = path.join(path.dirname(this.logFile), 'forensic-summary.json');
      fs.writeFileSync(summaryFile, JSON.stringify(summary, null, 2));
    } catch (error) {
      // Silently ignore flush errors in production
      if (process.env.NODE_ENV !== 'production') {
        console.warn('Failed to flush forensic logger:', error);
      }
    }
  }

  // Obtener el archivo de log actual
  getLogFile(): string {
    return this.logFile;
  }

  // Limpiar interceptores (para tests)
  cleanup(): void {
    console.error = this.originalConsoleError;
    console.warn = this.originalConsoleWarn;
  }
}

// Singleton global
export const forensicLogger = new ForensicLogger();

// Helper para auditar catches
export function auditCatch(
  location: string,
  error: any,
  action: 'silenced' | 'logged' | 'rethrown' = 'logged'
): void {
  forensicLogger.auditCatch(location, error, action);
}

// Comando para ver logs forenses
export function showForensicLogs(): void {
  const summary = forensicLogger.getSummary();
  // console.log('\n🔍 FORENSIC LOG SUMMARY\n');
  // console.log('📊 Statistics:');
  // console.log(`   Total entries: ${summary.totalEntries}`);
  // console.log('\n📈 By Type:');
  Object.entries(summary.byType).forEach(([type, count]) => {
    // console.log(`   ${type}: ${count}`);
  });
  // console.log('\n📍 By Location:');
  Object.entries(summary.byLocation).forEach(([loc, count]) => {
    // console.log(`   ${loc}: ${count}`);
  });

  if (summary.silentCatches.length > 0) {
    // console.log('\n🤫 SILENT CATCHES DETECTED:');
    summary.silentCatches.forEach((entry: any) => {
      // console.log(`   - ${entry.location}: ${entry.message}`);
    });
  }

  if (summary.criticalErrors.length > 0) {
    // console.log('\n🚨 CRITICAL ERRORS:');
    summary.criticalErrors.forEach((entry: any) => {
      // console.log(`   - ${entry.location}: ${entry.message}`);
    });
  }

  // console.log(`\n📁 Full log: ${forensicLogger.getLogFile()}`);
}

// Auto-flush en salida
process.on('exit', () => {
  forensicLogger.flush();
});
