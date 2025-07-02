import { validateWorkflow, validateWorkflowUpdate } from '../../src/services/validator';

describe('Validator Service', () => {
  describe('validateWorkflow', () => {
    const validWorkflow = {
      name: 'Test Workflow',
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
          name: 'Set Data',
          type: 'n8n-nodes-base.set',
          typeVersion: 1,
          position: [300, 200],
          parameters: {
            values: {
              string: [
                {
                  name: 'message',
                  value: 'Hello World'
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

    it('should validate a correct workflow', () => {
      const result = validateWorkflow(validWorkflow);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject workflow without name', () => {
      const invalidWorkflow = { ...validWorkflow };
      delete invalidWorkflow.name;
      
      const result = validateWorkflow(invalidWorkflow);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(expect.stringContaining('name'));
    });

    it('should reject workflow without nodes', () => {
      const invalidWorkflow = { ...validWorkflow, nodes: [] };
      
      const result = validateWorkflow(invalidWorkflow);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(expect.stringContaining('nodes'));
    });

    it('should reject workflow without trigger node', () => {
      const invalidWorkflow = {
        ...validWorkflow,
        nodes: [
          {
            id: 'set-1',
            name: 'Set Data',
            type: 'n8n-nodes-base.set',
            typeVersion: 1,
            position: [300, 200],
            parameters: {}
          }
        ]
      };
      
      const result = validateWorkflow(invalidWorkflow);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(expect.stringContaining('trigger node'));
    });

    it('should reject workflow with forbidden node types', () => {
      const invalidWorkflow = {
        ...validWorkflow,
        nodes: [
          ...validWorkflow.nodes,
          {
            id: 'evil-1',
            name: 'Evil Node',
            type: 'evil-node-type',
            typeVersion: 1,
            position: [500, 200],
            parameters: {}
          }
        ]
      };
      
      const result = validateWorkflow(invalidWorkflow);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(expect.stringContaining('not allowed'));
    });

    it('should reject workflow with too many nodes', () => {
      const nodes = Array.from({ length: 51 }, (_, i) => ({
        id: `node-${i}`,
        name: `Node ${i}`,
        type: 'n8n-nodes-base.set',
        typeVersion: 1,
        position: [100 + i * 50, 200],
        parameters: {}
      }));
      
      nodes[0].type = 'n8n-nodes-base.start'; // Añadir trigger
      
      const invalidWorkflow = {
        ...validWorkflow,
        nodes
      };
      
      const result = validateWorkflow(invalidWorkflow);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(expect.stringContaining('maximum nodes limit'));
    });

    it('should reject workflow with duplicate node IDs', () => {
      const invalidWorkflow = {
        ...validWorkflow,
        nodes: [
          ...validWorkflow.nodes,
          {
            id: 'start-1', // Duplicate ID
            name: 'Duplicate Start',
            type: 'n8n-nodes-base.start',
            typeVersion: 1,
            position: [500, 200],
            parameters: {}
          }
        ]
      };
      
      const result = validateWorkflow(invalidWorkflow);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(expect.stringContaining('Duplicate node IDs'));
    });

    it('should reject workflow with invalid connections', () => {
      const invalidWorkflow = {
        ...validWorkflow,
        connections: {
          'non-existent-node': {
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
        }
      };
      
      const result = validateWorkflow(invalidWorkflow);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(expect.stringContaining('non-existent source node'));
    });

    it('should warn about disconnected nodes', () => {
      const workflowWithDisconnected = {
        ...validWorkflow,
        nodes: [
          ...validWorkflow.nodes,
          {
            id: 'disconnected-1',
            name: 'Disconnected Node',
            type: 'n8n-nodes-base.set',
            typeVersion: 1,
            position: [500, 200],
            parameters: {}
          }
        ]
      };
      
      const result = validateWorkflow(workflowWithDisconnected);
      expect(result.isValid).toBe(true);
      expect(result.warnings).toContain(expect.stringContaining('disconnected nodes'));
    });

    it('should reject function nodes with forbidden code', () => {
      const dangerousWorkflow = {
        ...validWorkflow,
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
            id: 'function-1',
            name: 'Dangerous Function',
            type: 'n8n-nodes-base.function',
            typeVersion: 1,
            position: [300, 200],
            parameters: {
              functionCode: 'const fs = require(\"fs\"); fs.readFileSync(\"/etc/passwd\");'
            }
          }
        ]
      };
      
      const result = validateWorkflow(dangerousWorkflow);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(expect.stringContaining('forbidden code'));
    });
  });

  describe('validateWorkflowUpdate', () => {
    const existingWorkflow = {
      id: 'workflow-123',
      name: 'Existing Workflow',
      active: true,
      nodes: [
        {
          id: 'start-1',
          name: 'Start',
          type: 'n8n-nodes-base.start',
          typeVersion: 1,
          position: [100, 200],
          parameters: {}
        }
      ]
    };

    it('should validate workflow update with same ID', () => {
      const updatedWorkflow = {
        ...existingWorkflow,
        name: 'Updated Workflow'
      };
      
      const result = validateWorkflowUpdate(existingWorkflow, updatedWorkflow);
      expect(result.isValid).toBe(true);
    });

    it('should reject workflow update with different ID', () => {
      const updatedWorkflow = {
        ...existingWorkflow,
        id: 'different-id'
      };
      
      const result = validateWorkflowUpdate(existingWorkflow, updatedWorkflow);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(expect.stringContaining('ID cannot be changed'));
    });

    it('should warn when deactivating workflow', () => {
      const updatedWorkflow = {
        ...existingWorkflow,
        active: false
      };
      
      const result = validateWorkflowUpdate(existingWorkflow, updatedWorkflow);
      expect(result.isValid).toBe(true);
      expect(result.warnings).toContain(expect.stringContaining('deactivated'));
    });
  });
});