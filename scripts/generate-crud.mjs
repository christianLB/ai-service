#!/usr/bin/env node

/**
 * Script no interactivo para generar CRUD usando Plop
 * Versión ES Modules para compatibilidad con node-plop
 * Enhanced to read Prisma schema directly for accurate field generation
 */

import nodePlop from 'node-plop';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFile } from 'fs/promises';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Parse command line arguments
function parseArgs() {
  const args = process.argv.slice(2);
  
  if (args.length === 0 || args[0] === '--help' || args[0] === '-h') {
    console.log(`
📋 Generador CRUD No Interactivo

Uso: npm run generate:crud:auto <modelo> [opciones]

Opciones:
  --schema <nombre>     Schema de la BD (default: '')
  --features <lista>    Features separadas por coma (default: todas)
                       Opciones: list,form,detail,api,service,hooks,tests
  --no-relations       Sin relaciones (default: con relaciones)
  
Ejemplos:
  npm run generate:crud:auto Alert
  npm run generate:crud:auto Trade --schema trading
  npm run generate:crud:auto Report --features list,form,api
    `);
    process.exit(0);
  }

  const options = {
    model: args[0],
    schema: '',
    features: ['list', 'form', 'api', 'service', 'hooks'],
    hasRelations: true
  };

  // Parse flags
  for (let i = 1; i < args.length; i++) {
    if (args[i] === '--schema' && args[i + 1]) {
      options.schema = args[i + 1];
      i++;
    } else if (args[i] === '--features' && args[i + 1]) {
      options.features = args[i + 1].split(',').map(f => f.trim());
      i++;
    } else if (args[i] === '--no-relations') {
      options.hasRelations = false;
    }
  }

  return options;
}

// Parse Prisma schema and extract model fields
async function parsePrismaModel(modelName) {
  const schemaPath = join(__dirname, '..', 'prisma', 'schema.prisma');
  const schemaContent = await readFile(schemaPath, 'utf-8');
  
  // Find the model definition
  const modelRegex = new RegExp(`model\\s+${modelName}\\s*{([^}]+)}`, 's');
  const modelMatch = schemaContent.match(modelRegex);
  
  if (!modelMatch) {
    throw new Error(`Model ${modelName} not found in schema.prisma`);
  }
  
  const modelContent = modelMatch[1];
  const fields = [];
  const relations = [];
  
  // Parse fields
  const lines = modelContent.split('\n').filter(line => line.trim());
  
  for (const line of lines) {
    // Skip comments and directives
    if (line.trim().startsWith('//') || line.trim().startsWith('@@')) continue;
    
    // Parse field: name Type modifiers
    const fieldRegex = /^\s*(\w+)\s+(\w+)(\[])?(\?)?(.*)$/;
    const match = line.match(fieldRegex);
    
    if (match) {
      const [, fieldName, fieldType, isArray, isOptional, rest] = match;
      
      // Skip if it's the end of relations section
      if (fieldName === 'Relations' || fieldName === 'indexes') continue;
      
      // Check if it's a relation
      const isRelation = rest.includes('@relation') || 
                        (!['String', 'Int', 'Float', 'Boolean', 'DateTime', 'Json', 'Decimal', 'BigInt', 'Bytes'].includes(fieldType) && 
                         !fieldType.includes('?') && fieldType !== 'Unsupported');
      
      const field = {
        name: fieldName,
        type: fieldType,
        isArray: !!isArray,
        isOptional: !!isOptional || rest.includes('?'),
        isId: rest.includes('@id'),
        isUnique: rest.includes('@unique'),
        hasDefault: rest.includes('@default'),
        isRelation,
        dbName: null,
        defaultValue: null
      };
      
      // Extract @map if exists
      const mapMatch = rest.match(/@map\("([^"]+)"\)/);
      if (mapMatch) {
        field.dbName = mapMatch[1];
      }
      
      // Extract default value
      const defaultMatch = rest.match(/@default\(([^)]+)\)/);
      if (defaultMatch) {
        field.defaultValue = defaultMatch[1];
      }
      
      if (isRelation) {
        relations.push(field);
      } else {
        fields.push(field);
      }
    }
  }
  
  // Extract schema if specified
  const schemaMatch = modelContent.match(/@@schema\("([^"]+)"\)/);
  const schema = schemaMatch ? schemaMatch[1] : 'public';
  
  return {
    name: modelName,
    schema,
    fields,
    relations
  };
}

