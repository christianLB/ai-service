#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { 
  CallToolRequestSchema, 
  ListToolsRequestSchema,
  Tool 
} from '@modelcontextprotocol/sdk/types.js';
import { execSync } from 'child_process';
import path from 'path';
import fs from 'fs';

const CLI_PATH = path.join(__dirname, '..', '..', 'dist', 'index.js');

class CLIMCPServer {
  private server: Server;
  
  constructor() {
    this.server = new Server(
      {
        name: 'ai-service-cli',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.setupHandlers();
  }

  private setupHandlers() {
    // List available CLI tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: this.getAvailableTools(),
      };
    });

    // Execute CLI commands
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;
      
      try {
        const result = await this.executeCLICommand(name, args);
        return {
          content: [
            {
              type: 'text',
              text: result,
            },
          ],
        };
      } catch (error: any) {
        return {
          content: [
            {
              type: 'text',
              text: `Error: ${error.message}`,
            },
          ],
        };
      }
    });
  }

  private getAvailableTools(): Tool[] {
    return [
      {
        name: 'dev_start',
        description: 'Start development environment',
        inputSchema: {
          type: 'object',
          properties: {
            env: { type: 'string', enum: ['local', 'production', 'nas'], default: 'local' },
            detached: { type: 'boolean', default: true },
          },
        },
      },
      {
        name: 'dev_stop',
        description: 'Stop development environment',
        inputSchema: {
          type: 'object',
          properties: {
            env: { type: 'string', enum: ['local', 'production', 'nas'], default: 'local' },
            volumes: { type: 'boolean', default: false },
          },
        },
      },
      {
        name: 'dev_status',
        description: 'Check development environment status',
        inputSchema: {
          type: 'object',
          properties: {
            detailed: { type: 'boolean', default: false },
          },
        },
      },
      {
        name: 'dev_logs',
        description: 'View service logs',
        inputSchema: {
          type: 'object',
          properties: {
            service: { type: 'string' },
            tail: { type: 'number', default: 100 },
            follow: { type: 'boolean', default: false },
          },
        },
      },
      {
        name: 'auth_token',
        description: 'Get authentication token',
        inputSchema: {
          type: 'object',
          properties: {
            format: { type: 'string', enum: ['plain', 'json'], default: 'plain' },
          },
        },
      },
      {
        name: 'db_migrate',
        description: 'Run database migrations',
        inputSchema: {
          type: 'object',
          properties: {
            dryRun: { type: 'boolean', default: false },
          },
        },
      },
      {
        name: 'db_status',
        description: 'Check database status',
        inputSchema: {
          type: 'object',
          properties: {
            verbose: { type: 'boolean', default: false },
          },
        },
      },
      {
        name: 'db_backup',
        description: 'Create database backup',
        inputSchema: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            compress: { type: 'boolean', default: true },
          },
        },
      },
      {
        name: 'test_run',
        description: 'Run tests',
        inputSchema: {
          type: 'object',
          properties: {
            suite: { type: 'string', enum: ['unit', 'e2e', 'all'], default: 'all' },
            coverage: { type: 'boolean', default: false },
          },
        },
      },
      {
        name: 'build',
        description: 'Build application',
        inputSchema: {
          type: 'object',
          properties: {
            target: { type: 'string', enum: ['api', 'frontend', 'all'], default: 'all' },
            production: { type: 'boolean', default: false },
          },
        },
      },
    ];
  }

  private async executeCLICommand(command: string, args: any = {}): Promise<string> {
    // Map MCP command to CLI command
    const commandMap: Record<string, string> = {
      'dev_start': 'dev start',
      'dev_stop': 'dev stop',
      'dev_status': 'dev status',
      'dev_logs': 'dev logs',
      'auth_token': 'auth token',
      'db_migrate': 'db migrate',
      'db_status': 'db status',
      'db_backup': 'db backup create',
      'test_run': 'test',
      'build': 'build',
    };

    const cliCommand = commandMap[command];
    if (!cliCommand) {
      throw new Error(`Unknown command: ${command}`);
    }

    // Build command with arguments
    let fullCommand = `node ${CLI_PATH} ${cliCommand}`;
    
    // Add arguments based on command
    switch (command) {
      case 'dev_start':
        if (args.env) fullCommand += ` --env ${args.env}`;
        if (!args.detached) fullCommand += ` --no-detached`;
        break;
      case 'dev_stop':
        if (args.env) fullCommand += ` --env ${args.env}`;
        if (args.volumes) fullCommand += ` --volumes`;
        break;
      case 'dev_status':
        if (args.detailed) fullCommand += ` --detailed`;
        break;
      case 'dev_logs':
        if (args.service) fullCommand += ` ${args.service}`;
        if (args.tail) fullCommand += ` --tail ${args.tail}`;
        if (args.follow) fullCommand += ` --follow`;
        break;
      case 'auth_token':
        if (args.format) fullCommand += ` --format ${args.format}`;
        break;
      case 'db_migrate':
        if (args.dryRun) fullCommand += ` --dry-run`;
        break;
      case 'db_status':
        if (args.verbose) fullCommand += ` --verbose`;
        break;
      case 'db_backup':
        if (args.name) fullCommand += ` ${args.name}`;
        if (!args.compress) fullCommand += ` --no-compress`;
        break;
      case 'test_run':
        if (args.suite && args.suite !== 'all') fullCommand += ` ${args.suite}`;
        if (args.coverage) fullCommand += ` --coverage`;
        break;
      case 'build':
        if (args.target && args.target !== 'all') fullCommand += ` ${args.target}`;
        if (args.production) fullCommand += ` --production`;
        break;
    }

    // Execute command
    try {
      const output = execSync(fullCommand, {
        encoding: 'utf8',
        maxBuffer: 1024 * 1024 * 10, // 10MB
      });
      return output;
    } catch (error: any) {
      if (error.stdout) {
        return error.stdout + '\n' + error.stderr;
      }
      throw error;
    }
  }

  async start() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('AI Service CLI MCP Server started');
  }
}

// Start server if run directly
if (require.main === module) {
  const server = new CLIMCPServer();
  server.start().catch((error) => {
    console.error('Failed to start MCP server:', error);
    process.exit(1);
  });
}

export { CLIMCPServer };