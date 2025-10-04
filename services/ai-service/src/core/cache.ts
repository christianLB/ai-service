import { Redis } from 'ioredis';
import { createHash } from 'crypto';

let redis: Redis | null = null;

export function initializeCache(): void {
  const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
  
  try {
    redis = new Redis(redisUrl, {
      maxRetriesPerRequest: 3,
      enableReadyCheck: true,
      lazyConnect: false
    });
    
    redis.on('error', (error) => {
      console.error('Redis error:', error);
    });
    
    redis.on('connect', () => {
      console.log('Connected to Redis cache');
    });
  } catch (error) {
    console.error('Failed to initialize Redis cache:', error);
    redis = null;
  }
}

export async function cached<T>(
  key: string,
  ttlSeconds: number,
  fn: () => Promise<T>
): Promise<T> {
  if (!redis) {
    return fn();
  }
  
  try {
    const cached = await redis.get(key);
    if (cached) {
      console.log(`Cache hit: ${key}`);
      return JSON.parse(cached);
    }
  } catch (error) {
    console.warn('Cache get error:', error);
  }
  
  const value = await fn();
  
  try {
    await redis.set(
      key,
      JSON.stringify(value),
      'EX',
      ttlSeconds
    );
    console.log(`Cache set: ${key} (TTL: ${ttlSeconds}s)`);
  } catch (error) {
    console.warn('Cache set error:', error);
  }
  
  return value;
}

export function createCacheKey(
  prefix: string,
  data: any,
  options?: any
): string {
  const hash = createHash('sha256');
  hash.update(JSON.stringify({ data, options }));
  return `${prefix}:${hash.digest('hex')}`;
}

export async function invalidateCache(pattern: string): Promise<number> {
  if (!redis) {
    return 0;
  }
  
  try {
    const keys = await redis.keys(pattern);
    if (keys.length > 0) {
      return await redis.del(...keys);
    }
    return 0;
  } catch (error) {
    console.error('Cache invalidation error:', error);
    return 0;
  }
}

export async function getCacheStats(): Promise<{
  connected: boolean;
  keys: number;
  memory: string;
}> {
  if (!redis) {
    return {
      connected: false,
      keys: 0,
      memory: '0'
    };
  }
  
  try {
    const info = await redis.info('memory');
    const keyCount = await redis.dbsize();
    const memoryMatch = info.match(/used_memory_human:([^\r\n]+)/);
    
    return {
      connected: true,
      keys: keyCount,
      memory: memoryMatch ? memoryMatch[1] : 'unknown'
    };
  } catch (error) {
    console.error('Failed to get cache stats:', error);
    return {
      connected: false,
      keys: 0,
      memory: '0'
    };
  }
}

// Batch processing queue
const batchQueues = new Map<string, { items: any[]; timer: NodeJS.Timeout }>();

export async function addToBatch<T>(
  queueName: string,
  item: any,
  batchSize: number,
  batchDelayMs: number,
  processor: (items: any[]) => Promise<T[]>
): Promise<T> {
  return new Promise((resolve, reject) => {
    let queue = batchQueues.get(queueName);
    
    if (!queue) {
      queue = {
        items: [],
        timer: setTimeout(() => {
          processBatch(queueName, processor);
        }, batchDelayMs)
      };
      batchQueues.set(queueName, queue);
    }
    
    queue.items.push({ item, resolve, reject });
    
    if (queue.items.length >= batchSize) {
      clearTimeout(queue.timer);
      processBatch(queueName, processor);
    }
  });
}

async function processBatch(
  queueName: string,
  processor: (items: any[]) => Promise<any[]>
): Promise<void> {
  const queue = batchQueues.get(queueName);
  if (!queue || queue.items.length === 0) {
    return;
  }
  
  batchQueues.delete(queueName);
  const { items } = queue;
  
  try {
    const inputs = items.map(i => i.item);
    const results = await processor(inputs);
    
    items.forEach((item, index) => {
      item.resolve(results[index]);
    });
  } catch (error) {
    items.forEach(item => {
      item.reject(error);
    });
  }
}

export function closeCache(): void {
  if (redis) {
    redis.disconnect();
    redis = null;
  }
}