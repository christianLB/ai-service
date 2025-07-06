import { Pool } from 'pg';
import { logger } from '../../utils/log';

export interface NumberingSequence {
  id: string;
  series: string; // 'DEFAULT', 'CLIENT_ABC', etc.
  prefix: string; // 'FAC', 'INV', etc.
  currentNumber: number;
  currentYear: number;
  format: string; // 'PREFIX-YYYY-0000', 'PREFIX/YYYY/0000', etc.
  yearlyReset: boolean;
  lastUsed: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface InvoiceNumberOptions {
  series?: string; // Optional series for different numbering sequences
  prefix?: string; // Override default prefix
  format?: string; // Override default format
  year?: number; // Specific year (defaults to current)
}

export class InvoiceNumberingService {
  private pool: Pool;
  private defaultPrefix: string;
  private defaultFormat: string;
  private yearlyReset: boolean;

  constructor(pool: Pool, config?: {
    defaultPrefix?: string;
    defaultFormat?: string;
    yearlyReset?: boolean;
  }) {
    this.pool = pool;
    this.defaultPrefix = config?.defaultPrefix || 'FAC';
    this.defaultFormat = config?.defaultFormat || 'PREFIX-YYYY-0000';
    this.yearlyReset = config?.yearlyReset !== false; // Default true
  }

