#!/usr/bin/env node
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const index_js_1 = require("@modelcontextprotocol/sdk/server/index.js");
const stdio_js_1 = require("@modelcontextprotocol/sdk/server/stdio.js");
const types_js_1 = require("@modelcontextprotocol/sdk/types.js");
const config_1 = require("./config");
const ai_service_bridge_1 = require("./adapters/ai-service-bridge");
const logger_1 = require("./utils/logger");
// Initialize AI Service bridge
const bridge = new ai_service_bridge_1.AIServiceBridge({
    url: config_1.config.aiService.url,
    authToken: config_1.config.aiService.authToken,
    timeout: config_1.config.aiService.timeout,
});
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
        const result = await bridge.executeTool(name, args || {});
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