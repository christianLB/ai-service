#!/usr/bin/env node

/**
 * Generate Integration Configuration Key Script
 * 
 * This script generates a secure 32-character key for INTEGRATION_CONFIG_KEY
 * and optionally updates the .env.local file.
 * 
 * Usage: node scripts/generate-integration-key.js [options]
 * 
 * Options:
 *   --update     Update .env.local with the generated key
 *   --force      Overwrite existing INTEGRATION_CONFIG_KEY in .env.local
 *   --help       Show this help message
 */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

// Parse command line arguments
const args = process.argv.slice(2);
const shouldUpdate = args.includes('--update');
const forceUpdate = args.includes('--force');
const showHelp = args.includes('--help') || args.includes('-h');

if (showHelp) {
  console.log(`
🔐 Integration Configuration Key Generator

This script generates a secure 32-character key for INTEGRATION_CONFIG_KEY.

Usage: node scripts/generate-integration-key.js [options]

Options:
  --update     Update .env.local with the generated key
  --force      Overwrite existing INTEGRATION_CONFIG_KEY in .env.local
  --help       Show this help message

Examples:
  # Just generate a key
  node scripts/generate-integration-key.js
  
  # Generate and update .env.local
  node scripts/generate-integration-key.js --update
  
  # Force update even if key exists
  node scripts/generate-integration-key.js --update --force
  `);
  process.exit(0);
}

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function askQuestion(question) {
  return new Promise((resolve) => {
    rl.question(question, resolve);
  });
}

function generateSecureKey() {
  // Generate a secure random key
  // Using base64 encoding and taking first 32 chars for a mix of characters
  const randomBytes = crypto.randomBytes(24); // 24 bytes = 32 base64 chars
  const base64 = randomBytes.toString('base64');
  
  // Ensure it's exactly 32 characters and replace any problematic characters
  let key = base64.substring(0, 32);
  
  // Replace + and / with safer characters for env files
  key = key.replace(/\+/g, 'x').replace(/\//g, 'y');
  
  return key;
}

async function updateEnvFile(key) {
  const envPath = path.join(__dirname, '../.env.local');
  
  try {
    // Check if file exists
    if (!fs.existsSync(envPath)) {
      console.log(`\n❌ Error: .env.local file not found at ${envPath}`);
      console.log('   Please create the file first or run from the project root.');
      return false;
    }
    
    // Read the current content
    let content = fs.readFileSync(envPath, 'utf8');
    
    // Check if INTEGRATION_CONFIG_KEY already exists
    const keyExists = content.includes('INTEGRATION_CONFIG_KEY=');
    
    if (keyExists && !forceUpdate) {
      console.log('\n⚠️  INTEGRATION_CONFIG_KEY already exists in .env.local');
      const overwrite = await askQuestion('Do you want to overwrite it? (yes/no): ');
      
      if (overwrite.toLowerCase() !== 'yes') {
        console.log('\nUpdate cancelled.');
        return false;
      }
    }
    
    if (keyExists) {
      // Replace existing key
      content = content.replace(
        /INTEGRATION_CONFIG_KEY=.*/,
        `INTEGRATION_CONFIG_KEY=${key}`
      );
      console.log('\n✅ Updated existing INTEGRATION_CONFIG_KEY in .env.local');
    } else {
      // Add new key after JWT_SECRET or at the end
      const jwtIndex = content.indexOf('JWT_SECRET=');
      
      if (jwtIndex !== -1) {
        // Find the end of the JWT_SECRET line
        const lineEnd = content.indexOf('\n', jwtIndex);
        
        // Insert the new key after JWT_SECRET
        const before = content.substring(0, lineEnd + 1);
        const after = content.substring(lineEnd + 1);
        
        content = before + 
          '\n# Integration Configuration Encryption Key\n' +
          '# This key is used to encrypt sensitive integration configurations like API keys\n' +
          '# Must be exactly 32 characters for AES-256 encryption\n' +
          `INTEGRATION_CONFIG_KEY=${key}\n` +
          after;
      } else {
        // Add at the end of file
        if (!content.endsWith('\n')) content += '\n';
        content += 
          '\n# Integration Configuration Encryption Key\n' +
          '# This key is used to encrypt sensitive integration configurations like API keys\n' +
          '# Must be exactly 32 characters for AES-256 encryption\n' +
          `INTEGRATION_CONFIG_KEY=${key}\n`;
      }
      
      console.log('\n✅ Added INTEGRATION_CONFIG_KEY to .env.local');
    }
    
    // Write the updated content
    fs.writeFileSync(envPath, content, 'utf8');
    
    return true;
  } catch (error) {
    console.error(`\n❌ Error updating .env.local: ${error.message}`);
    return false;
  }
}

async function main() {
  console.log('🔐 Integration Configuration Key Generator\n');
  
  // Generate a secure key
  const key = generateSecureKey();
  
  console.log('Generated secure 32-character key:');
  console.log('═'.repeat(40));
  console.log(key);
  console.log('═'.repeat(40));
  
  // Verify it's exactly 32 characters
  console.log(`\nKey length: ${key.length} characters ✅`);
  
  if (shouldUpdate) {
    console.log('\n📝 Updating .env.local file...');
    const updated = await updateEnvFile(key);
    
    if (updated) {
      console.log('\n🎉 Success! Your .env.local has been updated.');
      console.log('\n⚠️  Important next steps:');
      console.log('1. Restart your Docker containers: make dev-up');
      console.log('2. Re-encrypt existing credentials: node scripts/re-encrypt-credentials.js');
      console.log('3. Reset any credentials that fail to decrypt (like GoCardless)');
    }
  } else {
    console.log('\n💡 To update .env.local with this key, run:');
    console.log(`   node scripts/generate-integration-key.js --update`);
    console.log('\n📋 Or manually add to .env.local:');
    console.log(`   INTEGRATION_CONFIG_KEY=${key}`);
  }
  
  rl.close();
}

main();