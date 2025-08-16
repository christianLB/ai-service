import express from 'express';
import { createBullBoard } from '@bull-board/api';
import { BullAdapter } from '@bull-board/api/bullAdapter';
import { ExpressAdapter } from '@bull-board/express';
import Queue from 'bull';
import basicAuth from 'express-basic-auth';
import helmet from 'helmet';
import { env } from '@ai/config';
// @ts-ignore - package types not built yet
import { createStandardObservability } from '@ai/observability';

// Create observability setup
const observability = createStandardObservability({
  serviceName: 'bull-board',
  version: process.env.npm_package_version,
  environment: process.env.NODE_ENV,
  dependencies: {
    redis: { url: env.REDIS_URL }
  }
});

const app = express();

// Security headers with Bull Board compatibility
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"], // Bull Board requires inline styles
      scriptSrc: ["'self'", "'unsafe-inline'"], // Bull Board requires inline scripts
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'", "https:", "data:"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  crossOriginEmbedderPolicy: false, // Required for Bull Board
}));

// Setup observability middleware (health checks)
observability.setupExpress(app);

// Create queue instances for monitoring
const queues = [
  new Queue('financial-processing', env.REDIS_URL),
  new Queue('trading-strategy', env.REDIS_URL),
  new Queue('trading-fsm', env.REDIS_URL),
  new Queue('document-analysis', env.REDIS_URL),
  new Queue('transaction-sync', env.REDIS_URL),
  new Queue('account-reconciliation', env.REDIS_URL),
  new Queue('report-generation', env.REDIS_URL),
  new Queue('categorization', env.REDIS_URL),
  new Queue('strategy-execution', env.REDIS_URL),
  new Queue('arbitrage-detection', env.REDIS_URL),
  new Queue('position-monitoring', env.REDIS_URL),
  new Queue('risk-analysis', env.REDIS_URL),
];

// Create Bull Board server adapter
const serverAdapter = new ExpressAdapter();
serverAdapter.setBasePath('/admin/queues');

// Create Bull Board instance
createBullBoard({
  queues: queues.map(queue => new BullAdapter(queue)),
  serverAdapter: serverAdapter,
});

// Basic authentication for production
const authUsername = process.env.BULL_BOARD_USERNAME || 'admin';
const authPassword = process.env.BULL_BOARD_PASSWORD || 'admin123';

// Apply authentication to the Bull Board routes
app.use('/admin/queues', basicAuth({
  users: { [authUsername]: authPassword },
  challenge: true,
  realm: 'Bull Board Admin',
}) as any, serverAdapter.getRouter());

// Home page redirect
app.get('/', (req, res) => {
  res.redirect('/admin/queues');
});

// Health check endpoint (not authenticated)
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy',
    service: 'bull-board',
    timestamp: new Date().toISOString(),
    queues: queues.length
  });
});

// Queue statistics endpoint
app.get('/api/queue-stats', basicAuth({
  users: { [authUsername]: authPassword },
  challenge: true,
}) as any, async (req: any, res: any) => {
  try {
    const stats = await Promise.all(
      queues.map(async (queue) => {
        const [waiting, active, completed, failed, delayed, paused] = await Promise.all([
          queue.getWaitingCount(),
          queue.getActiveCount(),
          queue.getCompletedCount(),
          queue.getFailedCount(),
          queue.getDelayedCount(),
          queue.getPausedCount(),
        ]);

        return {
          name: queue.name,
          waiting,
          active,
          completed,
          failed,
          delayed,
          paused,
          total: waiting + active + completed + failed + delayed + paused,
        };
      })
    );

    res.json({
      timestamp: new Date().toISOString(),
      queues: stats,
      summary: {
        totalQueues: stats.length,
        totalJobs: stats.reduce((sum, q) => sum + q.total, 0),
        totalActive: stats.reduce((sum, q) => sum + q.active, 0),
        totalFailed: stats.reduce((sum, q) => sum + q.failed, 0),
      }
    });
  } catch (error) {
    res.status(500).json({ 
      error: 'Failed to fetch queue statistics',
      message: (error as Error).message 
    });
  }
});

const port = Number(process.env.PORT || 3200);

app.listen(port, () => {
  console.log(`🎯 Bull Board Dashboard running at http://localhost:${port}/admin/queues`);
  console.log(`📊 Queue statistics available at http://localhost:${port}/api/queue-stats`);
  console.log(`🔐 Authentication: ${authUsername} / [configured password]`);
});