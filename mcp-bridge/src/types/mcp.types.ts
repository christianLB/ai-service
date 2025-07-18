import { z } from 'zod';

// MCP Tool Definition
export interface MCPTool {
  name: string;
  description: string;
  inputSchema: z.ZodSchema<any>;
  handler: (params: any) => Promise<MCPToolResult>;
  category: 'financial' | 'documents' | 'system' | 'general';
  requiresAuth: boolean;
  rateLimit?: {
    maxPerMinute: number;
    maxPerHour: number;
  };
}

// MCP Tool Result
export interface MCPToolResult {
  success: boolean;
  data?: any;
  error?: string;
  metadata?: {
    duration: number;
    cached: boolean;
    [key: string]: any;
  };
}

// MCP Resource Definition
export interface MCPResource {
  id: string;
  name: string;
  description: string;
  mimeType: string;
  uri: string;
  metadata?: Record<string, any>;
}

// MCP Prompt Definition
export interface MCPPrompt {
  id: string;
  name: string;
  description: string;
  template: string;
  variables: string[];
  category: string;
}

// MCP Server Capabilities
export interface MCPCapabilities {
  tools: Array<{
    name: string;
    description: string;
    category: string;
    inputSchema: any;
  }>;
  resources: MCPResource[];
  prompts: MCPPrompt[];
  version: string;
  features: string[];
}

// Request/Response Types
export const MCPToolRequestSchema = z.object({
  tool: z.string(),
  params: z.record(z.any()).optional(),
  requestId: z.string().optional(),
});

export type MCPToolRequest = z.infer<typeof MCPToolRequestSchema>;

export const MCPResourceRequestSchema = z.object({
  resourceId: z.string(),
  includeContent: z.boolean().optional(),
});

export type MCPResourceRequest = z.infer<typeof MCPResourceRequestSchema>;

// Authentication Types
export interface MCPAuthContext {
  authenticated: boolean;
  userId?: string;
  permissions?: string[];
  apiKey?: string;
  jwt?: string;
}

// Error Types
export class MCPError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 400,
    public details?: any
  ) {
    super(message);
    this.name = 'MCPError';
  }
}

// Common Error Codes
export const MCP_ERROR_CODES = {
  TOOL_NOT_FOUND: 'TOOL_NOT_FOUND',
  INVALID_PARAMS: 'INVALID_PARAMS',
  AUTHENTICATION_REQUIRED: 'AUTHENTICATION_REQUIRED',
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
  TOOL_EXECUTION_FAILED: 'TOOL_EXECUTION_FAILED',
  RESOURCE_NOT_FOUND: 'RESOURCE_NOT_FOUND',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
} as const;