import { FastifyInstance } from 'fastify';
import { getCacheStats } from '../core/cache';

export async function healthRoutes(app: FastifyInstance): Promise<void> {
  app.get('/health', async (_request, reply) => {
    reply.send({
      status: 'healthy',
      timestamp: new Date().toISOString()
    });
  });

  app.get('/ready', async (_request, reply) => {
    const cacheStats = await getCacheStats();
    
    const isReady = cacheStats.connected;
    
    reply
      .code(isReady ? 200 : 503)
      .send({
        ready: isReady,
        cache: cacheStats,
        timestamp: new Date().toISOString()
      });
  });

  app.get('/metrics', async (_request, reply) => {
    // TODO: Implement Prometheus metrics
    reply
      .type('text/plain')
      .send(`# HELP ai_requests_total Total number of AI requests
# TYPE ai_requests_total counter
ai_requests_total 0

# HELP ai_tokens_total Total number of tokens processed
# TYPE ai_tokens_total counter
ai_tokens_total{direction="input"} 0
ai_tokens_total{direction="output"} 0

# HELP ai_cache_hit_ratio Cache hit ratio
# TYPE ai_cache_hit_ratio gauge
ai_cache_hit_ratio 0
`);
  });
}