#!/usr/bin/env node

/**
 * Simple integration test for enhanced MCP server with Make commands
 * This script tests the basic functionality
 */

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🧪 Testing Enhanced MCP Server Integration\n');

// Test configuration
const tests = [
  {
    name: 'Build MCP Server',
    command: 'npm',
    args: ['run', 'build'],
    cwd: __dirname,
    expected: 'tsc'
  },
  {
    name: 'Check Build Output',
    command: 'ls',
    args: ['-la', 'dist/server.js'],
    cwd: __dirname,
    expected: 'server.js'
  },
  {
    name: 'Test Server Startup',
    command: 'timeout',
    args: ['2s', 'node', 'dist/server.js'],
    cwd: __dirname,
    expected: 'MCP local server started'
  }
];

// Run tests sequentially
async function runTests() {
  let passed = 0;
  let failed = 0;

  for (const test of tests) {
    console.log(`📋 Running: ${test.name}`);
    
    try {
      const result = await runCommand(test.command, test.args, test.cwd);
      
      if (result.includes(test.expected)) {
        console.log(`✅ PASS: ${test.name}`);
        passed++;
      } else {
        console.log(`❌ FAIL: ${test.name}`);
        console.log(`   Expected to contain: "${test.expected}"`);
        console.log(`   Got: ${result.substring(0, 200)}...`);
        failed++;
      }
    } catch (error) {
      console.log(`❌ ERROR: ${test.name}`);
      console.log(`   ${error.message}`);
      failed++;
    }
    
    console.log('');
  }

  console.log(`\n📊 Test Results:`);
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`📈 Success Rate: ${Math.round((passed / (passed + failed)) * 100)}%`);

  if (failed === 0) {
    console.log('\n🎉 All tests passed! Enhanced MCP server is ready for use.');
    console.log('\n📋 Next steps:');
    console.log('   1. Run: make claude-config');
    console.log('   2. Restart Claude Code');
    console.log('   3. Test with: "List available make targets"');
  } else {
    console.log('\n⚠️  Some tests failed. Check the build and dependencies.');
    process.exit(1);
  }
}

function runCommand(command, args, cwd) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { 
      cwd,
      stdio: ['pipe', 'pipe', 'pipe'],
      shell: process.platform === 'win32'
    });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    child.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    child.on('close', (code) => {
      // For timeout command, code 124 is expected when server starts correctly
      if (code === 0 || (code === 124 && (stdout + stderr).includes('MCP local server started'))) {
        resolve(stdout + stderr);
      } else {
        reject(new Error(`Command failed with code ${code}: ${stderr || stdout}`));
      }
    });

    child.on('error', (error) => {
      reject(error);
    });

    // Timeout after 30 seconds
    setTimeout(() => {
      child.kill();
      reject(new Error('Command timed out'));
    }, 30000);
  });
}

// Run the tests
runTests().catch(console.error);