import request from 'supertest';
import express from 'express';
import flowGen from '../../src/routes/flow-gen';
import flowUpdate from '../../src/routes/flow-update';
import flowTest from '../../src/routes/flow-test';

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

import { getOpenAIClient } from '../../src/services/openai';
import { validateWorkflow, validateWorkflowUpdate } from '../../src/services/validator';
import { db } from '../../src/services/database';

const mockOpenAI = {
  chat: {
    completions: {
      create: jest.fn()
    }
  }
};

jest.mock('../../src/services/openai', () => ({
  getOpenAIClient: jest.fn(() => mockOpenAI)
}));

describe('API Routes Integration Tests', () => {
  let app: express.Application;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use(flowGen);
    app.use(flowUpdate);
    app.use(flowTest);

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
      (mockOpenAI.chat.completions.create as jest.Mock).mockResolvedValue({
        choices: [
          {
            message: {
              content: JSON.stringify(mockWorkflow)
            }
          }
        ]
      });

      // Mock validation
      (validateWorkflow as jest.Mock).mockReturnValue({
        isValid: true,
        errors: [],
        warnings: []
      });

      // Mock database
      (db.createWorkflow as jest.Mock).mockResolvedValue('workflow-123');

      const response = await request(app)
        .post('/flow-gen')
        .send({ description: 'Create a simple workflow' })
        .expect(200);

      expect(response.body).toEqual(mockWorkflow);
      expect(openai.chat.completions.create).toHaveBeenCalledWith({
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
      (openai.chat.completions.create as jest.Mock).mockResolvedValue({
        choices: [
          {
            message: {
              content: JSON.stringify(mockWorkflow)
            }
          }
        ]
      });

      // Mock validation failure
      (validateWorkflow as jest.Mock).mockReturnValue({
        isValid: false,
        errors: ['Missing required trigger node'],
        warnings: []
      });

      const response = await request(app)
        .post('/flow-gen')
        .send({ description: 'Create a simple workflow' })
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body).toHaveProperty('validation_errors');
    });

    it('should handle OpenAI API errors', async () => {
      (openai.chat.completions.create as jest.Mock).mockRejectedValue(new Error('API Error'));

      const response = await request(app)
        .post('/flow-gen')
        .send({ description: 'Create a simple workflow' })
        .expect(500);

      expect(response.body).toHaveProperty('error');
    });

    it('should handle invalid JSON from OpenAI', async () => {
      (openai.chat.completions.create as jest.Mock).mockResolvedValue({
        choices: [
          {
            message: {
              content: 'Invalid JSON response'
            }
          }
        ]
      });

      const response = await request(app)
        .post('/flow-gen')
        .send({ description: 'Create a simple workflow' })
        .expect(500);

      expect(response.body).toHaveProperty('error');
    });

    it('should require description parameter', async () => {
      const response = await request(app)
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
      (db.getWorkflow as jest.Mock).mockResolvedValue(existingWorkflow);
      (openai.chat.completions.create as jest.Mock).mockResolvedValue({
        choices: [
          {
            message: {
              content: JSON.stringify(updatedWorkflow)
            }
          }
        ]
      });
      (validateWorkflowUpdate as jest.Mock).mockReturnValue({
        isValid: true,
        errors: [],
        warnings: []
      });
      (db.updateWorkflow as jest.Mock).mockResolvedValue(true);

      const response = await request(app)
        .post('/flow-update')
        .send({
          workflowId: 'workflow-123',
          changes: 'Update the workflow name'
        })
        .expect(200);

      expect(response.body).toEqual(updatedWorkflow);
      expect(db.getWorkflow).toHaveBeenCalledWith('workflow-123');
      expect(db.updateWorkflow).toHaveBeenCalled();
    });

    it('should handle non-existent workflow', async () => {
      (db.getWorkflow as jest.Mock).mockResolvedValue(null);

      const response = await request(app)
        .post('/flow-update')
        .send({
          workflowId: 'non-existent-id',
          changes: 'Update something'
        })
        .expect(404);

      expect(response.body).toHaveProperty('error');
    });

    it('should handle update validation errors', async () => {
      (db.getWorkflow as jest.Mock).mockResolvedValue(existingWorkflow);
      (openai.chat.completions.create as jest.Mock).mockResolvedValue({
        choices: [
          {
            message: {
              content: JSON.stringify({ ...updatedWorkflow, id: 'different-id' })
            }
          }
        ]
      });
      (validateWorkflowUpdate as jest.Mock).mockReturnValue({
        isValid: false,
        errors: ['ID cannot be changed'],
        warnings: []
      });

      const response = await request(app)
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
      (validateWorkflow as jest.Mock).mockReturnValue({
        isValid: true,
        errors: [],
        warnings: []
      });

      const response = await request(app)
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
      (validateWorkflow as jest.Mock).mockReturnValue({
        isValid: false,
        errors: ['Invalid workflow structure'],
        warnings: []
      });

      const response = await request(app)
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
      const response = await request(app)
        .post('/flow-test')
        .send({ testData: {} })
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });
  });
});