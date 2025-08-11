#!/usr/bin/env node

/**
 * Test script for enhanced Make command awareness in MCP server
 * This tests the new features added to make Claude prioritize Make commands
 */

const { MakeCommandBridge } = require('./dist/adapters/make-command-bridge');
const { AutoSuggestionEngine } = require('./dist/utils/auto-suggestion-engine');
const { IntentMapper } = require('./dist/utils/intent-mapper');
const path = require('path');

// Test cases for the enhanced Make command awareness
const testCases = [
  {
    input: "start development",
    expectedCommand: "dev-up",
    expectedConfidence: 0.9,
    description: "Simple start command"
  },
  {
    input: "check if everything is running",
    expectedCommand: "dev-status",
    expectedConfidence: 0.8,
    description: "Status check with natural language"
  },
  {
    input: "run tests",
    expectedCommand: "test",
    expectedConfidence: 0.9,
    description: "Direct test command"
  },
  {
    input: "build the project",
    expectedCommand: "build",
    expectedConfidence: 0.9,
    description: "Build command"
  },
  {
    input: "something is not working",
    expectedCommand: "dev-status",
    expectedConfidence: 0.7,
    description: "Problem detection"
  },
  {
    input: "deploy to production",
    expectedCommand: "deploy",
    expectedConfidence: 0.9,
    description: "Deployment command"
  },
  {
    input: "show me the logs",
    expectedCommand: "dev-logs",
    expectedConfidence: 0.9,
    description: "Log viewing"
  },
  {
    input: "migrate database",
    expectedCommand: "db-migrate",
    expectedConfidence: 0.9,
    description: "Database migration"
  }
];

async function runTests() {
  console.log('🧪 Testing Enhanced Make Command Awareness\n');
  console.log('=' . repeat(60));
  
  const projectRoot = path.resolve(__dirname, '../');
  const makeBridge = new MakeCommandBridge(projectRoot);
  
  let passed = 0;
  let failed = 0;
  
  for (const testCase of testCases) {
    console.log(`\n📝 Test: ${testCase.description}`);
    console.log(`   Input: "${testCase.input}"`);
    
    try {
      // Test the new checkMakeCommandsFirst method
      const result = await makeBridge.checkMakeCommandsFirst(testCase.input, false);
      
      if (result.executed) {
        console.log(`   ✅ Would execute: ${result.command}`);
        console.log(`   Confidence: ${result.confidence?.toFixed(2) || 'N/A'}`);
        
        if (result.command === testCase.expectedCommand) {
          console.log(`   ✓ Correct command detected!`);
          passed++;
        } else {
          console.log(`   ✗ Expected: ${testCase.expectedCommand}, Got: ${result.command}`);
          failed++;
        }
      } else if (result.suggestions && result.suggestions.length > 0) {
        const topSuggestion = result.suggestions[0];
        console.log(`   📋 Top suggestion: ${topSuggestion.command}`);
        console.log(`   Confidence: ${topSuggestion.confidence?.toFixed(2) || 'N/A'}`);
        
        if (topSuggestion.command.includes(testCase.expectedCommand)) {
          console.log(`   ✓ Correct command in suggestions!`);
          passed++;
        } else {
          console.log(`   ✗ Expected: ${testCase.expectedCommand} not found in top suggestion`);
          failed++;
        }
      } else {
        console.log(`   ❌ No command detected or suggested`);
        failed++;
      }
      
    } catch (error) {
      console.log(`   ❌ Error: ${error.message}`);
      failed++;
    }
  }
  
  console.log('\n' + '=' . repeat(60));
  console.log(`\n📊 Results: ${passed} passed, ${failed} failed out of ${testCases.length} tests`);
  console.log(`Success rate: ${((passed / testCases.length) * 100).toFixed(1)}%\n`);
  
  // Test tool descriptions
  console.log('🔧 Testing Tool Descriptions\n');
  console.log('=' . repeat(60));
  
  const tools = await makeBridge.getMakeTools();
  const primaryTool = tools.find(t => t.name === 'check_make_commands_first');
  
  if (primaryTool) {
    console.log('✅ Primary tool "check_make_commands_first" found!');
    console.log(`   Description keywords: ${primaryTool.description.includes('ALWAYS USE THIS TOOL FIRST') ? '✓' : '✗'} ALWAYS USE THIS TOOL FIRST`);
    console.log(`   Has trigger words: ${primaryTool.description.includes('start, stop, run, build') ? '✓' : '✗'} Common triggers`);
  } else {
    console.log('❌ Primary tool not found!');
  }
  
  // Check tool ordering
  console.log('\n📑 Tool Priority Order:');
  tools.slice(0, 5).forEach((tool, idx) => {
    console.log(`   ${idx + 1}. ${tool.name} (${tool.category})`);
  });
  
  console.log('\n✨ Test complete!');
}

// Run the tests
runTests().catch(console.error);