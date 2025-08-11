#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { config } from './config';
import { AIServiceBridge } from './adapters/ai-service-bridge';
import { MakeCommandBridge } from './adapters/make-command-bridge';
import { logger } from './utils/logger';
import * as path from 'path';

// Initialize AI Service bridge
const bridge = new AIServiceBridge({
  url: config.aiService.url,
  authToken: config.aiService.authToken,
  timeout: config.aiService.timeout,
});

// Initialize Make command bridge
const projectRoot = path.resolve(__dirname, '../../');
const makeBridge = new MakeCommandBridge(projectRoot);

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
    // Get tools from both bridges
    const [aiServiceTools, makeTools] = await Promise.all([
      bridge.listTools().catch(() => []),
      makeBridge.getMakeTools().catch(() => [])
    ]);
    
    const allTools = [...aiServiceTools, ...makeTools];
    
    return {
      tools: allTools.map(tool => ({
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
    let result;
    
    // Route to appropriate bridge based on tool name
    if (name.startsWith('check_make_') || name.startsWith('execute_make_') || name.startsWith('list_make_') || 
        name.startsWith('make_command_') || name.startsWith('validate_make_') || 
        name.startsWith('get_command_') || name.startsWith('analyze_user_')) {
      // Route to Make command bridge
      switch (name) {
        case 'check_make_commands_first':
          result = await makeBridge.checkMakeCommandsFirst(
            String(args?.userRequest || ''),
            args?.autoExecute !== false
          );
          break;
        case 'execute_make_command':
          result = await makeBridge.executeMakeCommand(
            String(args?.target || ''), 
            args?.args || {}, 
            Boolean(args?.confirm)
          );
          break;
        case 'list_make_targets':
          result = await makeBridge.listMakeTargets(args?.category ? String(args.category) : undefined);
          break;
        case 'make_command_help':
          result = await makeBridge.getMakeCommandHelp(String(args?.target || ''));
          break;
        case 'validate_make_prerequisites':
          result = await makeBridge.validateMakePrerequisites(String(args?.target || ''));
          break;
        case 'make_command_status':
          result = await makeBridge.getMakeCommandStatus(args?.service ? String(args.service) : undefined);
          break;
        case 'analyze_user_intent':
          result = await makeBridge.analyzeUserIntent(
            args?.intent ? String(args.intent) : undefined, 
            args?.currentState
          );
          break;
        case 'get_command_suggestions':
          result = await makeBridge.getCommandSuggestions(
            args?.intent ? String(args.intent) : undefined, 
            args?.currentState
          );
          break;
        default:
          throw new Error(`Unknown make command tool: ${name}`);
      }
    } else {
      // Route to AI Service bridge
      result = await bridge.executeTool(name, args || {});
    }
    
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