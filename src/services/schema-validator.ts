import { Pool } from 'pg';
import { logger } from '../utils/log';

interface SchemaValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  timestamp: Date;
}

interface ColumnDefinition {
  name: string;
  type: string;
  nullable: boolean;
  defaultValue?: string;
}

interface TableDefinition {
  schema: string;
  table: string;
  columns: ColumnDefinition[];
  constraints?: string[];
  indexes?: string[];
}

/**
 * Schema Validator Service
 *
 * PROPÓSITO: Validar que el schema de base de datos coincide exactamente
 * con lo esperado ANTES de cualquier operación o deploy.
 *
 * Esto previene los errores de "column does not exist" en producción.
 */
export class SchemaValidator {
  private pool: Pool;

  constructor(pool: Pool) {
    this.pool = pool;
  }

  /**
   * SCHEMA ESPERADO - Single Source of Truth
   * Este es el schema completo que DEBE existir en la base de datos
   */
  private getExpectedSchema(): TableDefinition[] {
    return [
      {
        schema: 'financial',
        table: 'currencies',
        columns: [
          { name: 'id', type: 'uuid', nullable: false },
          { name: 'code', type: 'character varying', nullable: false },
          { name: 'name', type: 'character varying', nullable: false },
          { name: 'type', type: 'character varying', nullable: false },
          { name: 'decimals', type: 'integer', nullable: true, defaultValue: '2' },
          { name: 'symbol', type: 'character varying', nullable: true },
          { name: 'is_active', type: 'boolean', nullable: true, defaultValue: 'true' },
          { name: 'created_at', type: 'timestamp with time zone', nullable: true },
          { name: 'updated_at', type: 'timestamp with time zone', nullable: true }
        ]
      },
      {
        schema: 'financial',
        table: 'accounts',
        columns: [
          { name: 'id', type: 'uuid', nullable: false },
          { name: 'account_id', type: 'character varying', nullable: false },
          { name: 'name', type: 'character varying', nullable: false },
          { name: 'type', type: 'character varying', nullable: false },
          { name: 'currency_id', type: 'uuid', nullable: true },
          { name: 'balance', type: 'numeric', nullable: true, defaultValue: '0' },
          { name: 'available_balance', type: 'numeric', nullable: true, defaultValue: '0' },
          { name: 'institution', type: 'character varying', nullable: true },
          { name: 'institution_id', type: 'character varying', nullable: true },
          { name: 'requisition_id', type: 'character varying', nullable: true },
          { name: 'iban', type: 'character varying', nullable: true },
          { name: 'wallet_address', type: 'character varying', nullable: true },
          { name: 'chain_id', type: 'character varying', nullable: true },
          { name: 'exchange_name', type: 'character varying', nullable: true },
          { name: 'metadata', type: 'jsonb', nullable: true, defaultValue: "'{}'" },
          { name: 'is_active', type: 'boolean', nullable: true, defaultValue: 'true' },
          { name: 'last_sync', type: 'timestamp with time zone', nullable: true },
          { name: 'created_at', type: 'timestamp with time zone', nullable: true },
          { name: 'updated_at', type: 'timestamp with time zone', nullable: true }
        ]
      },
      {
        schema: 'financial',
        table: 'transactions',
        columns: [
          { name: 'id', type: 'uuid', nullable: false },
          { name: 'transaction_id', type: 'character varying', nullable: false },
          { name: 'account_id', type: 'character varying', nullable: false },
          { name: 'amount', type: 'numeric', nullable: false },
          { name: 'currency_id', type: 'uuid', nullable: true },
          { name: 'type', type: 'character varying', nullable: false },
          { name: 'status', type: 'character varying', nullable: true, defaultValue: "'confirmed'" },
          { name: 'description', type: 'text', nullable: true },
          { name: 'reference', type: 'character varying', nullable: true },
          { name: 'date', type: 'date', nullable: false },
          { name: 'created_at', type: 'timestamp with time zone', nullable: true },
          { name: 'updated_at', type: 'timestamp with time zone', nullable: true },
          { name: 'metadata', type: 'jsonb', nullable: true, defaultValue: "'{}'" },
          { name: 'tags', type: 'text[]', nullable: true },
          { name: 'fee_amount', type: 'numeric', nullable: true },
          { name: 'fee_currency_id', type: 'uuid', nullable: true }
        ]
      },
      {
        schema: 'financial',
        table: 'categories',
        columns: [
          { name: 'id', type: 'uuid', nullable: false },
          { name: 'name', type: 'character varying', nullable: false },
          { name: 'type', type: 'character varying', nullable: true },
          { name: 'parent_id', type: 'uuid', nullable: true },
          { name: 'color', type: 'character varying', nullable: true },
          { name: 'icon', type: 'character varying', nullable: true },
          { name: 'is_active', type: 'boolean', nullable: true, defaultValue: 'true' },
          { name: 'created_at', type: 'timestamp with time zone', nullable: true },
          { name: 'updated_at', type: 'timestamp with time zone', nullable: true }
        ]
      },
      {
        schema: 'financial',
        table: 'transaction_categorizations',
        columns: [
          { name: 'id', type: 'uuid', nullable: false },
          { name: 'transaction_id', type: 'uuid', nullable: true },
          { name: 'category_id', type: 'uuid', nullable: true },
          { name: 'confidence', type: 'numeric', nullable: true, defaultValue: '1.00' },
          { name: 'method', type: 'character varying', nullable: true, defaultValue: "'manual'" },
          { name: 'created_at', type: 'timestamp with time zone', nullable: true }
        ]
      }
    ];
  }

