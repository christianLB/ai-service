#!/usr/bin/env node

import { readFile } from 'fs/promises';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import nodePlop from 'node-plop';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Parse Prisma schema and extract model fields
 */
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

/**
 * Convert Prisma type to Zod type
 */
function prismaTypeToZod(field) {
  const typeMap = {
    'String': 'z.string()',
    'Int': 'z.number().int()',
    'Float': 'z.number()',
    'Boolean': 'z.boolean()',
    'DateTime': 'z.date()',
    'Json': 'z.any()',
    'Decimal': 'z.number()',
    'BigInt': 'z.bigint()',
    'Bytes': 'z.any()',
  };
  
  let zodType = typeMap[field.type] || 'z.string()';
  
  // Add UUID validation for ID fields
  if (field.name.toLowerCase().includes('id') && field.type === 'String') {
    zodType = 'z.string().uuid()';
  }
  
  // Add email validation
  if (field.name.toLowerCase() === 'email') {
    zodType = 'z.string().email()';
  }
  
  // Handle optional fields
  if (field.isOptional) {
    zodType += '.optional()';
    
    // Add nullable for optional fields (common in Prisma)
    if (!field.hasDefault) {
      zodType += '.nullable()';
    }
  }
  
  // Handle defaults
  if (field.hasDefault) {
    if (field.defaultValue === 'false' || field.defaultValue === 'true') {
      zodType += `.default(${field.defaultValue})`;
    } else if (field.defaultValue === 'now()' || field.defaultValue === 'uuid()' || field.defaultValue?.includes('dbgenerated')) {
      // Skip database-generated defaults in Zod
    } else if (field.defaultValue && !field.defaultValue.includes('(')) {
      zodType += `.default(${field.defaultValue})`;
    }
  }
  
  // Handle arrays
  if (field.isArray) {
    zodType = `z.array(${zodType})`;
  }
  
  return zodType;
}

/**
 * Generate type definitions from Prisma model
 */
function generateTypeContent(modelInfo) {
  const { name, fields, relations } = modelInfo;
  
  // Generate Zod schema
  const zodFields = fields
    .filter(f => !f.isId || f.name !== 'id') // Optionally include ID in base schema
    .map(field => {
      const zodType = prismaTypeToZod(field);
      return `  ${field.name}: ${zodType},`;
    })
    .join('\n');
  
  const relationImports = relations
    .filter(r => !r.isArray)
    .map(r => r.type)
    .filter((v, i, a) => a.indexOf(v) === i); // unique
  
  return `import { z } from 'zod';
import { Prisma } from '@prisma/client';

// Base ${name} schema
export const ${name.toLowerCase()}Schema = z.object({
  id: z.string().uuid().optional(),
${zodFields}
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
});

// Create schema (omit id and timestamps)
export const create${name}Schema = ${name.toLowerCase()}Schema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Update schema (all fields optional except id)
export const update${name}Schema = ${name.toLowerCase()}Schema.partial().extend({
  id: z.string().uuid(),
});

// Query params schema
export const ${name.toLowerCase()}QuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(10),
  search: z.string().optional(),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

// Types
export type ${name} = z.infer<typeof ${name.toLowerCase()}Schema>;
export type Create${name} = z.infer<typeof create${name}Schema>;
export type Update${name} = z.infer<typeof update${name}Schema>;
export type ${name}Query = z.infer<typeof ${name.toLowerCase()}QuerySchema>;

// Prisma types
export type ${name}WithRelations = Prisma.${name}GetPayload<{
  include: {
${relations.map(r => `    ${r.name}: true;`).join('\n')}
  };
}>;`;
}

/**
 * Main function
 */
async function generateCrud() {
  const args = process.argv.slice(2);
  
  if (args.length === 0 || args[0] === '--help') {
    console.log(`
📋 Generador CRUD desde Prisma Schema

Uso: node scripts/generate-crud-from-prisma.mjs <ModelName>

Este script lee el modelo directamente desde prisma/schema.prisma
y genera código con los campos correctos.

Ejemplo:
  node scripts/generate-crud-from-prisma.mjs InvoiceTemplate
    `);
    process.exit(0);
  }
  
  const modelName = args[0];
  
  try {
    console.log(`🔍 Leyendo modelo ${modelName} desde Prisma schema...`);
    const modelInfo = await parsePrismaModel(modelName);
    
    console.log(`✅ Modelo encontrado:`);
    console.log(`   Schema: ${modelInfo.schema}`);
    console.log(`   Campos: ${modelInfo.fields.length}`);
    console.log(`   Relaciones: ${modelInfo.relations.length}`);
    
    // Generate type file content
    const typeContent = generateTypeContent(modelInfo);
    
    // Save the generated type file
    const typePath = join(__dirname, '..', 'src', 'types', `${modelName.toLowerCase()}.generated.types.ts`);
    await writeFile(typePath, typeContent);
    
    console.log(`\n✅ Archivo generado: ${typePath}`);
    console.log('\n📋 Contenido generado con campos reales del modelo Prisma');
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  }
}

// Helper to write file
import { writeFile as fsWriteFile } from 'fs/promises';
async function writeFile(path, content) {
  await fsWriteFile(path, content, 'utf-8');
}

// Run
generateCrud().catch(console.error);