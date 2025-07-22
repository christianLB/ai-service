#!/usr/bin/env node

/**
 * Regression tests for previously fixed issues
 */

import { readFile } from 'fs/promises';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { parsePrismaModel } from '../../scripts/parsePrismaModel.mjs';
import Handlebars from 'handlebars';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Test utilities
let testResults = { passed: 0, failed: 0, tests: [] };

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

// Register minimal helpers for testing
Handlebars.registerHelper('eq', (a, b) => a === b);
Handlebars.registerHelper('or', (...args) => args.slice(0, -1).some(v => v));
Handlebars.registerHelper('not', (value) => !value);
Handlebars.registerHelper('titleCase', (str) => str.charAt(0).toUpperCase() + str.slice(1));
Handlebars.registerHelper('pascalCase', (str) => str.charAt(0).toUpperCase() + str.slice(1));
Handlebars.registerHelper('kebabCase', (str) => str.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase());

// Run tests
async function runTests() {
  console.log('🧪 Regression Tests for Fixed Issues\n');

  console.log('📋 Issue #1: Frontend types not using modelInfo');
  
  await test('should generate types based on actual model fields', async () => {
    // Parse a test model
    const modelInfo = await parsePrismaModel('TestAlert', join(__dirname, 'fixtures/test-schema.prisma'));
    
    // Load and compile template
    const templatePath = join(__dirname, '../../plop-templates/types/model.types.frontend.ts.hbs');
    const templateContent = await readFile(templatePath, 'utf-8');
    const template = Handlebars.compile(templateContent);
    
    const result = template({
      model: 'TestAlert',
      modelInfo: modelInfo
    });
    
    // Check that actual fields are generated
    if (!result.includes('severity: string;')) {
      throw new Error('severity field not found in generated types');
    }
    
    if (!result.includes('data?: any;')) {
      throw new Error('optional data field not found');
    }
    
    // Should not have generic fields
    if (result.includes('field1') || result.includes('field2')) {
      throw new Error('Generic fields found - template not using modelInfo');
    }
  });

  console.log('\n📋 Issue #2: CreateModel excluding fields with defaults');
  
  await test('should include fields with defaults in CreateModel', async () => {
    const modelInfo = await parsePrismaModel('TestAlert', join(__dirname, 'fixtures/test-schema.prisma'));
    
    const templatePath = join(__dirname, '../../plop-templates/types/model.types.frontend.ts.hbs');
    const templateContent = await readFile(templatePath, 'utf-8');
    const template = Handlebars.compile(templateContent);
    
    const result = template({
      model: 'TestAlert',
      modelInfo: modelInfo
    });
    
    // Extract CreateTestAlert interface
    const createTypeMatch = result.match(/export interface CreateTestAlert \{([^}]+)\}/s);
    if (!createTypeMatch) {
      throw new Error('CreateTestAlert interface not found');
    }
    
    const createTypeContent = createTypeMatch[1];
    
    // Fields with defaults should be included as optional
    if (!createTypeContent.includes('severity?:')) {
      throw new Error('severity field with default should be in CreateModel as optional');
    }
    
    if (!createTypeContent.includes('data?:')) {
      throw new Error('data field with default should be in CreateModel as optional');
    }
  });

  console.log('\n📋 Issue #3: PageHeader using subtitle instead of subTitle');
  
  await test('should use subTitle prop for PageHeader', async () => {
    const templatePath = join(__dirname, '../../plop-templates/pages/model-page.tsx.hbs');
    const templateContent = await readFile(templatePath, 'utf-8');
    
    // Check the template uses subTitle
    if (!templateContent.includes('subTitle=')) {
      throw new Error('Template should use subTitle prop');
    }
    
    if (templateContent.includes('subtitle=')) {
      throw new Error('Template should not use subtitle prop');
    }
    
    if (templateContent.includes('breadcrumbs=')) {
      throw new Error('Template should not use breadcrumbs prop');
    }
  });

  console.log('\n📋 Issue #4: onChange type errors in list component');
  
  await test('should cast onChange keys parameter', async () => {
    const templatePath = join(__dirname, '../../plop-templates/components/model-list-dynamic.tsx.hbs');
    const templateContent = await readFile(templatePath, 'utf-8');
    
    // Check for type casting
    if (!templateContent.includes('onChange: (keys) => setSelectedRowKeys(keys as string[])')) {
      throw new Error('onChange should cast keys to string[]');
    }
  });

  await test('should properly type showTotal function', async () => {
    const templatePath = join(__dirname, '../../plop-templates/components/model-list-dynamic.tsx.hbs');
    const templateContent = await readFile(templatePath, 'utf-8');
    
    // Check for proper showTotal typing
    if (!templateContent.includes('showTotal: (total: number)')) {
      throw new Error('showTotal should have typed parameter');
    }
  });

  console.log('\n📋 Issue #5: parsePrismaModel not parsing default values correctly');
  
  await test('should parse function default values like uuid()', async () => {
    const modelInfo = await parsePrismaModel('TestModel', join(__dirname, 'fixtures/test-schema.prisma'));
    
    const idField = modelInfo.fields.find(f => f.name === 'id');
    if (!idField) {
      throw new Error('id field not found');
    }
    
    if (idField.defaultValue !== 'uuid()') {
      throw new Error(`Expected default value "uuid()", got "${idField.defaultValue}"`);
    }
  });

  await test('should parse string default values with quotes', async () => {
    const modelInfo = await parsePrismaModel('TestAlert', join(__dirname, 'fixtures/test-schema.prisma'));
    
    const severityField = modelInfo.fields.find(f => f.name === 'severity');
    if (!severityField) {
      throw new Error('severity field not found');
    }
    
    if (severityField.defaultValue !== '"info"') {
      throw new Error(`Expected default value '"info"', got '${severityField.defaultValue}'`);
    }
  });

  console.log('\n📋 Issue #6: Model similarity suggestions in error messages');
  
  await test('should suggest similar model names on typos', async () => {
    try {
      await parsePrismaModel('TestMdel', join(__dirname, 'fixtures/test-schema.prisma'));
      throw new Error('Should have thrown an error');
    } catch (error) {
      if (!error.message.includes('Did you mean')) {
        throw new Error('Error should suggest similar models');
      }
      
      if (!error.message.includes('TestModel')) {
        throw new Error('Error should suggest TestModel for TestMdel typo');
      }
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