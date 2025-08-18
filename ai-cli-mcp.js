#!/usr/bin/env node

// MCP Server wrapper for AI Service CLI
const { execSync } = require('child_process');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Helper to execute CLI commands
function executeCLI(command, args = {}) {
  const cliPath = '/home/k2600x/dev/ai-service/ai-cli.js';
  let cmd = `${cliPath} ${command}`;
  
  // Add arguments
  Object.entries(args).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      cmd += ` --${key} ${value}`;
    }
  });
  
  try {
    const result = execSync(cmd, { encoding: 'utf8', cwd: '/home/k2600x/dev/ai-service' });
    return { success: true, output: result };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// MCP tool handlers
const tools = {
  get_token: () => {
    const result = executeCLI('token');
    return result.success ? result.output.trim() : null;
  },
  
  dev_start: (params = {}) => {
    return executeCLI('dev start', params);
  },
  
  dev_stop: (params = {}) => {
    return executeCLI('dev stop', params);
  },
  
  dev_status: () => {
    return executeCLI('dev status');
  },
  
  dev_logs: (params = {}) => {
    const args = [];
    if (params.service) args.push(params.service);
    return executeCLI('dev logs', args.join(' '));
  },
  
  db_status: () => {
    return executeCLI('db status');
  },
  
  db_migrate: (params = {}) => {
    if (params.backup !== false) {
      executeCLI('db backup', { name: `pre-migration-${Date.now()}` });
    }
    return executeCLI('db migrate');
  },
  
  db_backup: (params = {}) => {
    return executeCLI('db backup', params);
  },
  
  test_run: (params = {}) => {
    const suite = params.suite || 'all';
    return executeCLI(`test ${suite}`, params);
  }
};

// MCP protocol handler
function handleMCPRequest(request) {
  try {
    const { method, params = {} } = JSON.parse(request);
    
    if (method === 'list_tools') {
      return {
        tools: Object.keys(tools).map(name => ({
          name,
          description: `Execute ${name} command`
        }))
      };
    }
    
    if (method === 'execute_tool') {
      const { tool, arguments: args = {} } = params;
      if (tools[tool]) {
        const result = tools[tool](args);
        return { success: true, result };
      } else {
        return { success: false, error: `Unknown tool: ${tool}` };
      }
    }
    
    return { error: 'Unknown method' };
  } catch (error) {
    return { error: error.message };
  }
}

// Main loop for MCP server
console.log('AI Service CLI MCP Server Started');
console.log('Ready to receive commands...');

rl.on('line', (input) => {
  const response = handleMCPRequest(input);
  console.log(JSON.stringify(response));
});

rl.on('close', () => {
  console.log('MCP Server shutting down');
  process.exit(0);
});