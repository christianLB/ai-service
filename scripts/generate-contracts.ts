#!/usr/bin/env tsx

/**
 * Generate TypeScript types from OpenAPI specifications
 * This script reads all OpenAPI specs and generates corresponding TypeScript types
 */

import { execSync } from 'child_process';
import { existsSync, mkdirSync, readdirSync } from 'fs';
import { join } from 'path';

const OPENAPI_DIR = join(__dirname, '..', 'openapi');
const OUTPUT_DIR = join(__dirname, '..', 'packages', 'contracts', 'src', 'generated');

// OpenAPI specs to generate
const SPECS = [
  'gateway.yaml',
  'auth.yaml',
  'financial.yaml',
  'trading.yaml',
  'ai-core.yaml',
  'comm.yaml'
];

async function generateContracts() {
  console.log('🚀 Starting OpenAPI contract generation...\n');

  // Ensure output directory exists
  if (!existsSync(OUTPUT_DIR)) {
    console.log(`📁 Creating output directory: ${OUTPUT_DIR}`);
    mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  // Check which specs exist
  const existingSpecs = SPECS.filter(spec => {
    const specPath = join(OPENAPI_DIR, spec);
    const exists = existsSync(specPath);
    if (!exists) {
      console.log(`⚠️  Spec not found: ${spec} (will skip)`);
    }
    return exists;
  });

  if (existingSpecs.length === 0) {
    console.error('❌ No OpenAPI specifications found!');
    console.log('\n📝 Expected specs in openapi/ directory:');
    SPECS.forEach(spec => console.log(`   - ${spec}`));
    process.exit(1);
  }

  console.log(`\n📋 Found ${existingSpecs.length} OpenAPI specifications:`);
  existingSpecs.forEach(spec => console.log(`   ✓ ${spec}`));
  console.log();

  // Generate TypeScript types for each spec
  for (const spec of existingSpecs) {
    const specPath = join(OPENAPI_DIR, spec);
    const outputName = spec.replace('.yaml', '.ts').replace('.yml', '.ts');
    const outputPath = join(OUTPUT_DIR, outputName);

    console.log(`📝 Generating types for ${spec}...`);
    
    try {
      // Use openapi-typescript to generate types
      const command = `npx openapi-typescript ${specPath} -o ${outputPath}`;
      execSync(command, { stdio: 'inherit' });
      console.log(`   ✅ Generated: ${outputName}`);
    } catch (error) {
      console.error(`   ❌ Failed to generate types for ${spec}:`, error);
      // Continue with other specs
    }
  }

  // Create index file to re-export all generated types
  console.log('\n📚 Creating index file for generated types...');
  const indexContent = generateIndexFile(existingSpecs);
  const indexPath = join(OUTPUT_DIR, 'index.ts');
  require('fs').writeFileSync(indexPath, indexContent);
  console.log('   ✅ Created: generated/index.ts');

  console.log('\n✨ Contract generation complete!');
}

function generateIndexFile(specs: string[]): string {
  const exports = specs.map(spec => {
    const moduleName = spec.replace('.yaml', '').replace('.yml', '');
    return `export * as ${moduleName.replace('-', '_')} from './${moduleName}';`;
  }).join('\n');

  return `/**
 * Auto-generated index file for OpenAPI contracts
 */

${exports}

// Export version for runtime checks
export const CONTRACT_VERSION = '1.0.0';
`;
}

// Run the script
generateContracts().catch(error => {
  console.error('❌ Contract generation failed:', error);
  process.exit(1);
});