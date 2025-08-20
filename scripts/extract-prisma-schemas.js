#!/usr/bin/env node

/**
 * Extract Prisma Schemas for Microservices
 * 
 * This script reads the monolithic schema.prisma and splits it into
 * service-specific schemas based on the @@schema annotation.
 * 
 * CONTRACT-FIRST Note: This is a transitional script. Future schemas
 * should be generated from OpenAPI specifications, not extracted.
 */

const fs = require('fs');
const path = require('path');

// Service mapping configuration
const SERVICE_MAPPING = {
  'financial': {
    service: 'financial-svc',
    database: 'postgresql://financial_user:financial_secure_2025@localhost:5435/financial_db',
    description: 'Financial Service - Clients, Invoices, Accounts, Transactions'
  },
  'trading': {
    service: 'trading-svc', 
    database: 'postgresql://trading_user:trading_secure_2025@localhost:5436/trading_db',
    description: 'Trading Service - Strategies, Positions, Orders, Market Data'
  },
  'tagging': {
    service: 'ai-core',
    database: 'postgresql://ai_user:ai_secure_2025@localhost:5437/ai_db',
    description: 'AI Core Service - Documents, Tags, Embeddings'
  },
  'public': {
    service: 'api-gateway',
    database: 'postgresql://auth_user:auth_secure_2025@localhost:5434/auth_db',
    description: 'API Gateway & Auth - Users, Sessions, Permissions'
  },
  'comm': {
    service: 'comm-svc',
    database: 'postgresql://comm_user:comm_secure_2025@localhost:5438/comm_db',
    description: 'Communication Service - Messages, Channels, Notifications'
  }
};

// Read the monolithic schema
const schemaPath = path.join(__dirname, '..', 'prisma', 'schema.prisma');
const schemaContent = fs.readFileSync(schemaPath, 'utf-8');

// Parse the schema into sections
function parseSchema(content) {
  const lines = content.split('\n');
  const models = {};
  const enums = {};
  let currentModel = null;
  let currentEnum = null;
  let modelContent = [];
  let headerContent = [];
  let inHeader = true;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    
    // Capture header (generator and datasource)
    if (inHeader && (trimmed.startsWith('generator') || trimmed.startsWith('datasource'))) {
      let bracketCount = 0;
      const startIdx = i;
      
      do {
        const currentLine = lines[i];
        headerContent.push(currentLine);
        if (currentLine.includes('{')) bracketCount++;
        if (currentLine.includes('}')) bracketCount--;
        i++;
      } while (bracketCount > 0 && i < lines.length);
      
      i--; // Adjust for loop increment
      continue;
    }
    
    // End of header
    if (inHeader && (trimmed.startsWith('model') || trimmed.startsWith('enum'))) {
      inHeader = false;
    }
    
    // Start of enum
    if (trimmed.startsWith('enum ')) {
      if (currentModel) {
        // Save previous model
        saveModel(models, currentModel, modelContent);
        currentModel = null;
        modelContent = [];
      }
      
      const enumName = trimmed.split(' ')[1];
      currentEnum = enumName;
      modelContent = [line];
      continue;
    }
    
    // Start of model
    if (trimmed.startsWith('model ')) {
      if (currentModel) {
        // Save previous model
        saveModel(models, currentModel, modelContent);
      }
      if (currentEnum) {
        // Save enum
        enums[currentEnum] = modelContent.join('\n');
        currentEnum = null;
      }
      
      const modelName = trimmed.split(' ')[1];
      currentModel = { name: modelName, schema: null };
      modelContent = [line];
      continue;
    }
    
    // Content within model or enum
    if (currentModel || currentEnum) {
      modelContent.push(line);
      
      // Check for schema annotation
      if (trimmed.startsWith('@@schema(')) {
        const schema = trimmed.match(/@@schema\("([^"]+)"\)/);
        if (schema && currentModel) {
          currentModel.schema = schema[1];
        }
      }
      
      // End of model/enum (closing brace at start of line)
      if (line === '}') {
        if (currentModel) {
          saveModel(models, currentModel, modelContent);
          currentModel = null;
        }
        if (currentEnum) {
          enums[currentEnum] = modelContent.join('\n');
          currentEnum = null;
        }
        modelContent = [];
      }
    }
  }
  
  // Save last model if exists
  if (currentModel) {
    saveModel(models, currentModel, modelContent);
  }
  
  return { models, enums, header: headerContent.join('\n') };
}

