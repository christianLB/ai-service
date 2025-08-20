import { PrismaClient } from '@prisma/client';
import { Logger } from '../utils/logger';

const logger = new Logger('TradingPrismaClient');

// Global prisma instance to avoid creating multiple connections
let prisma: PrismaClient;

declare global {
  // eslint-disable-next-line no-var
  var __trading_prisma: PrismaClient | undefined;
}

if (process.env.NODE_ENV === 'production') {
  prisma = new PrismaClient({
    datasources: {
      db: {
        url: process.env.DATABASE_URL || 'postgresql://trading_user:trading_secure_2025@localhost:5436/trading_db',
      },
    },
    log: [
      {
        emit: 'event',
        level: 'query',
      },
      {
        emit: 'event',
        level: 'error',
      },
      {
        emit: 'event',
        level: 'info',
      },
      {
        emit: 'event',
        level: 'warn',
      },
    ],
  });
} else {
  // In development, use a global variable to preserve the instance across hot reloads
  if (!global.__trading_prisma) {
    global.__trading_prisma = new PrismaClient({
      datasources: {
        db: {
          url: process.env.DATABASE_URL || 'postgresql://trading_user:trading_secure_2025@localhost:5436/trading_db',
        },
      },
      log: [
        {
          emit: 'event',
          level: 'query',
        },
        {
          emit: 'event',
          level: 'error',
        },
        {
          emit: 'event',
          level: 'info',
        },
        {
          emit: 'event',
          level: 'warn',
        },
      ],
    });
  }
  prisma = global.__trading_prisma;
}

// Event listeners commented out - not compatible with Prisma 5+
// prisma.$on('query', (e: any) => {
//   if (process.env.LOG_QUERIES === 'true') {
//     logger.debug('Query executed', {
//       query: e.query,
//       params: e.params,
//       duration: `${e.duration}ms`,
//     });
//   }
// });

// prisma.$on('error', (e: any) => {
//   logger.error('Prisma error', {
//     message: e.message,
//     target: e.target,
//   });
// });

// prisma.$on('info', (e: any) => {
//   logger.info('Prisma info', {
//     message: e.message,
//     target: e.target,
//   });
// });

// prisma.$on('warn', (e: any) => {
//   logger.warn('Prisma warning', {
//     message: e.message,
//     target: e.target,
//   });
// });

// Graceful shutdown
async function gracefulShutdown() {
  logger.info('Disconnecting from trading database...');
  await prisma.$disconnect();
  logger.info('Disconnected from trading database');
}

process.on('SIGINT', gracefulShutdown);
process.on('SIGTERM', gracefulShutdown);
process.on('beforeExit', gracefulShutdown);

// Health check function
export async function checkDatabaseHealth(): Promise<{ connected: boolean; latency?: number; error?: string }> {
  try {
    const start = Date.now();
    await prisma.$queryRaw`SELECT 1`;
    const latency = Date.now() - start;
    
    return { connected: true, latency };
  } catch (error) {
    logger.error('Database health check failed', error);
    return { 
      connected: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

// Database migration check
export async function checkPendingMigrations(): Promise<{ hasPending: boolean; migrations?: string[] }> {
  try {
    // This would need to be implemented based on your migration strategy
    // For now, return no pending migrations
    return { hasPending: false, migrations: [] };
  } catch (error) {
    logger.error('Failed to check pending migrations', error);
    return { hasPending: false, migrations: [] };
  }
}

// Export the configured prisma instance
export { prisma as tradingPrisma };
export default prisma;