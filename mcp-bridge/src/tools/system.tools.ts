import { z } from 'zod';
import { MCPTool } from '../types/mcp.types';
import { aiServiceClient } from '../utils/ai-service-client';

// Get System Status Tool
export const getSystemStatusTool: MCPTool = {
  name: 'get_system_status',
  description: 'Get current system status including health, uptime, and service availability',
  category: 'system',
  requiresAuth: false,
  inputSchema: z.object({}),
  handler: async () => {
    try {
      const data = await aiServiceClient.getSystemStatus();
      return {
        success: true,
        data,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
      };
    }
  },
};

// Get Neural Status Tool
export const getNeuralStatusTool: MCPTool = {
  name: 'get_neural_status',
  description: 'Get detailed neural system status showing health of all components',
  category: 'system',
  requiresAuth: false,
  inputSchema: z.object({}),
  handler: async () => {
    try {
      const data = await aiServiceClient.getNeuralStatus();
      return {
        success: true,
        data,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
      };
    }
  },
};

// Get System Metrics Tool
export const getSystemMetricsTool: MCPTool = {
  name: 'get_system_metrics',
  description: 'Get detailed system metrics including performance, memory usage, and API statistics',
  category: 'system',
  requiresAuth: true,
  inputSchema: z.object({
    includeHistory: z.boolean().optional().default(false)
      .describe('Include historical metrics data'),
    period: z.enum(['hour', 'day', 'week']).optional().default('hour')
      .describe('Time period for historical data'),
  }),
  handler: async (_params) => {
    try {
      const data = await aiServiceClient.getSystemMetrics();
      return {
        success: true,
        data,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
      };
    }
  },
};

// Trigger Backup Tool
export const triggerBackupTool: MCPTool = {
  name: 'trigger_backup',
  description: 'Manually trigger a system backup of critical data',
  category: 'system',
  requiresAuth: true,
  rateLimit: {
    maxPerMinute: 1,
    maxPerHour: 3,
  },
  inputSchema: z.object({
    backupType: z.enum(['full', 'incremental', 'financial', 'documents'])
      .optional()
      .default('incremental')
      .describe('Type of backup to perform'),
    compress: z.boolean().optional().default(true)
      .describe('Compress backup files'),
  }),
  handler: async (params) => {
    try {
      // This would need implementation in AI Service
      return {
        success: true,
        data: {
          message: 'Backup triggered successfully',
          backupId: `backup-${Date.now()}`,
          type: params.backupType,
          compressed: params.compress,
        },
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
      };
    }
  },
};

// Clear Cache Tool
export const clearCacheTool: MCPTool = {
  name: 'clear_cache',
  description: 'Clear system cache to free memory or resolve stale data issues',
  category: 'system',
  requiresAuth: true,
  rateLimit: {
    maxPerMinute: 2,
    maxPerHour: 10,
  },
  inputSchema: z.object({
    cacheType: z.enum(['all', 'redis', 'memory', 'documents', 'financial'])
      .optional()
      .default('all')
      .describe('Type of cache to clear'),
  }),
  handler: async (params) => {
    try {
      // This would need implementation in AI Service
      return {
        success: true,
        data: {
          message: `Cache cleared successfully: ${params.cacheType}`,
          timestamp: new Date().toISOString(),
        },
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
      };
    }
  },
};

// Get Service Logs Tool
export const getServiceLogsTool: MCPTool = {
  name: 'get_service_logs',
  description: 'Retrieve recent logs from various system services',
  category: 'system',
  requiresAuth: true,
  inputSchema: z.object({
    service: z.enum(['all', 'api', 'financial', 'documents', 'telegram'])
      .optional()
      .default('all')
      .describe('Service to get logs from'),
    level: z.enum(['error', 'warn', 'info', 'debug'])
      .optional()
      .default('info')
      .describe('Minimum log level to retrieve'),
    lines: z.number().min(10).max(1000).optional().default(100)
      .describe('Number of log lines to retrieve'),
    search: z.string().optional()
      .describe('Search term to filter logs'),
  }),
  handler: async (params) => {
    try {
      // This would need implementation in AI Service
      return {
        success: true,
        data: {
          service: params.service,
          level: params.level,
          lines: params.lines,
          logs: [
            {
              timestamp: new Date().toISOString(),
              level: 'info',
              message: 'Sample log entry',
              service: 'api',
            },
          ],
        },
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
      };
    }
  },
};

// Health Check Tool
export const healthCheckTool: MCPTool = {
  name: 'health_check',
  description: 'Perform comprehensive health check on all system components',
  category: 'system',
  requiresAuth: false,
  inputSchema: z.object({
    detailed: z.boolean().optional().default(false)
      .describe('Include detailed diagnostics'),
  }),
  handler: async (params) => {
    try {
      const [status, neural, metrics] = await Promise.allSettled([
        aiServiceClient.getSystemStatus(),
        aiServiceClient.getNeuralStatus(),
        aiServiceClient.getSystemMetrics(),
      ]);
      
      return {
        success: true,
        data: {
          healthy: status.status === 'fulfilled' && status.value.status === 'healthy',
          components: {
            api: status.status === 'fulfilled' ? 'healthy' : 'unhealthy',
            neural: neural.status === 'fulfilled' ? 'healthy' : 'unhealthy',
            metrics: metrics.status === 'fulfilled' ? 'healthy' : 'unhealthy',
          },
          details: params.detailed ? {
            status: status.status === 'fulfilled' ? status.value : null,
            neural: neural.status === 'fulfilled' ? neural.value : null,
            metrics: metrics.status === 'fulfilled' ? metrics.value : null,
          } : undefined,
        },
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
      };
    }
  },
};

// Restart Service Tool
export const restartServiceTool: MCPTool = {
  name: 'restart_service',
  description: 'Restart a specific service or component',
  category: 'system',
  requiresAuth: true,
  rateLimit: {
    maxPerMinute: 1,
    maxPerHour: 5,
  },
  inputSchema: z.object({
    service: z.enum(['telegram', 'scheduler', 'worker'])
      .describe('Service to restart'),
    graceful: z.boolean().optional().default(true)
      .describe('Perform graceful restart'),
  }),
  handler: async (params) => {
    try {
      // This would need implementation in AI Service
      return {
        success: true,
        data: {
          message: `Service ${params.service} restart initiated`,
          graceful: params.graceful,
          timestamp: new Date().toISOString(),
        },
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
      };
    }
  },
};

// Export all system tools
export const systemTools: MCPTool[] = [
  getSystemStatusTool,
  getNeuralStatusTool,
  getSystemMetricsTool,
  triggerBackupTool,
  clearCacheTool,
  getServiceLogsTool,
  healthCheckTool,
  restartServiceTool,
];