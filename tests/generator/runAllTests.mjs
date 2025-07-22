#!/usr/bin/env node

/**
 * Run all generator tests
 */

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const tests = [
  {
    name: 'Unit Tests - parsePrismaModel',
    script: 'parsePrismaModel.unit.test.mjs'
  },
  {
    name: 'Template Validation Tests',
    script: 'templateValidation.test.mjs'
  },
  {
    name: 'Regression Tests',
    script: 'regression.test.mjs'
  },
  {
    name: 'Integration Tests',
    script: 'generateCrud.integration.test.mjs',
    skip: process.argv.includes('--no-integration')
  }
];

async function runTest(test) {
  return new Promise((resolve) => {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`🧪 Running: ${test.name}`);
    console.log('='.repeat(60));
    
    const child = spawn('node', [join(__dirname, test.script)], {
      stdio: 'inherit'
    });
    
    child.on('close', (code) => {
      resolve(code === 0);
    });
  });
}

async function runAllTests() {
  console.log('🧪 AI Service - CRUD Generator Test Suite\n');
  
  let passed = 0;
  let failed = 0;
  let skipped = 0;
  const results = [];
  
  for (const test of tests) {
    if (test.skip) {
      console.log(`\n⏭️  Skipping: ${test.name}`);
      skipped++;
      results.push({ name: test.name, status: 'skipped' });
      continue;
    }
    
    const success = await runTest(test);
    
    if (success) {
      passed++;
      results.push({ name: test.name, status: 'passed' });
    } else {
      failed++;
      results.push({ name: test.name, status: 'failed' });
    }
  }
  
  // Print summary
  console.log(`\n${'='.repeat(60)}`);
  console.log('📊 OVERALL TEST SUMMARY');
  console.log('='.repeat(60));
  
  results.forEach(result => {
    const icon = result.status === 'passed' ? '✅' : result.status === 'failed' ? '❌' : '⏭️';
    console.log(`${icon} ${result.name}`);
  });
  
  console.log('\n📈 Statistics:');
  console.log(`  ✅ Passed: ${passed}`);
  console.log(`  ❌ Failed: ${failed}`);
  console.log(`  ⏭️ Skipped: ${skipped}`);
  console.log(`  📋 Total: ${tests.length}`);
  
  if (failed === 0 && passed > 0) {
    console.log('\n🎉 All tests passed!');
  }
  
  if (process.argv.includes('--no-integration')) {
    console.log('\n⚠️  Note: Integration tests were skipped. Run without --no-integration to include them.');
  }
  
  process.exit(failed > 0 ? 1 : 0);
}

runAllTests().catch(console.error);