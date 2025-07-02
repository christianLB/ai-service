#!/usr/bin/env node

const http = require('http');
const url = require('url');
const { spawn } = require('child_process');

// Mock de la base de datos en memoria
let workflowsDB = [];
let executionsDB = [];
let metricsDB = [];
let idCounter = 1;

// Métricas globales
const globalMetrics = {
  workflows_generated: 0,
  validations_run: 0,
  api_requests: 0,
  llm_requests: 0,
  startTime: Date.now()
};

// Mock Services
const mockServices = {
  // Database Mock
  db: {
    async createWorkflow(workflow) {
      const id = `wf-${idCounter++}`;
      const newWorkflow = {
        id,
        ...workflow,
        version: 1,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      workflowsDB.push(newWorkflow);
      console.log(`✅ Workflow created: ${id} - "${workflow.name}"`);
      return id;
    },
    
    async getWorkflow(id) {
      return workflowsDB.find(w => w.id === id) || null;
    },
    
    async getAllWorkflows(active) {
      if (active === undefined) return [...workflowsDB];
      return workflowsDB.filter(w => w.active === active);
    },
    
    async updateWorkflow(id, updates) {
      const index = workflowsDB.findIndex(w => w.id === id);
      if (index === -1) return false;
      
      workflowsDB[index] = {
        ...workflowsDB[index],
        ...updates,
        version: (workflowsDB[index].version || 1) + 1,
        updated_at: new Date().toISOString()
      };
      console.log(`✅ Workflow updated: ${id}`);
      return true;
    },
    
    async createExecution(execution) {
      const id = `exec-${idCounter++}`;
      const newExecution = {
        id,
        ...execution,
        start_time: new Date().toISOString(),
        end_time: execution.status !== 'running' ? new Date().toISOString() : null
      };
      executionsDB.push(newExecution);
      return id;
    },
    
    async getExecutionsForWorkflow(workflowId, limit = 10) {
      return executionsDB
        .filter(e => e.workflow_id === workflowId)
        .slice(-limit)
        .reverse();
    },
    
    async getWorkflowStats() {
      return {
        total_workflows: workflowsDB.length,
        active_workflows: workflowsDB.filter(w => w.active).length,
        total_executions: executionsDB.length,
        executions_last_24h: executionsDB.filter(e => 
          new Date(e.start_time) > new Date(Date.now() - 24*60*60*1000)
        ).length
      };
    }
  },
  
  // Validator Mock
  validator: {
    validateWorkflow(workflow) {
      const errors = [];
      const warnings = [];
      
      if (!workflow.name) errors.push('Workflow name is required');
      if (!workflow.nodes || workflow.nodes.length === 0) {
        errors.push('Workflow must have at least one node');
      } else {
        const hasStartNode = workflow.nodes.some(node => 
          node.type === 'n8n-nodes-base.start' || 
          node.type === 'n8n-nodes-base.webhook' ||
          node.type === 'n8n-nodes-base.cron'
        );
        
        if (!hasStartNode) {
          errors.push('Workflow must have a trigger node');
        }
        
        if (workflow.nodes.length > 10) {
          warnings.push('Workflow has many nodes, consider optimizing');
        }
        
        // Validar IDs únicos
        const nodeIds = workflow.nodes.map(n => n.id);
        const duplicates = nodeIds.filter((id, index) => nodeIds.indexOf(id) !== index);
        if (duplicates.length > 0) {
          errors.push(`Duplicate node IDs: ${duplicates.join(', ')}`);
        }
      }
      
      return {
        isValid: errors.length === 0,
        errors,
        warnings
      };
    }
  }
};

// Función para parsear JSON del body
function parseBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (e) {
        reject(new Error('Invalid JSON'));
      }
    });
    req.on('error', reject);
  });
}

// Función para responder con JSON
function jsonResponse(res, data, statusCode = 200) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  });
  res.end(JSON.stringify(data, null, 2));
}

