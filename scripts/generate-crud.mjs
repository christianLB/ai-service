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
  --skip-validation    Omitir validación TypeScript al final
  
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
    hasRelations: true,
    skipValidation: false
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
    } else if (args[i] === '--skip-validation') {
      options.skipValidation = true;
    }
  }

  return options;
}

// Parse Prisma schema and extract model fields
export async function parsePrismaModel(modelName) {
  const schemaPath = join(__dirname, '..', 'prisma', 'schema.prisma');
  const schemaContent = await readFile(schemaPath, 'utf-8');
  
  // Find the model definition - try exact match first
  const modelRegex = new RegExp(`model\\s+${modelName}\\s*{([^}]+)}`, 's');
  const modelMatch = schemaContent.match(modelRegex);
  
  if (!modelMatch) {
    // Try to find all models to give a helpful error message
    const allModelsRegex = /model\s+(\w+)\s*{/g;
    const allModels = [];
    let match;
    while ((match = allModelsRegex.exec(schemaContent)) !== null) {
      allModels.push(match[1]);
    }
    
    const errorMsg = `Model "${modelName}" not found in schema.prisma`;
    console.error(`\n❌ ${errorMsg}`);
    
    if (allModels.length > 0) {
      console.log('\n📋 Available models:');
      allModels.forEach(m => console.log(`   - ${m}`));
      
      // Check for similar names
      const similar = allModels.filter(m => 
        m.toLowerCase() === modelName.toLowerCase() ||
        m.toLowerCase().includes(modelName.toLowerCase()) ||
        modelName.toLowerCase().includes(m.toLowerCase())
      );
      
      if (similar.length > 0) {
        console.log(`\n💡 Did you mean: ${similar.join(', ')}?`);
      }
    }
    
    throw new Error(errorMsg);
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
      const defaultMatch = rest.match(/@default\((.+?)\)(?:\s|$)/);
      if (defaultMatch) {
        let defaultValue = defaultMatch[1];
        // Handle different default value types
        if (defaultValue.includes('(') && defaultValue.includes(')')) {
          // Function call like uuid(), now(), etc.
          field.defaultValue = defaultValue;
        } else if (defaultValue.startsWith('"') && defaultValue.endsWith('"')) {
          // String literal - keep quotes for template
          field.defaultValue = defaultValue;
        } else if (defaultValue === 'true' || defaultValue === 'false') {
          // Boolean literal
          field.defaultValue = defaultValue;
        } else {
          // Other values (numbers, etc.)
          field.defaultValue = defaultValue;
        }
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

// Validate model exists before generation
export async function validateModelExists(modelName) {
  try {
    const modelInfo = await parsePrismaModel(modelName);
    return { valid: true, modelInfo };
  } catch (error) {
    return { valid: false, error: error.message };
  }
}

// Track generated files for rollback
const generatedFiles = [];

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
      console.error(`\n❌ Error: ${e.message}`);
      console.error('\n⚠️  El modelo debe existir en prisma/schema.prisma antes de generar el CRUD.\n');
      console.log('📝 Pasos para solucionarlo:');
      console.log(`   1. Agrega el modelo ${options.model} a prisma/schema.prisma`);
      console.log('   2. Ejecuta: npm run db:generate');
      console.log('   3. Vuelve a ejecutar este comando\n');
      console.log('💡 Ejemplo de modelo en Prisma:');
      console.log(`   model ${options.model} {`);
      console.log('     id        String   @id @default(uuid())');
      console.log('     name      String');
      console.log('     createdAt DateTime @default(now())');
      console.log('     updatedAt DateTime @updatedAt');
      console.log('     ');
      console.log(`     @@schema("${options.schema || 'public'}")`);
      console.log('   }\n');
      process.exit(1);
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

    // Run the generator with rollback support
    console.log('🔨 Generando archivos...\n');
    const createdFiles = [];
    let results;
    let successCount = 0;
    
    try {
      results = await crudGenerator.runActions(answers);
      
      // Show results
      
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
      
      // Check for failures
      if (results.failures && results.failures.length > 0) {
        console.error('\n❌ Se encontraron errores durante la generación:');
        results.failures.forEach(failure => {
          console.error(`   ❌ ${failure.error || failure.path}`);
        });
        
        // Rollback on failures
        if (createdFiles.length > 0) {
          console.log('\n🔄 Revirtiendo archivos generados...');
          const { unlink } = await import('fs/promises');
          for (const file of createdFiles) {
            try {
              await unlink(file);
              console.log(`   🗑️  Eliminado: ${file}`);
            } catch (err) {
              // File might not exist, ignore
            }
          }
        }
        
        throw new Error('La generación falló con errores. Revise los mensajes anteriores.');
      }
    } catch (genError) {
      // Additional rollback for unexpected errors
      if (createdFiles.length > 0) {
        console.log('\n🔄 Revirtiendo archivos generados debido a error...');
        const { unlink } = await import('fs/promises');
        for (const file of createdFiles) {
          try {
            await unlink(file);
            console.log(`   🗑️  Eliminado: ${file}`);
          } catch (err) {
            // File might not exist, ignore
          }
        }
      }
      throw genError;
    }

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
      
      // Validate TypeScript compilation unless skipped
      if (!options.skipValidation && createdFiles.some(f => f.endsWith('.ts'))) {
        console.log('\n🔍 Validando compilación TypeScript...');
        try {
          const { execSync } = await import('child_process');
          execSync('npm run build', { stdio: 'pipe' });
          console.log('   ✅ Compilación exitosa');
        } catch (error) {
          console.error('   ⚠️  La compilación TypeScript falló. Revisa los errores:');
          const output = error.stdout?.toString() || error.message;
          // Show only first few errors
          const lines = output.split('\n');
          const errorLines = lines.filter(line => line.includes('error TS'));
          if (errorLines.length > 0) {
            console.error('   ' + errorLines.slice(0, 5).join('\n   '));
            if (errorLines.length > 5) {
              console.error(`   ... y ${errorLines.length - 5} errores más`);
            }
          }
          console.log('\n   💡 Ejecuta "npm run build" para ver todos los detalles.');
        }
      }
    }

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  }
}

// Run
generateCrud().catch(console.error);