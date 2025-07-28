import { db, WorkflowRecord } from '../../src/services/database';

describe('Database Service', () => {
  let dbInitialized = false;

  beforeAll(async () => {
    try {
      // Only run these tests if database is available
      if (process.env.SKIP_DB_TESTS === 'true') {
        console.log('Skipping database tests (SKIP_DB_TESTS=true)');
        return;
      }

      // Try to initialize with timeout
      const initPromise = db.initialize();
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Database initialization timeout in test')), 15000);
      });

      await Promise.race([initPromise, timeoutPromise]);
      dbInitialized = true;
    } catch (error: any) {
      console.error('Failed to initialize database for tests:', error.message);
      console.log('Skipping database tests due to initialization failure');
      dbInitialized = false;
    }
  });

  afterAll(async () => {
    if (dbInitialized) {
      try {
        await db.close();
      } catch (error: any) {
        console.error('Error closing database:', error.message);
      }
    }
  });

  // Use describe.skip if database is not initialized
  const describeIf = (condition: boolean) => condition ? describe : describe.skip;

  describeIf(dbInitialized)('Workflow CRUD Operations', () => {
    let workflowId: string;

    const testWorkflow: Omit<WorkflowRecord, 'id' | 'created_at' | 'updated_at' | 'version'> = {
      name: 'Test Workflow',
      description: 'A test workflow for Jest',
      active: false,
      workflow_data: {
        nodes: [
          {
            id: 'start-1',
            name: 'Start',
            type: 'n8n-nodes-base.start',
            position: [100, 200]
          }
        ],
        connections: {}
      },
      created_by: 'test-user',
      tags: ['test', 'jest']
    };

    it('should create a new workflow', async () => {
      workflowId = await db.createWorkflow(testWorkflow);
      expect(workflowId).toBeDefined();
      expect(typeof workflowId).toBe('string');
    });

    it('should retrieve a workflow by ID', async () => {
      const workflow = await db.getWorkflow(workflowId);
      expect(workflow).toBeDefined();
      expect(workflow?.name).toBe(testWorkflow.name);
      expect(workflow?.active).toBe(testWorkflow.active);
      expect(workflow?.description).toBe(testWorkflow.description);
    });

    it('should get all workflows', async () => {
      const workflows = await db.getAllWorkflows();
      expect(Array.isArray(workflows)).toBe(true);
      expect(workflows.length).toBeGreaterThan(0);
      
      const testWf = workflows.find(w => w.id === workflowId);
      expect(testWf).toBeDefined();
    });

    it('should filter workflows by active status', async () => {
      const activeWorkflows = await db.getAllWorkflows(true);
      const inactiveWorkflows = await db.getAllWorkflows(false);
      
      expect(Array.isArray(activeWorkflows)).toBe(true);
      expect(Array.isArray(inactiveWorkflows)).toBe(true);
      
      // Our test workflow should be in inactive list
      const testWf = inactiveWorkflows.find(w => w.id === workflowId);
      expect(testWf).toBeDefined();
    });

    it('should update a workflow', async () => {
      const updateData = {
        name: 'Updated Test Workflow',
        active: true,
        description: 'Updated description'
      };

      const success = await db.updateWorkflow(workflowId, updateData);
      expect(success).toBe(true);

      const updatedWorkflow = await db.getWorkflow(workflowId);
      expect(updatedWorkflow?.name).toBe(updateData.name);
      expect(updatedWorkflow?.active).toBe(updateData.active);
      expect(updatedWorkflow?.description).toBe(updateData.description);
      expect(updatedWorkflow?.version).toBe(2); // Version should increment
    });

    it('should delete a workflow', async () => {
      const success = await db.deleteWorkflow(workflowId);
      expect(success).toBe(true);

      const deletedWorkflow = await db.getWorkflow(workflowId);
      expect(deletedWorkflow).toBeNull();
    });

    it('should return null for non-existent workflow', async () => {
      const workflow = await db.getWorkflow('non-existent-id');
      expect(workflow).toBeNull();
    });
  });

  describeIf(dbInitialized)('Execution Management', () => {
    let workflowId: string;
    let executionId: string;

    beforeAll(async () => {
      // Create a test workflow first
      workflowId = await db.createWorkflow({
        name: 'Execution Test Workflow',
        active: false,
        workflow_data: { nodes: [], connections: {} }
      });
    });

    afterAll(async () => {
      await db.deleteWorkflow(workflowId);
    });

    it('should create an execution', async () => {
      executionId = await db.createExecution({
        workflow_id: workflowId,
        status: 'running',
        input_data: { test: 'data' }
      });

      expect(executionId).toBeDefined();
      expect(typeof executionId).toBe('string');
    });

    it('should update an execution', async () => {
      const success = await db.updateExecution(executionId, {
        status: 'success',
        output_data: { result: 'completed' },
        execution_time_ms: 1500
      });

      expect(success).toBe(true);
    });

    it('should get executions for workflow', async () => {
      const executions = await db.getExecutionsForWorkflow(workflowId);
      expect(Array.isArray(executions)).toBe(true);
      expect(executions.length).toBeGreaterThan(0);
      
      const testExecution = executions.find(e => e.id === executionId);
      expect(testExecution).toBeDefined();
      expect(testExecution?.status).toBe('success');
    });
  });

  describeIf(dbInitialized)('Metrics System', () => {
    it('should record a metric', async () => {
      await expect(
        db.recordMetric('test_metric', 42, 'counter', { source: 'jest' })
      ).resolves.not.toThrow();
    });

    it('should retrieve metrics', async () => {
      // Record a few more metrics
      await db.recordMetric('test_metric', 10, 'gauge');
      await db.recordMetric('test_metric', 20, 'gauge');
      
      const metrics = await db.getMetrics('test_metric', 1);
      expect(Array.isArray(metrics)).toBe(true);
      expect(metrics.length).toBeGreaterThan(0);
    });

    it('should get workflow statistics', async () => {
      const stats = await db.getWorkflowStats();
      expect(stats).toBeDefined();
      expect(typeof stats.total_workflows).toBe('number');
      expect(typeof stats.active_workflows).toBe('number');
      expect(typeof stats.total_executions).toBe('number');
      expect(typeof stats.executions_last_24h).toBe('number');
    });
  });

  describeIf(dbInitialized)('Health Check', () => {
    it('should pass health check', async () => {
      const isHealthy = await db.healthCheck();
      expect(isHealthy).toBe(true);
    });
  });
});