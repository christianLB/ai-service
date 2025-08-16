import express from "express";
import cors from "cors";
import helmet from "helmet";
import Redis from "ioredis";
import { env } from "@ai/config";
import { createStandardObservability } from "@ai/observability";
import { TradingQueueWorker } from "./queue-worker";

// Redis client (for BullMQ)
const redis = new Redis(env.REDIS_URL);

// Initialize Trading Queue Worker
const tradingWorker = new TradingQueueWorker();

// Create observability setup
const observability = createStandardObservability({
  serviceName: 'worker-trading',
  version: process.env.npm_package_version,
  environment: process.env.NODE_ENV,
  dependencies: {
    redis: { url: env.REDIS_URL }
  }
});

const { metricsRegistry } = observability;

// Create business-specific metrics for Trading Worker
const jobsProcessed = metricsRegistry!.createCounter(
  'jobs_processed_total',
  'Total number of jobs processed',
  ['job_type', 'status']
);

const jobProcessingTime = metricsRegistry!.createHistogram(
  'job_processing_seconds',
  'Time taken to process jobs',
  ['job_type'],
  [0.1, 0.5, 1, 5, 10, 30, 60, 300]
);

const queueDepth = metricsRegistry!.createGauge(
  'queue_depth',
  'Current depth of job queues',
  ['queue_name', 'priority']
);

const activeJobs = metricsRegistry!.createGauge(
  'active_jobs_total',
  'Number of currently active jobs',
  ['job_type']
);

const strategyExecutions = metricsRegistry!.createCounter(
  'strategy_executions_total',
  'Total strategy execution operations',
  ['strategy_name', 'exchange', 'status']
);

const arbitrageOpportunities = metricsRegistry!.createCounter(
  'arbitrage_opportunities_total',
  'Total arbitrage opportunities detected',
  ['exchange_pair', 'status']
);

const riskAnalysis = metricsRegistry!.createCounter(
  'risk_analysis_total',
  'Total risk analysis operations',
  ['analysis_type', 'status']
);

const app = express();
app.use(helmet());
app.use(cors());
app.use(express.json());

// Setup observability middleware
observability.setupExpress(app);

// Trading Worker endpoints with metrics

// Strategy execution job endpoint
app.post("/api/worker/execute-strategy", async (req, res) => {
  const startTime = Date.now();
  const { jobId, strategyName = 'momentum', exchange = 'binance', symbol = 'BTC/USD', parameters = {} } = req.body;
  
  try {
    if (!jobId) {
      return res.status(400).json({ message: "Job ID is required" });
    }

    // Track active job
    activeJobs.inc({ job_type: 'strategy_execution' });
    
    try {
      // Simulate strategy execution time
      const processingTime = Math.random() * 10000 + 2000; // 2-12 seconds
      await new Promise(resolve => setTimeout(resolve, processingTime));
      
      // Simulate strategy success/failure
      const shouldSucceed = Math.random() < 0.85; // 85% success rate
      if (!shouldSucceed) {
        throw new Error(`Strategy ${strategyName} failed on ${exchange}`);
      }
      
      const result = {
        jobId,
        strategyName,
        exchange,
        symbol,
        status: 'completed',
        executionTime: `${(processingTime / 1000).toFixed(2)}s`,
        profit: (Math.random() * 200 - 100).toFixed(2), // Random profit/loss
        trades: Math.floor(Math.random() * 10) + 1,
        timestamp: new Date().toISOString()
      };
      
      // Record metrics
      jobsProcessed.inc({ job_type: 'strategy_execution', status: 'success' });
      strategyExecutions.inc({ strategy_name: strategyName, exchange, status: 'success' });
      
      const duration = (Date.now() - startTime) / 1000;
      jobProcessingTime.observe({ job_type: 'strategy_execution' }, duration);
      
      res.json(result);
    } finally {
      activeJobs.dec({ job_type: 'strategy_execution' });
    }
  } catch (err) {
    activeJobs.dec({ job_type: 'strategy_execution' });
    jobsProcessed.inc({ job_type: 'strategy_execution', status: 'error' });
    strategyExecutions.inc({ strategy_name: strategyName, exchange, status: 'error' });
    
    res.status(500).json({ message: (err as Error).message });
  }
});

