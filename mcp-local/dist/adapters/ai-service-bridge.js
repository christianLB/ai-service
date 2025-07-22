"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AIServiceBridge = void 0;
const axios_1 = __importDefault(require("axios"));
const logger_1 = require("../utils/logger");
class AIServiceBridge {
    client;
    cache = new Map();
    cacheTTL = 300000; // 5 minutes
    constructor(config) {
        this.client = axios_1.default.create({
            baseURL: config.url,
            timeout: config.timeout || 30000,
            headers: {
                'Content-Type': 'application/json',
                ...(config.authToken && { 'Authorization': `Bearer ${config.authToken}` }),
            },
        });
        // Add request/response interceptors for logging
        this.client.interceptors.request.use((request) => {
            logger_1.logger.debug('AI Service request:', {
                method: request.method,
                url: request.url,
                data: request.data,
            });
            return request;
        }, (error) => {
            logger_1.logger.error('AI Service request error:', error);
            return Promise.reject(error);
        });
        this.client.interceptors.response.use((response) => {
            logger_1.logger.debug('AI Service response:', {
                status: response.status,
                data: response.data,
            });
            return response;
        }, (error) => {
            logger_1.logger.error('AI Service response error:', error.response?.data || error.message);
            return Promise.reject(error);
        });
    }
    /**
     * Get available tools from AI Service
     */
    async listTools() {
        try {
            // Try to get tools from the MCP endpoint
            const response = await this.client.get('/api/mcp/tools');
            return response.data.tools || [];
        }
        catch (error) {
            logger_1.logger.warn('Failed to fetch tools from MCP endpoint, using fallback');
            // Fallback to hardcoded tools if MCP endpoint is not available
            return this.getFallbackTools();
        }
    }
    /**
     * Execute a tool through AI Service
     */
    async executeTool(toolName, args) {
        const cacheKey = `${toolName}:${JSON.stringify(args)}`;
        // Check cache first
        const cached = this.getFromCache(cacheKey);
        if (cached !== null) {
            logger_1.logger.debug(`Returning cached result for ${toolName}`);
            return cached;
        }
        try {
            // Execute tool through MCP endpoint
            const response = await this.client.post(`/api/mcp/tools/${toolName}/execute`, {
                arguments: args,
            });
            const result = response.data.result;
            // Cache the result
            this.setCache(cacheKey, result);
            return result;
        }
        catch (error) {
            // Try direct API endpoints as fallback
            return this.executeToolFallback(toolName, args);
        }
    }
    /**
     * Execute tool using direct API endpoints (fallback)
     */
    async executeToolFallback(toolName, args) {
        logger_1.logger.info(`Using fallback execution for tool: ${toolName}`);
        // Map tool names to API endpoints
        const toolEndpointMap = {
            // Financial tools
            'get_financial_summary': {
                method: 'GET',
                endpoint: '/api/dashboard/financial-summary',
                transform: (args) => ({ params: args }),
            },
            'get_account_balance': {
                method: 'GET',
                endpoint: '/api/financial/balance',
            },
            'get_transactions': {
                method: 'GET',
                endpoint: '/api/financial/transactions',
                transform: (args) => ({ params: args }),
            },
            'analyze_expenses': {
                method: 'POST',
                endpoint: '/api/financial/analyze-expenses',
                transform: (args) => ({ data: args }),
            },
            'create_invoice': {
                method: 'POST',
                endpoint: '/api/financial/invoices',
                transform: (args) => ({ data: args }),
            },
            // Document tools
            'search_documents': {
                method: 'POST',
                endpoint: '/api/documents/search',
                transform: (args) => ({ data: { query: args.query, limit: args.limit || 10 } }),
            },
            'analyze_document': {
                method: 'POST',
                endpoint: '/api/documents/analyze',
                transform: (args) => ({ data: args }),
            },
            // System tools
            'get_system_health': {
                method: 'GET',
                endpoint: '/api/health',
            },
        };
        const mapping = toolEndpointMap[toolName];
        if (!mapping) {
            throw new Error(`Unknown tool: ${toolName}`);
        }
        const requestConfig = mapping.transform ? mapping.transform(args) : {};
        if (mapping.method === 'GET') {
            const response = await this.client.get(mapping.endpoint, requestConfig);
            return response.data;
        }
        else {
            const response = await this.client.post(mapping.endpoint, requestConfig.data || args);
            return response.data;
        }
    }
    /**
     * Get fallback tool definitions
     */
    getFallbackTools() {
        return [
            // Financial tools
            {
                name: 'get_financial_summary',
                description: 'Get a summary of financial data for a specified period',
                parameters: {
                    period: { type: 'string', description: 'Period (e.g., "last_month", "this_year")' },
                },
                category: 'financial',
                requiresAuth: true,
            },
            {
                name: 'get_account_balance',
                description: 'Get current account balance',
                parameters: {},
                category: 'financial',
                requiresAuth: true,
            },
            {
                name: 'get_transactions',
                description: 'Get transactions with optional filters',
                parameters: {
                    limit: { type: 'number', description: 'Number of transactions to return' },
                    category: { type: 'string', description: 'Filter by category' },
                    startDate: { type: 'string', description: 'Start date (ISO format)' },
                    endDate: { type: 'string', description: 'End date (ISO format)' },
                },
                category: 'financial',
                requiresAuth: true,
            },
            {
                name: 'analyze_expenses',
                description: 'Analyze expenses by category and period',
                parameters: {
                    period: { type: 'string', description: 'Analysis period' },
                    groupBy: { type: 'string', description: 'Group by (category, merchant, etc.)' },
                },
                category: 'financial',
                requiresAuth: true,
            },
            {
                name: 'create_invoice',
                description: 'Create a new invoice',
                parameters: {
                    clientId: { type: 'number', description: 'Client ID' },
                    items: { type: 'array', description: 'Invoice line items' },
                    dueDate: { type: 'string', description: 'Due date (ISO format)' },
                },
                category: 'financial',
                requiresAuth: true,
            },
            // Document tools
            {
                name: 'search_documents',
                description: 'Search documents using semantic search',
                parameters: {
                    query: { type: 'string', description: 'Search query' },
                    limit: { type: 'number', description: 'Maximum results to return' },
                },
                category: 'documents',
                requiresAuth: true,
            },
            {
                name: 'analyze_document',
                description: 'Analyze a document using AI',
                parameters: {
                    documentId: { type: 'string', description: 'Document ID' },
                    analysisType: { type: 'string', description: 'Type of analysis' },
                },
                category: 'documents',
                requiresAuth: true,
            },
            // System tools
            {
                name: 'get_system_health',
                description: 'Get system health status',
                parameters: {},
                category: 'system',
                requiresAuth: false,
            },
        ];
    }
    /**
     * Cache management
     */
    getFromCache(key) {
        const entry = this.cache.get(key);
        if (!entry)
            return null;
        const age = Date.now() - entry.timestamp;
        if (age > this.cacheTTL) {
            this.cache.delete(key);
            return null;
        }
        return entry.data;
    }
    setCache(key, data) {
        this.cache.set(key, {
            data,
            timestamp: Date.now(),
        });
    }
}
exports.AIServiceBridge = AIServiceBridge;
//# sourceMappingURL=ai-service-bridge.js.map