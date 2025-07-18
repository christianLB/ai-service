import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import { rateLimit } from 'express-rate-limit';
import config from '../config';
import logger from '../utils/logger';
import { toolRegistry } from './tool-registry';
import { MCPToolRequestSchema, MCPError, MCP_ERROR_CODES } from '../types/mcp.types';
import { authMiddleware } from '../middleware/auth';
import { errorHandler } from '../middleware/error-handler';

// Import and register tools
import { financialTools } from '../tools/financial.tools';
import { documentTools } from '../tools/document.tools';
import { systemTools } from '../tools/system.tools';

export class MCPServer {
  private app: express.Application;
  private server: any;
  private wss!: WebSocketServer;

  constructor() {
    this.app = express();
    this.setupMiddleware();
    this.registerTools();
    this.setupRoutes();
    this.setupWebSocket();
  }

  private setupMiddleware() {
    // CORS
    this.app.use(cors(config.cors));

    // Body parsing
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true }));

    // Request logging
    this.app.use((req: Request, _res: Response, next: NextFunction) => {
      logger.info(`${req.method} ${req.path}`, {
        ip: req.ip,
        userAgent: req.get('user-agent'),
      });
      next();
    });

    // Rate limiting
    const limiter = rateLimit({
      windowMs: config.rateLimit.windowMs,
      max: config.rateLimit.maxRequests,
      skipSuccessfulRequests: config.rateLimit.skipSuccessfulRequests,
      message: 'Too many requests from this IP',
      standardHeaders: true,
      legacyHeaders: false,
    });
    this.app.use('/api/', limiter);
  }

  private registerTools() {
    // Register all tools
    toolRegistry.registerMultiple([
      ...financialTools,
      ...documentTools,
      ...systemTools,
    ]);

    logger.info('Tools registered', {
      stats: toolRegistry.getStats(),
    });
  }

  private setupRoutes() {
    // Health check
    this.app.get('/health', (_req, res) => {
      res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        version: config.mcp.version,
      });
    });

    // MCP capabilities
    this.app.get('/mcp/capabilities', (_req, res) => {
      res.json({
        version: config.mcp.version,
        name: config.mcp.name,
        description: config.mcp.description,
        tools: toolRegistry.getCapabilities(),
        features: [
          'tool-execution',
          'websocket-support',
          'authentication',
          'rate-limiting',
        ],
      });
    });

    // List tools
    this.app.get('/mcp/tools', authMiddleware(false), (req, res) => {
      const category = req.query.category as string | undefined;
      const tools = toolRegistry.list(category).map(tool => ({
        name: tool.name,
        description: tool.description,
        category: tool.category,
        requiresAuth: tool.requiresAuth,
      }));
      res.json({ tools });
    });

    // Execute tool
    this.app.post('/mcp/tools/:toolName/execute', authMiddleware(true), async (req, res, next) => {
      try {
        const { toolName } = req.params;
        const validatedRequest = MCPToolRequestSchema.parse({
          tool: toolName,
          params: req.body,
        });

        // Check if tool requires auth
        const tool = toolRegistry.get(toolName);
        if (tool.requiresAuth && !req.user) {
          throw new MCPError(
            'Authentication required',
            MCP_ERROR_CODES.AUTHENTICATION_REQUIRED,
            401
          );
        }

        // Execute tool
        const result = await toolRegistry.execute(toolName, validatedRequest.params);
        res.json(result);
      } catch (error) {
        next(error);
      }
    });

    // Tool details
    this.app.get('/mcp/tools/:toolName', authMiddleware(false), (req, res, next) => {
      try {
        const { toolName } = req.params;
        const tool = toolRegistry.get(toolName);
        res.json({
          name: tool.name,
          description: tool.description,
          category: tool.category,
          requiresAuth: tool.requiresAuth,
          inputSchema: tool.inputSchema._def,
          rateLimit: tool.rateLimit,
        });
      } catch (error) {
        next(error);
      }
    });

    // MCP info
    this.app.get('/mcp/info', (_req, res) => {
      res.json({
        name: config.mcp.name,
        version: config.mcp.version,
        description: config.mcp.description,
        environment: config.server.environment,
        uptime: process.uptime(),
        stats: toolRegistry.getStats(),
      });
    });

    // Error handler
    this.app.use(errorHandler);
  }

  private setupWebSocket() {
    this.server = createServer(this.app);
    this.wss = new WebSocketServer({ server: this.server });

    this.wss.on('connection', (ws, req) => {
      logger.info('WebSocket connection established', {
        ip: req.socket.remoteAddress,
      });

      ws.on('message', async (message) => {
        try {
          const data = JSON.parse(message.toString());
          
          if (data.type === 'tool-execute') {
            const result = await toolRegistry.execute(data.tool, data.params);
            ws.send(JSON.stringify({
              type: 'tool-result',
              requestId: data.requestId,
              result,
            }));
          } else if (data.type === 'ping') {
            ws.send(JSON.stringify({ type: 'pong' }));
          }
        } catch (error: any) {
          ws.send(JSON.stringify({
            type: 'error',
            error: error.message,
          }));
        }
      });

      ws.on('close', () => {
        logger.info('WebSocket connection closed');
      });

      ws.on('error', (error) => {
        logger.error('WebSocket error', { error: error.message });
      });
    });
  }

  async start() {
    const port = config.server.port;
    const host = config.server.host;

    this.server.listen(port, host, () => {
      logger.info(`MCP Bridge Server started`, {
        port,
        host,
        environment: config.server.environment,
        tools: toolRegistry.getStats().total,
      });
    });
  }

  async stop() {
    return new Promise((resolve) => {
      this.wss.close(() => {
        this.server.close(() => {
          logger.info('MCP Bridge Server stopped');
          resolve(undefined);
        });
      });
    });
  }
}

// Export singleton instance
export const mcpServer = new MCPServer();