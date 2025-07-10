import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs/promises';
import * as path from 'path';
import { createHash } from 'crypto';

const execAsync = promisify(exec);

interface SchemaChecksum {
  timestamp: string;
  checksum: string;
  environment: 'development' | 'production';
}

interface SchemaDrift {
  hasChanges: boolean;
  additions: string[];
  removals: string[];
  modifications: string[];
}

class SchemaSync {
  private readonly migrationsPath = path.join(__dirname, '../migrations');
  private readonly checksumFile = path.join(__dirname, '../.schema-checksums.json');

  async compareSchemas(): Promise<SchemaDrift> {
    console.log('🔍 Comparing database schemas...');
    
    // Extract schemas
    const devSchema = await this.extractSchema('development');
    const prodSchema = await this.extractSchema('production');
    
    // Compare schemas
    const drift = this.detectDrift(devSchema, prodSchema);
    
    if (drift.hasChanges) {
      console.log('⚠️  Schema drift detected!');
      console.log(`  Additions: ${drift.additions.length}`);
      console.log(`  Removals: ${drift.removals.length}`);
      console.log(`  Modifications: ${drift.modifications.length}`);
    } else {
      console.log('✅ Schemas are in sync');
    }
    
    return drift;
  }

  async generateMigration(name: string): Promise<string> {
    const drift = await this.compareSchemas();
    
    if (!drift.hasChanges) {
      console.log('No changes detected, skipping migration generation');
      return '';
    }
    
    const timestamp = new Date().toISOString().replace(/[-:]/g, '').split('.')[0];
    const filename = `${timestamp}-${name}.sql`;
    const filepath = path.join(this.migrationsPath, filename);
    
    let migrationSQL = `-- Auto-generated migration: ${name}\n`;
    migrationSQL += `-- Generated at: ${new Date().toISOString()}\n\n`;
    
    // Add SQL for each change
    for (const addition of drift.additions) {
      migrationSQL += `-- Addition: ${addition}\n`;
      migrationSQL += await this.generateAdditionSQL(addition);
      migrationSQL += '\n\n';
    }
    
    for (const modification of drift.modifications) {
      migrationSQL += `-- Modification: ${modification}\n`;
      migrationSQL += await this.generateModificationSQL(modification);
      migrationSQL += '\n\n';
    }
    
    await fs.writeFile(filepath, migrationSQL);
    console.log(`✅ Migration generated: ${filename}`);
    
    return filepath;
  }

  async validateSchema(): Promise<boolean> {
    console.log('🔍 Validating schema integrity...');
    
    try {
      // Run schema validation queries
      const validationQueries = [
        // Check for missing foreign keys
        `SELECT conname FROM pg_constraint WHERE contype = 'f' AND NOT convalidated;`,
        
        // Check for missing indexes on foreign keys
        `SELECT tc.table_name, kcu.column_name
         FROM information_schema.table_constraints tc
         JOIN information_schema.key_column_usage kcu 
           ON tc.constraint_name = kcu.constraint_name
         WHERE tc.constraint_type = 'FOREIGN KEY'
         AND NOT EXISTS (
           SELECT 1 FROM pg_indexes 
           WHERE tablename = tc.table_name 
           AND indexdef LIKE '%' || kcu.column_name || '%'
         );`,
        
        // Check for tables without primary keys
        `SELECT schemaname, tablename 
         FROM pg_tables t
         WHERE schemaname NOT IN ('pg_catalog', 'information_schema')
         AND NOT EXISTS (
           SELECT 1 FROM pg_constraint c
           WHERE c.conrelid = (t.schemaname||'.'||t.tablename)::regclass
           AND c.contype = 'p'
         );`
      ];
      
      for (const query of validationQueries) {
        const result = await this.runQuery('development', query);
        if (result.rows.length > 0) {
          console.warn('⚠️  Schema validation issue found:', result.rows);
        }
      }
      
      return true;
    } catch (error) {
      console.error('❌ Schema validation failed:', error);
      return false;
    }
  }

