import { z } from 'zod';

// MCP Tool Definition
export const ToolSchema = z.object({
  name: z.string(),
  description: z.string(),
  parameters: z.record(z.any()).optional().default({}),
  category: z.enum(['financial', 'documents', 'system', 'trading', 'development', 'database', 'quality', 'deployment', 'mcp', 'utility', 'information', 'validation', 'monitoring', 'intelligence']),
  requiresAuth: z.boolean().optional().default(true),
});

export type Tool = z.infer<typeof ToolSchema>;

// Tool execution request/response
export const ToolExecutionRequestSchema = z.object({
  tool: z.string(),
  arguments: z.record(z.any()).optional().default({}),
});

export type ToolExecutionRequest = z.infer<typeof ToolExecutionRequestSchema>;

export interface ToolExecutionResponse {
  success: boolean;
  result?: any;
  error?: string;
  metadata?: {
    executionTime: number;
    cached?: boolean;
  };
}

// AI Service configuration
export interface AIServiceConfig {
  url: string;
  authToken?: string;
  timeout?: number;
}

// MCP Server configuration
export interface MCPServerConfig {
  name: string;
  version: string;
  aiService: AIServiceConfig;
  cache?: {
    enabled: boolean;
    ttl: number;
  };
}