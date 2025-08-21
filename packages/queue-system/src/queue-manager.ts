import { Queue, QueueEvents, Worker, Job } from 'bullmq';
import { Redis } from 'ioredis';
import { 
  QueueName, 
  QUEUE_NAMES, 
  JobOptions, 
  JobResult, 
  ServiceEvent,
  EVENT_CHANNELS,
  TradingJobData,
  FinancialJobData
} from './types';
import { 
  createQueueConnection, 
  DEFAULT_QUEUE_CONFIG, 
  WORKER_CONFIGS,
  JOB_PRIORITIES 
} from './config';

export class QueueManager {
  private queues: Map<QueueName, Queue> = new Map();
  private queueEvents: Map<QueueName, QueueEvents> = new Map();
  private workers: Map<QueueName, Worker> = new Map();
  private redis: Redis;
  private connection: any;

  constructor(private redisUrl: string) {
    this.connection = createQueueConnection(redisUrl);
    this.redis = new Redis(redisUrl);
  }

  /**
   * Initialize all queues
   */
  async initialize(): Promise<void> {
    console.log('🚀 Initializing Queue Manager...');
    
    // Create all queues
    Object.values(QUEUE_NAMES).forEach(queueName => {
      this.createQueue(queueName);
    });

    // Setup event listeners
    this.setupEventListeners();
    
    console.log(`✅ Queue Manager initialized with ${this.queues.size} queues`);
  }

  /**
   * Create a queue
   */
  createQueue(queueName: QueueName): Queue {
    if (this.queues.has(queueName)) {
      return this.queues.get(queueName)!;
    }

    const queue = new Queue(queueName, {
      connection: this.connection,
      defaultJobOptions: {
        ...DEFAULT_QUEUE_CONFIG.defaultJobOptions,
        priority: JOB_PRIORITIES[queueName] || 5,
      },
    });

    const queueEvents = new QueueEvents(queueName, {
      connection: this.connection,
    });

    this.queues.set(queueName, queue);
    this.queueEvents.set(queueName, queueEvents);

    console.log(`📝 Created queue: ${queueName}`);
    return queue;
  }

  /**
   * Get a queue by name
   */
  getQueue(queueName: QueueName): Queue | undefined {
    return this.queues.get(queueName);
  }

  /**
   * Add a job to a queue
   */
  async addJob<T extends TradingJobData | FinancialJobData>(
    queueName: QueueName,
    jobData: T,
    options?: JobOptions
  ): Promise<Job<T>> {
    const queue = this.getQueue(queueName);
    if (!queue) {
      throw new Error(`Queue ${queueName} not found`);
    }

    const jobOptions = {
      ...options,
      priority: options?.priority || JOB_PRIORITIES[queueName],
    };

    const job = await queue.add(queueName, jobData, jobOptions);
    
    console.log(`📤 Job added to ${queueName}: ${job.id}`);
    
    // Publish event
    await this.publishEvent(EVENT_CHANNELS.WORKER_COORDINATION, {
      service: 'queue-manager',
      event: 'job_added',
      data: {
        queueName,
        jobId: job.id,
        priority: jobOptions.priority,
      },
      timestamp: new Date().toISOString(),
    });

    return job;
  }

  /**
   * Create a worker for a queue
   */
  createWorker<T extends TradingJobData | FinancialJobData>(
    queueName: QueueName,
    processor: (job: Job<T>) => Promise<JobResult>
  ): Worker<T> {
    if (this.workers.has(queueName)) {
      console.log(`⚠️ Worker for ${queueName} already exists`);
      return this.workers.get(queueName) as Worker<T>;
    }

    const workerConfig = WORKER_CONFIGS[queueName] || {};
    
    const worker: Worker<T> = new Worker<T>(
      queueName,
      async (job: Job<T>): Promise<JobResult> => {
        const startTime = Date.now();
        console.log(`🔄 Processing job ${job.id} in ${queueName}`);
        
        try {
          const result = await processor(job);
          
          const executionTime = Date.now() - startTime;
          console.log(`✅ Job ${job.id} completed in ${executionTime}ms`);
          
          // Publish completion event
          await this.publishEvent(EVENT_CHANNELS.WORKER_COORDINATION, {
            service: `worker-${queueName}`,
            event: 'job_completed',
            data: {
              queueName,
              jobId: job.id,
              executionTime,
              result,
            },
            timestamp: new Date().toISOString(),
          });
          
          return {
            ...result,
            metadata: {
              ...result.metadata,
              executionTime,
              retryCount: job.attemptsMade,
              workerInfo: {
                id: worker.id,
                version: '1.0.0',
              },
            },
          };
          
        } catch (error) {
          const executionTime = Date.now() - startTime;
          console.error(`❌ Job ${job.id} failed after ${executionTime}ms:`, error);
          
          // Publish failure event
          await this.publishEvent(EVENT_CHANNELS.WORKER_COORDINATION, {
            service: `worker-${queueName}`,
            event: 'job_failed',
            data: {
              queueName,
              jobId: job.id,
              executionTime,
              error: error instanceof Error ? error.message : String(error),
              retryCount: job.attemptsMade,
            },
            timestamp: new Date().toISOString(),
          });
          
          throw error;
        }
      },
      {
        connection: this.connection,
        concurrency: workerConfig.concurrency || 1,
        limiter: workerConfig.limiter,
      }
    );

    this.workers.set(queueName, worker as any);
    console.log(`👷 Created worker for ${queueName} (concurrency: ${workerConfig.concurrency || 1})`);
    
    return worker;
  }

