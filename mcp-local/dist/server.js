#!/usr/bin/env node
"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const index_js_1 = require("@modelcontextprotocol/sdk/server/index.js");
const stdio_js_1 = require("@modelcontextprotocol/sdk/server/stdio.js");
const types_js_1 = require("@modelcontextprotocol/sdk/types.js");
const config_1 = require("./config");
const ai_service_bridge_1 = require("./adapters/ai-service-bridge");
const make_command_bridge_1 = require("./adapters/make-command-bridge");
const logger_1 = require("./utils/logger");
const path = __importStar(require("path"));
// Initialize AI Service bridge
const bridge = new ai_service_bridge_1.AIServiceBridge({
    url: config_1.config.aiService.url,
    authToken: config_1.config.aiService.authToken,
    timeout: config_1.config.aiService.timeout,
});
// Initialize Make command bridge
const projectRoot = path.resolve(__dirname, '../../');
const makeBridge = new make_command_bridge_1.MakeCommandBridge(projectRoot);
// Create MCP server
const server = new index_js_1.Server({
    name: 'ai-service-local',
    version: '1.0.0',
}, {
    capabilities: {
        tools: {},
    },
});
// Handle tool listing
server.setRequestHandler(types_js_1.ListToolsRequestSchema, async () => {
    logger_1.logger.info('Listing available tools');
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
    }
    catch (error) {
        logger_1.logger.error('Error listing tools:', error);
        return { tools: [] };
    }
});
// Handle tool execution
server.setRequestHandler(types_js_1.CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;
    logger_1.logger.info(`Executing tool: ${name}`, { args });
    try {
        let result;
        // Route to appropriate bridge based on tool name
        if (name.startsWith('check_make_') || name.startsWith('execute_make_') || name.startsWith('list_make_') ||
            name.startsWith('make_command_') || name.startsWith('validate_make_') ||
            name.startsWith('get_command_') || name.startsWith('analyze_user_')) {
            // Route to Make command bridge
            switch (name) {
                case 'check_make_commands_first':
                    result = await makeBridge.checkMakeCommandsFirst(String(args?.userRequest || ''), args?.autoExecute !== false);
                    break;
                case 'execute_make_command':
                    result = await makeBridge.executeMakeCommand(String(args?.target || ''), args?.args || {}, Boolean(args?.confirm));
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
                    result = await makeBridge.analyzeUserIntent(args?.intent ? String(args.intent) : undefined, args?.currentState);
                    break;
                case 'get_command_suggestions':
                    result = await makeBridge.getCommandSuggestions(args?.intent ? String(args.intent) : undefined, args?.currentState);
                    break;
                default:
                    throw new Error(`Unknown make command tool: ${name}`);
            }
        }
        else {
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
    }
    catch (error) {
        logger_1.logger.error(`Error executing tool ${name}:`, error);
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
    logger_1.logger.info('Starting MCP local server...');
    const transport = new stdio_js_1.StdioServerTransport();
    await server.connect(transport);
    logger_1.logger.info('MCP local server started successfully');
}
// Handle graceful shutdown
process.on('SIGINT', async () => {
    logger_1.logger.info('Shutting down MCP server...');
    await server.close();
    process.exit(0);
});
// Start server
main().catch((error) => {
    logger_1.logger.error('Failed to start MCP server:', error);
    process.exit(1);
});
//# sourceMappingURL=server.js.map