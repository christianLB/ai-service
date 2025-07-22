#!/usr/bin/env node

/**
 * Script no interactivo para generar CRUD usando Plop
 * Uso: node scripts/generate-crud.js <modelo> [opciones]
 * 
 * Ejemplos:
 *   node scripts/generate-crud.js Alert
 *   node scripts/generate-crud.js Alert --schema trading
 *   node scripts/generate-crud.js Alert --schema trading --no-relations
 *   node scripts/generate-crud.js Alert --features list,form,api
 */

const nodePlop = require('node-plop');
const path = require('path');

// Parse command line arguments
function parseArgs() {
  const args = process.argv.slice(2);
  
  if (args.length === 0 || args[0] === '--help' || args[0] === '-h') {
    console.log(`
📋 Generador CRUD No Interactivo

Uso: node scripts/generate-crud.js <modelo> [opciones]

Opciones:
  --schema <nombre>     Schema de la BD (default: '')
  --features <lista>    Features separadas por coma (default: todas)
                       Opciones: list,form,detail,api,service,hooks,tests
  --no-relations       Sin relaciones (default: con relaciones)
  --dry-run           Solo mostrar qué se generaría sin crear archivos
  
Ejemplos:
  node scripts/generate-crud.js Alert
  node scripts/generate-crud.js Trade --schema trading
  node scripts/generate-crud.js Report --features list,form,api
  node scripts/generate-crud.js Alert --no-relations --dry-run
    `);
    process.exit(0);
  }

  const options = {
    model: args[0],
    schema: '',
    features: ['list', 'form', 'detail', 'api', 'service', 'hooks'],
    hasRelations: true,
    dryRun: false
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
    } else if (args[i] === '--dry-run') {
      options.dryRun = true;
    }
  }

  return options;
}

// Main function
async function generateCrud() {
  const options = parseArgs();

  console.log('🚀 Generando CRUD con las siguientes opciones:');
  console.log(`   Modelo: ${options.model}`);
  console.log(`   Schema: ${options.schema || '(default)'}`);
  console.log(`   Features: ${options.features.join(', ')}`);
  console.log(`   Relaciones: ${options.hasRelations ? 'Sí' : 'No'}`);
  if (options.dryRun) {
    console.log('   🔍 Modo DRY RUN - No se crearán archivos');
  }
  console.log('');

  try {
    // Load plop
    const plopfilePath = path.join(__dirname, '..', 'plopfile.js');
    const plop = await nodePlop(plopfilePath);
    
    // Get the CRUD generator
    const crudGenerator = plop.getGenerator('crud');
    
    // Prepare answers
    const answers = {
      model: options.model,
      schema: options.schema,
      features: options.features,
      hasRelations: options.hasRelations
    };

    if (options.dryRun) {
      // In dry run mode, just show what would be generated
      console.log('📝 Archivos que se generarían:\n');
      
      // Simulate the file list based on features
      const files = [];
      
      // Always generated
      files.push(`src/types/${plop.getHelper('kebabCase')(options.model)}.types.ts`);
      
      if (options.features.includes('service')) {
        files.push(`src/services/${plop.getHelper('kebabCase')(options.model)}.service.ts`);
      }
      
      if (options.features.includes('api')) {
        files.push(`src/routes/${plop.getHelper('kebabCase')(options.model)}.routes.ts`);
      }
      
      if (options.features.includes('hooks')) {
        files.push(`frontend/src/hooks/use-${plop.getHelper('kebabCase')(options.model)}.ts`);
      }
      
      if (options.features.includes('list')) {
        files.push(`frontend/src/components/${plop.getHelper('kebabCase')(options.model)}/${options.model}List.tsx`);
      }
      
      if (options.features.includes('form')) {
        files.push(`frontend/src/components/${plop.getHelper('kebabCase')(options.model)}/${options.model}Form.tsx`);
      }
      
      if (options.features.includes('detail')) {
        files.push(`frontend/src/components/${plop.getHelper('kebabCase')(options.model)}/${options.model}Detail.tsx`);
      }
      
      if (options.features.includes('tests')) {
        files.push(`src/services/__tests__/${plop.getHelper('kebabCase')(options.model)}.service.test.ts`);
        files.push(`frontend/src/components/${plop.getHelper('kebabCase')(options.model)}/__tests__/${options.model}List.test.tsx`);
      }
      
      // Page is always generated
      files.push(`frontend/src/pages/${plop.getHelper('kebabCase')(options.model)}/index.tsx`);
      
      files.forEach(file => console.log(`   ✓ ${file}`));
      
      console.log('\n✨ Ejecuta sin --dry-run para generar estos archivos');
      process.exit(0);
    }

    // Run the generator
    console.log('🔨 Generando archivos...\n');
    const results = await crudGenerator.runActions(answers);
    
    // Show results
    let successCount = 0;
    let errorCount = 0;
    
    results.changes.forEach(change => {
      if (change.type === 'add') {
        console.log(`   ✅ Creado: ${change.path}`);
        successCount++;
      } else if (change.type === 'modify') {
        console.log(`   ✅ Modificado: ${change.path}`);
        successCount++;
      }
    });
    
    results.failures.forEach(failure => {
      console.log(`   ❌ Error: ${failure.path || failure.error}`);
      errorCount++;
    });

    console.log(`\n📊 Resumen:`);
    console.log(`   ✅ ${successCount} archivos generados exitosamente`);
    if (errorCount > 0) {
      console.log(`   ❌ ${errorCount} errores`);
    }

    if (successCount > 0) {
      console.log('\n🎉 ¡CRUD generado exitosamente!');
      console.log('\n📝 Próximos pasos:');
      console.log('   1. Revisa los archivos generados');
      console.log('   2. Ejecuta: npm run db:generate');
      console.log('   3. Personaliza el código según tus necesidades');
      console.log('   4. Agrega el modelo a prisma/schema.prisma si no existe');
    }

  } catch (error) {
    console.error('\n❌ Error al generar CRUD:', error.message);
    console.error('\nAsegúrate de que:');
    console.error('- El archivo plopfile.js existe y es válido');
    console.error('- Las plantillas están en plop-templates/');
    console.error('- El nombre del modelo empieza con mayúscula');
    process.exit(1);
  }
}

// Run the generator
generateCrud().catch(console.error);