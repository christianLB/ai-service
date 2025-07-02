const express = require('express');
const app = express();

app.use(express.json());

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

// Health check
app.get('/status', (req, res) => {
  metrics.api_requests++;
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    version: '1.0.0-demo'
  });
});

// Generar workflow (versión demo)
app.post('/api/flow-gen', (req, res) => {
  metrics.api_requests++;
  const { description } = req.body;
  
  if (!description) {
    return res.status(400).json({ error: 'Description is required' });
  }
  
  // Workflow de ejemplo generado
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
  
  // Validar workflow
  const validation = mockValidateWorkflow(mockWorkflow);
  metrics.validations_run++;
  
  if (!validation.isValid) {
    return res.status(400).json({
      error: 'Generated workflow failed validation',
      validation_errors: validation.errors
    });
  }
  
  metrics.workflows_generated++;
  
  console.log(`✅ Generated workflow for: "${description}"`);
  
  res.json({
    ...mockWorkflow,
    _metadata: {
      generated_at: new Date().toISOString(),
      description: description,
      validation: {
        valid: validation.isValid,
        warnings: validation.warnings
      }
    }
  });
});

// Métricas simplificadas
app.get('/api/metrics/json', (req, res) => {
  metrics.api_requests++;
  res.json({
    service: 'ai-service-demo',
    metrics: {
      ...metrics,
      uptime_seconds: Math.floor(process.uptime()),
      memory_usage_mb: Math.round(process.memoryUsage().heapUsed / 1024 / 1024)
    },
    timestamp: new Date().toISOString()
  });
});

// Listar workflows (demo)
app.get('/api/flows', (req, res) => {
  metrics.api_requests++;
  res.json({
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
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Not found',
    available_endpoints: [
      'GET /status',
      'POST /api/flow-gen',
      'GET /api/flows', 
      'GET /api/metrics/json'
    ]
  });
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`🚀 AI Service Demo running on port ${port}`);
  console.log(`📊 Health: http://localhost:${port}/status`);
  console.log(`⚡ Demo: http://localhost:${port}/api/flow-gen`);
  console.log(`📈 Metrics: http://localhost:${port}/api/metrics/json`);
  console.log('\n🎯 Try this demo:');
  console.log(`curl -X POST http://localhost:${port}/api/flow-gen -H "Content-Type: application/json" -d '{"description":"Create a workflow that processes invoices"}'`);
});