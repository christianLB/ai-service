#!/usr/bin/env node

/**
 * Service Validation Script
 * Validates that all service files follow the correct patterns
 * Used as a pre-commit hook to catch errors before they're committed
 */

const fs = require('fs');
const path = require('path');

// Colors for console output
const colors = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  reset: '\x1b[0m',
};

let hasErrors = false;
const errors = [];

// Get all service files
const servicesDir = path.join(__dirname, '..', 'src', 'services');
const serviceFiles = [];

function findServiceFiles(dir) {
  if (!fs.existsSync(dir)) {
    return;
  }
  
  const files = fs.readdirSync(dir);
  
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    
    if (stat.isDirectory() && file !== '__tests__') {
      findServiceFiles(fullPath);
    } else if (file.endsWith('Service.ts') && !file.includes('.test.')) {
      serviceFiles.push(fullPath);
    }
  }
}

findServiceFiles(servicesDir);

console.log(`\n🔍 Validating ${serviceFiles.length} service files...\n`);

// Validate each service file
for (const file of serviceFiles) {
  const content = fs.readFileSync(file, 'utf8');
  const fileName = path.basename(file);
  const fileErrors = [];
  
  // Check 1: Must import api
  const hasApiImport = /import\s+(?:api|\{[^}]*api[^}]*\})\s+from\s+['"]\.*\/api['"]/.test(content);
  if (!hasApiImport) {
    fileErrors.push('Missing required import of api from "./api"');
  }
  
  // Check 2: Must not use fetch()
  const usesFetch = /\bfetch\s*\(/.test(content);
  if (usesFetch) {
    fileErrors.push('Uses fetch() directly instead of api instance');
  }
  
  // Check 3: Must not use XMLHttpRequest
  const usesXHR = /new\s+XMLHttpRequest/.test(content);
  if (usesXHR) {
    fileErrors.push('Uses XMLHttpRequest instead of api instance');
  }
  
  // Check 4: Must not hardcode API URLs
  const hardcodedUrls = content.match(/['"`](https?:\/\/[^'"`\s]+api[^'"`\s]*)['"`]/g);
  if (hardcodedUrls) {
    fileErrors.push(`Contains hardcoded API URLs: ${hardcodedUrls.join(', ')}`);
  }
  
  // Check 5: Should use api.get, api.post, etc.
  const hasApiCalls = /api\.(get|post|put|patch|delete|request)/.test(content);
  if (hasApiImport && !hasApiCalls) {
    fileErrors.push('Imports api but doesn\'t appear to use it');
  }
  
  // Check 6: Should not manually handle authentication headers
  const manualAuth = /['"]Authorization['"]\s*:\s*[`'"]Bearer/.test(content);
  if (manualAuth) {
    fileErrors.push('Manually handles Authorization headers (api instance does this automatically)');
  }
  
  // Check 7: Should not handle 401 errors
  const handles401 = /status\s*===?\s*401|response\.status\s*===?\s*401|catch.*401/.test(content);
  if (handles401) {
    fileErrors.push('Appears to handle 401 errors (api instance handles token refresh automatically)');
  }
  
  // Report errors for this file
  if (fileErrors.length > 0) {
    hasErrors = true;
    errors.push({ file: fileName, errors: fileErrors });
    console.log(`${colors.red}❌ ${fileName}${colors.reset}`);
    fileErrors.forEach(error => {
      console.log(`   ${colors.yellow}→${colors.reset} ${error}`);
    });
    console.log('');
  } else {
    console.log(`${colors.green}✓${colors.reset} ${fileName}`);
  }
}

// Summary
console.log('\n' + '='.repeat(60) + '\n');

if (hasErrors) {
  console.log(`${colors.red}❌ Service validation failed!${colors.reset}\n`);
  console.log('Please fix the following issues:\n');
  
  errors.forEach(({ file, errors }) => {
    console.log(`${colors.yellow}${file}:${colors.reset}`);
    errors.forEach(error => {
      console.log(`  - ${error}`);
    });
    console.log('');
  });
  
  console.log(`See ${colors.yellow}frontend/docs/SERVICE_DEVELOPMENT_GUIDE.md${colors.reset} for correct patterns.\n`);
  process.exit(1);
} else {
  console.log(`${colors.green}✅ All service files passed validation!${colors.reset}\n`);
  process.exit(0);
}