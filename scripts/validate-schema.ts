import { Pool } from 'pg';

interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

class SchemaValidator {
  private devPool: Pool;
  
  constructor() {
    this.devPool = new Pool({
      host: 'localhost',
      port: 5432,
      database: 'ai_service',
      user: 'postgres',
      password: 'postgres123'
    });
  }

  async validate(): Promise<ValidationResult> {
    const result: ValidationResult = {
      isValid: true,
      errors: [],
      warnings: []
    };

    try {
      // Check required schemas exist
      await this.checkSchemas(result);
      
      // Check required tables
      await this.checkTables(result);
      
      // Check required columns
      await this.checkColumns(result);
      
      // Check constraints
      await this.checkConstraints(result);
      
      // Check indexes
      await this.checkIndexes(result);
      
    } catch (error) {
      result.isValid = false;
      result.errors.push(`Validation error: ${error.message}`);
    } finally {
      await this.devPool.end();
    }

    return result;
  }

  private async checkSchemas(result: ValidationResult): Promise<void> {
    const requiredSchemas = ['financial'];
    
    const { rows } = await this.devPool.query(`
      SELECT schema_name 
      FROM information_schema.schemata 
      WHERE schema_name = ANY($1)
    `, [requiredSchemas]);
    
    const existingSchemas = rows.map(r => r.schema_name);
    const missingSchemas = requiredSchemas.filter(s => !existingSchemas.includes(s));
    
    if (missingSchemas.length > 0) {
      result.isValid = false;
      result.errors.push(`Missing schemas: ${missingSchemas.join(', ')}`);
    }
  }

  private async checkTables(result: ValidationResult): Promise<void> {
    const requiredTables = [
      'financial.currencies',
      'financial.accounts',
      'financial.transactions',
      'financial.categories',
      'financial.transaction_categories',
      'financial.client_transaction_links',
      'financial.matching_patterns'
    ];

    for (const tableName of requiredTables) {
      const [schema, table] = tableName.split('.');
      const { rows } = await this.devPool.query(`
        SELECT EXISTS (
          SELECT 1 FROM information_schema.tables 
          WHERE table_schema = $1 AND table_name = $2
        )
      `, [schema, table]);
      
      if (!rows[0].exists) {
        result.isValid = false;
        result.errors.push(`Missing table: ${tableName}`);
      }
    }
  }

  private async checkColumns(result: ValidationResult): Promise<void> {
    // Critical columns for transactions
    const criticalColumns = [
      { table: 'financial.transactions', column: 'transaction_id', type: 'character varying' },
      { table: 'financial.transactions', column: 'account_id', type: 'character varying' },
      { table: 'financial.transactions', column: 'amount', type: 'numeric' },
      { table: 'financial.transactions', column: 'date', type: 'date' },
      { table: 'financial.accounts', column: 'account_id', type: 'character varying' },
      { table: 'financial.accounts', column: 'provider', type: 'character varying' }
    ];

    for (const check of criticalColumns) {
      const [schema, table] = check.table.split('.');
      const { rows } = await this.devPool.query(`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_schema = $1 AND table_name = $2 AND column_name = $3
      `, [schema, table, check.column]);
      
      if (rows.length === 0) {
        result.isValid = false;
        result.errors.push(`Missing column: ${check.table}.${check.column}`);
      } else if (rows[0].data_type !== check.type) {
        result.warnings.push(
          `Column type mismatch: ${check.table}.${check.column} ` +
          `expected ${check.type}, got ${rows[0].data_type}`
        );
      }
    }
  }

  private async checkConstraints(result: ValidationResult): Promise<void> {
    // Check unique constraints
    const uniqueConstraints = [
      { table: 'financial.transactions', column: 'transaction_id' },
      { table: 'financial.accounts', column: 'account_id' }
    ];

    for (const constraint of uniqueConstraints) {
      const [schema, table] = constraint.table.split('.');
      const { rows } = await this.devPool.query(`
        SELECT COUNT(*) FROM pg_indexes 
        WHERE schemaname = $1 
        AND tablename = $2 
        AND indexdef LIKE '%UNIQUE%' 
        AND indexdef LIKE '%${constraint.column}%'
      `, [schema, table]);
      
      if (rows[0].count === '0') {
        result.warnings.push(
          `Missing UNIQUE constraint on ${constraint.table}.${constraint.column}`
        );
      }
    }
  }

  private async checkIndexes(result: ValidationResult): Promise<void> {
    // Check performance indexes
    const performanceIndexes = [
      { table: 'financial.transactions', column: 'account_id' },
      { table: 'financial.transactions', column: 'date' },
      { table: 'financial.transactions', column: 'transaction_id' }
    ];

    for (const index of performanceIndexes) {
      const [schema, table] = index.table.split('.');
      const { rows } = await this.devPool.query(`
        SELECT COUNT(*) FROM pg_indexes 
        WHERE schemaname = $1 
        AND tablename = $2 
        AND indexdef LIKE '%${index.column}%'
      `, [schema, table]);
      
      if (rows[0].count === '0') {
        result.warnings.push(
          `Missing index on ${index.table}.${index.column} (performance impact)`
        );
      }
    }
  }
}

// CLI execution
if (require.main === module) {
  const validator = new SchemaValidator();
  
  validator.validate().then(result => {
    console.log('Schema Validation Results:');
    console.log('=========================');
    console.log(`Valid: ${result.isValid ? '✅' : '❌'}`);
    
    if (result.errors.length > 0) {
      console.log('\nErrors:');
      result.errors.forEach(err => console.log(`  ❌ ${err}`));
    }
    
    if (result.warnings.length > 0) {
      console.log('\nWarnings:');
      result.warnings.forEach(warn => console.log(`  ⚠️  ${warn}`));
    }
    
    if (result.isValid && result.errors.length === 0 && result.warnings.length === 0) {
      console.log('\n✅ Schema is fully valid!');
    }
    
    process.exit(result.isValid ? 0 : 1);
  }).catch(error => {
    console.error('Validation failed:', error);
    process.exit(1);
  });
}

export default SchemaValidator;