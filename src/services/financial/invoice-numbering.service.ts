import { PrismaClient, Prisma } from '@prisma/client';
import { logger } from '../../utils/logger';

export interface NumberingSequence {
  id: string;
  series: string;
  prefix: string;
  currentNumber: number;
  currentYear: number;
  format: string;
  yearlyReset: boolean;
  lastUsed: Date | null;
  createdAt: Date | null;
  updatedAt: Date | null;
}

export interface InvoiceNumberOptions {
  series?: string;
  prefix?: string;
  format?: string;
  year?: number;
}

/**
 * Invoice Numbering Service - Prisma Implementation
 * 
 * Manages sequential invoice numbering with database locking to ensure
 * no gaps in numbering sequences. This is critical for legal compliance
 * in many jurisdictions.
 */
export class InvoiceNumberingService {
  private prisma: PrismaClient;
  private defaultPrefix: string;
  private defaultFormat: string;
  private yearlyReset: boolean;
  

  constructor(
    prisma: PrismaClient,
    config?: {
      defaultPrefix?: string;
      defaultFormat?: string;
      yearlyReset?: boolean;
    }
  ) {
    this.prisma = prisma;
    this.defaultPrefix = config?.defaultPrefix || 'FAC';
    this.defaultFormat = config?.defaultFormat || 'PREFIX-YYYY-0000';
    this.yearlyReset = config?.yearlyReset !== false; // Default true
  }

  /**
   * Get the next invoice number in sequence with atomic locking
   * CRITICAL: This uses row-level locking to ensure sequential numbering with no gaps
   */
  async getNextInvoiceNumber(options: InvoiceNumberOptions = {}): Promise<string> {
    const {
      series = 'DEFAULT',
      prefix = this.defaultPrefix,
      format = this.defaultFormat,
      year = new Date().getFullYear()
    } = options;

    try {
      // Use Prisma transaction with explicit locking
      const result = await this.prisma.$transaction(async (tx) => {
        // First, try to find and lock the existing sequence
        const existingSequenceRaw = await tx.$queryRaw<Array<{
          id: string;
          series: string;
          prefix: string;
          current_number: number;
          current_year: number;
          format: string;
          yearly_reset: boolean;
          last_used: Date | null;
          created_at: Date | null;
          updated_at: Date | null;
        }>>`
          SELECT * FROM public."invoice_numbering_sequences"
          WHERE series = ${series} 
            AND prefix = ${prefix} 
            AND current_year = ${year}
          FOR UPDATE
        `;
        
        const existingSequence: NumberingSequence[] = existingSequenceRaw.map(seq => ({
          id: seq.id,
          series: seq.series,
          prefix: seq.prefix,
          currentNumber: seq.current_number,
          currentYear: seq.current_year,
          format: seq.format,
          yearlyReset: seq.yearly_reset,
          lastUsed: seq.last_used,
          createdAt: seq.created_at,
          updatedAt: seq.updated_at
        }));

        let sequence: NumberingSequence;
        let nextNumber: number;

        if (existingSequence.length === 0) {
          // Create new sequence
          nextNumber = 1;
          
          const newSequence = await tx.invoice_numbering_sequences.create({
            data: {
              series,
              prefix,
              current_number: nextNumber,
              current_year: year,
              format,
              yearly_reset: this.yearlyReset,
              last_used: new Date()
            }
          });
          
          sequence = {
            id: newSequence.id,
            series: newSequence.series,
            prefix: newSequence.prefix,
            currentNumber: newSequence.current_number,
            currentYear: newSequence.current_year,
            format: newSequence.format,
            yearlyReset: newSequence.yearly_reset,
            lastUsed: newSequence.last_used,
            createdAt: newSequence.created_at,
            updatedAt: newSequence.updated_at
          };
        } else {
          // Update existing sequence
          sequence = existingSequence[0];

          // Check if we need to reset for new year
          if (this.yearlyReset && sequence.currentYear < year) {
            nextNumber = 1;
            
            await tx.invoice_numbering_sequences.update({
              where: { id: sequence.id },
              data: {
                current_number: nextNumber,
                current_year: year,
                last_used: new Date(),
                updated_at: new Date()
              }
            });
          } else {
            nextNumber = sequence.currentNumber + 1;
            
            await tx.invoice_numbering_sequences.update({
              where: { id: sequence.id },
              data: {
                current_number: nextNumber,
                last_used: new Date(),
                updated_at: new Date()
              }
            });
          }
        }

        return nextNumber;
      }, {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable
      });

      // Format the invoice number
      const invoiceNumber = this.formatInvoiceNumber(result, year, prefix, format);
      
      logger.info(`Generated invoice number: ${invoiceNumber} (series: ${series})`);
      return invoiceNumber;

    } catch (error) {
      logger.error('Error generating invoice number:', error);
      throw new Error('Failed to generate invoice number');
    }
  }

