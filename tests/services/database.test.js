"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const database_1 = require("../../src/services/database");
describe('Database Service', () => {
    beforeAll(async () => {
        await database_1.db.initialize();
    });
    afterAll(async () => {
        await database_1.db.close();
    });
    describe('Workflow CRUD Operations', () => {
        let workflowId;
        const testWorkflow = {
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
            workflowId = await database_1.db.createWorkflow(testWorkflow);
            expect(workflowId).toBeDefined();
            expect(typeof workflowId).toBe('string');
        });
        it('should retrieve a workflow by ID', async () => {
            const workflow = await database_1.db.getWorkflow(workflowId);
            expect(workflow).toBeDefined();
            expect(workflow?.name).toBe(testWorkflow.name);
            expect(workflow?.active).toBe(testWorkflow.active);
            expect(workflow?.description).toBe(testWorkflow.description);
        });
        it('should get all workflows', async () => {
            const workflows = await database_1.db.getAllWorkflows();
            expect(Array.isArray(workflows)).toBe(true);
            expect(workflows.length).toBeGreaterThan(0);
            const testWf = workflows.find(w => w.id === workflowId);
            expect(testWf).toBeDefined();
        });
        it('should filter workflows by active status', async () => {
            const activeWorkflows = await database_1.db.getAllWorkflows(true);
            const inactiveWorkflows = await database_1.db.getAllWorkflows(false);
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
            const success = await database_1.db.updateWorkflow(workflowId, updateData);
            expect(success).toBe(true);
            const updatedWorkflow = await database_1.db.getWorkflow(workflowId);
            expect(updatedWorkflow?.name).toBe(updateData.name);
            expect(updatedWorkflow?.active).toBe(updateData.active);
            expect(updatedWorkflow?.description).toBe(updateData.description);
            expect(updatedWorkflow?.version).toBe(2); // Version should increment
        });
        it('should delete a workflow', async () => {
            const success = await database_1.db.deleteWorkflow(workflowId);
            expect(success).toBe(true);
            const deletedWorkflow = await database_1.db.getWorkflow(workflowId);
            expect(deletedWorkflow).toBeNull();
        });
        it('should return null for non-existent workflow', async () => {
            const workflow = await database_1.db.getWorkflow('non-existent-id');
            expect(workflow).toBeNull();
        });
    });
    describe('Execution Management', () => {
        let workflowId;
        let executionId;
        beforeAll(async () => {
            // Create a test workflow first
            workflowId = await database_1.db.createWorkflow({
                name: 'Execution Test Workflow',
                active: false,
                workflow_data: { nodes: [], connections: {} }
            });
        });
        afterAll(async () => {
            await database_1.db.deleteWorkflow(workflowId);
        });
        it('should create an execution', async () => {
            executionId = await database_1.db.createExecution({
                workflow_id: workflowId,
                status: 'running',
                input_data: { test: 'data' }
            });
            expect(executionId).toBeDefined();
            expect(typeof executionId).toBe('string');
        });
        it('should update an execution', async () => {
            const success = await database_1.db.updateExecution(executionId, {
                status: 'success',
                output_data: { result: 'completed' },
                execution_time_ms: 1500
            });
            expect(success).toBe(true);
        });
        it('should get executions for workflow', async () => {
            const executions = await database_1.db.getExecutionsForWorkflow(workflowId);
            expect(Array.isArray(executions)).toBe(true);
            expect(executions.length).toBeGreaterThan(0);
            const testExecution = executions.find(e => e.id === executionId);
            expect(testExecution).toBeDefined();
            expect(testExecution?.status).toBe('success');
        });
    });
    describe('Metrics System', () => {
        it('should record a metric', async () => {
            await expect(database_1.db.recordMetric('test_metric', 42, 'counter', { source: 'jest' })).resolves.not.toThrow();
        });
        it('should retrieve metrics', async () => {
            // Record a few more metrics
            await database_1.db.recordMetric('test_metric', 10, 'gauge');
            await database_1.db.recordMetric('test_metric', 20, 'gauge');
            const metrics = await database_1.db.getMetrics('test_metric', 1);
            expect(Array.isArray(metrics)).toBe(true);
            expect(metrics.length).toBeGreaterThan(0);
        });
        it('should get workflow statistics', async () => {
            const stats = await database_1.db.getWorkflowStats();
            expect(stats).toBeDefined();
            expect(typeof stats.total_workflows).toBe('number');
            expect(typeof stats.active_workflows).toBe('number');
            expect(typeof stats.total_executions).toBe('number');
            expect(typeof stats.executions_last_24h).toBe('number');
        });
    });
    describe('Health Check', () => {
        it('should pass health check', async () => {
            const isHealthy = await database_1.db.healthCheck();
            expect(isHealthy).toBe(true);
        });
    });
});