// Arbitrage detection job endpoint
app.post("/api/worker/detect-arbitrage", async (req, res) => {
  const startTime = Date.now();
  const { jobId, exchangePair = 'binance-coinbase', symbol = 'BTC/USD', minProfit = 0.5 } = req.body;
  
  try {
    if (!jobId) {
      return res.status(400).json({ message: "Job ID is required" });
    }

    // Track active job
    activeJobs.inc({ job_type: 'arbitrage_detection' });
    
    try {
      // Simulate arbitrage detection
      const processingTime = Math.random() * 3000 + 1000; // 1-4 seconds
      await new Promise(resolve => setTimeout(resolve, processingTime));
      
      // Simulate finding opportunities
      const opportunityFound = Math.random() < 0.3; // 30% chance of opportunity
      const profitPercentage = opportunityFound ? Math.random() * 2 + 0.5 : 0; // 0.5-2.5%
      
      const result = {
        jobId,
        exchangePair,
        symbol,
        status: 'completed',
        opportunityFound,
        profitPercentage: profitPercentage.toFixed(3),
        volume: opportunityFound ? (Math.random() * 10000 + 1000).toFixed(2) : '0',
        timestamp: new Date().toISOString()
      };
      
      // Record metrics
      jobsProcessed.inc({ job_type: 'arbitrage_detection', status: 'success' });
      arbitrageOpportunities.inc({ 
        exchange_pair: exchangePair, 
        status: opportunityFound ? 'found' : 'none' 
      });
      
      const duration = (Date.now() - startTime) / 1000;
      jobProcessingTime.observe({ job_type: 'arbitrage_detection' }, duration);
      
      res.json(result);
    } finally {
      activeJobs.dec({ job_type: 'arbitrage_detection' });
    }
  } catch (err) {
    activeJobs.dec({ job_type: 'arbitrage_detection' });
    jobsProcessed.inc({ job_type: 'arbitrage_detection', status: 'error' });
    arbitrageOpportunities.inc({ exchange_pair: exchangePair, status: 'error' });
    
    res.status(500).json({ message: (err as Error).message });
  }
});

// Risk analysis job endpoint
app.post("/api/worker/analyze-risk", async (req, res) => {
  const startTime = Date.now();
  const { jobId, analysisType = 'portfolio', portfolio = [], timeframe = '1d' } = req.body;
  
  try {
    if (!jobId) {
      return res.status(400).json({ message: "Job ID is required" });
    }

    // Track active job
    activeJobs.inc({ job_type: 'risk_analysis' });
    
    try {
      // Simulate risk analysis
      const processingTime = Math.random() * 5000 + 2000; // 2-7 seconds
      await new Promise(resolve => setTimeout(resolve, processingTime));
      
      const result = {
        jobId,
        analysisType,
        timeframe,
        riskScore: (Math.random() * 10).toFixed(2), // 0-10 risk score
        volatility: (Math.random() * 50 + 10).toFixed(2), // 10-60% volatility
        maxDrawdown: (Math.random() * 30 + 5).toFixed(2), // 5-35% max drawdown
        sharpeRatio: (Math.random() * 3).toFixed(3), // 0-3 Sharpe ratio
        recommendations: [
          'Reduce position size for high-volatility assets',
          'Consider hedging strategies',
          'Monitor correlation metrics'
        ],
        timestamp: new Date().toISOString()
      };
      
      // Record metrics
      jobsProcessed.inc({ job_type: 'risk_analysis', status: 'success' });
      riskAnalysis.inc({ analysis_type: analysisType, status: 'success' });
      
      const duration = (Date.now() - startTime) / 1000;
      jobProcessingTime.observe({ job_type: 'risk_analysis' }, duration);
      
      res.json(result);
    } finally {
      activeJobs.dec({ job_type: 'risk_analysis' });
    }
  } catch (err) {
    activeJobs.dec({ job_type: 'risk_analysis' });
    jobsProcessed.inc({ job_type: 'risk_analysis', status: 'error' });
    riskAnalysis.inc({ analysis_type: analysisType, status: 'error' });
    
    res.status(500).json({ message: (err as Error).message });
  }
});

// Queue status endpoint - now using real BullMQ data
app.get("/api/worker/queue-status", async (req, res) => {
  try {
    const stats = await tradingWorker.getQueueStats();
    
    // Update queue depth metrics for Prometheus
    queueDepth.reset();
    stats.queues.forEach(queueStat => {
      Object.entries(queueStat.counts).forEach(([status, count]) => {
        queueDepth.set({ queue_name: queueStat.queueName, priority: status }, count);
      });
    });
    
    res.json(stats);
  } catch (err) {
    res.status(500).json({ message: (err as Error).message });
  }
});

