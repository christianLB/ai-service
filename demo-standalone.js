const http = require('http');
const url = require('url');

// Mock para demostración
const mockValidateWorkflow = (workflow) => {
  const errors = [];
  const warnings = [];
  
  if (!workflow.name) errors.push('Workflow name is required');
  if (!workflow.nodes || workflow.nodes.length === 0) errors.push('Workflow must have at least one node');
  
  const hasStartNode = workflow.nodes?.some(node => 
    node.type === 'n8n-nodes-base.start' || 
    node.type === 'n8n-nodes-base.webhook'
  );
  
  if (!hasStartNode) errors.push('Workflow must have a trigger node');
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
};

// Simulación de métricas
let metrics = {
  workflows_generated: 0,
  validations_run: 0,
  api_requests: 0
};

const server = http.createServer((req, res) => {
  const parsedUrl = url.parse(req.url, true);
  const path = parsedUrl.pathname;
  const method = req.method;
  
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Content-Type', 'application/json');
  
  if (method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }
  
  metrics.api_requests++;
  
  // Health check
  if (path === '/status' && method === 'GET') {
    res.writeHead(200);
    res.end(JSON.stringify({
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      version: '1.0.0-demo'
    }, null, 2));
    return;
  }
  
  // Generate workflow
  if (path === '/api/flow-gen' && method === 'POST') {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });
    
    req.on('end', () => {
      try {
        const { description } = JSON.parse(body);
        
        if (!description) {
          res.writeHead(400);
          res.end(JSON.stringify({ error: 'Description is required' }));
          return;
        }
        
        // Generate mock workflow
        const mockWorkflow = {
          name: `Workflow: ${description.substring(0, 50)}`,
          active: false,
          nodes: [
            {
              id: 'start-1',
              name: 'Start',
              type: 'n8n-nodes-base.start',
              typeVersion: 1,
              position: [100, 200],
              parameters: {}
            },
            {
              id: 'set-1',
              name: 'Process Data',
              type: 'n8n-nodes-base.set',
              typeVersion: 1,
              position: [300, 200],
              parameters: {
                values: {
                  string: [
                    {
                      name: 'description',
                      value: description
                    },
                    {
                      name: 'generated_at',
                      value: new Date().toISOString()
                    }
                  ]
                }
              }
            }
          ],
          connections: {
            'start-1': {
              main: [
                [
                  {
                    node: 'set-1',
                    type: 'main',
                    index: 0
                  }
                ]
              ]
            }
          },
          settings: {
            executionOrder: 'v1'
          }
        };
        
        // Validate workflow
        const validation = mockValidateWorkflow(mockWorkflow);
        metrics.validations_run++;
        
        if (!validation.isValid) {
          res.writeHead(400);
          res.end(JSON.stringify({
            error: 'Generated workflow failed validation',
            validation_errors: validation.errors
          }));
          return;
        }
        
        metrics.workflows_generated++;
        
        console.log(`✅ Generated workflow for: "${description}"`);
        
        res.writeHead(200);
        res.end(JSON.stringify({
          ...mockWorkflow,
          _metadata: {
            generated_at: new Date().toISOString(),
            description: description,
            validation: {
              valid: validation.isValid,
              warnings: validation.warnings
            }
          }
        }, null, 2));
        
      } catch (error) {
        res.writeHead(400);
        res.end(JSON.stringify({ error: 'Invalid JSON' }));
      }
    });
    return;
  }
  
  // Metrics
  if (path === '/api/metrics/json' && method === 'GET') {
    res.writeHead(200);
    res.end(JSON.stringify({
      service: 'ai-service-demo',
      metrics: {
        ...metrics,
        uptime_seconds: Math.floor(process.uptime()),
        memory_usage_mb: Math.round(process.memoryUsage().heapUsed / 1024 / 1024)
      },
      timestamp: new Date().toISOString()
    }, null, 2));
    return;
  }
  
  // List workflows
  if (path === '/api/flows' && method === 'GET') {
    res.writeHead(200);
    res.end(JSON.stringify({
      workflows: [
        {
          id: 'demo-1',
          name: 'Demo Workflow 1',
          active: true,
          created_at: new Date(Date.now() - 3600000).toISOString()
        },
        {
          id: 'demo-2', 
          name: 'Demo Workflow 2',
          active: false,
          created_at: new Date(Date.now() - 7200000).toISOString()
        }
      ],
      total: 2,
      active_count: 1
    }, null, 2));
    return;
  }
  
  // 404
  res.writeHead(404);
  res.end(JSON.stringify({
    error: 'Not found',
    available_endpoints: [
      'GET /status',
      'POST /api/flow-gen',
      'GET /api/flows', 
      'GET /api/metrics/json'
    ]
  }));
});

const port = process.env.PORT || 3001;
server.listen(port, () => {
  console.log(`🚀 AI Service Demo running on port ${port}`);
  console.log(`📊 Health: http://localhost:${port}/status`);
  console.log(`⚡ Demo: http://localhost:${port}/api/flow-gen`);
  console.log(`📈 Metrics: http://localhost:${port}/api/metrics/json`);
  console.log('\n🎯 Demo Commands:');
  console.log(`curl http://localhost:${port}/status`);
  console.log(`curl -X POST http://localhost:${port}/api/flow-gen -H "Content-Type: application/json" -d '{"description":"Create a workflow that processes invoices"}'`);
  console.log(`curl http://localhost:${port}/api/metrics/json`);
});