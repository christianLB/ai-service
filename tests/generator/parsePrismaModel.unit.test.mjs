#!/usr/bin/env node

/**
 * Unit tests for parsePrismaModel function
 */

import { parsePrismaModel } from '../../scripts/parsePrismaModel.mjs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFile } from 'fs/promises';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const testSchemaPath = join(__dirname, 'fixtures/test-schema.prisma');

// Test utilities
let testResults = { passed: 0, failed: 0, tests: [] };

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function assertEquals(actual, expected, message) {
  if (actual !== expected) {
    throw new Error(`${message}: expected ${expected}, got ${actual}`);
  }
}

function assertContains(array, item, message) {
  if (!array.some(el => JSON.stringify(el).includes(JSON.stringify(item)))) {
    throw new Error(`${message}: array does not contain expected item`);
  }
}

async function test(name, fn) {
  process.stdout.write(`  ${name}... `);
  try {
    await fn();
    console.log('✅');
    testResults.passed++;
    testResults.tests.push({ name, status: 'passed' });
  } catch (error) {
    console.log(`❌ ${error.message}`);
    testResults.failed++;
    testResults.tests.push({ name, status: 'failed', error: error.message });
  }
}

// Run tests
async function runTests() {
  console.log('🧪 parsePrismaModel Unit Tests\n');

  console.log('📋 Basic Model Parsing:');
  
  await test('should parse simple model (TestModel)', async () => {
    const result = await parsePrismaModel('TestModel', testSchemaPath);
    
    assertEquals(result.name, 'TestModel', 'Model name');
    assertEquals(result.schema, 'public', 'Schema');
    assertEquals(result.fields.length, 6, 'Field count');
    assertEquals(result.relations.length, 0, 'Relations count');
    
    const idField = result.fields.find(f => f.name === 'id');
    assert(idField, 'id field exists');
    assertEquals(idField.type, 'String', 'id type');
    assertEquals(idField.isId, true, 'id isId flag');
    assertEquals(idField.hasDefault, true, 'id hasDefault');
    assertEquals(idField.defaultValue, 'uuid()', 'id default value');
    
    const nameField = result.fields.find(f => f.name === 'name');
    assert(nameField, 'name field exists');
    assertEquals(nameField.isOptional, false, 'name is required');
    
    const descriptionField = result.fields.find(f => f.name === 'description');
    assert(descriptionField, 'description field exists');
    assertEquals(descriptionField.isOptional, true, 'description is optional');
  });

  await test('should parse model with relations (TestPost)', async () => {
    const result = await parsePrismaModel('TestPost', testSchemaPath);
    
    assertEquals(result.relations.length, 1, 'Relations count');
    
    const userRelation = result.relations[0];
    assertEquals(userRelation.name, 'user', 'Relation name');
    assertEquals(userRelation.type, 'TestUser', 'Relation type');
    assertEquals(userRelation.isRelation, true, 'isRelation flag');
    
    const userIdField = result.fields.find(f => f.name === 'userId');
    assert(userIdField, 'userId field exists');
    assertEquals(userIdField.type, 'String', 'userId type');
  });

  await test('should parse model in different schema (TestTrade)', async () => {
    const result = await parsePrismaModel('TestTrade', testSchemaPath);
    
    assertEquals(result.schema, 'trading', 'Schema');
    
    const symbolField = result.fields.find(f => f.name === 'symbol');
    assert(symbolField, 'symbol field exists');
    assertEquals(symbolField.type, 'String', 'symbol type');
    
    const quantityField = result.fields.find(f => f.name === 'quantity');
    assert(quantityField, 'quantity field exists');
    assertEquals(quantityField.type, 'Float', 'quantity type');
  });

  console.log('\n📋 Complex Field Types:');
  
  await test('should parse model with Json fields (TestAlert)', async () => {
    const result = await parsePrismaModel('TestAlert', testSchemaPath);
    
    const dataField = result.fields.find(f => f.name === 'data');
    assert(dataField, 'data field exists');
    assertEquals(dataField.type, 'Json', 'data type');
    assertEquals(dataField.isOptional, true, 'data is optional');
    assertEquals(dataField.hasDefault, true, 'data has default');
    
    const severityField = result.fields.find(f => f.name === 'severity');
    assert(severityField, 'severity field exists');
    assertEquals(severityField.hasDefault, true, 'severity has default');
    assertEquals(severityField.defaultValue, '"info"', 'severity default value');
  });

  await test('should parse array relations (TestUser)', async () => {
    const result = await parsePrismaModel('TestUser', testSchemaPath);
    
    assertEquals(result.relations.length, 1, 'Relations count');
    
    const postsRelation = result.relations[0];
    assertEquals(postsRelation.name, 'posts', 'Relation name');
    assertEquals(postsRelation.type, 'TestPost', 'Relation type');
    assertEquals(postsRelation.isArray, true, 'isArray flag');
  });

  await test('should identify unique fields (TestUser)', async () => {
    const result = await parsePrismaModel('TestUser', testSchemaPath);
    
    const emailField = result.fields.find(f => f.name === 'email');
    assert(emailField, 'email field exists');
    assertEquals(emailField.isUnique, true, 'email is unique');
  });

  console.log('\n📋 Error Handling:');
  
  await test('should throw error for non-existent model', async () => {
    try {
      await parsePrismaModel('NonExistentModel', testSchemaPath);
      throw new Error('Should have thrown an error');
    } catch (error) {
      assert(error.message.includes('not found'), 'Error message contains "not found"');
    }
  });

  await test('should suggest similar model names', async () => {
    try {
      await parsePrismaModel('TestMdel', testSchemaPath); // Typo in TestModel
      throw new Error('Should have thrown an error');
    } catch (error) {
      assert(error.message.includes('Did you mean'), 'Error suggests alternatives');
      assert(error.message.includes('TestModel'), 'Error suggests TestModel');
    }
  });

  // Print summary
  console.log('\n📊 Test Summary:');
  console.log(`  ✅ Passed: ${testResults.passed}`);
  console.log(`  ❌ Failed: ${testResults.failed}`);
  console.log(`  📋 Total: ${testResults.passed + testResults.failed}`);
  
  if (testResults.failed > 0) {
    console.log('\n❌ Failed tests:');
    testResults.tests.filter(t => t.status === 'failed').forEach(t => {
      console.log(`  - ${t.name}: ${t.error}`);
    });
  }
  
  process.exit(testResults.failed > 0 ? 1 : 0);
}

runTests().catch(console.error);