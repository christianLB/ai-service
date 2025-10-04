import Fastify from 'fastify';
import cors from '@fastify/cors';
import { initializeProviders } from './core/router';
import { initializeCache } from './core/cache';
import { healthRoutes } from './routes/health';
import { v1Routes } from './routes/v1';
import { startStreamConsumer } from './services/stream-consumer';
import { VaultService } from './vault/vault.service';

const PORT = parseInt(process.env.PORT || '3000', 10);
const HOST = process.env.HOST || '0.0.0.0';

async function start(): Promise<void> {
  // Initialize Vault secrets first
  const vaultService = new VaultService();
  await vaultService.initializeVault();

  // Initialize components
  console.log('Initializing AI Service...');
  
  console.log('Initializing cache...');
  initializeCache();
  
  console.log('Initializing providers...');
  await initializeProviders();
  
  // Create Fastify instance
  const app = Fastify({
    logger: {
      level: process.env.LOG_LEVEL || 'info',
      transport: {
        target: 'pino-pretty',
        options: {
          translateTime: 'HH:MM:ss Z',
          ignore: 'pid,hostname'
        }
      }
    }
  });
  
  // Register plugins
  await app.register(cors, {
    origin: process.env.NODE_ENV === 'production' ? false : true,
    credentials: true
  });
  
  // API Key authentication
  app.addHook('onRequest', async (request, reply) => {
    // Skip auth for health endpoints
    if (request.url.startsWith('/health') || 
        request.url.startsWith('/ready') || 
        request.url.startsWith('/metrics')) {
      return;
    }
    
    const apiKey = request.headers['x-api-key'] as string;
    const allowedServices = (process.env.ALLOWED_SERVICES || 'test').split(',');
    
    if (!apiKey || !allowedServices.includes(apiKey)) {
      reply.code(401).send({ error: 'Unauthorized' });
    }
  });
  
  // Register routes
  await app.register(healthRoutes);
  await app.register(v1Routes);
  
  // Error handler
  app.setErrorHandler((error, _request, reply) => {
    app.log.error(error);
    reply.code(500).send({
      error: 'Internal Server Error',
      message: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  });
  
  // Start server
  try {
    await app.listen({ port: PORT, host: HOST });
    console.log(`AI Service listening on ${HOST}:${PORT}`);

    // Start Redis Stream consumer for Telegram messages
    startStreamConsumer().catch(err => {
      console.error('💥 [FATAL] Failed to start stream consumer:', err);
      console.error('Error details:', {
        name: err.name,
        message: err.message,
        stack: err.stack
      });
      // Don't exit - allow health checks to continue
    });
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
  
  // Graceful shutdown
  const signals = ['SIGINT', 'SIGTERM'];
  signals.forEach(signal => {
    process.on(signal, async () => {
      console.log(`Received ${signal}, shutting down gracefully...`);
      await app.close();
      process.exit(0);
    });
  });
}

// Start the service
start().catch(error => {
  console.error('Failed to start AI Service:', error);
  process.exit(1);
});