// Generar workflow mock
function generateMockWorkflow(description) {
  const nodeTypes = [
    'n8n-nodes-base.set',
    'n8n-nodes-base.httpRequest', 
    'n8n-nodes-base.if',
    'n8n-nodes-base.function'
  ];
  
  const nodes = [
    {
      id: 'start-1',
      name: 'Start',
      type: 'n8n-nodes-base.start',
      typeVersion: 1,
      position: [100, 200],
      parameters: {}
    }
  ];
  
  // Generar nodos adicionales basados en la descripción
  const keywords = description.toLowerCase();
  let nodeCount = 2;
  
  if (keywords.includes('data') || keywords.includes('process')) {
    nodes.push({
      id: `process-${nodeCount++}`,
      name: 'Process Data',
      type: 'n8n-nodes-base.set',
      typeVersion: 1,
      position: [300, 200],
      parameters: {
        values: {
          string: [
            { name: 'description', value: description },
            { name: 'processed_at', value: new Date().toISOString() }
          ]
        }
      }
    });
  }
  
  if (keywords.includes('api') || keywords.includes('http') || keywords.includes('request')) {
    nodes.push({
      id: `http-${nodeCount++}`,
      name: 'HTTP Request',
      type: 'n8n-nodes-base.httpRequest',
      typeVersion: 1,
      position: [500, 200],
      parameters: {
        url: 'https://api.example.com/data',
        method: 'GET'
      }
    });
  }
  
  if (keywords.includes('condition') || keywords.includes('if') || keywords.includes('check')) {
    nodes.push({
      id: `condition-${nodeCount++}`,
      name: 'Check Condition',
      type: 'n8n-nodes-base.if',
      typeVersion: 1,
      position: [700, 200],
      parameters: {
        conditions: {
          string: [
            {
              value1: '={{$json["status"]}}',
              operation: 'equal',
              value2: 'success'
            }
          ]
        }
      }
    });
  }
  
  // Nodo de salida
  nodes.push({
    id: `output-${nodeCount}`,
    name: 'Output',
    type: 'n8n-nodes-base.set',
    typeVersion: 1,
    position: [900, 200],
    parameters: {
      values: {
        string: [
          { name: 'result', value: 'Workflow completed successfully' },
          { name: 'completed_at', value: new Date().toISOString() }
        ]
      }
    }
  });
  
  // Generar conexiones
  const connections = {};
  for (let i = 0; i < nodes.length - 1; i++) {
    connections[nodes[i].id] = {
      main: [
        [{ node: nodes[i + 1].id, type: 'main', index: 0 }]
      ]
    };
  }
  
  return {
    name: `Workflow: ${description.substring(0, 40)}${description.length > 40 ? '...' : ''}`,
    active: false,
    nodes,
    connections,
    settings: {
      executionOrder: 'v1'
    }
  };
}

