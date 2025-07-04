#!/usr/bin/env node

/**
 * Schema Validation Script
 * 
 * EJECUTAR ANTES DE CADA DEPLOY
 * 
 * Este script valida que el schema de base de datos coincide
 * exactamente con lo esperado, previniendo errores en producción.
 */

import { Pool } from 'pg';
import { createSchemaValidator } from '../src/services/schema-validator';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

// Load environment variables
const envPath = process.env.NODE_ENV === 'production' 
  ? '.env.production' 
  : '.env.local';

if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
}

async function validateDatabaseSchema() {
  console.log('🔍 Database Schema Validation\n');
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`Database: ${process.env.POSTGRES_DB}@${process.env.POSTGRES_HOST}\n`);

  const pool = new Pool({
    host: process.env.POSTGRES_HOST,
    port: parseInt(process.env.POSTGRES_PORT || '5432'),
    database: process.env.POSTGRES_DB,
    user: process.env.POSTGRES_USER,
    password: process.env.POSTGRES_PASSWORD,
  });

  try {
    const validator = createSchemaValidator(pool);
    const result = await validator.validateSchema();
    
    // Generate report
    const report = validator.generateReport(result);
    console.log(report);
    
    // Save report to file
    const reportPath = path.join(__dirname, '../schema-validation-report.md');
    fs.writeFileSync(reportPath, report);
    console.log(`\n📄 Report saved to: ${reportPath}`);
    
    // Exit with appropriate code
    if (!result.isValid) {
      console.error('\n❌ VALIDATION FAILED - DO NOT DEPLOY!');
      process.exit(1);
    } else {
      console.log('\n✅ Validation passed - Safe to deploy');
      process.exit(0);
    }
    
  } catch (error) {
    console.error('Validation error:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run validation
validateDatabaseSchema();