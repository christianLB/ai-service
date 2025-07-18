import { MCPTool, MCPError, MCP_ERROR_CODES } from '../types/mcp.types';
import logger from '../utils/logger';

export class ToolRegistry {
  private tools: Map<string, MCPTool> = new Map();

  register(tool: MCPTool) {
    if (this.tools.has(tool.name)) {
      logger.warn(`Tool ${tool.name} is being overwritten`);
    }
    
    this.tools.set(tool.name, tool);
    logger.info(`Registered tool: ${tool.name}`, {
      category: tool.category,
      requiresAuth: tool.requiresAuth,
    });
  }

  registerMultiple(tools: MCPTool[]) {
    tools.forEach(tool => this.register(tool));
  }

  get(name: string): MCPTool {
    const tool = this.tools.get(name);
    if (!tool) {
      throw new MCPError(
        `Tool '${name}' not found`,
        MCP_ERROR_CODES.TOOL_NOT_FOUND,
        404
      );
    }
    return tool;
  }

  has(name: string): boolean {
    return this.tools.has(name);
  }

  list(category?: string): MCPTool[] {
    const tools = Array.from(this.tools.values());
    
    if (category) {
      return tools.filter(tool => tool.category === category);
    }
    
    return tools;
  }

  getCapabilities() {
    return Array.from(this.tools.values()).map(tool => ({
      name: tool.name,
      description: tool.description,
      category: tool.category,
      inputSchema: tool.inputSchema._def,
      requiresAuth: tool.requiresAuth,
      rateLimit: tool.rateLimit,
    }));
  }

  async execute(toolName: string, params: any = {}) {
    const startTime = Date.now();
    const tool = this.get(toolName);
    
    try {
      // Validate parameters
      const validatedParams = tool.inputSchema.parse(params);
      
      // Execute tool
      const result = await tool.handler(validatedParams);
      
      // Log successful execution
      const duration = Date.now() - startTime;
      logger.info(`Tool executed successfully: ${toolName}`, {
        duration,
        cached: result.metadata?.cached || false,
      });
      
      return {
        ...result,
        metadata: {
          ...result.metadata,
          duration,
          tool: toolName,
        },
      };
    } catch (error: any) {
      const duration = Date.now() - startTime;
      logger.error(`Tool execution failed: ${toolName}`, {
        error: error.message,
        duration,
      });
      
      // Re-throw MCPError as-is
      if (error instanceof MCPError) {
        throw error;
      }
      
      // Wrap validation errors
      if (error.name === 'ZodError') {
        throw new MCPError(
          'Invalid parameters',
          MCP_ERROR_CODES.INVALID_PARAMS,
          400,
          error.errors
        );
      }
      
      // Wrap other errors
      throw new MCPError(
        `Tool execution failed: ${error.message}`,
        MCP_ERROR_CODES.TOOL_EXECUTION_FAILED,
        500
      );
    }
  }

  getStats() {
    const tools = Array.from(this.tools.values());
    const byCategory = tools.reduce((acc, tool) => {
      acc[tool.category] = (acc[tool.category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    return {
      total: tools.length,
      byCategory,
      requiresAuth: tools.filter(t => t.requiresAuth).length,
      withRateLimit: tools.filter(t => t.rateLimit).length,
    };
  }
}

// Singleton instance
export const toolRegistry = new ToolRegistry();