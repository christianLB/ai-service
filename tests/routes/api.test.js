"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const supertest_1 = __importDefault(require("supertest"));
const express_1 = __importDefault(require("express"));
const flow_gen_1 = __importDefault(require("../../src/routes/flow-gen"));
const flow_update_1 = __importDefault(require("../../src/routes/flow-update"));
const flow_test_1 = __importDefault(require("../../src/routes/flow-test"));
// Mock services
jest.mock('../../src/services/openai', () => ({
    openai: {
        chat: {
            completions: {
                create: jest.fn()
            }
        }
    }
}));
jest.mock('../../src/services/validator', () => ({
    validateWorkflow: jest.fn(),
    validateWorkflowUpdate: jest.fn()
}));
jest.mock('../../src/services/database', () => ({
    db: {
        createWorkflow: jest.fn(),
        getWorkflow: jest.fn(),
        updateWorkflow: jest.fn(),
        getAllWorkflows: jest.fn(),
        createExecution: jest.fn(),
        updateExecution: jest.fn()
    }
}));
const openai_1 = require("../../src/services/openai");
const validator_1 = require("../../src/services/validator");
const database_1 = require("../../src/services/database");
describe('API Routes Integration Tests', () => {
    let app;
    beforeEach(() => {
        app = (0, express_1.default)();
        app.use(express_1.default.json());
        app.use(flow_gen_1.default);
        app.use(flow_update_1.default);
        app.use(flow_test_1.default);
        // Reset mocks
        jest.clearAllMocks();
    });
    describe('POST /flow-gen', () => {
        const mockWorkflow = {
            name: 'Generated Workflow',
            nodes: [
                {
                    id: 'start-1',
                    name: 'Start',
                    type: 'n8n-nodes-base.start',
                    position: [100, 200]
                }
            ],
            connections: {}
        };
        it('should generate a workflow successfully', async () => {
            // Mock OpenAI response
            openai_1.openai.chat.completions.create.mockResolvedValue({
                choices: [
                    {
                        message: {
                            content: JSON.stringify(mockWorkflow)
                        }
                    }
                ]
            });
            // Mock validation
            validator_1.validateWorkflow.mockReturnValue({
                isValid: true,
                errors: [],
                warnings: []
            });
            // Mock database
            database_1.db.createWorkflow.mockResolvedValue('workflow-123');
            const response = await (0, supertest_1.default)(app)
                .post('/flow-gen')
                .send({ description: 'Create a simple workflow' })
                .expect(200);
            expect(response.body).toEqual(mockWorkflow);
            expect(openai_1.openai.chat.completions.create).toHaveBeenCalledWith({
                model: 'gpt-4o',
                messages: expect.arrayContaining([
                    expect.objectContaining({
                        role: 'user'
                    })
                ])
            });
        });
        it('should handle validation errors', async () => {
            // Mock OpenAI response
            openai_1.openai.chat.completions.create.mockResolvedValue({
                choices: [
                    {
                        message: {
                            content: JSON.stringify(mockWorkflow)
                        }
                    }
                ]
            });
            // Mock validation failure
            validator_1.validateWorkflow.mockReturnValue({
                isValid: false,
                errors: ['Missing required trigger node'],
                warnings: []
            });
            const response = await (0, supertest_1.default)(app)
                .post('/flow-gen')
                .send({ description: 'Create a simple workflow' })
                .expect(400);
            expect(response.body).toHaveProperty('error');
            expect(response.body).toHaveProperty('validation_errors');
        });
        it('should handle OpenAI API errors', async () => {
            openai_1.openai.chat.completions.create.mockRejectedValue(new Error('API Error'));
            const response = await (0, supertest_1.default)(app)
                .post('/flow-gen')
                .send({ description: 'Create a simple workflow' })
                .expect(500);
            expect(response.body).toHaveProperty('error');
        });
        it('should handle invalid JSON from OpenAI', async () => {
            openai_1.openai.chat.completions.create.mockResolvedValue({
                choices: [
                    {
                        message: {
                            content: 'Invalid JSON response'
                        }
                    }
                ]
            });
            const response = await (0, supertest_1.default)(app)
                .post('/flow-gen')
                .send({ description: 'Create a simple workflow' })
                .expect(500);
            expect(response.body).toHaveProperty('error');
        });
        it('should require description parameter', async () => {
            const response = await (0, supertest_1.default)(app)
                .post('/flow-gen')
                .send({})
                .expect(400);
            expect(response.body).toHaveProperty('error');
        });
    });
    describe('POST /flow-update', () => {
        const existingWorkflow = {
            id: 'workflow-123',
            name: 'Existing Workflow',
            nodes: [],
            connections: {}
        };
        const updatedWorkflow = {
            ...existingWorkflow,
            name: 'Updated Workflow'
        };
        it('should update a workflow successfully', async () => {
            database_1.db.getWorkflow.mockResolvedValue(existingWorkflow);
            openai_1.openai.chat.completions.create.mockResolvedValue({
                choices: [
                    {
                        message: {
                            content: JSON.stringify(updatedWorkflow)
                        }
                    }
                ]
            });
            validator_1.validateWorkflowUpdate.mockReturnValue({
                isValid: true,
                errors: [],
                warnings: []
            });
            database_1.db.updateWorkflow.mockResolvedValue(true);
            const response = await (0, supertest_1.default)(app)
                .post('/flow-update')
                .send({
                workflowId: 'workflow-123',
                changes: 'Update the workflow name'
            })
                .expect(200);
            expect(response.body).toEqual(updatedWorkflow);
            expect(database_1.db.getWorkflow).toHaveBeenCalledWith('workflow-123');
            expect(database_1.db.updateWorkflow).toHaveBeenCalled();
        });
        it('should handle non-existent workflow', async () => {
            database_1.db.getWorkflow.mockResolvedValue(null);
            const response = await (0, supertest_1.default)(app)
                .post('/flow-update')
                .send({
                workflowId: 'non-existent-id',
                changes: 'Update something'
            })
                .expect(404);
            expect(response.body).toHaveProperty('error');
        });
        it('should handle update validation errors', async () => {
            database_1.db.getWorkflow.mockResolvedValue(existingWorkflow);
            openai_1.openai.chat.completions.create.mockResolvedValue({
                choices: [
                    {
                        message: {
                            content: JSON.stringify({ ...updatedWorkflow, id: 'different-id' })
                        }
                    }
                ]
            });
            validator_1.validateWorkflowUpdate.mockReturnValue({
                isValid: false,
                errors: ['ID cannot be changed'],
                warnings: []
            });
            const response = await (0, supertest_1.default)(app)
                .post('/flow-update')
                .send({
                workflowId: 'workflow-123',
                changes: 'Change the ID'
            })
                .expect(400);
            expect(response.body).toHaveProperty('validation_errors');
        });
    });
    describe('POST /flow-test', () => {
        const testWorkflow = {
            name: 'Test Workflow',
            nodes: [
                {
                    id: 'start-1',
                    name: 'Start',
                    type: 'n8n-nodes-base.start',
                    position: [100, 200]
                }
            ],
            connections: {}
        };
        it('should test a workflow successfully', async () => {
            validator_1.validateWorkflow.mockReturnValue({
                isValid: true,
                errors: [],
                warnings: []
            });
            const response = await (0, supertest_1.default)(app)
                .post('/flow-test')
                .send({
                workflow: testWorkflow,
                testData: {}
            })
                .expect(200);
            expect(response.body).toHaveProperty('testResult');
            expect(response.body.testResult).toBe('success');
        });
        it('should handle workflow validation errors in testing', async () => {
            validator_1.validateWorkflow.mockReturnValue({
                isValid: false,
                errors: ['Invalid workflow structure'],
                warnings: []
            });
            const response = await (0, supertest_1.default)(app)
                .post('/flow-test')
                .send({
                workflow: testWorkflow,
                testData: {}
            })
                .expect(400);
            expect(response.body).toHaveProperty('error');
            expect(response.body).toHaveProperty('validation_errors');
        });
        it('should require workflow parameter', async () => {
            const response = await (0, supertest_1.default)(app)
                .post('/flow-test')
                .send({ testData: {} })
                .expect(400);
            expect(response.body).toHaveProperty('error');
        });
    });
});
