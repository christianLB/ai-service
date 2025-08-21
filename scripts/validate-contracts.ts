#!/usr/bin/env tsx

/**
 * Validate OpenAPI specifications and check for contract drift
 */

import { execSync } from 'child_process';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import SwaggerParser from '@apidevtools/swagger-parser';

const OPENAPI_DIR = join(__dirname, '..', 'openapi');

// OpenAPI specs to validate
const SPECS = [
  'gateway.yaml',
  'auth.yaml', 
  'financial.yaml',
  'trading.yaml',
  'ai-core.yaml',
  'comm.yaml'
];

async function validateContracts() {
  console.log('🔍 Validating OpenAPI specifications...\n');

  let hasErrors = false;

  for (const spec of SPECS) {
    const specPath = join(OPENAPI_DIR, spec);
    
    if (!existsSync(specPath)) {
      console.log(`⚠️  Skipping ${spec} (not found)`);
      continue;
    }

    console.log(`📋 Validating ${spec}...`);
    
    try {
      // Parse and validate the OpenAPI spec
      const api = await SwaggerParser.validate(specPath);
      console.log(`   ✅ Valid OpenAPI ${api.openapi || api.swagger} specification`);
      
      // Additional checks
      if (!api.info?.title) {
        console.log(`   ⚠️  Warning: Missing API title`);
      }
      if (!api.info?.version) {
        console.log(`   ⚠️  Warning: Missing API version`);
      }
      if (!api.servers || api.servers.length === 0) {
        console.log(`   ⚠️  Warning: No servers defined`);
      }
      
      // Count endpoints
      const paths = Object.keys(api.paths || {});
      const operations = paths.reduce((count, path) => {
        const pathItem = api.paths[path];
        return count + Object.keys(pathItem).filter(method => 
          ['get', 'post', 'put', 'patch', 'delete'].includes(method)
        ).length;
      }, 0);
      
      console.log(`   📊 ${paths.length} paths, ${operations} operations`);
      
    } catch (error: any) {
      console.error(`   ❌ Validation failed: ${error.message}`);
      hasErrors = true;
    }
  }

  // Check for contract drift
  console.log('\n🔄 Checking for contract drift...');
  
  try {
    // Run git diff to check if generated files have changed
    const gitDiff = execSync('git diff --exit-code packages/contracts/src/generated', {
      encoding: 'utf-8'
    });
    
    if (gitDiff) {
      console.log('   ⚠️  Contract drift detected! Run: npm run contracts:generate');
      hasErrors = true;
    } else {
      console.log('   ✅ No contract drift detected');
    }
  } catch (error: any) {
    if (error.status === 1) {
      console.log('   ⚠️  Contract drift detected! Run: npm run contracts:generate');
      hasErrors = true;
    } else {
      console.log('   ⚠️  Could not check for drift (not a git repository?)');
    }
  }

  if (hasErrors) {
    console.log('\n❌ Validation failed with errors');
    process.exit(1);
  } else {
    console.log('\n✅ All contracts validated successfully!');
  }
}

// Run the script
validateContracts().catch(error => {
  console.error('❌ Validation failed:', error);
  process.exit(1);
});