  /**
   * Format the invoice number according to the specified format
   */
  private formatInvoiceNumber(
    number: number,
    year: number,
    prefix: string,
    format: string
  ): string {
    let formatted = format;
    
    // Replace PREFIX
    formatted = formatted.replace('PREFIX', prefix);
    
    // Replace YYYY (4-digit year)
    formatted = formatted.replace('YYYY', year.toString());
    
    // Replace YY (2-digit year)
    formatted = formatted.replace('YY', (year % 100).toString().padStart(2, '0'));
    
    // Replace number with appropriate padding
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

  /**
   * Get sequence information for a specific series
   */
  async getSequenceInfo(series: string = 'DEFAULT'): Promise<NumberingSequence[]> {
    try {
      const sequences = await this.prisma.invoice_numbering_sequences.findMany({
        where: { series },
        orderBy: [
          { current_year: 'desc' },
          { prefix: 'asc' }
        ]
      });

      return sequences.map((seq: any) => ({
        id: seq.id,
        series: seq.series,
        prefix: seq.prefix,
        currentNumber: seq.current_number,
        currentYear: seq.current_year,
        format: seq.format,
        yearlyReset: seq.yearly_reset,
        lastUsed: seq.last_used,
        createdAt: seq.created_at,
        updatedAt: seq.updated_at
      }));
    } catch (error) {
      logger.error('Error getting sequence info:', error);
      throw new Error('Failed to get sequence information');
    }
  }

  /**
   * Get all numbering sequences
   */
  async getAllSequences(): Promise<NumberingSequence[]> {
    try {
      const sequences = await this.prisma.invoice_numbering_sequences.findMany({
        orderBy: [
          { series: 'asc' },
          { current_year: 'desc' },
          { prefix: 'asc' }
        ]
      });

      return sequences.map((seq: any) => ({
        id: seq.id,
        series: seq.series,
        prefix: seq.prefix,
        currentNumber: seq.current_number,
        currentYear: seq.current_year,
        format: seq.format,
        yearlyReset: seq.yearly_reset,
        lastUsed: seq.last_used,
        createdAt: seq.created_at,
        updatedAt: seq.updated_at
      }));
    } catch (error) {
      logger.error('Error getting all sequences:', error);
      throw new Error('Failed to get sequences');
    }
  }

  /**
   * Reset a sequence to start from 1 again
   * WARNING: This can cause duplicate invoice numbers if not used carefully
   */
  async resetSequence(series: string, prefix: string, year?: number): Promise<void> {
    const currentYear = year || new Date().getFullYear();
    
    try {
      await this.prisma.invoice_numbering_sequences.updateMany({
        where: {
          series,
          prefix,
          current_year: currentYear
        },
        data: {
          current_number: 0,
          updated_at: new Date()
        }
      });

      logger.warn(`Reset invoice sequence for series: ${series}, prefix: ${prefix}, year: ${currentYear}`);
    } catch (error) {
      logger.error('Error resetting sequence:', error);
      throw new Error('Failed to reset sequence');
    }
  }

  /**
   * Set the next number for a sequence
   * WARNING: This can create gaps in numbering if not used carefully
   */
  async setNextNumber(
    series: string,
    prefix: string,
    nextNumber: number,
    year?: number
  ): Promise<void> {
    const currentYear = year || new Date().getFullYear();
    
    try {
      // Use upsert to create or update
      await this.prisma.invoice_numbering_sequences.upsert({
        where: {
          series_prefix_current_year: {
            series,
            prefix,
            current_year: currentYear
          }
        },
        update: {
          current_number: nextNumber - 1, // Subtract 1 because getNextInvoiceNumber will increment
          updated_at: new Date()
        },
        create: {
          series,
          prefix,
          current_number: nextNumber - 1,
          current_year: currentYear,
          format: this.defaultFormat,
          yearly_reset: this.yearlyReset,
          last_used: new Date()
        }
      });

      logger.info(`Set next invoice number for ${series}/${prefix}/${currentYear} to ${nextNumber}`);
    } catch (error) {
      logger.error('Error setting next number:', error);
      throw new Error('Failed to set next number');
    }
  }

  /**
   * Validate that an invoice number hasn't been used
   */
  async validateInvoiceNumber(invoiceNumber: string): Promise<boolean> {
    try {
      const count = await this.prisma.invoice.count({
        where: {
          invoiceNumber: invoiceNumber
        }
      });

      return count === 0;
    } catch (error) {
      logger.error('Error validating invoice number:', error);
      // In case of error, return false to be safe
      return false;
    }
  }

  /**
   * Get statistics about invoice numbering
   */
  async getStatistics(): Promise<{
    totalSequences: number;
    sequencesByYear: { year: number; count: number }[];
    mostUsedSeries: { series: string; count: number }[];
  }> {
    try {
      // Get total sequences
      const totalSequences = await this.prisma.invoice_numbering_sequences.count();

      // Get sequences by year using raw query for aggregation
      const yearStats = await this.prisma.$queryRaw<Array<{ year: number; count: bigint }>>`
        SELECT 
          current_year as year,
          SUM(current_number)::bigint as count
        FROM public."invoice_numbering_sequences"
        GROUP BY current_year
        ORDER BY current_year DESC
      `;

      // Get most used series
      const seriesStats = await this.prisma.$queryRaw<Array<{ series: string; count: bigint }>>`
        SELECT 
          series,
          SUM(current_number)::bigint as count
        FROM public."invoice_numbering_sequences"
        GROUP BY series
        ORDER BY count DESC
        LIMIT 10
      `;

      return {
        totalSequences,
        sequencesByYear: yearStats.map(stat => ({
          year: stat.year,
          count: Number(stat.count)
        })),
        mostUsedSeries: seriesStats.map(stat => ({
          series: stat.series,
          count: Number(stat.count)
        }))
      };
    } catch (error) {
      logger.error('Error getting statistics:', error);
      throw new Error('Failed to get statistics');
    }
  }

  /**
   * Get the last used invoice number for a series
   */
  async getLastUsedNumber(
    series: string = 'DEFAULT',
    prefix?: string,
    year?: number
  ): Promise<string | null> {
    try {
      const currentYear = year || new Date().getFullYear();
      const where: any = {
        series,
        current_year: currentYear
      };

      if (prefix) {
        where.prefix = prefix;
      }

      const sequence = await this.prisma.invoice_numbering_sequences.findFirst({
        where,
        orderBy: {
          last_used: 'desc'
        }
      });

      if (!sequence || sequence.current_number === 0) {
        return null;
      }

      return this.formatInvoiceNumber(
        sequence.current_number,
        sequence.current_year,
        sequence.prefix,
        sequence.format
      );
    } catch (error) {
      logger.error('Error getting last used number:', error);
      throw new Error('Failed to get last used number');
    }
  }
}

// Export standard invoice number formats
export const INVOICE_NUMBER_FORMATS = {
  SPANISH_STANDARD: 'PREFIX-YYYY-0000',  // FAC-2024-0001
  SPANISH_SLASH: 'PREFIX/YYYY/0000',     // FAC/2024/0001
  SEQUENTIAL_ONLY: 'PREFIX-000000',      // FAC-000001
  YEAR_PREFIX: 'YYYY-PREFIX-0000',       // 2024-FAC-0001
  COMPACT: 'PREFIXYYYYY00000',           // FAC240001
  CUSTOM: 'PREFIX-YY-00000'              // FAC-24-00001
};