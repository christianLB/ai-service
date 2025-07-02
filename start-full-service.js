#!/usr/bin/env node

// Servicio AI completo con simulación de base de datos
const express = require('express');
const { spawn } = require('child_process');

// Mock de la base de datos en memoria
let workflowsDB = [];
let executionsDB = [];
let metricsDB = [];
let idCounter = 1;

// Simulación de servicios
const mockServices = {
  // Mock Database
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
      console.log(`✅ Workflow created: ${id}`);
      return id;
    },
    
    async getWorkflow(id) {
      return workflowsDB.find(w => w.id === id) || null;
    },
    
    async getAllWorkflows(active) {
      if (active === undefined) return workflowsDB;
      return workflowsDB.filter(w => w.active === active);
    },
    
    async updateWorkflow(id, updates) {
      const index = workflowsDB.findIndex(w => w.id === id);
      if (index === -1) return false;
      
      workflowsDB[index] = {
        ...workflowsDB[index],
        ...updates,
        version: workflowsDB[index].version + 1,
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
    
    async recordMetric(name, value, type, tags) {
      metricsDB.push({
        id: idCounter++,
        metric_name: name,
        metric_value: value,
        metric_type: type,
        tags: tags || {},
        timestamp: new Date().toISOString()
      });
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
    },
    
    async healthCheck() {
      return true;
    }
  },
  
  // Mock Validator
  validator: {
    validateWorkflow(workflow) {
      const errors = [];
      const warnings = [];
      
      if (!workflow.name) errors.push('Workflow name is required');
      if (!workflow.nodes || workflow.nodes.length === 0) {
        errors.push('Workflow must have at least one node');
      }
      
      const hasStartNode = workflow.nodes?.some(node => 
        node.type === 'n8n-nodes-base.start' || 
        node.type === 'n8n-nodes-base.webhook' ||
        node.type === 'n8n-nodes-base.cron'
      );
      
      if (!hasStartNode) {
        errors.push('Workflow must have a trigger node');
      }
      
      // Simular advertencias
      if (workflow.nodes?.length > 10) {
        warnings.push('Workflow has many nodes, consider splitting');
      }
      
      return {
        isValid: errors.length === 0,
        errors,
        warnings
      };
    }
  },
  
  // Mock Metrics
  metrics: {
    workflows_generated: 0,
    validations_run: 0,
    api_requests: 0,
    llm_requests: 0,
    
    recordWorkflowGeneration(status, model, duration) {
      this.workflows_generated++;
      console.log(`📊 Workflow generation: ${status} (${model}) - ${duration}s`);
    },
    
    recordWorkflowValidation(status, error) {
      this.validations_run++;
      console.log(`✅ Workflow validation: ${status}`);
    },
    
    recordApiRequest(method, endpoint, statusCode, duration) {
      this.api_requests++;
    },
    
    recordLLMRequest(provider, model, duration, success) {
      this.llm_requests++;
      console.log(`🤖 LLM request: ${provider}/${model} - ${success ? 'success' : 'error'} (${duration}s)`);
    },
    
    async getMetricsJson() {
      const stats = await mockServices.db.getWorkflowStats();
      return {
        service: 'ai-service-full',
        metrics: {
          ...this,
          uptime_seconds: Math.floor(process.uptime()),
          memory_usage_mb: Math.round(process.memoryUsage().heapUsed / 1024 / 1024)
        },
        database_stats: stats,
        timestamp: new Date().toISOString()
      };
    },
    
    async checkAlerts() {
      const alerts = [];
      const memUsage = process.memoryUsage();
      const memPercent = (memUsage.heapUsed / memUsage.heapTotal) * 100;
      
      if (memPercent > 80) {
        alerts.push({
          level: 'warning',
          message: `High memory usage: ${memPercent.toFixed(1)}%`
        });
      }
      
      return alerts;
    }
  }
};

// Crear app Express
const app = express();
app.use(express.json({ limit: '10mb' }));

// Middleware de logging
app.use((req, res, next) => {
  const startTime = Date.now();
  mockServices.metrics.recordApiRequest(req.method, req.path, 200, 0);
  
  console.log(`${new Date().toISOString()} ${req.method} ${req.path}`);
  
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    console.log(`  → ${res.statusCode} (${duration}ms)`);
  });
  
  next();
});

