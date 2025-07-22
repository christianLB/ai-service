#!/usr/bin/env node

/**
 * Integration tests for CRUD generation
 */

import { exec as execCallback } from 'child_process';
import { promisify } from 'util';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFile, unlink, access } from 'fs/promises';
import { constants } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const exec = promisify(execCallback);

// Test utilities
let testResults = { passed: 0, failed: 0, tests: [] };

async function fileExists(path) {
  try {
    await access(path, constants.F_OK);
    return true;
  } catch {
    return false;
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

async function runCrudGeneration(model, options = {}) {
  const args = [model];
  
  if (options.schema) {
    args.push('--schema', options.schema);
  }
  
  if (options.features) {
    args.push('--features', options.features.join(','));
  }
  
  if (options.skipValidation) {
    args.push('--skip-validation');
  }
  
  const result = await exec(`npm run generate:crud:auto ${args.join(' ')}`, {
    cwd: join(__dirname, '../..')
  });
  
  return result;
}

async function cleanupGeneratedFiles(model) {
  const files = [
    `src/types/${model.toLowerCase()}.types.ts`,
    `src/services/${model.toLowerCase()}.service.ts`,
    `src/routes/${model.toLowerCase()}.ts`,
    `frontend/src/types/${model.toLowerCase()}.types.ts`,
    `frontend/src/services/${model.toLowerCase()}.service.ts`,
    `frontend/src/pages/${model}.tsx`,
    `frontend/src/components/${model}/${model}List.tsx`,
    `frontend/src/components/${model}/${model}Form.tsx`,
    `frontend/src/components/${model}/${model}Detail.tsx`,
    `frontend/src/hooks/use${model}.ts`
  ];
  
  for (const file of files) {
    const fullPath = join(__dirname, '../..', file);
    if (await fileExists(fullPath)) {
      await unlink(fullPath);
    }
  }
}

// Run tests
async function runTests() {
  console.log('🧪 CRUD Generation Integration Tests\n');

  console.log('📋 Basic Generation:');
  
  await test('should generate CRUD for TestModel', async () => {
    // Clean up any existing files
    await cleanupGeneratedFiles('TestModel');
    
    // Generate CRUD
    const result = await runCrudGeneration('TestModel', { skipValidation: true });
    
    // Check that key files were created
    const expectedFiles = [
      'src/types/testmodel.types.ts',
      'src/services/testmodel.service.ts',
      'src/routes/testmodel.ts',
      'frontend/src/types/testmodel.types.ts',
      'frontend/src/pages/TestModel.tsx'
    ];
    
    for (const file of expectedFiles) {
      const fullPath = join(__dirname, '../..', file);
      if (!await fileExists(fullPath)) {
        throw new Error(`Expected file not created: ${file}`);
      }
    }
    
    // Check that backend types include actual fields
    const backendTypes = await readFile(
      join(__dirname, '../..', 'src/types/testmodel.types.ts'),
      'utf-8'
    );
    
    if (!backendTypes.includes('name: z.string()')) {
      throw new Error('Backend types do not include name field');
    }
    
    if (!backendTypes.includes('description: z.string().nullable()')) {
      throw new Error('Backend types do not include optional description field');
    }
    
    // Clean up
    await cleanupGeneratedFiles('TestModel');
  });

  await test('should generate CRUD with different schema', async () => {
    // Clean up any existing files
    await cleanupGeneratedFiles('TestTrade');
    
    // Generate CRUD for trading schema model
    const result = await runCrudGeneration('TestTrade', { 
      schema: 'trading',
      skipValidation: true 
    });
    
    // Check that service includes correct schema
    const service = await readFile(
      join(__dirname, '../..', 'src/services/testtrade.service.ts'),
      'utf-8'
    );
    
    if (!service.includes('FROM "trading"."TestTrade"')) {
      throw new Error('Service does not use correct schema');
    }
    
    // Clean up
    await cleanupGeneratedFiles('TestTrade');
  });

  console.log('\n📋 Feature Selection:');
  
  await test('should generate only selected features', async () => {
    // Clean up any existing files
    await cleanupGeneratedFiles('TestPost');
    
    // Generate only list and api features
    const result = await runCrudGeneration('TestPost', { 
      features: ['list', 'api'],
      skipValidation: true 
    });
    
    // Check that only expected files were created
    const shouldExist = [
      'src/routes/testpost.ts',
      'frontend/src/components/TestPost/TestPostList.tsx'
    ];
    
    const shouldNotExist = [
      'frontend/src/components/TestPost/TestPostForm.tsx',
      'frontend/src/components/TestPost/TestPostDetail.tsx'
    ];
    
    for (const file of shouldExist) {
      const fullPath = join(__dirname, '../..', file);
      if (!await fileExists(fullPath)) {
        throw new Error(`Expected file not created: ${file}`);
      }
    }
    
    for (const file of shouldNotExist) {
      const fullPath = join(__dirname, '../..', file);
      if (await fileExists(fullPath)) {
        throw new Error(`Unexpected file created: ${file}`);
      }
    }
    
    // Clean up
    await cleanupGeneratedFiles('TestPost');
  });

  console.log('\n📋 Complex Models:');
  
  await test('should handle models with relations', async () => {
    // Clean up any existing files
    await cleanupGeneratedFiles('TestPost');
    
    // Generate CRUD
    const result = await runCrudGeneration('TestPost', { skipValidation: true });
    
    // Check that types include relation fields
    const frontendTypes = await readFile(
      join(__dirname, '../..', 'frontend/src/types/testpost.types.ts'),
      'utf-8'
    );
    
    if (!frontendTypes.includes('userId:')) {
      throw new Error('Frontend types do not include userId field');
    }
    
    // Check that form doesn't include relation object
    const form = await readFile(
      join(__dirname, '../..', 'frontend/src/components/TestPost/TestPostForm.tsx'),
      'utf-8'
    );
    
    if (form.includes('name="user"')) {
      throw new Error('Form should not include user relation field');
    }
    
    // Clean up
    await cleanupGeneratedFiles('TestPost');
  });

  await test('should handle models with Json fields', async () => {
    // Clean up any existing files
    await cleanupGeneratedFiles('TestAlert');
    
    // Generate CRUD
    const result = await runCrudGeneration('TestAlert', { skipValidation: true });
    
    // Check that form handles Json field correctly
    const form = await readFile(
      join(__dirname, '../..', 'frontend/src/components/TestAlert/TestAlertForm.tsx'),
      'utf-8'
    );
    
    if (!form.includes('Input.TextArea')) {
      throw new Error('Form should use TextArea for Json fields');
    }
    
    // Clean up
    await cleanupGeneratedFiles('TestAlert');
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