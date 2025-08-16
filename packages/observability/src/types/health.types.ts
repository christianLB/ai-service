import { z } from 'zod';

export type HealthStatus = 'healthy' | 'unhealthy' | 'degraded';

export const DependencySchema = z.object({
  name: z.string(),
  status: z.enum(['healthy', 'unhealthy', 'degraded']),
  message: z.string().optional(),
  latency: z.number().optional(),
  timestamp: z.string().datetime(),
  metadata: z.record(z.unknown()).optional(),
});

export const HealthResponseSchema = z.object({
  status: z.enum(['healthy', 'unhealthy', 'degraded']),
  timestamp: z.string().datetime(),
  uptime: z.number(),
  version: z.string().optional(),
  service: z.string(),
  environment: z.string().optional(),
  dependencies: z.array(DependencySchema).optional(),
  metadata: z.record(z.unknown()).optional(),
});

export const LivenessResponseSchema = z.object({
  alive: z.boolean(),
  timestamp: z.string().datetime(),
  uptime: z.number(),
  service: z.string(),
});

export const ReadinessResponseSchema = z.object({
  ready: z.boolean(),
  timestamp: z.string().datetime(),
  service: z.string(),
  checks: z.array(DependencySchema),
  overall_status: z.enum(['healthy', 'unhealthy', 'degraded']),
});

// Type exports
export type Dependency = z.infer<typeof DependencySchema>;
export type HealthResponse = z.infer<typeof HealthResponseSchema>;
export type LivenessResponse = z.infer<typeof LivenessResponseSchema>;
export type ReadinessResponse = z.infer<typeof ReadinessResponseSchema>;

// Health check configuration
export interface HealthCheckConfig {
  serviceName: string;
  version?: string;
  environment?: string;
  dependencies?: DependencyChecker[];
  gracefulShutdownTimeoutMs?: number;
}

// Dependency checker interface
export interface DependencyChecker {
  name: string;
  check: () => Promise<DependencyCheckResult>;
  timeout?: number;
  critical?: boolean;
}

export interface DependencyCheckResult {
  status: HealthStatus;
  message?: string;
  latency?: number;
  metadata?: Record<string, unknown>;
}

// Standard dependency checker options
export interface DatabaseCheckOptions {
  name?: string;
  timeout?: number;
  query?: string;
  critical?: boolean;
}

export interface RedisCheckOptions {
  name?: string;
  timeout?: number;
  critical?: boolean;
}

export interface HttpCheckOptions {
  name: string;
  url: string;
  timeout?: number;
  expectedStatus?: number;
  critical?: boolean;
  headers?: Record<string, string>;
}

export interface CustomCheckOptions {
  name: string;
  timeout?: number;
  critical?: boolean;
}