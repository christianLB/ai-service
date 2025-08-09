#!/usr/bin/env node

/**
 * Full-stack Contract-First CRUD Generator
 * Generates complete type-safe CRUD with ts-rest contracts from Prisma models
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import chalk from 'chalk';
import ora from 'ora';
import Handlebars from 'handlebars';

const execAsync = promisify(exec);
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = path.join(__dirname, '..');

// Register Handlebars helpers
Handlebars.registerHelper('eq', (a, b) => a === b);
Handlebars.registerHelper('or', (...args) => args.slice(0, -1).some(v => v));
Handlebars.registerHelper('not', (value) => !value);
Handlebars.registerHelper('and', (a, b) => a && b);
Handlebars.registerHelper('includes', (array, item) => {
  if (typeof array === 'string') {
    return array.includes(item);
  }
  return array?.includes(item);
});

// Case conversion helpers
Handlebars.registerHelper('camelCase', (str) => str.charAt(0).toLowerCase() + str.slice(1));
Handlebars.registerHelper('pascalCase', (str) => str.charAt(0).toUpperCase() + str.slice(1));
Handlebars.registerHelper('kebabCase', (str) => str.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase());
Handlebars.registerHelper('snakeCase', (str) => str.replace(/([a-z])([A-Z])/g, '$1_$2').toLowerCase());
Handlebars.registerHelper('upperCase', (str) => str.toUpperCase());
Handlebars.registerHelper('lowerCase', (str) => str.toLowerCase());
Handlebars.registerHelper('capitalize', (str) => str.charAt(0).toUpperCase() + str.slice(1));
Handlebars.registerHelper('titleCase', (str) => str.split(/[\s-_]+/).map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(' '));

// Prisma to Zod type helper
Handlebars.registerHelper('prismaToZod', (field) => {
  if (!field) return 'z.any()';
  
  let zodType = 'z.any()';
  
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
      zodType += `.default(${field.defaultValue})`;
    } else if (field.defaultValue && !field.defaultValue.includes('(')) {
      zodType += `.default(${field.defaultValue})`;
    }
  }
  
  return zodType;
});

// Parse command line arguments
function parseArgs() {
  const args = process.argv.slice(2);
  
  if (args.length === 0 || args[0] === '--help' || args[0] === '-h') {
    console.log(chalk.cyan(`
╔════════════════════════════════════════════════════════════╗
║         🚀 Full-Stack Contract-First CRUD Generator        ║
╚════════════════════════════════════════════════════════════╝

${chalk.yellow('Usage:')} npm run generate:full <ModelName> [options]

${chalk.yellow('Options:')}
  --schema <name>      Database schema (default: auto-detect from Prisma)
  --no-bulk           Skip bulk operations
  --skip-frontend     Skip frontend generation
  --skip-tests        Skip test generation
  --dry-run          Show what would be generated without creating files

${chalk.yellow('Examples:')}
  npm run generate:full Product
  npm run generate:full Invoice --schema financial
  npm run generate:full Trade --schema trading --no-bulk

${chalk.green('What gets generated:')}
  ✅ Zod schemas for validation
  ✅ ts-rest contracts for type-safe API
  ✅ Express router with ts-rest
  ✅ Prisma service with full CRUD
  ✅ React components and hooks
  ✅ OpenAPI documentation
  ✅ Basic tests
    `));
    process.exit(0);
  }

  const options = {
    model: args[0],
    schema: '',
    includeBulk: true,
    includeFrontend: true,
    includeTests: true,
    dryRun: false,
  };

  // Parse flags
  for (let i = 1; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--schema' && args[i + 1]) {
      options.schema = args[i + 1];
      i++;
    } else if (arg === '--no-bulk') {
      options.includeBulk = false;
    } else if (arg === '--skip-frontend') {
      options.includeFrontend = false;
    } else if (arg === '--skip-tests') {
      options.includeTests = false;
    } else if (arg === '--dry-run') {
      options.dryRun = true;
    }
  }

  return options;
}

// Parse Prisma schema to extract model information
async function parsePrismaModel(modelName) {
  const schemaPath = path.join(projectRoot, 'prisma', 'schema.prisma');
  const schemaContent = await fs.readFile(schemaPath, 'utf-8');
  
  // Find the model definition
  const modelRegex = new RegExp(`model\\s+${modelName}\\s*{([^}]+)}`, 's');
  const modelMatch = schemaContent.match(modelRegex);
  
  if (!modelMatch) {
    // List available models
    const availableModels = [...schemaContent.matchAll(/model\s+(\w+)\s*{/g)]
      .map(m => m[1])
      .filter(m => !['Migration'].includes(m)); // Exclude system models
    
    throw new Error(
      `Model "${modelName}" not found in schema.prisma\n\n` +
      `Available models:\n${availableModels.map(m => `  - ${m}`).join('\n')}`
    );
  }
  
  const modelContent = modelMatch[1];
  const fields = [];
  const relations = [];
  let schema = 'public'; // Default schema
  
  // Parse schema directive
  const schemaMatch = modelContent.match(/@@schema\("([^"]+)"\)/);
  if (schemaMatch) {
    schema = schemaMatch[1];
  }
  
  // Parse fields
  const fieldLines = modelContent.split('\n').filter(line => line.trim() && !line.trim().startsWith('@@'));
  
  for (const line of fieldLines) {
    const fieldMatch = line.match(/^\s*(\w+)\s+(\w+)(\[])?(\?)?/);
    if (fieldMatch) {
      const [, name, type, isArray, isOptional] = fieldMatch;
      
      // Check if it's a relation
      if (line.includes('@relation')) {
        relations.push({
          name,
          type,
          isList: !!isArray,
          isOptional: !!isOptional,
        });
      } else {
        const field = {
          name,
          type,
          isOptional: !!isOptional || line.includes('?'),
          isList: !!isArray,
          isId: line.includes('@id'),
          isUnique: line.includes('@unique'),
          hasDefaultValue: line.includes('@default'),
          isCreatedAt: name === 'createdAt' || line.includes('@default(now())'),
          isUpdatedAt: name === 'updatedAt' || line.includes('@updatedAt'),
        };
        
        // Parse additional constraints
        const maxMatch = line.match(/@db\.\w+\((\d+)(?:,\s*\d+)?\)/);
        if (maxMatch) {
          field.maxLength = parseInt(maxMatch[1]);
        }
        
        fields.push(field);
      }
    }
  }
  
  return {
    name: modelName,
    schema,
    fields,
    relations,
    hasRelations: relations.length > 0,
    hasDateTime: fields.some(f => f.type === 'DateTime'),
    hasDecimal: fields.some(f => f.type === 'Decimal'),
    hasCommonTypes: true, // Always import UUID at minimum
  };
}

// Generate file from template
async function generateFromTemplate(templatePath, outputPath, data, options) {
  if (options.dryRun) {
    console.log(chalk.gray(`  Would create: ${outputPath}`));
    return;
  }
  
  // Read template
  const template = await fs.readFile(templatePath, 'utf-8');
  
  // Compile template with Handlebars
  const compiledTemplate = Handlebars.compile(template);
  
  // Prepare context with all necessary data
  const context = {
    ...data,
    model: data.name,
    modelInfo: data,
    schema: data.schema,
    hasBulkOperations: options.includeBulk,
    hasRelations: data.hasRelations,
    hasDateTime: data.hasDateTime,
    hasDecimal: data.hasDecimal,
    hasCommonTypes: data.hasCommonTypes,
    // Add case variations
    pascalCase: data.pascalCase,
    camelCase: data.camelCase,
    kebabCase: data.kebabCase,
    lowerCase: data.lowerCase,
    upperCase: data.upperCase,
    // Model name variations for templates
    modelLower: data.lowerCase,
    modelPlural: data.pascalCase + 's',
    modelPluralLower: data.lowerCase + 's'
  };
  
  // Generate content
  const content = compiledTemplate(context);
  
  // Create directory if it doesn't exist
  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  
  // Write file
  await fs.writeFile(outputPath, content);
  console.log(chalk.green(`  ✅ Created: ${outputPath}`));
}

// Helper functions for case conversion
function pascalCase(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function camelCase(str) {
  return str.charAt(0).toLowerCase() + str.slice(1);
}

function kebabCase(str) {
  return str.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase();
}

// Main generation function
async function generateFullStack(options) {
  const spinner = ora('Parsing Prisma model...').start();
  
  try {
    // Parse model from Prisma
    const modelInfo = await parsePrismaModel(options.model);
    
    if (options.schema && options.schema !== modelInfo.schema) {
      spinner.warn(`Schema override: using "${options.schema}" instead of detected "${modelInfo.schema}"`);
      modelInfo.schema = options.schema;
    }
    
    spinner.succeed(`Found model ${chalk.cyan(options.model)} in schema ${chalk.yellow(modelInfo.schema)}`);
    
    // Prepare template data
    const templateData = {
      ...modelInfo,
      pascalCase: pascalCase(options.model),
      camelCase: camelCase(options.model),
      kebabCase: kebabCase(options.model),
      lowerCase: options.model.toLowerCase(),
      upperCase: options.model.toUpperCase(),
    };
    
    const filesToGenerate = [];
    
    // Backend files
    filesToGenerate.push({
      template: path.join(projectRoot, 'plop-templates/contracts/zod-schema.ts.hbs'),
      output: path.join(projectRoot, `packages/contracts/src/schemas/${kebabCase(options.model)}.ts`),
      type: 'Zod Schema',
    });
    
    filesToGenerate.push({
      template: path.join(projectRoot, 'plop-templates/contracts/ts-rest-contract.ts.hbs'),
      output: path.join(projectRoot, `packages/contracts/src/contracts/${kebabCase(options.model)}.ts`),
      type: 'ts-rest Contract',
    });
    
    filesToGenerate.push({
      template: path.join(projectRoot, 'plop-templates/services/model.service.ts.hbs'),
      output: path.join(
        projectRoot,
        `src/services`,
        modelInfo.schema !== 'public' ? modelInfo.schema : '',
        `${kebabCase(options.model)}.service.ts`
      ),
      type: 'Service',
    });
    
    filesToGenerate.push({
      template: path.join(projectRoot, 'plop-templates/routes/ts-rest-router.ts.hbs'),
      output: path.join(projectRoot, `src/routes/${kebabCase(options.model)}.router.ts`),
      type: 'Router',
    });
    
    // Frontend files (if included)
    if (options.includeFrontend) {
      filesToGenerate.push({
        template: path.join(projectRoot, 'plop-templates/hooks/use-model.ts.hbs'),
        output: path.join(projectRoot, `frontend/src/hooks/use-${kebabCase(options.model)}.ts`),
        type: 'React Hook',
      });
      
      filesToGenerate.push({
        template: path.join(projectRoot, 'plop-templates/components/model-list-dynamic.tsx.hbs'),
        output: path.join(projectRoot, `frontend/src/components/${kebabCase(options.model)}/${pascalCase(options.model)}List.tsx`),
        type: 'List Component',
      });
      
      filesToGenerate.push({
        template: path.join(projectRoot, 'plop-templates/components/model-form-dynamic.tsx.hbs'),
        output: path.join(projectRoot, `frontend/src/components/${kebabCase(options.model)}/${pascalCase(options.model)}Form.tsx`),
        type: 'Form Component',
      });
    }
    
    // Generate files
    if (options.dryRun) {
      console.log(chalk.yellow('\n🔍 Dry run mode - no files will be created:\n'));
    } else {
      console.log(chalk.cyan('\n📝 Generating files...\n'));
    }
    
    for (const file of filesToGenerate) {
      try {
        await generateFromTemplate(file.template, file.output, templateData, options);
      } catch (error) {
        // If template doesn't exist, skip it
        if (error.code === 'ENOENT' && error.path === file.template) {
          console.log(chalk.yellow(`  ⚠️  Template not found, using fallback: ${file.type}`));
          // Create a basic file
          if (!options.dryRun) {
            await fs.mkdir(path.dirname(file.output), { recursive: true });
            await fs.writeFile(file.output, `// TODO: Implement ${file.type} for ${options.model}\n`);
          }
        } else {
          throw error;
        }
      }
    }
    
    // Generate OpenAPI (if not dry run)
    if (!options.dryRun) {
      spinner.start('Generating OpenAPI documentation...');
      try {
        await execAsync('npm run generate:openapi', { cwd: projectRoot });
        spinner.succeed('OpenAPI documentation generated');
      } catch (error) {
        spinner.warn('OpenAPI generation failed (this is optional)');
      }
    }
    
    // Run TypeScript check
    if (!options.dryRun) {
      spinner.start('Validating TypeScript...');
      try {
        await execAsync('npx tsc --noEmit', { cwd: projectRoot });
        spinner.succeed('TypeScript validation passed');
      } catch (error) {
        spinner.warn('TypeScript validation failed - please fix any type errors');
      }
    }
    
    // Success!
    console.log(chalk.green.bold(`
╔════════════════════════════════════════════════════════════╗
║                    ✨ Generation Complete!                 ║
╚════════════════════════════════════════════════════════════╝
`));
    
    console.log(chalk.cyan('Generated structure:'));
    console.log(`
${chalk.yellow('Backend:')}
  📁 packages/contracts/src/
    ├── schemas/${kebabCase(options.model)}.ts
    └── contracts/${kebabCase(options.model)}.ts
  📁 src/
    ├── services/${modelInfo.schema !== 'public' ? modelInfo.schema + '/' : ''}${kebabCase(options.model)}.service.ts
    └── routes/${kebabCase(options.model)}.router.ts
${options.includeFrontend ? `
${chalk.yellow('Frontend:')}
  📁 frontend/src/
    ├── hooks/use-${kebabCase(options.model)}.ts
    └── components/${kebabCase(options.model)}/
        ├── ${pascalCase(options.model)}List.tsx
        └── ${pascalCase(options.model)}Form.tsx
` : ''}
${chalk.yellow('Next steps:')}
  1. Add the router to your main index.ts:
     ${chalk.gray(`import { setup${pascalCase(options.model)}Routes } from './routes/${kebabCase(options.model)}.router';`)}
     ${chalk.gray(`setup${pascalCase(options.model)}Routes(app);`)}
  
  2. Run migrations if needed:
     ${chalk.gray('npm run db:migrate')}
  
  3. Start the development server:
     ${chalk.gray('npm run dev:contract')}
`);
    
  } catch (error) {
    spinner.fail(`Generation failed: ${error.message}`);
    process.exit(1);
  }
}

// Run the generator
const options = parseArgs();
generateFullStack(options).catch(error => {
  console.error(chalk.red('Fatal error:'), error);
  process.exit(1);
});