  async initializeSchema(): Promise<void> {
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS invoice_numbering_sequences (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        series VARCHAR(50) NOT NULL DEFAULT 'DEFAULT',
        prefix VARCHAR(20) NOT NULL,
        current_number INTEGER NOT NULL DEFAULT 0,
        current_year INTEGER NOT NULL,
        format VARCHAR(50) NOT NULL,
        yearly_reset BOOLEAN NOT NULL DEFAULT true,
        last_used TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        UNIQUE(series, prefix, current_year)
      );

      CREATE INDEX IF NOT EXISTS idx_invoice_numbering_series ON invoice_numbering_sequences(series);
      CREATE INDEX IF NOT EXISTS idx_invoice_numbering_year ON invoice_numbering_sequences(current_year);
    `;

    try {
      await this.pool.query(createTableQuery);
      logger.info('Invoice numbering sequences table initialized');
    } catch (error) {
      logger.error('Error initializing invoice numbering schema:', error);
      throw error;
    }
  }

  async getNextInvoiceNumber(options: InvoiceNumberOptions = {}): Promise<string> {
    const {
      series = 'DEFAULT',
      prefix = this.defaultPrefix,
      format = this.defaultFormat,
      year = new Date().getFullYear()
    } = options;

    const client = await this.pool.connect();
    
    try {
      // Start transaction for atomic operation
      await client.query('BEGIN');

      // Try to get and lock the current sequence
      const selectQuery = `
        SELECT * FROM invoice_numbering_sequences 
        WHERE series = $1 AND prefix = $2 AND current_year = $3
        FOR UPDATE
      `;

      const result = await client.query(selectQuery, [series, prefix, year]);
      
      let sequence: NumberingSequence;
      let nextNumber: number;

      if (result.rows.length === 0) {
        // Create new sequence
        nextNumber = 1;
        const insertQuery = `
          INSERT INTO invoice_numbering_sequences 
          (series, prefix, current_number, current_year, format, yearly_reset, last_used)
          VALUES ($1, $2, $3, $4, $5, $6, NOW())
          RETURNING *
        `;
        
        const insertResult = await client.query(insertQuery, [
          series,
          prefix,
          nextNumber,
          year,
          format,
          this.yearlyReset
        ]);
        
        sequence = insertResult.rows[0];
      } else {
        // Update existing sequence
        sequence = result.rows[0];
        
        // Check if we need to reset for new year
        if (this.yearlyReset && sequence.currentYear < year) {
          nextNumber = 1;
          const resetQuery = `
            UPDATE invoice_numbering_sequences
            SET current_number = $1, current_year = $2, last_used = NOW(), updated_at = NOW()
            WHERE id = $3
            RETURNING *
          `;
          
          const resetResult = await client.query(resetQuery, [nextNumber, year, sequence.id]);
          sequence = resetResult.rows[0];
        } else {
          nextNumber = sequence.currentNumber + 1;
          const updateQuery = `
            UPDATE invoice_numbering_sequences
            SET current_number = $1, last_used = NOW(), updated_at = NOW()
            WHERE id = $2
            RETURNING *
          `;
          
          const updateResult = await client.query(updateQuery, [nextNumber, sequence.id]);
          sequence = updateResult.rows[0];
        }
      }

      // Commit transaction
      await client.query('COMMIT');

      // Format the invoice number
      return this.formatInvoiceNumber(nextNumber, year, prefix, format);

    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Error generating invoice number:', error);
      throw new Error('Failed to generate invoice number');
    } finally {
      client.release();
    }
  }

  private formatInvoiceNumber(
    number: number, 
    year: number, 
    prefix: string, 
    format: string
  ): string {
    // Replace placeholders in format
    let formatted = format;
    
    // Replace PREFIX
    formatted = formatted.replace('PREFIX', prefix);
    
    // Replace YYYY (4-digit year)
    formatted = formatted.replace('YYYY', year.toString());
    
    // Replace YY (2-digit year)
    formatted = formatted.replace('YY', (year % 100).toString().padStart(2, '0'));
    
    // Replace number with appropriate padding
    // Count consecutive 0s or #s for padding
    const numberPattern = /0+|#+/g;
    const matches = formatted.match(numberPattern);
    
    if (matches) {
      const paddingLength = matches[0].length;
      const paddedNumber = number.toString().padStart(paddingLength, '0');
      formatted = formatted.replace(numberPattern, paddedNumber);
    } else {
      // Default: append number
      formatted += number.toString();
    }

    return formatted;
  }

  async getSequenceInfo(series: string = 'DEFAULT'): Promise<NumberingSequence[]> {
    const query = `
      SELECT * FROM invoice_numbering_sequences
      WHERE series = $1
      ORDER BY current_year DESC, prefix
    `;

    const result = await this.pool.query(query, [series]);
    return result.rows;
  }

  async getAllSequences(): Promise<NumberingSequence[]> {
    const query = `
      SELECT * FROM invoice_numbering_sequences
      ORDER BY series, current_year DESC, prefix
    `;

    const result = await this.pool.query(query);
    return result.rows;
  }

  async resetSequence(series: string, prefix: string, year?: number): Promise<void> {
    const currentYear = year || new Date().getFullYear();
    
    const query = `
      UPDATE invoice_numbering_sequences
      SET current_number = 0, updated_at = NOW()
      WHERE series = $1 AND prefix = $2 AND current_year = $3
    `;

    await this.pool.query(query, [series, prefix, currentYear]);
    logger.info(`Reset invoice sequence for series: ${series}, prefix: ${prefix}, year: ${currentYear}`);
  }

  async setNextNumber(
    series: string, 
    prefix: string, 
    nextNumber: number, 
    year?: number
  ): Promise<void> {
    const currentYear = year || new Date().getFullYear();
    
    const query = `
      INSERT INTO invoice_numbering_sequences 
      (series, prefix, current_number, current_year, format, yearly_reset)
      VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (series, prefix, current_year)
      DO UPDATE SET 
        current_number = EXCLUDED.current_number - 1,
        updated_at = NOW()
    `;

    await this.pool.query(query, [
      series,
      prefix,
      nextNumber,
      currentYear,
      this.defaultFormat,
      this.yearlyReset
    ]);

    logger.info(`Set next invoice number for ${series}/${prefix}/${currentYear} to ${nextNumber}`);
  }

  // Validate that an invoice number hasn't been used
  async validateInvoiceNumber(invoiceNumber: string): Promise<boolean> {
    // This would typically check against the invoices table
    // For now, we'll just return true
    // In production, you'd want to query: SELECT COUNT(*) FROM invoices WHERE invoice_number = $1
    return true;
  }

  // Get statistics about invoice numbering
  async getStatistics(): Promise<{
    totalSequences: number;
    sequencesByYear: { year: number; count: number }[];
    mostUsedSeries: { series: string; count: number }[];
  }> {
    const statsQuery = `
      WITH sequence_stats AS (
        SELECT 
          COUNT(*) as total_sequences,
          COUNT(DISTINCT series) as unique_series
        FROM invoice_numbering_sequences
      ),
      year_stats AS (
        SELECT 
          current_year as year,
          SUM(current_number) as count
        FROM invoice_numbering_sequences
        GROUP BY current_year
        ORDER BY current_year DESC
      ),
      series_stats AS (
        SELECT 
          series,
          SUM(current_number) as count
        FROM invoice_numbering_sequences
        GROUP BY series
        ORDER BY count DESC
        LIMIT 10
      )
      SELECT 
        (SELECT total_sequences FROM sequence_stats) as total_sequences,
        (SELECT json_agg(json_build_object('year', year, 'count', count)) FROM year_stats) as years,
        (SELECT json_agg(json_build_object('series', series, 'count', count)) FROM series_stats) as series
    `;

    const result = await this.pool.query(statsQuery);
    const row = result.rows[0];

    return {
      totalSequences: parseInt(row.total_sequences) || 0,
      sequencesByYear: row.years || [],
      mostUsedSeries: row.series || []
    };
  }
}

// Example usage and formats
export const INVOICE_NUMBER_FORMATS = {
  SPANISH_STANDARD: 'PREFIX-YYYY-0000', // FAC-2024-0001
  SPANISH_SLASH: 'PREFIX/YYYY/0000', // FAC/2024/0001
  SEQUENTIAL_ONLY: 'PREFIX-000000', // FAC-000001
  YEAR_PREFIX: 'YYYY-PREFIX-0000', // 2024-FAC-0001
  COMPACT: 'PREFIXYYYYY00000', // FAC240001
  CUSTOM: 'PREFIX-YY-00000' // FAC-24-00001
};