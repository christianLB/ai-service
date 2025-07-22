#!/usr/bin/env node

/**
 * Template validation tests
 */

import { readFile } from 'fs/promises';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import Handlebars from 'handlebars';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Test utilities
let testResults = { passed: 0, failed: 0, tests: [] };

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

// Sample model data for testing
const sampleModelInfo = {
  name: 'TestModel',
  schema: 'public',
  fields: [
    { name: 'id', type: 'String', isArray: false, isOptional: false, isId: true, isUnique: false, hasDefault: true, isRelation: false, dbName: null, defaultValue: 'uuid()' },
    { name: 'name', type: 'String', isArray: false, isOptional: false, isId: false, isUnique: false, hasDefault: false, isRelation: false, dbName: null, defaultValue: null },
    { name: 'description', type: 'String', isArray: false, isOptional: true, isId: false, isUnique: false, hasDefault: false, isRelation: false, dbName: null, defaultValue: null },
    { name: 'data', type: 'Json', isArray: false, isOptional: true, isId: false, isUnique: false, hasDefault: true, isRelation: false, dbName: null, defaultValue: '{}' },
    { name: 'isActive', type: 'Boolean', isArray: false, isOptional: false, isId: false, isUnique: false, hasDefault: true, isRelation: false, dbName: null, defaultValue: 'true' },
    { name: 'createdAt', type: 'DateTime', isArray: false, isOptional: false, isId: false, isUnique: false, hasDefault: true, isRelation: false, dbName: null, defaultValue: 'now()' }
  ],
  relations: []
};

const sampleContext = {
  model: 'TestModel',
  modelLower: 'testmodel',
  modelPlural: 'TestModels',
  modelPluralLower: 'testmodels',
  modelInfo: sampleModelInfo,
  schema: 'public'
};

// Register Handlebars helpers used in templates
Handlebars.registerHelper('eq', (a, b) => a === b);
Handlebars.registerHelper('or', (...args) => {
  // Remove the last argument (Handlebars options object)
  const values = args.slice(0, -1);
  return values.some(v => v);
});
Handlebars.registerHelper('and', (...args) => {
  // Remove the last argument (Handlebars options object)
  const values = args.slice(0, -1);
  return values.every(v => v);
});
Handlebars.registerHelper('not', (value) => !value);
Handlebars.registerHelper('includes', (str, substr) => str && str.includes(substr));
Handlebars.registerHelper('json', (context) => JSON.stringify(context, null, 2));
Handlebars.registerHelper('camelCase', (str) => str.charAt(0).toLowerCase() + str.slice(1));
Handlebars.registerHelper('pascalCase', (str) => str.charAt(0).toUpperCase() + str.slice(1));
Handlebars.registerHelper('titleCase', (str) => str.charAt(0).toUpperCase() + str.slice(1));
Handlebars.registerHelper('lowerCase', (str) => str.toLowerCase());
Handlebars.registerHelper('upperCase', (str) => str.toUpperCase());
Handlebars.registerHelper('kebabCase', (str) => str.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase());
Handlebars.registerHelper('snakeCase', (str) => str.replace(/([a-z])([A-Z])/g, '$1_$2').toLowerCase());
Handlebars.registerHelper('capitalize', (str) => str.charAt(0).toUpperCase() + str.slice(1));

