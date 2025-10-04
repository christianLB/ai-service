import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { summarize } from '../modules/summarize';
import { classify } from '../modules/classify';
import { extract } from '../modules/extract';
import { route, executeEmbed } from '../core/router';
import { checkBudget } from '../core/policies';

// Schema definitions
const SummarizeSchema = z.object({
  input: z.union([
    z.string(),
    z.object({
      text: z.string().optional(),
      docId: z.string().optional()
    })
  ]),
  size: z.enum(['short', 'medium', 'long']).optional(),
  style: z.enum(['technical', 'executive', 'casual']).optional()
});

const ClassifySchema = z.object({
  input: z.union([
    z.string(),
    z.object({
      text: z.string().optional(),
      docId: z.string().optional()
    })
  ]),
  labels: z.array(z.string()).optional(),
  taxonomyId: z.string().optional(),
  autoTag: z.boolean().optional(),
  threshold: z.number().min(0).max(1).optional()
});

const ExtractSchema = z.object({
  input: z.union([
    z.string(),
    z.object({
      text: z.string().optional(),
      docId: z.string().optional()
    })
  ]),
  schema: z.any(),
  examples: z.array(z.any()).optional()
});

const EmbedSchema = z.object({
  input: z.union([z.string(), z.array(z.string())])
});

const AgentSchema = z.object({
  name: z.string(),
  input: z.any(),
  params: z.record(z.any()).optional(),
  tools: z.array(z.string()).optional()
});

export async function v1Routes(app: FastifyInstance): Promise<void> {
  // Middleware to extract service from headers
  app.addHook('preHandler', async (request, _reply) => {
    const service = request.headers['x-service'] as string || 'default';
    (request as any).service = service;
  });

  // POST /v1/summarize
  app.post('/v1/summarize', async (request, reply) => {
    try {
      const body = SummarizeSchema.parse(request.body);
      const service = (request as any).service;
      
      // Check budget
      const budget = await checkBudget(service, 0.001);
      if (!budget.allowed) {
        return reply.code(429).send({
          error: 'Budget exceeded',
          remaining: budget.remaining
        });
      }
      
      const result = await summarize(body as any, service);
      reply.send(result);
    } catch (error) {
      if (error instanceof z.ZodError) {
        reply.code(400).send({
          error: 'Validation error',
          details: error.errors
        });
      } else {
        console.error('Summarize error:', error);
        reply.code(500).send({
          error: 'Internal server error',
          message: (error as Error).message
        });
      }
    }
  });

  // POST /v1/classify
  app.post('/v1/classify', async (request, reply) => {
    try {
      const body = ClassifySchema.parse(request.body);
      const service = (request as any).service;
      
      // Check budget
      const budget = await checkBudget(service, 0.001);
      if (!budget.allowed) {
        return reply.code(429).send({
          error: 'Budget exceeded',
          remaining: budget.remaining
        });
      }
      
      const result = await classify(body as any, service);
      reply.send(result);
    } catch (error) {
      if (error instanceof z.ZodError) {
        reply.code(400).send({
          error: 'Validation error',
          details: error.errors
        });
      } else {
        console.error('Classify error:', error);
        reply.code(500).send({
          error: 'Internal server error',
          message: (error as Error).message
        });
      }
    }
  });

  // POST /v1/extract
  app.post('/v1/extract', async (request, reply) => {
    try {
      const body = ExtractSchema.parse(request.body);
      const service = (request as any).service;
      
      // Check budget
      const budget = await checkBudget(service, 0.002);
      if (!budget.allowed) {
        return reply.code(429).send({
          error: 'Budget exceeded',
          remaining: budget.remaining
        });
      }
      
      const result = await extract(body as any, service);
      reply.send(result);
    } catch (error) {
      if (error instanceof z.ZodError) {
        reply.code(400).send({
          error: 'Validation error',
          details: error.errors
        });
      } else {
        console.error('Extract error:', error);
        reply.code(500).send({
          error: 'Internal server error',
          message: (error as Error).message
        });
      }
    }
  });

  // POST /v1/embed
  app.post('/v1/embed', async (request, reply) => {
    try {
      const body = EmbedSchema.parse(request.body);
      const service = (request as any).service;
      
      // Check budget
      const budget = await checkBudget(service, 0.0001);
      if (!budget.allowed) {
        return reply.code(429).send({
          error: 'Budget exceeded',
          remaining: budget.remaining
        });
      }
      
      const decision = await route('embed.search', ['embed'], service);
      const result = await executeEmbed(decision, body);
      
      reply.send({
        vectors: result.vectors,
        dimensions: result.dimensions,
        provider: decision.provider,
        model: decision.model
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        reply.code(400).send({
          error: 'Validation error',
          details: error.errors
        });
      } else {
        console.error('Embed error:', error);
        reply.code(500).send({
          error: 'Internal server error',
          message: (error as Error).message
        });
      }
    }
  });

  // POST /v1/agent/run
  app.post('/v1/agent/run', async (request, reply) => {
    try {
      AgentSchema.parse(request.body);
      const service = (request as any).service;
      
      // Check budget
      const budget = await checkBudget(service, 0.005);
      if (!budget.allowed) {
        return reply.code(429).send({
          error: 'Budget exceeded',
          remaining: budget.remaining
        });
      }
      
      // TODO: Implement agent execution
      reply.send({
        result: 'Agent execution not yet implemented',
        logs: [],
        toolCalls: [],
        provider: 'openai',
        model: 'gpt-4o-mini'
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        reply.code(400).send({
          error: 'Validation error',
          details: error.errors
        });
      } else {
        console.error('Agent error:', error);
        reply.code(500).send({
          error: 'Internal server error',
          message: (error as Error).message
        });
      }
    }
  });
}