  /**
   * Valida el schema completo de la base de datos
   */
  async validateSchema(): Promise<SchemaValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      logger.info('🔍 Starting schema validation...');

      const expectedTables = this.getExpectedSchema();

      for (const expectedTable of expectedTables) {
        await this.validateTable(expectedTable, errors, warnings);
      }

      const isValid = errors.length === 0;

      if (isValid) {
        logger.info('✅ Schema validation passed!');
      } else {
        logger.error(`❌ Schema validation failed with ${errors.length} errors`);
        errors.forEach(error => logger.error(`  - ${error}`));
      }

      if (warnings.length > 0) {
        logger.warn(`⚠️  Schema validation has ${warnings.length} warnings`);
        warnings.forEach(warning => logger.warn(`  - ${warning}`));
      }

      return {
        isValid,
        errors,
        warnings,
        timestamp: new Date()
      };

    } catch (error: any) {
      logger.error('Schema validation error:', error);
      errors.push(`Validation error: ${error.message}`);

      return {
        isValid: false,
        errors,
        warnings,
        timestamp: new Date()
      };
    }
  }

  /**
   * Valida una tabla específica
   */
  private async validateTable(
    expectedTable: TableDefinition,
    errors: string[],
    warnings: string[]
  ): Promise<void> {
    const { schema, table, columns } = expectedTable;

    // Check if table exists
    const tableExists = await this.tableExists(schema, table);
    if (!tableExists) {
      errors.push(`Table ${schema}.${table} does not exist`);
      return;
    }

    // Check columns
    for (const expectedColumn of columns) {
      await this.validateColumn(schema, table, expectedColumn, errors, warnings);
    }

    // Check for unexpected columns
    const actualColumns = await this.getTableColumns(schema, table);
    const expectedColumnNames = columns.map(c => c.name);

    for (const actualColumn of actualColumns) {
      if (!expectedColumnNames.includes(actualColumn.column_name)) {
        warnings.push(
          `Unexpected column ${schema}.${table}.${actualColumn.column_name} found`
        );
      }
    }
  }

  /**
   * Valida una columna específica
   */
  private async validateColumn(
    schema: string,
    table: string,
    expectedColumn: ColumnDefinition,
    errors: string[],
    warnings: string[]
  ): Promise<void> {
    const query = `
      SELECT 
        column_name,
        data_type,
        is_nullable,
        column_default
      FROM information_schema.columns
      WHERE table_schema = $1 
        AND table_name = $2 
        AND column_name = $3
    `;

    const result = await this.pool.query(query, [schema, table, expectedColumn.name]);

    if (result.rows.length === 0) {
      errors.push(`Column ${schema}.${table}.${expectedColumn.name} does not exist`);
      return;
    }

    const actualColumn = result.rows[0];

    // Validate type
    if (actualColumn.data_type !== expectedColumn.type) {
      errors.push(
        `Column ${schema}.${table}.${expectedColumn.name} has incorrect type: ` +
        `expected '${expectedColumn.type}', found '${actualColumn.data_type}'`
      );
    }

    // Validate nullable
    const actualNullable = actualColumn.is_nullable === 'YES';
    if (actualNullable !== expectedColumn.nullable) {
      warnings.push(
        `Column ${schema}.${table}.${expectedColumn.name} nullable mismatch: ` +
        `expected ${expectedColumn.nullable}, found ${actualNullable}`
      );
    }
  }

  /**
   * Verifica si una tabla existe
   */
  private async tableExists(schema: string, table: string): Promise<boolean> {
    const query = `
      SELECT EXISTS (
        SELECT 1 
        FROM information_schema.tables 
        WHERE table_schema = $1 
          AND table_name = $2
      ) as exists
    `;

    const result = await this.pool.query(query, [schema, table]);
    return result.rows[0].exists;
  }

  /**
   * Obtiene las columnas de una tabla
   */
  private async getTableColumns(schema: string, table: string): Promise<any[]> {
    const query = `
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_schema = $1 AND table_name = $2
      ORDER BY ordinal_position
    `;

    const result = await this.pool.query(query, [schema, table]);
    return result.rows;
  }

  /**
   * Genera un reporte de validación en formato markdown
   */
  generateReport(result: SchemaValidationResult): string {
    let report = '# Schema Validation Report\n\n';
    report += `**Date**: ${result.timestamp.toISOString()}\n`;
    report += `**Status**: ${result.isValid ? '✅ PASSED' : '❌ FAILED'}\n\n`;

    if (result.errors.length > 0) {
      report += '## Errors\n\n';
      result.errors.forEach(error => {
        report += `- ❌ ${error}\n`;
      });
      report += '\n';
    }

    if (result.warnings.length > 0) {
      report += '## Warnings\n\n';
      result.warnings.forEach(warning => {
        report += `- ⚠️  ${warning}\n`;
      });
      report += '\n';
    }

    if (result.isValid) {
      report += '## Summary\n\n';
      report += 'All schema validations passed successfully! ✅\n';
    }

    return report;
  }
}

export const createSchemaValidator = (pool: Pool) => new SchemaValidator(pool);