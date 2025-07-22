const { exec } = require('child_process');
const { promisify } = require('util');
const path = require('path');
const fs = require('fs');

const execAsync = promisify(exec);

describe('parsePrismaModel functionality', () => {
  const scriptPath = path.join(__dirname, '../../scripts/generate-crud.mjs');
  const testSchemaPath = path.join(__dirname, 'fixtures/test-schema.prisma');

  // Helper to run the parsePrismaModel function via node
  async function testParsePrismaModel(modelName) {
    // Create a test script that calls parsePrismaModel and outputs JSON
    const testScript = `
import { parsePrismaModel } from '${scriptPath}';

// Override the schema path for testing
import { readFile } from 'fs/promises';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Mock readFile to use test schema
const originalReadFile = readFile;
global.readFile = async (path) => {
  if (path.includes('schema.prisma')) {
    return originalReadFile('${testSchemaPath}');
  }
  return originalReadFile(path);
};

parsePrismaModel('${modelName}')
  .then(result => {
    console.log(JSON.stringify(result));
    process.exit(0);
  })
  .catch(err => {
    console.error(JSON.stringify({ error: err.message }));
    process.exit(1);
  });
`;

    try {
      const { stdout, stderr } = await execAsync(
        `node --input-type=module -e "${testScript.replace(/"/g, '\\"').replace(/\n/g, ' ')}"`
      );
      
      if (stderr) {
        const errorData = JSON.parse(stderr);
        throw new Error(errorData.error);
      }
      
      return JSON.parse(stdout);
    } catch (error) {
      if (error.stderr) {
        const errorData = JSON.parse(error.stderr);
        throw new Error(errorData.error);
      }
      throw error;
    }
  }

  describe('Basic model parsing', () => {
    it('should parse a simple model with basic fields', async () => {
      const result = await testParsePrismaModel('TestModel');

      expect(result.name).toBe('TestModel');
      expect(result.schema).toBe('public');
      expect(result.fields).toHaveLength(6);
      
      const idField = result.fields.find(f => f.name === 'id');
      expect(idField).toMatchObject({
        name: 'id',
        type: 'String',
        isId: true,
        hasDefault: true,
        defaultValue: 'uuid()'
      });

      const nameField = result.fields.find(f => f.name === 'name');
      expect(nameField).toMatchObject({
        name: 'name',
        type: 'String',
        isOptional: false,
        hasDefault: false
      });

      const descriptionField = result.fields.find(f => f.name === 'description');
      expect(descriptionField).toMatchObject({
        name: 'description',
        type: 'String',
        isOptional: true
      });
    });

    it('should parse a model with relations', async () => {
      const result = await testParsePrismaModel('TestPost');

      expect(result.relations).toHaveLength(1);
      expect(result.relations[0]).toMatchObject({
        name: 'user',
        type: 'TestUser',
        isRelation: true
      });

      // Should also have userId field
      const userIdField = result.fields.find(f => f.name === 'userId');
      expect(userIdField).toMatchObject({
        name: 'userId',
        type: 'String'
      });
    });

    it('should parse a model in different schema', async () => {
      const result = await testParsePrismaModel('TestTrade');

      expect(result.schema).toBe('trading');
      
      const symbolField = result.fields.find(f => f.name === 'symbol');
      expect(symbolField).toBeTruthy();
      expect(symbolField.type).toBe('String');

      const quantityField = result.fields.find(f => f.name === 'quantity');
      expect(quantityField).toBeTruthy();
      expect(quantityField.type).toBe('Float');
    });

    it('should parse complex model like Alert', async () => {
      const result = await testParsePrismaModel('TestAlert');

      const severityField = result.fields.find(f => f.name === 'severity');
      expect(severityField).toMatchObject({
        name: 'severity',
        type: 'String',
        hasDefault: true,
        defaultValue: '"info"'
      });

      const dataField = result.fields.find(f => f.name === 'data');
      expect(dataField).toMatchObject({
        name: 'data',
        type: 'Json',
        isOptional: true,
        hasDefault: true
      });
    });
  });

  describe('Error handling', () => {
    it('should throw error when model does not exist', async () => {
      await expect(testParsePrismaModel('NonExistentModel')).rejects.toThrow(
        'Model "NonExistentModel" not found in schema.prisma'
      );
    });
  });

  describe('Field type detection', () => {
    it('should correctly identify optional fields', async () => {
      const result = await testParsePrismaModel('TestPost');
      const contentField = result.fields.find(f => f.name === 'content');
      
      expect(contentField?.isOptional).toBe(true);
    });

    it('should correctly identify unique fields', async () => {
      const result = await testParsePrismaModel('TestUser');
      const emailField = result.fields.find(f => f.name === 'email');
      
      expect(emailField?.isUnique).toBe(true);
    });

    it('should handle models with array relations', async () => {
      const result = await testParsePrismaModel('TestUser');
      
      expect(result.relations).toHaveLength(1);
      const postsRelation = result.relations[0];
      
      expect(postsRelation).toMatchObject({
        name: 'posts',
        type: 'TestPost',
        isArray: true,
        isRelation: true
      });
    });
  });
});