// Health check
app.get('/status', async (req, res) => {
  const alerts = await mockServices.metrics.checkAlerts();
  const stats = await mockServices.db.getWorkflowStats();
  
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    database: 'connected',
    alerts: alerts.length,
    version: '2.0.0-full',
    stats
  });
});

// Generar workflow
app.post('/api/flow-gen', async (req, res) => {
  const startTime = Date.now();
  const { description, save = true } = req.body;
  
  try {
    if (!description) {
      return res.status(400).json({ error: 'Description is required' });
    }
    
    // Simular llamada a LLM
    console.log(`🤖 Generating workflow for: "${description}"`);
    const llmStartTime = Date.now();
    
    // Simular delay de LLM
    await new Promise(resolve => setTimeout(resolve, Math.random() * 1000 + 500));
    
    const llmDuration = (Date.now() - llmStartTime) / 1000;
    mockServices.metrics.recordLLMRequest('openai', 'gpt-4o', llmDuration, true);
    
    // Generar workflow mock
    const workflow = {
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
          id: 'process-1',
          name: 'Process Data',
          type: 'n8n-nodes-base.set',
          typeVersion: 1,
          position: [300, 200],
          parameters: {
            values: {
              string: [
                { name: 'description', value: description },
                { name: 'generated_at', value: new Date().toISOString() }
              ]
            }
          }
        },
        {
          id: 'output-1',
          name: 'Output',
          type: 'n8n-nodes-base.set',
          typeVersion: 1,
          position: [500, 200],
          parameters: {
            values: {
              string: [
                { name: 'result', value: 'Workflow completed successfully' }
              ]
            }
          }
        }
      ],
      connections: {
        'start-1': {
          main: [
            [{ node: 'process-1', type: 'main', index: 0 }]
          ]
        },
        'process-1': {
          main: [
            [{ node: 'output-1', type: 'main', index: 0 }]
          ]
        }
      },
      settings: {
        executionOrder: 'v1'
      }
    };
    
    // Validar workflow
    const validation = mockServices.validator.validateWorkflow(workflow);
    mockServices.metrics.recordWorkflowValidation(validation.isValid ? 'valid' : 'invalid');
    
    if (!validation.isValid) {
      mockServices.metrics.recordWorkflowGeneration('error', 'gpt-4o');
      return res.status(400).json({
        error: 'Generated workflow failed validation',
        validation_errors: validation.errors,
        warnings: validation.warnings
      });
    }
    
    // Guardar workflow
    let workflowId;
    if (save) {
      workflowId = await mockServices.db.createWorkflow({
        name: workflow.name,
        description: `Generated from: ${description}`,
        active: false,
        workflow_data: workflow,
        created_by: 'ai-service-full',
        tags: ['ai-generated', 'full-service']
      });
      
      // Crear ejecución
      await mockServices.db.createExecution({
        workflow_id: workflowId,
        status: 'success',
        input_data: { description },
        output_data: { workflow_generated: true }
      });
    }
    
    const totalDuration = (Date.now() - startTime) / 1000;
    mockServices.metrics.recordWorkflowGeneration('success', 'gpt-4o', totalDuration);
    
    res.json({
      ...workflow,
      _metadata: {
        id: workflowId,
        generated_at: new Date().toISOString(),
        generation_time_ms: Date.now() - startTime,
        validation: {
          valid: validation.isValid,
          warnings: validation.warnings
        },
        service_version: 'full'
      }
    });
    
  } catch (err) {
    mockServices.metrics.recordWorkflowGeneration('error', 'gpt-4o');
    console.error('Workflow generation failed:', err.message);
    res.status(500).json({ error: 'Failed to generate workflow', details: err.message });
  }
});