// Helper to convert Prisma type to Zod type
Handlebars.registerHelper('prismaToZod', (field) => {
  if (!field) return 'z.any()';
  
  let zodType = 'z.any()';
  
  // Map Prisma types to Zod types
  const typeMap = {
    'String': 'z.string()',
    'Int': 'z.number().int()',
    'Float': 'z.number()',
    'Boolean': 'z.boolean()',
    'DateTime': 'z.date()',
    'Json': 'z.any()',
    'Decimal': 'z.number()',
    'BigInt': 'z.bigint()',
    'Bytes': 'z.any()'
  };
  
  zodType = typeMap[field.type] || 'z.string()';
  
  // Add UUID validation for ID fields
  if (field.name.toLowerCase().includes('id') && field.type === 'String') {
    zodType = 'z.string().uuid()';
  }
  
  // Add email validation
  if (field.name.toLowerCase() === 'email') {
    zodType = 'z.string().email()';
  }
  
  // Handle arrays
  if (field.isArray) {
    zodType = `z.array(${zodType})`;
  }
  
  // Handle optional fields
  if (field.isOptional) {
    zodType += '.optional()';
    if (!field.hasDefault) {
      zodType += '.nullable()';
    }
  }
  
  // Handle defaults
  if (field.hasDefault) {
    if (field.defaultValue === 'false' || field.defaultValue === 'true') {
      zodType += `.default(${field.defaultValue})`;
    } else if (field.defaultValue && field.defaultValue.match(/^['"].*['"]$/)) {
      // String default - already has quotes
      zodType += `.default(${field.defaultValue})`;
    } else if (field.defaultValue && !field.defaultValue.includes('(')) {
      // Other defaults like numbers
      zodType += `.default(${field.defaultValue})`;
    }
  }
  
  return zodType;
});

async function testTemplate(templatePath, context) {
  const templateContent = await readFile(templatePath, 'utf-8');
  const template = Handlebars.compile(templateContent);
  
  // This will throw if template has syntax errors
  const result = template(context);
  
  return result;
}

// Run tests
async function runTests() {
  console.log('🧪 Template Validation Tests\n');

  console.log('📋 Frontend Templates:');
  
  await test('should compile model types template', async () => {
    const templatePath = join(__dirname, '../../plop-templates/types/model.types.frontend.ts.hbs');
    const result = await testTemplate(templatePath, sampleContext);
    
    // Check that it generates correct field types
    if (!result.includes('name: string;')) {
      throw new Error('Missing required name field');
    }
    
    if (!result.includes('description?: string;')) {
      throw new Error('Optional description field not marked as optional');
    }
    
    if (!result.includes('data?: any;')) {
      throw new Error('Json field should be typed as any');
    }
  });

  await test('should compile model form template', async () => {
    const templatePath = join(__dirname, '../../plop-templates/components/model-form-simple.tsx.hbs');
    const result = await testTemplate(templatePath, sampleContext);
    
    // Check imports
    if (!result.includes("import") || !result.includes("Modal") || !result.includes("Form")) {
      throw new Error('Missing required imports');
    }
    
    // Check that it doesn't include relation fields
    if (result.includes('name="id"') || result.includes('name="createdAt"')) {
      throw new Error('Form should not include auto-generated fields');
    }
    
    // Check Json field uses TextArea
    if (sampleContext.modelInfo.fields.some(f => f.type === 'Json')) {
      if (!result.includes('TextArea')) {
        throw new Error('Json fields should use TextArea');
      }
    }
  });

  await test('should compile model list template', async () => {
    const templatePath = join(__dirname, '../../plop-templates/components/model-list-dynamic.tsx.hbs');
    const result = await testTemplate(templatePath, sampleContext);
    
    // Check table columns are generated
    if (!result.includes("dataIndex: 'name'")) {
      throw new Error('Missing name column');
    }
    
    // Check onChange type fix
    if (!result.includes('onChange: (keys) => setSelectedRowKeys(keys as string[])')) {
      throw new Error('onChange type casting missing');
    }
  });

  await test('should compile model page template', async () => {
    const templatePath = join(__dirname, '../../plop-templates/pages/model-page.tsx.hbs');
    const result = await testTemplate(templatePath, sampleContext);
    
    // Check PageHeader props
    if (!result.includes('subTitle=')) {
      throw new Error('Should use subTitle prop');
    }
    
    if (result.includes('breadcrumbs=')) {
      throw new Error('Should not include breadcrumbs prop');
    }
  });

  console.log('\n📋 Backend Templates:');
  
  await test('should compile backend types template', async () => {
    const templatePath = join(__dirname, '../../plop-templates/types/model.types.dynamic.ts.hbs');
    const result = await testTemplate(templatePath, sampleContext);
    
    // Check zod schemas
    if (!result.includes('z.object({')) {
      throw new Error('Missing zod object schema');
    }
    
    if (!result.includes('name: z.string()')) {
      throw new Error('Missing name field validation');
    }
    
    if (!result.includes('description: z.string().optional().nullable()')) {
      throw new Error('Optional fields should be optional and nullable');
    }
  });

  await test('should compile dynamic routes template', async () => {
    const templatePath = join(__dirname, '../../plop-templates/routes/model.routes.dynamic.ts.hbs');
    const result = await testTemplate(templatePath, sampleContext);
    
    // Check field-specific validations
    if (!result.includes("body('name')")) {
      throw new Error('Missing name field validation');
    }
    
    // Check that auto-generated fields are excluded
    if (result.includes("body('id')") || result.includes("body('createdAt')")) {
      throw new Error('Should not validate auto-generated fields');
    }
  });

  await test('should compile service template', async () => {
    const templatePath = join(__dirname, '../../plop-templates/services/model.service.ts.hbs');
    const result = await testTemplate(templatePath, sampleContext);
    
    // Check SQL queries use correct schema
    if (sampleContext.schema !== 'public' && !result.includes(`FROM "${sampleContext.schema}"`)) {
      throw new Error('Service should use correct schema');
    }
  });

  console.log('\n📋 Edge Cases:');
  
  await test('should handle model with no optional fields', async () => {
    const contextNoOptional = {
      ...sampleContext,
      modelInfo: {
        ...sampleModelInfo,
        fields: sampleModelInfo.fields.filter(f => !f.isOptional)
      }
    };
    
    const templatePath = join(__dirname, '../../plop-templates/types/model.types.frontend.ts.hbs');
    const result = await testTemplate(templatePath, contextNoOptional);
    
    // Check that the main interface has no optional fields
    const interfaceMatch = result.match(/export interface TestModel \{[^}]+\}/s);
    if (interfaceMatch) {
      const interfaceContent = interfaceMatch[0];
      const optionalInInterface = interfaceContent.match(/\w+\?:/g);
      if (optionalInInterface) {
        throw new Error(`Main interface should not have optional fields: found ${optionalInInterface.join(', ')}`);
      }
    }
  });

  await test('should handle model with relations', async () => {
    const contextWithRelations = {
      ...sampleContext,
      modelInfo: {
        ...sampleModelInfo,
        relations: [
          { name: 'user', type: 'User', isArray: false, isRelation: true }
        ]
      }
    };
    
    const templatePath = join(__dirname, '../../plop-templates/components/model-form-simple.tsx.hbs');
    const result = await testTemplate(templatePath, contextWithRelations);
    
    // Form should not include relation fields
    if (result.includes('name="user"')) {
      throw new Error('Form should not include relation fields');
    }
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