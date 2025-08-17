import express from "express";
import cors from "cors";
import helmet from "helmet";
import Redis from "ioredis";
import { env } from "@ai/config";
// @ts-ignore - package built locally
import { createStandardObservability } from "@ai/observability";

// Redis client (ai orchestration could use queues/cache)
const redis = new Redis(env.REDIS_URL);

// Create observability setup
const observability = createStandardObservability({
  serviceName: 'ai-core',
  version: process.env.npm_package_version,
  environment: process.env.NODE_ENV,
  dependencies: {
    redis: { url: env.REDIS_URL }
  }
});

const { metricsRegistry } = observability;

// Create business-specific metrics for AI Core Service
const modelInferences = metricsRegistry!.createCounter(
  'model_inferences_total',
  'Total number of model inferences',
  ['model', 'provider', 'status']
);

const inferenceLatency = metricsRegistry!.createHistogram(
  'inference_latency_seconds',
  'Latency of model inference requests',
  ['model', 'provider'],
  [0.01, 0.05, 0.1, 0.5, 1, 2, 5, 10, 30]
);

const documentsProcessed = metricsRegistry!.createCounter(
  'documents_processed_total',
  'Total number of documents processed',
  ['document_type', 'operation', 'status']
);

const documentProcessingTime = metricsRegistry!.createHistogram(
  'document_processing_seconds',
  'Time taken to process documents',
  ['document_type', 'operation'],
  [0.1, 0.5, 1, 5, 10, 30, 60, 300]
);

const activePrompts = metricsRegistry!.createGauge(
  'active_prompts_total',
  'Number of active prompt executions',
  ['model', 'provider']
);

const tokenUsage = metricsRegistry!.createCounter(
  'tokens_consumed_total',
  'Total tokens consumed by provider',
  ['provider', 'model', 'type']
);

const embeddingOperations = metricsRegistry!.createCounter(
  'embedding_operations_total',
  'Total embedding operations',
  ['provider', 'model', 'status']
);

const app = express();
app.use(helmet());
app.use(cors());
app.use(express.json());

// Setup observability middleware
observability.setupExpress(app);

// Add health endpoints directly
app.get('/health', (_req, res) => {
  res.json({ status: 'healthy', service: 'ai-core' });
});

app.get('/health/live', (_req, res) => {
  res.json({ ok: true });
});

app.get('/health/ready', async (_req, res) => {
  try {
    // Check redis connection
    await redis.ping();
    res.json({ ok: true });
  } catch (error) {
    res.status(503).json({ ok: false, error: 'Redis not ready' });
  }
});

app.get('/metrics', (_req, res) => {
  res.type('text/plain; version=0.0.4');
  res.send(`# HELP service_info Service information
# TYPE service_info gauge
service_info{service="ai-core"} 1
`);
});

// AI Core endpoints with metrics

// Mock inference endpoint
app.post("/api/ai/inference", async (req, res) => {
  const startTime = Date.now();
  const { model = 'gpt-3.5-turbo', provider = 'openai', prompt, temperature = 0.7 } = req.body;
  
  try {
    if (!prompt) {
      return res.status(400).json({ message: "Prompt is required" });
    }

    // Track active prompt
    activePrompts.inc({ model, provider });
    
    try {
      // Simulate inference processing time
      const processingTime = Math.random() * 2000 + 500; // 0.5-2.5 seconds
      await new Promise(resolve => setTimeout(resolve, processingTime));
      
      // Mock response
      const response = {
        model,
        provider,
        response: `AI response to: ${prompt.substring(0, 50)}...`,
        tokensUsed: {
          prompt: prompt.length / 4, // Rough estimate
          completion: Math.floor(Math.random() * 500) + 100,
          total: 0
        },
        timestamp: new Date().toISOString()
      };
      
      response.tokensUsed.total = response.tokensUsed.prompt + response.tokensUsed.completion;
      
      // Record metrics
      modelInferences.inc({ model, provider, status: 'success' });
      tokenUsage.inc({ provider, model, type: 'prompt' }, response.tokensUsed.prompt);
      tokenUsage.inc({ provider, model, type: 'completion' }, response.tokensUsed.completion);
      
      const latency = (Date.now() - startTime) / 1000;
      inferenceLatency.observe({ model, provider }, latency);
      
      res.json(response);
    } finally {
      activePrompts.dec({ model, provider });
    }
  } catch (err) {
    activePrompts.dec({ model, provider });
    modelInferences.inc({ model, provider, status: 'error' });
    
    res.status(500).json({ message: (err as Error).message });
  }
});