  async applyMigrations(environment: 'development' | 'production'): Promise<void> {
    console.log(`📦 Applying migrations to ${environment}...`);
    
    // Get list of migration files
    const files = await fs.readdir(this.migrationsPath);
    const sqlFiles = files.filter(f => f.endsWith('.sql')).sort();
    
    // Get applied migrations from database
    const appliedMigrations = await this.getAppliedMigrations(environment);
    
    // Apply pending migrations
    for (const file of sqlFiles) {
      if (!appliedMigrations.includes(file)) {
        console.log(`  Applying: ${file}`);
        const sql = await fs.readFile(path.join(this.migrationsPath, file), 'utf-8');
        await this.runSQL(environment, sql);
        await this.recordMigration(environment, file);
      }
    }
    
    console.log('✅ All migrations applied');
  }

  private async extractSchema(env: 'development' | 'production'): Promise<string> {
    const command = env === 'development' 
      ? 'docker exec ai-service-postgres-1 pg_dump -U postgres -d ai_service --schema-only --no-owner --no-privileges'
      : 'make -f Makefile.production prod-dump-schema';
    
    const { stdout } = await execAsync(command);
    return stdout;
  }

  private detectDrift(devSchema: string, prodSchema: string): SchemaDrift {
    // Simple line-based comparison (can be improved with proper SQL parsing)
    const devLines = devSchema.split('\n').filter(l => l.trim());
    const prodLines = prodSchema.split('\n').filter(l => l.trim());
    
    const devSet = new Set(devLines);
    const prodSet = new Set(prodLines);
    
    const additions = devLines.filter(l => !prodSet.has(l));
    const removals = prodLines.filter(l => !devSet.has(l));
    
    return {
      hasChanges: additions.length > 0 || removals.length > 0,
      additions,
      removals,
      modifications: [] // Would need more sophisticated parsing
    };
  }

  private async generateAdditionSQL(addition: string): Promise<string> {
    // Parse the addition and generate appropriate SQL
    if (addition.includes('CREATE TABLE')) {
      return addition;
    } else if (addition.includes('ADD COLUMN')) {
      return addition;
    } else if (addition.includes('CREATE INDEX')) {
      return addition;
    }
    return `-- TODO: Review this change\n${addition}`;
  }

  private async generateModificationSQL(modification: string): Promise<string> {
    return `-- TODO: Review this modification\n${modification}`;
  }

  private async runQuery(env: string, query: string): Promise<any> {
    // Implementation depends on your database connection setup
    // This is a placeholder
    return { rows: [] };
  }

  private async runSQL(env: string, sql: string): Promise<void> {
    // Implementation for running SQL
    if (env === 'development') {
      await execAsync(`docker exec -i ai-service-postgres-1 psql -U postgres -d ai_service`, {
        input: sql
      });
    } else {
      // Use make command for production
      await fs.writeFile('/tmp/migration.sql', sql);
      await execAsync('make -f Makefile.production prod-apply-sql FILE=/tmp/migration.sql');
    }
  }

  private async getAppliedMigrations(env: string): Promise<string[]> {
    // Check if migrations table exists and get applied migrations
    try {
      const result = await this.runQuery(env, 
        `SELECT filename FROM schema_migrations ORDER BY filename;`
      );
      return result.rows.map((r: any) => r.filename);
    } catch {
      // Table doesn't exist yet
      return [];
    }
  }

  private async recordMigration(env: string, filename: string): Promise<void> {
    await this.runSQL(env, `
      CREATE TABLE IF NOT EXISTS schema_migrations (
        filename VARCHAR(255) PRIMARY KEY,
        applied_at TIMESTAMP DEFAULT NOW()
      );
      INSERT INTO schema_migrations (filename) VALUES ('${filename}');
    `);
  }
}

// CLI Interface
if (require.main === module) {
  const sync = new SchemaSync();
  const command = process.argv[2];
  
  switch (command) {
    case 'compare':
      sync.compareSchemas();
      break;
    case 'validate':
      sync.validateSchema();
      break;
    case 'generate':
      const name = process.argv[3] || 'auto-sync';
      sync.generateMigration(name);
      break;
    case 'apply':
      const env = (process.argv[3] || 'development') as 'development' | 'production';
      sync.applyMigrations(env);
      break;
    default:
      console.log('Usage: npm run schema-sync [compare|validate|generate|apply] [options]');
  }
}

export default SchemaSync;