// Pause queues endpoint
app.post("/api/worker/pause", async (req, res) => {
  try {
    await tradingWorker.pauseAllQueues();
    res.json({ message: "All trading queues paused", timestamp: new Date().toISOString() });
  } catch (err) {
    res.status(500).json({ message: (err as Error).message });
  }
});

// Resume queues endpoint
app.post("/api/worker/resume", async (req, res) => {
  try {
    await tradingWorker.resumeAllQueues();
    res.json({ message: "All trading queues resumed", timestamp: new Date().toISOString() });
  } catch (err) {
    res.status(500).json({ message: (err as Error).message });
  }
});

// Function to simulate background trading operations and update metrics
async function updateTradingWorkerMetrics() {
  try {
    // Simulate background trading activities
    const jobTypes = ['strategy_execution', 'arbitrage_detection', 'risk_analysis', 'market_analysis'];
    const strategies = ['momentum', 'mean_reversion', 'breakout', 'scalping'];
    const exchanges = ['binance', 'coinbase', 'kraken', 'bitfinex'];
    const exchangePairs = ['binance-coinbase', 'kraken-bitfinex', 'binance-kraken'];
    
    // Random job processing
    if (Math.random() < 0.5) { // 50% chance
      const jobType = jobTypes[Math.floor(Math.random() * jobTypes.length)];
      const shouldSucceed = Math.random() < 0.9; // 90% success rate
      
      jobsProcessed.inc({ job_type: jobType, status: shouldSucceed ? 'success' : 'error' });
      
      // Simulate processing time
      const processingTime = Math.random() * 8 + 1; // 1-9 seconds
      jobProcessingTime.observe({ job_type: jobType }, processingTime);
      
      if (jobType === 'strategy_execution') {
        const strategy = strategies[Math.floor(Math.random() * strategies.length)];
        const exchange = exchanges[Math.floor(Math.random() * exchanges.length)];
        strategyExecutions.inc({ 
          strategy_name: strategy, 
          exchange, 
          status: shouldSucceed ? 'success' : 'error' 
        });
      } else if (jobType === 'arbitrage_detection') {
        const exchangePair = exchangePairs[Math.floor(Math.random() * exchangePairs.length)];
        const status = shouldSucceed ? (Math.random() < 0.3 ? 'found' : 'none') : 'error';
        arbitrageOpportunities.inc({ exchange_pair: exchangePair, status });
      } else if (jobType === 'risk_analysis') {
        const analysisTypes = ['portfolio', 'position', 'market'];
        const analysisType = analysisTypes[Math.floor(Math.random() * analysisTypes.length)];
        riskAnalysis.inc({ 
          analysis_type: analysisType, 
          status: shouldSucceed ? 'success' : 'error' 
        });
      }
    }
    
    // Update active jobs randomly
    const activeJobCounts = {
      'strategy_execution': Math.floor(Math.random() * 3),
      'arbitrage_detection': Math.floor(Math.random() * 5),
      'risk_analysis': Math.floor(Math.random() * 2),
      'market_analysis': Math.floor(Math.random() * 2)
    };
    
    activeJobs.reset();
    Object.entries(activeJobCounts).forEach(([jobType, count]) => {
      activeJobs.set({ job_type: jobType }, count);
    });
  } catch (error) {
    console.error('Failed to update trading worker metrics:', error);
  }
}

// Update trading worker metrics every 8 seconds
setInterval(updateTradingWorkerMetrics, 8000);
// Initial update
updateTradingWorkerMetrics();

const port = Number(process.env.PORT ?? 3102);

// Initialize trading worker and start server
async function startServer() {
  try {
    console.log('🚀 Starting Trading Worker Service...');
    
    // Initialize the trading queue worker
    await tradingWorker.initialize();
    
    // Start the Express server
    app.listen(port, () => {
      console.log(`✅ [worker-trading] listening on :${port}`);
      console.log(`📊 Queue management available at http://localhost:${port}/api/worker/queue-status`);
    });
    
    // Graceful shutdown
    process.on('SIGTERM', async () => {
      console.log('🛑 SIGTERM received, shutting down gracefully...');
      await tradingWorker.shutdown();
      process.exit(0);
    });
    
    process.on('SIGINT', async () => {
      console.log('🛑 SIGINT received, shutting down gracefully...');
      await tradingWorker.shutdown();
      process.exit(0);
    });
    
  } catch (error) {
    console.error('❌ Failed to start Trading Worker Service:', error);
    process.exit(1);
  }
}

startServer();