// Main function
async function generateCrud() {
  const options = parseArgs();

  console.log('🚀 Generando CRUD automáticamente...\n');
  console.log(`   📦 Modelo: ${options.model}`);
  console.log(`   🗄️  Schema: ${options.schema || 'public (default)'}`);
  console.log(`   ✨ Features: ${options.features.join(', ')}`);
  console.log(`   🔗 Relaciones: ${options.hasRelations ? 'Sí' : 'No'}\n`);

  try {
    // First, parse the Prisma model to get actual fields
    console.log('🔍 Leyendo modelo desde Prisma schema...');
    let modelInfo;
    try {
      modelInfo = await parsePrismaModel(options.model);
      console.log(`   ✅ Modelo encontrado en schema ${modelInfo.schema}`);
      console.log(`   📋 Campos: ${modelInfo.fields.map(f => f.name).join(', ')}`);
      console.log(`   🔗 Relaciones: ${modelInfo.relations.map(r => r.name).join(', ') || 'ninguna'}\n`);
      
      // Update options with parsed info
      if (!options.schema && modelInfo.schema !== 'public') {
        options.schema = modelInfo.schema;
      }
      if (modelInfo.relations.length > 0) {
        options.hasRelations = true;
      }
    } catch (e) {
      console.warn(`   ⚠️  No se pudo leer el modelo desde Prisma: ${e.message}`);
      console.log(`   ℹ️  Continuando con generación básica...\n`);
    }
    
    // Load plop
    const plopfilePath = join(__dirname, '..', 'plopfile.js');
    const plop = await nodePlop(plopfilePath);
    
    // Get the CRUD generator
    const crudGenerator = plop.getGenerator('crud');
    
    // Prepare answers with model info
    const answers = {
      model: options.model,
      schema: options.schema,
      features: options.features,
      hasRelations: options.hasRelations,
      // Pass parsed model info if available
      modelInfo: modelInfo || null
    };

    // Run the generator
    console.log('🔨 Generando archivos...\n');
    const results = await crudGenerator.runActions(answers);
    
    // Show results
    let successCount = 0;
    const createdFiles = [];
    
    results.changes.forEach(change => {
      if (change.type === 'add') {
        console.log(`   ✅ ${change.path}`);
        createdFiles.push(change.path);
        successCount++;
      } else if (change.type === 'modify') {
        console.log(`   📝 Actualizado: ${change.path}`);
        successCount++;
      }
    });
    
    results.failures.forEach(failure => {
      console.error(`   ❌ Error: ${failure.error || failure.path}`);
    });

    if (successCount > 0) {
      console.log(`\n🎉 ¡${successCount} archivos generados exitosamente!`);
      
      // Run linting fix on generated TypeScript files
      const tsFiles = createdFiles.filter(f => f.endsWith('.ts') || f.endsWith('.tsx'));
      if (tsFiles.length > 0) {
        console.log('\n🔧 Ejecutando auto-fix de linting...');
        try {
          const { execSync } = await import('child_process');
          // Run eslint fix on frontend files
          const frontendFiles = tsFiles.filter(f => f.includes('frontend/'));
          if (frontendFiles.length > 0) {
            const frontendPaths = frontendFiles.map(f => f.replace('/home/k2600x/dev/ai-service/', '')).join(' ');
            execSync(`cd frontend && npx eslint --fix ${frontendPaths.replace(/frontend\//g, '')} 2>/dev/null || true`, { stdio: 'ignore' });
          }
          // Run eslint fix on backend files
          const backendFiles = tsFiles.filter(f => !f.includes('frontend/'));
          if (backendFiles.length > 0) {
            const backendPaths = backendFiles.map(f => f.replace('/home/k2600x/dev/ai-service/', '')).join(' ');
            execSync(`npx eslint --fix ${backendPaths} 2>/dev/null || true`, { stdio: 'ignore' });
          }
          console.log('   ✅ Linting aplicado');
        } catch (e) {
          // Silently ignore linting errors
        }
      }
      
      // Show what was created
      console.log('\n📁 Estructura creada:');
      if (createdFiles.some(f => f.includes('types/'))) {
        console.log('   📄 Types & Schemas (Zod)');
      }
      if (createdFiles.some(f => f.includes('services/'))) {
        console.log('   🔧 Service Layer (CRUD)');
      }
      if (createdFiles.some(f => f.includes('routes/'))) {
        console.log('   🌐 API Routes (REST)');
      }
      if (createdFiles.some(f => f.includes('hooks/'))) {
        console.log('   🪝 React Hooks (TanStack Query)');
      }
      if (createdFiles.some(f => f.includes('components/'))) {
        console.log('   🧩 React Components (List, Form)');
      }
      if (createdFiles.some(f => f.includes('pages/'))) {
        console.log('   📱 Page Component');
      }
      
      console.log('\n📝 Próximos pasos:');
      console.log('   1. Agrega el modelo a prisma/schema.prisma');
      console.log('   2. Ejecuta: npm run db:generate');
      console.log('   3. Personaliza el código generado');
      console.log('   4. ¡Listo para usar!');
    }

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  }
}

// Run
generateCrud().catch(console.error);