  /**
   * Get queue statistics
   */
  async getQueueStats(queueName: QueueName) {
    const queue = this.getQueue(queueName);
    if (!queue) {
      throw new Error(`Queue ${queueName} not found`);
    }

    const [waiting, active, completed, failed, delayed] = await Promise.all([
      queue.getWaiting(),
      queue.getActive(),
      queue.getCompleted(),
      queue.getFailed(),
      queue.getDelayed(),
    ]);

    // Check if queue is paused
    const isPaused = await queue.isPaused();

    return {
      queueName,
      counts: {
        waiting: waiting.length,
        active: active.length,
        completed: completed.length,
        failed: failed.length,
        delayed: delayed.length,
        paused: isPaused ? 1 : 0,
      },
      jobs: {
        waiting: waiting.slice(0, 10), // Latest 10
        active: active.slice(0, 10),
        failed: failed.slice(0, 10),
      },
      isPaused,
    };
  }

  /**
   * Get all queue statistics
   */
  async getAllQueueStats() {
    const stats = await Promise.all(
      Array.from(this.queues.keys()).map(queueName => 
        this.getQueueStats(queueName)
      )
    );

    return {
      queues: stats,
      total: stats.reduce((acc, stat) => ({
        waiting: acc.waiting + stat.counts.waiting,
        active: acc.active + stat.counts.active,
        completed: acc.completed + stat.counts.completed,
        failed: acc.failed + stat.counts.failed,
        delayed: acc.delayed + stat.counts.delayed,
        paused: acc.paused + stat.counts.paused,
      }), {
        waiting: 0,
        active: 0,
        completed: 0,
        failed: 0,
        delayed: 0,
        paused: 0,
      }),
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Pause a queue
   */
  async pauseQueue(queueName: QueueName): Promise<void> {
    const queue = this.getQueue(queueName);
    if (!queue) {
      throw new Error(`Queue ${queueName} not found`);
    }

    await queue.pause();
    console.log(`⏸️ Paused queue: ${queueName}`);
  }

  /**
   * Resume a queue
   */
  async resumeQueue(queueName: QueueName): Promise<void> {
    const queue = this.getQueue(queueName);
    if (!queue) {
      throw new Error(`Queue ${queueName} not found`);
    }

    await queue.resume();
    console.log(`▶️ Resumed queue: ${queueName}`);
  }

  /**
   * Clean a queue (remove completed/failed jobs)
   */
  async cleanQueue(queueName: QueueName, grace: number = 24 * 60 * 60 * 1000): Promise<void> {
    const queue = this.getQueue(queueName);
    if (!queue) {
      throw new Error(`Queue ${queueName} not found`);
    }

    await Promise.all([
      queue.clean(grace, 100, 'completed'),
      queue.clean(grace, 50, 'failed'),
    ]);

    console.log(`🧹 Cleaned queue: ${queueName}`);
  }

  /**
   * Publish event to Redis channel
   */
  async publishEvent(channel: string, event: ServiceEvent): Promise<void> {
    await this.redis.publish(channel, JSON.stringify(event));
  }

  /**
   * Subscribe to events from Redis channel
   */
  async subscribeToEvents(
    channel: string, 
    handler: (event: ServiceEvent) => void
  ): Promise<void> {
    const subscriber = new Redis(this.redisUrl);
    await subscriber.subscribe(channel);
    
    subscriber.on('message', (receivedChannel, message) => {
      if (receivedChannel === channel) {
        try {
          const event = JSON.parse(message) as ServiceEvent;
          handler(event);
        } catch (error) {
          console.error('Failed to parse event:', error);
        }
      }
    });

    console.log(`📡 Subscribed to channel: ${channel}`);
  }

  /**
   * Setup event listeners for all queues
   */
  private setupEventListeners(): void {
    this.queueEvents.forEach((queueEvents, queueName) => {
      queueEvents.on('waiting', ({ jobId }) => {
        console.log(`⏳ Job ${jobId} is waiting in ${queueName}`);
      });

      queueEvents.on('active', ({ jobId }) => {
        console.log(`🔄 Job ${jobId} is active in ${queueName}`);
      });

      queueEvents.on('completed', ({ jobId }) => {
        console.log(`✅ Job ${jobId} completed in ${queueName}`);
      });

      queueEvents.on('failed', ({ jobId, failedReason }) => {
        console.log(`❌ Job ${jobId} failed in ${queueName}: ${failedReason}`);
      });

      queueEvents.on('stalled', ({ jobId }) => {
        console.log(`🚨 Job ${jobId} stalled in ${queueName}`);
      });
    });
  }

  /**
   * Shutdown all queues and workers
   */
  async shutdown(): Promise<void> {
    console.log('🛑 Shutting down Queue Manager...');
    
    // Close all workers
    await Promise.all(
      Array.from(this.workers.values()).map(worker => worker.close())
    );
    
    // Close all queue events
    await Promise.all(
      Array.from(this.queueEvents.values()).map(queueEvents => queueEvents.close())
    );
    
    // Close all queues
    await Promise.all(
      Array.from(this.queues.values()).map(queue => queue.close())
    );
    
    // Close Redis connection
    await this.redis.quit();
    
    console.log('✅ Queue Manager shutdown complete');
  }
}