// Mock document processing endpoint
app.post("/api/ai/process-document", async (req, res) => {
  const startTime = Date.now();
  const { documentType = 'pdf', operation = 'extract_text', content } = req.body;
  
  try {
    if (!content) {
      return res.status(400).json({ message: "Document content is required" });
    }

    // Simulate document processing
    const processingTime = Math.random() * 5000 + 1000; // 1-6 seconds
    await new Promise(resolve => setTimeout(resolve, processingTime));
    
    const result = {
      documentType,
      operation,
      extractedText: `Processed content from ${documentType} document...`,
      metadata: {
        pages: Math.floor(Math.random() * 20) + 1,
        words: Math.floor(Math.random() * 5000) + 100
      },
      timestamp: new Date().toISOString()
    };
    
    // Record metrics
    documentsProcessed.inc({ document_type: documentType, operation, status: 'success' });
    
    const duration = (Date.now() - startTime) / 1000;
    documentProcessingTime.observe({ document_type: documentType, operation }, duration);
    
    res.json(result);
  } catch (err) {
    documentsProcessed.inc({ document_type: documentType, operation, status: 'error' });
    
    res.status(500).json({ message: (err as Error).message });
  }
});

// Mock embeddings endpoint
app.post("/api/ai/embeddings", async (req, res) => {
  const startTime = Date.now();
  const { text, model = 'text-embedding-ada-002', provider = 'openai' } = req.body;
  
  try {
    if (!text) {
      return res.status(400).json({ message: "Text is required" });
    }

    // Simulate embedding generation
    const processingTime = Math.random() * 1000 + 200; // 200ms-1.2s
    await new Promise(resolve => setTimeout(resolve, processingTime));
    
    // Generate mock embedding (1536 dimensions for ada-002)
    const embedding = Array.from({ length: 1536 }, () => Math.random() * 2 - 1);
    
    const result = {
      provider,
      model,
      embedding,
      usage: {
        tokens: Math.ceil(text.length / 4)
      },
      timestamp: new Date().toISOString()
    };
    
    // Record metrics
    embeddingOperations.inc({ provider, model, status: 'success' });
    tokenUsage.inc({ provider, model, type: 'embedding' }, result.usage.tokens);
    
    res.json(result);
  } catch (err) {
    embeddingOperations.inc({ provider, model, status: 'error' });
    
    res.status(500).json({ message: (err as Error).message });
  }
});

// Function to simulate AI operations and update metrics
async function updateAIMetrics() {
  try {
    // Simulate periodic AI operations
    const providers = ['openai', 'anthropic', 'cohere'];
    const models = ['gpt-3.5-turbo', 'gpt-4', 'claude-2', 'command'];
    const docTypes = ['pdf', 'docx', 'txt', 'html'];
    
    // Random background operations
    if (Math.random() < 0.2) { // 20% chance
      const provider = providers[Math.floor(Math.random() * providers.length)];
      const model = models[Math.floor(Math.random() * models.length)];
      const docType = docTypes[Math.floor(Math.random() * docTypes.length)];
      
      // Simulate background document processing
      documentsProcessed.inc({ 
        document_type: docType, 
        operation: 'background_analysis', 
        status: 'success' 
      });
      
      // Simulate background inference
      modelInferences.inc({ model, provider, status: 'success' });
      tokenUsage.inc({ provider, model, type: 'completion' }, Math.floor(Math.random() * 100) + 50);
    }
  } catch (error) {
    console.error('Failed to update AI metrics:', error);
  }
}

// Update AI metrics every 15 seconds
setInterval(updateAIMetrics, 15000);
// Initial update
updateAIMetrics();

const port = Number(process.env.PORT ?? 3004);
app.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`[ai-core] listening on :${port}`);
});
