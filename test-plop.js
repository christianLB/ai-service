const nodePlop = require('node-plop');
const plop = nodePlop('./plopfile.js');

async function testCrudGenerator() {
  console.log('🧪 Probando generador CRUD...\n');
  
  const crudGenerator = plop.getGenerator('crud');
  
  // Configuración de prueba
  const answers = {
    model: 'Strategy',
    schema: 'trading',
    features: ['list', 'form', 'api', 'service', 'hooks'],
    hasRelations: true
  };
  
  try {
    console.log('📋 Configuración:');
    console.log(`- Modelo: ${answers.model}`);
    console.log(`- Schema: ${answers.schema}`);
    console.log(`- Features: ${answers.features.join(', ')}`);
    console.log(`- Relaciones: ${answers.hasRelations ? 'Sí' : 'No'}\n`);
    
    const results = await crudGenerator.runActions(answers);
    
    console.log('✅ Archivos generados:');
    results.changes.forEach(change => {
      if (change.type === 'add') {
        console.log(`  ✓ ${change.path}`);
      }
    });
    
    console.log('\n🎉 ¡CRUD generado exitosamente!');
    console.log('📝 Próximos pasos:');
    console.log('  1. Revisa los archivos generados');
    console.log('  2. Ejecuta: npm run db:generate');
    console.log('  3. Personaliza según tus necesidades');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

// Ejecutar
testCrudGenerator();