#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { config } from './config';
import { AIServiceBridge } from './adapters/ai-service-bridge';
import { logger } from './utils/logger';

// Initialize AI Service bridge
const bridge = new AIServiceBridge({
  url: config.aiService.url,
  authToken: config.aiService.authToken,
  timeout: config.aiService.timeout,
});

// Create MCP server
const server = new Server(
  {
    name: 'ai-service-local',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Handle tool listing
server.setRequestHandler(ListToolsRequestSchema, async () => {
  logger.info('Listing available tools');
  
  try {
    const tools = await bridge.listTools();
    return {
      tools: tools.map(tool => ({
        name: tool.name,
        description: tool.description,
        inputSchema: {
          type: 'object',
          properties: tool.parameters || {},
        },
      })),
    };
  } catch (error) {
    logger.error('Error listing tools:', error);
    return { tools: [] };
  }
});

// Handle tool execution
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  logger.info(`Executing tool: ${name}`, { args });

  try {
    const result = await bridge.executeTool(name, args || {});
    
    return {
      content: [
        {
          type: 'text',
          text: typeof result === 'string' ? result : JSON.stringify(result, null, 2),
        },
      ],
    };
  } catch (error) {
    logger.error(`Error executing tool ${name}:`, error);
    
    return {
      content: [
        {
          type: 'text',
          text: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        },
      ],
      isError: true,
    };
  }
});

// Start the server
async function main() {
  logger.info('Starting MCP local server...');
  
  const transport = new StdioServerTransport();
  await server.connect(transport);
  
  logger.info('MCP local server started successfully');
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
  logger.info('Shutting down MCP server...');
  await server.close();
  process.exit(0);
});

// Start server
main().catch((error) => {
  logger.error('Failed to start MCP server:', error);
  process.exit(1);
});