#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🔍 Analyzing TypeScript build errors...\n');

// Get all TypeScript errors
const buildOutput = execSync('npm run build 2>&1 || true', { encoding: 'utf8', maxBuffer: 10 * 1024 * 1024 });

// Parse errors
const errorLines = buildOutput.split('\n').filter(line => line.includes('error TS'));
const errors = {};

errorLines.forEach(line => {
  const match = line.match(/^(.+?)\((\d+),(\d+)\): error (TS\d+): (.+)$/);
  if (match) {
    const [, file, lineNum, colNum, errorCode, message] = match;
    if (!errors[file]) errors[file] = [];
    errors[file].push({ lineNum: parseInt(lineNum), colNum: parseInt(colNum), errorCode, message });
  }
});

// Analyze error patterns
const errorPatterns = {
  missingProperty: {},
  typeNotExist: {},
  typeMismatch: {},
  other: []
};

Object.entries(errors).forEach(([file, fileErrors]) => {
  fileErrors.forEach(error => {
    // Property doesn't exist
    if (error.message.includes('Property') && error.message.includes('does not exist')) {
      const match = error.message.match(/Property '(.+?)' does not exist on type '(.+?)'/);
      if (match) {
        const [, property, type] = match;
        const key = `${type}::${property}`;
        if (!errorPatterns.missingProperty[key]) {
          errorPatterns.missingProperty[key] = { property, type, files: [] };
        }
        errorPatterns.missingProperty[key].files.push(file);
      }
    }
    // Type doesn't exist
    else if (error.message.includes('Cannot find name')) {
      const match = error.message.match(/Cannot find name '(.+?)'/);
      if (match) {
        const [, typeName] = match;
        if (!errorPatterns.typeNotExist[typeName]) {
          errorPatterns.typeNotExist[typeName] = { files: [] };
        }
        errorPatterns.typeNotExist[typeName].files.push(file);
      }
    }
    // Type mismatch
    else if (error.message.includes('is not assignable to type')) {
      if (!errorPatterns.typeMismatch[file]) {
        errorPatterns.typeMismatch[file] = [];
      }
      errorPatterns.typeMismatch[file].push(error.message);
    }
    // Other errors
    else {
      errorPatterns.other.push({ file, message: error.message });
    }
  });
});

// Generate report
console.log('📊 Error Summary:');
console.log('================\n');
console.log(`Total files with errors: ${Object.keys(errors).length}`);
console.log(`Total errors: ${Object.values(errors).flat().length}\n`);

// Missing properties analysis
console.log('🔴 Missing Properties:');
console.log('---------------------');
const missingProps = Object.entries(errorPatterns.missingProperty);
missingProps.sort((a, b) => b[1].files.length - a[1].files.length);
missingProps.slice(0, 20).forEach(([key, data]) => {
  console.log(`${data.property} on ${data.type} (${data.files.length} occurrences)`);
});

// Check Prisma schema
console.log('\n📋 Checking Prisma Schema:');
console.log('-------------------------');
const schemaPath = path.join(__dirname, '..', 'prisma', 'schema.prisma');
const schema = fs.readFileSync(schemaPath, 'utf8');

// Look for specific missing tables/models
const missingTables = ['ai_tags', 'user_confirmed', 'ai_tag_id'];
missingTables.forEach(table => {
  const exists = schema.includes(`model ${table}`) || schema.includes(table);
  console.log(`${exists ? '✅' : '❌'} ${table}: ${exists ? 'exists' : 'MISSING'}`);
});

// Recommendations
console.log('\n💡 Recommendations:');
console.log('------------------');
console.log('1. The financial services expect fields/tables that don\'t exist in the Prisma schema');
console.log('2. Major mismatches in:');
console.log('   - ai_categorization service expects ai_tags table');
console.log('   - invoice service expects different field types');
console.log('   - reporting service has numerous type mismatches');
console.log('\n3. Solutions:');
console.log('   a) Update Prisma schema to match service expectations');
console.log('   b) Update services to match current Prisma schema');
console.log('   c) Generate type-safe services from Prisma schema');

// Generate fix suggestions
console.log('\n🔧 Automated Fix Suggestions:');
console.log('-----------------------------');

// Output JSON for automated processing
const diagnosticData = {
  totalErrors: Object.values(errors).flat().length,
  errorsByFile: Object.fromEntries(
    Object.entries(errors).map(([file, errs]) => [file, errs.length])
  ),
  missingProperties: errorPatterns.missingProperty,
  recommendations: []
};

fs.writeFileSync(
  path.join(__dirname, 'build-diagnostic.json'),
  JSON.stringify(diagnosticData, null, 2)
);

console.log('\n✅ Diagnostic complete! Results saved to scripts/build-diagnostic.json');