// Update workflow
app.post('/api/flow-update', async (req, res) => {
  const { workflowId, changes } = req.body;
  
  if (!workflowId || !changes) {
    return res.status(400).json({ error: 'workflowId and changes are required' });
  }
  
  const existingWorkflow = await mockServices.db.getWorkflow(workflowId);
  if (!existingWorkflow) {
    return res.status(404).json({ error: 'Workflow not found' });
  }
  
  // Simular actualización
  console.log(`🔄 Updating workflow ${workflowId}: ${changes}`);
  
  const updatedWorkflow = {
    ...existingWorkflow.workflow_data,
    name: `${existingWorkflow.workflow_data.name} (Updated)`
  };
  
  const validation = mockServices.validator.validateWorkflow(updatedWorkflow);
  if (!validation.isValid) {
    return res.status(400).json({
      error: 'Updated workflow failed validation',
      validation_errors: validation.errors
    });
  }
  
  await mockServices.db.updateWorkflow(workflowId, {
    workflow_data: updatedWorkflow,
    description: `${existingWorkflow.description} | Updated: ${changes}`
  });
  
  res.json({
    ...updatedWorkflow,
    _metadata: {
      id: workflowId,
      updated_at: new Date().toISOString(),
      changes: changes
    }
  });
});

// Test workflow
app.post('/api/flow-test', async (req, res) => {
  const { workflow, testData } = req.body;
  
  if (!workflow) {
    return res.status(400).json({ error: 'Workflow is required' });
  }
  
  const validation = mockServices.validator.validateWorkflow(workflow);
  if (!validation.isValid) {
    return res.status(400).json({
      error: 'Workflow failed validation',
      validation_errors: validation.errors
    });
  }
  
  console.log(`🧪 Testing workflow: ${workflow.name}`);
  
  // Simular ejecución
  const testResult = {
    executionId: `test-${Date.now()}`,
    status: 'success',
    startTime: new Date().toISOString(),
    endTime: new Date(Date.now() + 2000).toISOString(),
    executionTime: 2000,
    data: {
      simulation: true,
      nodeExecutions: workflow.nodes?.map(node => ({
        nodeName: node.name,
        status: 'success',
        executionTime: Math.random() * 100 + 50,
        outputData: { message: `Node ${node.name} executed successfully` }
      })) || []
    }
  };
  
  res.json({
    testResult: 'success',
    executionData: testResult,
    validation: {
      valid: validation.isValid,
      warnings: validation.warnings
    },
    _metadata: {
      test_time_ms: 2000,
      tested_at: new Date().toISOString(),
      simulation_mode: true
    }
  });
});

// Lista workflows
app.get('/api/flows', async (req, res) => {
  const { active } = req.query;
  const activeFilter = active === 'true' ? true : active === 'false' ? false : undefined;
  
  const workflows = await mockServices.db.getAllWorkflows(activeFilter);
  res.json({
    workflows,
    total: workflows.length,
    active_count: workflows.filter(w => w.active).length
  });
});

// Get workflow específico
app.get('/api/flows/:id', async (req, res) => {
  const { id } = req.params;
  const workflow = await mockServices.db.getWorkflow(id);
  
  if (!workflow) {
    return res.status(404).json({ error: 'Workflow not found' });
  }
  
  const executions = await mockServices.db.getExecutionsForWorkflow(id, 10);
  
  res.json({
    ...workflow,
    recent_executions: executions
  });
});

// Métricas
app.get('/api/metrics/json', async (req, res) => {
  const metrics = await mockServices.metrics.getMetricsJson();
  res.json(metrics);
});

// Performance
app.get('/api/performance', async (req, res) => {
  const hours = parseInt(req.query.hours) || 24;
  const metrics = await mockServices.metrics.getMetricsJson();
  const alerts = await mockServices.metrics.checkAlerts();
  
  res.json({
    period_hours: hours,
    summary: metrics.metrics,
    system_health: {
      memory_usage: process.memoryUsage(),
      uptime_seconds: process.uptime(),
      database_connected: true
    },
    alerts
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Not found',
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
  });
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`🚀 AI Service Full Stack running on port ${port}`);
  console.log(`📊 Health: http://localhost:${port}/status`);
  console.log(`🔥 All endpoints available!`);
  console.log(`💾 Using in-memory database simulation`);
  console.log(`🤖 Mock LLM integration active`);
  console.log(`✅ Full validation and metrics enabled`);
  console.log(`\n🎯 Try this demo:`);
  console.log(`curl -X POST http://localhost:${port}/api/flow-gen -H "Content-Type: application/json" -d '{"description":"Create a comprehensive data processing pipeline"}'`);
});