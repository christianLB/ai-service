/**
 * Extracted parsePrismaModel function for testing
 */

import { readFile } from 'fs/promises';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Simple Levenshtein distance for fuzzy matching
function getLevenshteinDistance(a, b) {
  const matrix = [];
  
  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }
  
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }
  
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1,     // insertion
          matrix[i - 1][j] + 1      // deletion
        );
      }
    }
  }
  
  return matrix[b.length][a.length];
}

// Parse Prisma schema and extract model fields
export async function parsePrismaModel(modelName, schemaPath = null) {
  if (!schemaPath) {
    schemaPath = join(__dirname, '..', 'prisma', 'schema.prisma');
  }
  
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
    
    if (allModels.length > 0) {
      // Check for similar names
      const similar = allModels.filter(m => {
        const mLower = m.toLowerCase();
        const nameLower = modelName.toLowerCase();
        
        // Exact match (case insensitive)
        if (mLower === nameLower) return true;
        
        // Contains check
        if (mLower.includes(nameLower) || nameLower.includes(mLower)) return true;
        
        // Levenshtein distance for typos (simple version)
        const distance = getLevenshteinDistance(mLower, nameLower);
        const threshold = Math.max(3, Math.floor(Math.min(mLower.length, nameLower.length) * 0.3));
        
        return distance <= threshold;
      });
      
      if (similar.length > 0) {
        throw new Error(`${errorMsg}. Did you mean: ${similar.join(', ')}?`);
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
  
  // Find schema directive (default to "public" if not specified)
  const schemaMatch = modelContent.match(/@@schema\("([^"]+)"\)/);
  const schema = schemaMatch ? schemaMatch[1] : 'public';
  
  return {
    name: modelName,
    schema,
    fields,
    relations
  };
}