function saveModel(models, modelInfo, content) {
  const schema = modelInfo.schema || 'public';
  if (!models[schema]) {
    models[schema] = [];
  }
  
  // Remove @@schema line from content
  const cleanedContent = content
    .filter(line => !line.trim().startsWith('@@schema'))
    .join('\n');
  
  models[schema].push({
    name: modelInfo.name,
    content: cleanedContent
  });
}

// Generate service-specific schema
function generateServiceSchema(schemaName, models, enums, config) {
  const header = `// ${config.description}
// Generated from monolithic schema - ${new Date().toISOString()}
// DATABASE: ${config.database}

generator client {
  provider = "prisma-client-js"
  output   = "../node_modules/.prisma/client"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}`;

  // Collect enums used by models
  const usedEnums = new Set();
  const modelContents = models.map(m => m.content).join('\n');
  
  // Simple enum detection (could be improved)
  Object.keys(enums).forEach(enumName => {
    if (modelContents.includes(enumName)) {
      usedEnums.add(enumName);
    }
  });
  
  // Build schema content
  const parts = [header];
  
  // Add enums
  if (usedEnums.size > 0) {
    parts.push('\n// ============= ENUMS =============\n');
    usedEnums.forEach(enumName => {
      parts.push(enums[enumName]);
    });
  }
  
  // Add models
  parts.push('\n// ============= MODELS =============\n');
  models.forEach(model => {
    parts.push(model.content);
  });
  
  return parts.join('\n');
}

// Process cross-service relations
function processCrossServiceRelations(schema) {
  // This is a simplified version - in production, you'd want more sophisticated parsing
  const lines = schema.split('\n');
  const processed = [];
  let inRelation = false;
  
  for (const line of lines) {
    const trimmed = line.trim();
    
    // Detect relation that might cross service boundary
    if (trimmed.includes('@relation')) {
      // For now, we'll keep relations within the same schema
      // Cross-service relations should be handled as foreign keys only
      processed.push(line);
    } else {
      processed.push(line);
    }
  }
  
  return processed.join('\n');
}

// Main execution
async function main() {
  console.log('🔍 Parsing monolithic schema...');
  const { models, enums, header } = parseSchema(schemaContent);
  
  console.log('\n📊 Found schemas:');
  Object.keys(models).forEach(schema => {
    console.log(`  - ${schema}: ${models[schema].length} models`);
  });
  
  console.log('\n📝 Generating service schemas...');
  
  for (const [schemaName, config] of Object.entries(SERVICE_MAPPING)) {
    const serviceModels = models[schemaName] || [];
    
    if (serviceModels.length === 0) {
      console.log(`  ⚠️  No models found for ${schemaName} schema`);
      continue;
    }
    
    // Generate schema
    let serviceSchema = generateServiceSchema(schemaName, serviceModels, enums, config);
    
    // Process cross-service relations
    serviceSchema = processCrossServiceRelations(serviceSchema);
    
    // Create directory if doesn't exist
    const serviceDir = path.join(__dirname, '..', 'apps', config.service, 'prisma');
    if (!fs.existsSync(serviceDir)) {
      fs.mkdirSync(serviceDir, { recursive: true });
    }
    
    // Write schema file
    const outputPath = path.join(serviceDir, 'schema.prisma');
    fs.writeFileSync(outputPath, serviceSchema);
    
    console.log(`  ✅ Generated ${config.service}/prisma/schema.prisma (${serviceModels.length} models)`);
  }
  
  console.log('\n🎉 Schema extraction complete!');
  console.log('\n📋 Next steps:');
  console.log('  1. Review generated schemas for cross-service relations');
  console.log('  2. Update .env files with DATABASE_URLs');
  console.log('  3. Run: npm run migrate:all');
  console.log('  4. Generate Prisma clients: npm run generate:all');
  
  console.log('\n⚠️  IMPORTANT: This is a transitional approach.');
  console.log('  Future schemas should be generated from OpenAPI specs!');
  console.log('  See: /docs/CONTRACT_FIRST_SCHEMA_GENERATION.md');
}

// Run the script
main().catch(error => {
  console.error('❌ Error:', error);
  process.exit(1);
});