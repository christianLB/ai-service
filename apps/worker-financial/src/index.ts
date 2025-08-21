import express from "express";
import cors from "cors";
import helmet from "helmet";
import Redis from "ioredis";
import { env } from "@ai/config";
// @ts-ignore - package built locally
import { createStandardObservability } from "@ai/observability";
import { FinancialQueueWorker } from "./queue-worker";

// Redis client (for BullMQ)
const redis = new Redis(env.REDIS_URL);

// Initialize Financial Queue Worker
const financialWorker = new FinancialQueueWorker();

// Create observability setup
const observability = createStandardObservability({
  serviceName: 'worker-financial',
  version: process.env.npm_package_version,
  environment: process.env.NODE_ENV,
  dependencies: {
    redis: { url: env.REDIS_URL }
  }
});

const { metricsRegistry } = observability;

// Create business-specific metrics for Financial Worker
const jobsProcessed = metricsRegistry!.createCounter(
  'jobs_processed_total',
  'Total number of jobs processed',
  ['job_type', 'status']
);

const jobProcessingTime = metricsRegistry!.createHistogram(
  'job_processing_seconds',
  'Time taken to process jobs',
  ['job_type'],
  [0.1, 0.5, 1, 5, 10, 30, 60, 300, 600]
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

const jobRetries = metricsRegistry!.createCounter(
  'job_retries_total',
  'Total number of job retries',
  ['job_type', 'reason']
);

const transactionAnalysis = metricsRegistry!.createCounter(
  'transaction_analysis_total',
  'Total transaction analysis operations',
  ['analysis_type', 'status']
);

const reportGeneration = metricsRegistry!.createCounter(
  'report_generation_total',
  'Total report generation operations',
  ['report_type', 'status']
);

const app = express();
app.use(helmet());
app.use(cors());
app.use(express.json());

// Setup observability middleware
observability.setupExpress(app);

// Financial Worker endpoints with metrics

// Mock job processing endpoint
app.post("/api/worker/process-job", async (req, res) => {
  const startTime = Date.now();
  const { jobType = 'transaction_sync', jobId, data } = req.body;
  
  try {
    if (!jobId) {
      return res.status(400).json({ message: "Job ID is required" });
    }

    // Track active job
    activeJobs.inc({ job_type: jobType });
    
    try {
      // Simulate job processing time based on job type
      let processingTime = 1000; // Default 1 second
      
      switch (jobType) {
        case 'transaction_sync':
          processingTime = Math.random() * 5000 + 1000; // 1-6 seconds
          break;
        case 'report_generation':
          processingTime = Math.random() * 30000 + 5000; // 5-35 seconds
          break;
        case 'transaction_analysis':
          processingTime = Math.random() * 10000 + 2000; // 2-12 seconds
          break;
        case 'account_reconciliation':
          processingTime = Math.random() * 15000 + 3000; // 3-18 seconds
          break;
      }
      
      await new Promise(resolve => setTimeout(resolve, processingTime));
      
      // Simulate occasional job failures
      const shouldFail = Math.random() < 0.05; // 5% failure rate
      if (shouldFail) {
        throw new Error(`Job ${jobType} failed during processing`);
      }
      
      const result = {
        jobId,
        jobType,
        status: 'completed',
        processingTime: `${(processingTime / 1000).toFixed(2)}s`,
        result: `Processed ${jobType} successfully`,
        timestamp: new Date().toISOString()
      };
      
      // Record metrics
      jobsProcessed.inc({ job_type: jobType, status: 'success' });
      
      const duration = (Date.now() - startTime) / 1000;
      jobProcessingTime.observe({ job_type: jobType }, duration);
      
      // Record specific metrics based on job type
      if (jobType === 'transaction_analysis') {
        transactionAnalysis.inc({ analysis_type: 'categorization', status: 'success' });
      } else if (jobType === 'report_generation') {
        reportGeneration.inc({ report_type: 'monthly_summary', status: 'success' });
      }
      
      res.json(result);
    } finally {
      activeJobs.dec({ job_type: jobType });
    }
  } catch (err) {
    activeJobs.dec({ job_type: jobType });
    jobsProcessed.inc({ job_type: jobType, status: 'error' });
    
    // Simulate retry logic
    const shouldRetry = Math.random() < 0.8; // 80% retry rate
    if (shouldRetry) {
      jobRetries.inc({ job_type: jobType, reason: 'processing_error' });
    }
    
    res.status(500).json({ message: (err as Error).message });
  }
});

// Queue management endpoint - now using real BullMQ data
app.get("/api/worker/queue-status", async (req, res) => {
  try {
    const stats = await financialWorker.getQueueStats();
    
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
    await financialWorker.pauseAllQueues();
    res.json({ message: "All financial queues paused", timestamp: new Date().toISOString() });
  } catch (err) {
    res.status(500).json({ message: (err as Error).message });
  }
});

// Resume queues endpoint
app.post("/api/worker/resume", async (req, res) => {
  try {
    await financialWorker.resumeAllQueues();
    res.json({ message: "All financial queues resumed", timestamp: new Date().toISOString() });
  } catch (err) {
    res.status(500).json({ message: (err as Error).message });
  }
});

// Batch job processing endpoint
app.post("/api/worker/process-batch", async (req, res) => {
  const startTime = Date.now();
  const { jobs = [] } = req.body;
  
  try {
    if (!Array.isArray(jobs) || jobs.length === 0) {
      return res.status(400).json({ message: "Jobs array is required" });
    }

    const results = [];
    
    for (const job of jobs) {
      const { jobType = 'transaction_sync', jobId, data } = job;
      
      activeJobs.inc({ job_type: jobType });
      
      try {
        // Simulate processing
        const processingTime = Math.random() * 2000 + 500; // 0.5-2.5 seconds per job
        await new Promise(resolve => setTimeout(resolve, processingTime));
        
        jobsProcessed.inc({ job_type: jobType, status: 'success' });
        jobProcessingTime.observe({ job_type: jobType }, processingTime / 1000);
        
        results.push({
          jobId,
          jobType,
          status: 'completed',
          processingTime: `${(processingTime / 1000).toFixed(2)}s`
        });
      } catch (err) {
        jobsProcessed.inc({ job_type: jobType, status: 'error' });
        results.push({
          jobId,
          jobType,
          status: 'failed',
          error: (err as Error).message
        });
      } finally {
        activeJobs.dec({ job_type: jobType });
      }
    }
    
    const totalDuration = (Date.now() - startTime) / 1000;
    
    res.json({
      batchId: `batch_${Date.now()}`,
      totalJobs: jobs.length,
      completed: results.filter(r => r.status === 'completed').length,
      failed: results.filter(r => r.status === 'failed').length,
      totalProcessingTime: `${totalDuration.toFixed(2)}s`,
      results,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    res.status(500).json({ message: (err as Error).message });
  }
});

// Function to simulate background job processing and update metrics
async function updateWorkerMetrics() {
  try {
    // Simulate background job processing
    const jobTypes = ['transaction_sync', 'report_generation', 'transaction_analysis', 'account_reconciliation'];
    
    // Random job processing
    if (Math.random() < 0.4) { // 40% chance
      const jobType = jobTypes[Math.floor(Math.random() * jobTypes.length)];
      const shouldSucceed = Math.random() < 0.95; // 95% success rate
      
      jobsProcessed.inc({ job_type: jobType, status: shouldSucceed ? 'success' : 'error' });
      
      // Simulate processing time
      const processingTime = Math.random() * 5 + 1; // 1-6 seconds
      jobProcessingTime.observe({ job_type: jobType }, processingTime);
      
      if (jobType === 'transaction_analysis') {
        transactionAnalysis.inc({ 
          analysis_type: ['categorization', 'fraud_detection', 'duplicate_detection'][Math.floor(Math.random() * 3)],
          status: shouldSucceed ? 'success' : 'error'
        });
      } else if (jobType === 'report_generation') {
        reportGeneration.inc({ 
          report_type: ['monthly_summary', 'tax_report', 'cash_flow'][Math.floor(Math.random() * 3)],
          status: shouldSucceed ? 'success' : 'error'
        });
      }
      
      if (!shouldSucceed) {
        jobRetries.inc({ 
          job_type: jobType, 
          reason: ['timeout', 'processing_error', 'data_error'][Math.floor(Math.random() * 3)]
        });
      }
    }
    
    // Update active jobs randomly
    const activeJobCounts = {
      'transaction_sync': Math.floor(Math.random() * 5),
      'report_generation': Math.floor(Math.random() * 2),
      'transaction_analysis': Math.floor(Math.random() * 3),
      'account_reconciliation': Math.floor(Math.random() * 1)
    };
    
    activeJobs.reset();
    Object.entries(activeJobCounts).forEach(([jobType, count]) => {
      activeJobs.set({ job_type: jobType }, count);
    });
  } catch (error) {
    console.error('Failed to update worker metrics:', error);
  }
}

// Update worker metrics every 10 seconds
setInterval(updateWorkerMetrics, 10000);
// Initial update
updateWorkerMetrics();

const port = Number(process.env.PORT ?? 3101);

// Initialize financial worker and start server
async function startServer() {
  try {
    console.log('🚀 Starting Financial Worker Service...');
    
    // Initialize the financial queue worker
    await financialWorker.initialize();
    
    // Start the Express server
    app.listen(port, () => {
      console.log(`✅ [worker-financial] listening on :${port}`);
      console.log(`📊 Queue management available at http://localhost:${port}/api/worker/queue-status`);
      console.log(`📅 Recurring jobs scheduled for financial operations`);
    });
    
    // Graceful shutdown
    process.on('SIGTERM', async () => {
      console.log('🛑 SIGTERM received, shutting down gracefully...');
      await financialWorker.shutdown();
      process.exit(0);
    });
    
    process.on('SIGINT', async () => {
      console.log('🛑 SIGINT received, shutting down gracefully...');
      await financialWorker.shutdown();
      process.exit(0);
    });
    
  } catch (error) {
    console.error('❌ Failed to start Financial Worker Service:', error);
    process.exit(1);
  }
}

startServer();