// Servidor HTTP
const server = http.createServer(async (req, res) => {
  const parsedUrl = url.parse(req.url, true);
  const path = parsedUrl.pathname;
  const method = req.method;
  const query = parsedUrl.query;
  
  // CORS
  if (method === 'OPTIONS') {
    res.writeHead(200, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    });
    res.end();
    return;
  }
  
  globalMetrics.api_requests++;
  const startTime = Date.now();
  
  console.log(`${new Date().toISOString()} ${method} ${path}`);
  
  try {
    // Health check
    if (path === '/status' && method === 'GET') {
      const stats = await mockServices.db.getWorkflowStats();
      const uptime = Math.floor((Date.now() - globalMetrics.startTime) / 1000);
      
      jsonResponse(res, {
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: uptime,
        memory: process.memoryUsage(),
        database: 'connected (mock)',
        version: '2.0.0-full-native',
        metrics: globalMetrics,
        stats
      });
      return;
    }
    
    // Generate workflow
    if (path === '/api/flow-gen' && method === 'POST') {
      const body = await parseBody(req);
      const { description, save = true } = body;
      
      if (!description) {
        jsonResponse(res, { error: 'Description is required' }, 400);
        return;
      }
      
      console.log(`🤖 Generating workflow for: "${description}"`);
      
      // Simular delay de LLM
      const llmStart = Date.now();
      await new Promise(resolve => setTimeout(resolve, Math.random() * 1500 + 500));
      const llmDuration = (Date.now() - llmStart) / 1000;
      
      globalMetrics.llm_requests++;
      console.log(`🤖 LLM request completed in ${llmDuration.toFixed(2)}s`);
      
      // Generar workflow
      const workflow = generateMockWorkflow(description);
      
      // Validar
      const validation = mockServices.validator.validateWorkflow(workflow);
      globalMetrics.validations_run++;
      
      if (!validation.isValid) {
        console.log(`❌ Workflow validation failed:`, validation.errors);
        jsonResponse(res, {
          error: 'Generated workflow failed validation',
          validation_errors: validation.errors,
          warnings: validation.warnings
        }, 400);
        return;
      }
      
      // Guardar si se requiere
      let workflowId;
      if (save) {
        workflowId = await mockServices.db.createWorkflow({
          name: workflow.name,
          description: `Generated from: ${description}`,
          active: false,
          workflow_data: workflow,
          created_by: 'ai-service-full',
          tags: ['ai-generated', 'full-service', 'native']
        });
        
        await mockServices.db.createExecution({
          workflow_id: workflowId,
          status: 'success',
          input_data: { description },
          output_data: { workflow_generated: true }
        });
      }
      
      globalMetrics.workflows_generated++;
      const totalTime = Date.now() - startTime;
      
      console.log(`✅ Workflow generated successfully in ${totalTime}ms`);
      
      jsonResponse(res, {
        ...workflow,
        _metadata: {
          id: workflowId,
          generated_at: new Date().toISOString(),
          generation_time_ms: totalTime,
          llm_time_ms: Math.round(llmDuration * 1000),
          validation: {
            valid: validation.isValid,
            warnings: validation.warnings
          },
          service_version: 'full-native'
        }
      });
      return;
    }
    
    // Update workflow
    if (path === '/api/flow-update' && method === 'POST') {
      const body = await parseBody(req);
      const { workflowId, changes } = body;
      
      if (!workflowId || !changes) {
        jsonResponse(res, { error: 'workflowId and changes are required' }, 400);
        return;
      }
      
      const existingWorkflow = await mockServices.db.getWorkflow(workflowId);
      if (!existingWorkflow) {
        jsonResponse(res, { error: 'Workflow not found' }, 404);
        return;
      }
      
      console.log(`🔄 Updating workflow ${workflowId}: ${changes}`);
      
      // Simular actualización
      const updatedWorkflow = {
        ...existingWorkflow.workflow_data,
        name: `${existingWorkflow.workflow_data.name} (Updated)`,
        nodes: existingWorkflow.workflow_data.nodes.map(node => ({
          ...node,
          parameters: {
            ...node.parameters,
            updated: new Date().toISOString()
          }
        }))
      };
      
      const validation = mockServices.validator.validateWorkflow(updatedWorkflow);
      if (!validation.isValid) {
        jsonResponse(res, {
          error: 'Updated workflow failed validation',
          validation_errors: validation.errors
        }, 400);
        return;
      }
      
      await mockServices.db.updateWorkflow(workflowId, {
        workflow_data: updatedWorkflow,
        description: `${existingWorkflow.description} | Updated: ${changes}`
      });
      
      jsonResponse(res, {
        ...updatedWorkflow,
        _metadata: {
          id: workflowId,
          updated_at: new Date().toISOString(),
          changes: changes,
          validation: validation
        }
      });
      return;
    }
    
    // Test workflow
    if (path === '/api/flow-test' && method === 'POST') {
      const body = await parseBody(req);
      const { workflow, testData } = body;
      
      if (!workflow) {
        jsonResponse(res, { error: 'Workflow is required' }, 400);
        return;
      }
      
      const validation = mockServices.validator.validateWorkflow(workflow);
      if (!validation.isValid) {
        jsonResponse(res, {
          error: 'Workflow failed validation',
          validation_errors: validation.errors
        }, 400);
        return;
      }
      
      console.log(`🧪 Testing workflow: ${workflow.name}`);
      
      // Simular ejecución
      const testStart = Date.now();
      await new Promise(resolve => setTimeout(resolve, Math.random() * 2000 + 1000));
      const testDuration = Date.now() - testStart;
      
      const testResult = {
        executionId: `test-${Date.now()}`,
        status: 'success',
        startTime: new Date(testStart).toISOString(),
        endTime: new Date().toISOString(),
        executionTime: testDuration,
        data: {
          simulation: true,
          nodeExecutions: workflow.nodes?.map(node => ({
            nodeName: node.name,
            status: 'success',
            executionTime: Math.random() * 200 + 50,
            outputData: { 
              message: `Node ${node.name} executed successfully`,
              timestamp: new Date().toISOString()
            }
          })) || []
        }
      };
      
      console.log(`✅ Workflow test completed in ${testDuration}ms`);
      
      jsonResponse(res, {
        testResult: 'success',
        executionData: testResult,
        validation: {
          valid: validation.isValid,
          warnings: validation.warnings
        },
        _metadata: {
          test_time_ms: testDuration,
          tested_at: new Date().toISOString(),
          simulation_mode: true
        }
      });
      return;
    }
    
    // Get workflows
    if (path === '/api/flows' && method === 'GET') {
      const activeFilter = query.active === 'true' ? true : query.active === 'false' ? false : undefined;
      const workflows = await mockServices.db.getAllWorkflows(activeFilter);
      
      jsonResponse(res, {
        workflows,
        total: workflows.length,
        active_count: workflows.filter(w => w.active).length
      });
      return;
    }
    
    // Get specific workflow
    if (path.startsWith('/api/flows/') && method === 'GET') {
      const id = path.split('/').pop();
      const workflow = await mockServices.db.getWorkflow(id);
      
      if (!workflow) {
        jsonResponse(res, { error: 'Workflow not found' }, 404);
        return;
      }
      
      const executions = await mockServices.db.getExecutionsForWorkflow(id, 10);
      
      jsonResponse(res, {
        ...workflow,
        recent_executions: executions
      });
      return;
    }
    
    // Metrics
    if (path === '/api/metrics/json' && method === 'GET') {
      const stats = await mockServices.db.getWorkflowStats();
      const uptime = Math.floor((Date.now() - globalMetrics.startTime) / 1000);
      
      jsonResponse(res, {
        service: 'ai-service-full-native',
        metrics: {
          ...globalMetrics,
          uptime_seconds: uptime,
          memory_usage_mb: Math.round(process.memoryUsage().heapUsed / 1024 / 1024)
        },
        database_stats: stats,
        timestamp: new Date().toISOString()
      });
      return;
    }
    
    // Performance
    if (path === '/api/performance' && method === 'GET') {
      const hours = parseInt(query.hours) || 24;
      const stats = await mockServices.db.getWorkflowStats();
      const uptime = Math.floor((Date.now() - globalMetrics.startTime) / 1000);
      
      jsonResponse(res, {
        period_hours: hours,
        summary: {
          ...globalMetrics,
          uptime_seconds: uptime,
          memory_usage_mb: Math.round(process.memoryUsage().heapUsed / 1024 / 1024)
        },
        database_stats: stats,
        system_health: {
          memory_usage: process.memoryUsage(),
          uptime_seconds: uptime,
          database_connected: true
        },
        alerts: []
      });
      return;
    }
    
    // 404
    jsonResponse(res, {
      error: 'Not found',
      path: path,
      available_endpoints: [
        'GET /status',
        'POST /api/flow-gen',
        'POST /api/flow-update',
        'POST /api/flow-test',
        'GET /api/flows',
        'GET /api/flows/:id',
        'GET /api/metrics/json',
        'GET /api/performance'
      ]
    }, 404);
    
  } catch (error) {
    console.error(`❌ Error processing ${method} ${path}:`, error.message);
    jsonResponse(res, {
      error: 'Internal server error',
      details: error.message,
      path: path
    }, 500);
  } finally {
    const duration = Date.now() - startTime;
    console.log(`  → ${res.statusCode} (${duration}ms)`);
  }
});

// Iniciar servidor
const port = process.env.PORT || 3000;
server.listen(port, () => {
  console.log(`🚀 AI Service Full Stack (Native) running on port ${port}`);
  console.log(`📊 Health: http://localhost:${port}/status`);
  console.log(`🔥 All endpoints available!`);
  console.log(`💾 Using in-memory database simulation`);
  console.log(`🤖 Mock LLM integration active`);
  console.log(`✅ Full validation and metrics enabled`);
  console.log(`🏗️  Built with native Node.js HTTP server`);
  console.log(`\n🎯 Try these demos:`);
  console.log(`curl http://localhost:${port}/status`);
  console.log(`curl -X POST http://localhost:${port}/api/flow-gen -H "Content-Type: application/json" -d '{"description":"Create a comprehensive data processing pipeline"}'`);
  console.log(`curl http://localhost:${port}/api/metrics/json`);
  console.log(`\n📊 Monitor with: ./start-monitors.sh mini`);
});