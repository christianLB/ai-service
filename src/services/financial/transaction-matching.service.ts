import { Pool } from 'pg';
import { logger } from '../../utils/log';
import {
  ClientTransactionLink,
  TransactionMatchingPattern,
  UnlinkedTransaction,
  ClientTransactionSummary,
} from '../../models/financial/client-transaction.model';

export class TransactionMatchingService {
  constructor(private pool: Pool) {}

  /**
   * Get all unlinked transactions
   */
  async getUnlinkedTransactions(
    limit: number = 100,
    offset: number = 0
  ): Promise<{ transactions: UnlinkedTransaction[]; total: number }> {
    try {
      // Get count
      const countQuery = `
        SELECT COUNT(*) as total
        FROM financial.transactions t
        LEFT JOIN financial.client_transaction_links ctl ON t.id = ctl.transaction_id
        WHERE ctl.id IS NULL
          AND t.status = 'confirmed'
      `;

      const countResult = await this.pool.query(countQuery);
      const total = parseInt(countResult.rows[0].total);

      // Get unlinked transactions with potential matches
      const query = `
        SELECT 
          t.id,
          t.transaction_id,
          t.account_id,
          t.amount,
          c.code as currency,
          t.description,
          t.reference,
          t.counterparty_name,
          t.date,
          t.type
        FROM financial.transactions t
        JOIN financial.currencies c ON t.currency_id = c.id
        LEFT JOIN financial.client_transaction_links ctl ON t.id = ctl.transaction_id
        WHERE ctl.id IS NULL
          AND t.status = 'confirmed'
        ORDER BY t.date DESC
        LIMIT $1 OFFSET $2
      `;

      const result = await this.pool.query(query, [limit, offset]);

      // For each transaction, find potential matches
      const transactions = await Promise.all(
        result.rows.map(async (row) => {
          const potentialMatches = await this.findPotentialMatches(row);
          return {
            ...row,
            potentialMatches,
          };
        })
      );

      return { transactions, total };
    } catch (error) {
      logger.error('Failed to get unlinked transactions:', error);
      throw error;
    }
  }

  /**
   * Find potential client matches for a transaction
   */
  private async findPotentialMatches(transaction: any): Promise<any[]> {
    const matches: any[] = [];

    // 1. Check for exact reference match in client custom fields
    if (transaction.reference) {
      const refQuery = `
        SELECT id, name, business_name
        FROM clients
        WHERE custom_fields->>'reference' = $1
          OR custom_fields->>'payment_reference' = $1
          OR bank_account = $1
        LIMIT 5
      `;

      const refResult = await this.pool.query(refQuery, [transaction.reference]);

      refResult.rows.forEach((client) => {
        matches.push({
          clientId: client.id,
          clientName: client.business_name || client.name,
          confidence: 0.95,
          matchType: 'reference',
          reason: 'Reference match',
        });
      });
    }

    // 2. Fuzzy match on counterparty name
    if (transaction.counterparty_name && matches.length === 0) {
      const nameQuery = `
        SELECT id, name, business_name,
          GREATEST(
            similarity(LOWER($1), LOWER(name)),
            similarity(LOWER($1), LOWER(COALESCE(business_name, '')))
          ) as score
        FROM clients
        WHERE GREATEST(
          similarity(LOWER($1), LOWER(name)),
          similarity(LOWER($1), LOWER(COALESCE(business_name, '')))
        ) > 0.3
        ORDER BY score DESC
        LIMIT 5
      `;

      const nameResult = await this.pool.query(nameQuery, [transaction.counterparty_name]);

      nameResult.rows.forEach((client) => {
        if (client.score > 0.3) {
          matches.push({
            clientId: client.id,
            clientName: client.business_name || client.name,
            confidence: client.score,
            matchType: 'fuzzy',
            reason: `Name similarity: ${(client.score * 100).toFixed(0)}%`,
          });
        }
      });
    }

    // 3. Check matching patterns
    if (matches.length === 0) {
      const patternQuery = `
        SELECT 
          p.id,
          p.client_id,
          p.pattern_type,
          p.pattern,
          p.confidence,
          p.amount_min,
          p.amount_max,
          c.name,
          c.business_name
        FROM financial.transaction_matching_patterns p
        JOIN clients c ON p.client_id = c.id
        WHERE p.is_active = true
          AND (
            (p.pattern_type = 'amount_range' AND $1 BETWEEN p.amount_min AND p.amount_max)
            OR (p.pattern_type = 'description' AND $2 ~* p.pattern)
            OR (p.pattern_type = 'reference' AND $3 ~* p.pattern)
          )
        LIMIT 5
      `;

      const patternResult = await this.pool.query(patternQuery, [
        transaction.amount,
        transaction.description || '',
        transaction.reference || '',
      ]);

      patternResult.rows.forEach((pattern) => {
        matches.push({
          clientId: pattern.client_id,
          clientName: pattern.business_name || pattern.name,
          confidence: pattern.confidence,
          matchType: 'pattern',
          reason: `Pattern match: ${pattern.pattern_type}`,
        });
      });
    }

    // Sort by confidence
    return matches.sort((a, b) => b.confidence - a.confidence);
  }

  /**
   * Manually link a transaction to a client
   */
  async linkTransactionToClient(
    transactionId: string,
    clientId: string,
    userId?: string,
    notes?: string
  ): Promise<ClientTransactionLink> {
    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');

      // Check if transaction exists
      const txQuery = 'SELECT id FROM financial.transactions WHERE id = $1';
      const txResult = await client.query(txQuery, [transactionId]);

      if (txResult.rows.length === 0) {
        throw new Error('Transaction not found');
      }

      // Check if client exists
      const clientQuery = 'SELECT id FROM clients WHERE id = $1';
      const clientResult = await client.query(clientQuery, [clientId]);

      if (clientResult.rows.length === 0) {
        throw new Error('Client not found');
      }

      // Check for existing link
      const existingQuery = `
        SELECT id, match_type, match_confidence 
        FROM financial.client_transaction_links 
        WHERE transaction_id = $1
      `;
      const existingResult = await client.query(existingQuery, [transactionId]);

      let previousLinkId = null;
      if (existingResult.rows.length > 0) {
        previousLinkId = existingResult.rows[0].id;
      }

      // Create new link
      const insertQuery = `
        INSERT INTO financial.client_transaction_links (
          transaction_id,
          client_id,
          match_type,
          match_confidence,
          matched_by,
          matched_at,
          is_manual_override,
          previous_link_id,
          notes
        ) VALUES ($1, $2, $3, $4, $5, NOW(), $6, $7, $8)
        RETURNING *
      `;

      const result = await client.query(insertQuery, [
        transactionId,
        clientId,
        'manual',
        1.0,
        userId,
        previousLinkId !== null,
        previousLinkId,
        notes,
      ]);

      await client.query('COMMIT');

      logger.info(`Transaction ${transactionId} manually linked to client ${clientId}`);

      return result.rows[0];
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Failed to link transaction to client:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Run automatic matching for unlinked transactions
   */
  async runAutoMatching(transactionIds?: string[]): Promise<{
    matched: number;
    processed: number;
    results: Array<{ transactionId: string; clientId: string; confidence: number }>;
  }> {
    const client = await this.pool.connect();
    const results: any[] = [];
    let matched = 0;
    let processed = 0;

    try {
      await client.query('BEGIN');

      // Get transactions to process
      let query: string;
      let params: any[];

      if (transactionIds && transactionIds.length > 0) {
        query = `
          SELECT 
            t.id,
            t.amount,
            t.description,
            t.reference,
            t.counterparty_name,
            t.date
          FROM financial.transactions t
          LEFT JOIN financial.client_transaction_links ctl ON t.id = ctl.transaction_id
          WHERE t.id = ANY($1)
            AND ctl.id IS NULL
            AND t.status = 'confirmed'
        `;
        params = [transactionIds];
      } else {
        query = `
          SELECT 
            t.id,
            t.amount,
            t.description,
            t.reference,
            t.counterparty_name,
            t.date
          FROM financial.transactions t
          LEFT JOIN financial.client_transaction_links ctl ON t.id = ctl.transaction_id
          WHERE ctl.id IS NULL
            AND t.status = 'confirmed'
            AND t.date >= CURRENT_DATE - INTERVAL '90 days'
          LIMIT 1000
        `;
        params = [];
      }

      const txResult = await client.query(query, params);

      for (const tx of txResult.rows) {
        processed++;

        // Try exact matching first
        const match = await this.findBestMatch(tx, client);

        if (match && match.confidence >= 0.7) {
          // Create link
          const insertQuery = `
            INSERT INTO financial.client_transaction_links (
              transaction_id,
              client_id,
              match_type,
              match_confidence,
              matched_at,
              match_criteria
            ) VALUES ($1, $2, $3, $4, NOW(), $5)
            RETURNING id
          `;

          await client.query(insertQuery, [
            tx.id,
            match.clientId,
            match.matchType,
            match.confidence,
            JSON.stringify(match.criteria),
          ]);

          matched++;
          results.push({
            transactionId: tx.id,
            clientId: match.clientId,
            confidence: match.confidence,
          });

          logger.info(
            `Auto-matched transaction ${tx.id} to client ${match.clientId} with confidence ${match.confidence}`
          );
        }
      }

      await client.query('COMMIT');

      return { matched, processed, results };
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Auto-matching failed:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Find the best match for a transaction
   */
  private async findBestMatch(transaction: any, client: any): Promise<any | null> {
    let bestMatch: any = null;
    let highestConfidence = 0;

    // 1. Try exact reference match
    if (transaction.reference) {
      const refQuery = `
        SELECT id, name, business_name
        FROM clients
        WHERE custom_fields->>'reference' = $1
          OR custom_fields->>'payment_reference' = $1
          OR bank_account = $1
      `;

      const refResult = await client.query(refQuery, [transaction.reference]);

      if (refResult.rows.length > 0) {
        return {
          clientId: refResult.rows[0].id,
          matchType: 'automatic',
          confidence: 0.95,
          criteria: { reference: true },
        };
      }
    }

    // 2. Try pattern matching
    const patternQuery = `
      SELECT 
        p.client_id,
        p.pattern_type,
        p.confidence,
        p.amount_min,
        p.amount_max
      FROM financial.transaction_matching_patterns p
      WHERE p.is_active = true
        AND (
          (p.pattern_type = 'amount_range' AND $1 BETWEEN p.amount_min AND p.amount_max)
          OR (p.pattern_type = 'description' AND $2 ~* p.pattern)
          OR (p.pattern_type = 'reference' AND $3 ~* p.pattern)
        )
      ORDER BY p.confidence DESC
      LIMIT 1
    `;

    const patternResult = await client.query(patternQuery, [
      transaction.amount,
      transaction.description || '',
      transaction.reference || '',
    ]);

    if (patternResult.rows.length > 0) {
      const pattern = patternResult.rows[0];
      if (pattern.confidence > highestConfidence) {
        bestMatch = {
          clientId: pattern.client_id,
          matchType: 'pattern',
          confidence: pattern.confidence,
          criteria: { pattern: pattern.pattern_type },
        };
        highestConfidence = pattern.confidence;
      }
    }

    // 3. Try fuzzy name matching if we have a counterparty name
    if (transaction.counterparty_name) {
      const nameQuery = `
        SELECT 
          id,
          GREATEST(
            similarity(LOWER($1), LOWER(name)),
            similarity(LOWER($1), LOWER(COALESCE(business_name, '')))
          ) as score
        FROM clients
        WHERE GREATEST(
          similarity(LOWER($1), LOWER(name)),
          similarity(LOWER($1), LOWER(COALESCE(business_name, '')))
        ) > 0.7
        ORDER BY score DESC
        LIMIT 1
      `;

      const nameResult = await client.query(nameQuery, [transaction.counterparty_name]);

      if (nameResult.rows.length > 0 && nameResult.rows[0].score > highestConfidence) {
        bestMatch = {
          clientId: nameResult.rows[0].id,
          matchType: 'fuzzy',
          confidence: nameResult.rows[0].score,
          criteria: { clientName: true },
        };
      }
    }

    return bestMatch;
  }

  /**
   * Get client transaction history
   */
  async getClientTransactions(clientId: string, startDate?: Date, endDate?: Date): Promise<any[]> {
    try {
      const query = `
        SELECT 
          t.id,
          t.transaction_id,
          t.amount,
          c.code as currency,
          t.description,
          t.reference,
          t.counterparty_name,
          t.date,
          t.type,
          ctl.match_type,
          ctl.match_confidence,
          ctl.matched_at,
          ctl.is_manual_override,
          ctl.notes
        FROM financial.transactions t
        JOIN financial.client_transaction_links ctl ON t.id = ctl.transaction_id
        JOIN financial.currencies c ON t.currency_id = c.id
        WHERE ctl.client_id = $1
          AND t.status = 'confirmed'
          ${startDate ? 'AND t.date >= $2' : ''}
          ${endDate ? 'AND t.date <= $3' : ''}
        ORDER BY t.date DESC
      `;

      const params = [clientId];
      if (startDate) {
        params.push(startDate.toISOString());
      }
      if (endDate) {
        params.push(endDate.toISOString());
      }

      const result = await this.pool.query(query, params);
      return result.rows;
    } catch (error) {
      logger.error('Failed to get client transactions:', error);
      throw error;
    }
  }

  /**
   * Get client transaction summary
   */
  async getClientTransactionSummary(clientId: string): Promise<ClientTransactionSummary | null> {
    try {
      const query = `
        SELECT 
          cl.id as client_id,
          cl.name,
          cl.business_name,
          COUNT(DISTINCT t.id) as total_transactions,
          SUM(t.amount) as total_amount,
          MIN(t.date) as first_transaction_date,
          MAX(t.date) as last_transaction_date,
          AVG(t.amount) as average_amount,
          COUNT(CASE WHEN ctl.match_type = 'manual' THEN 1 END) as manual_matches,
          COUNT(CASE WHEN ctl.match_type = 'automatic' THEN 1 END) as automatic_matches,
          COUNT(CASE WHEN ctl.match_type = 'pattern' THEN 1 END) as pattern_matches,
          COUNT(CASE WHEN ctl.match_type = 'fuzzy' THEN 1 END) as fuzzy_matches,
          AVG(ctl.match_confidence) as average_confidence,
          COUNT(CASE WHEN ctl.match_confidence < 0.7 THEN 1 END) as low_confidence_matches,
          COUNT(CASE WHEN ctl.match_confidence >= 0.9 THEN 1 END) as high_confidence_matches,
          cur.code as currency
        FROM clients cl
        LEFT JOIN financial.client_transaction_links ctl ON cl.id = ctl.client_id
        LEFT JOIN financial.transactions t ON ctl.transaction_id = t.id
        LEFT JOIN financial.currencies cur ON t.currency_id = cur.id
        WHERE cl.id = $1
          AND (t.status = 'confirmed' OR t.status IS NULL)
        GROUP BY cl.id, cl.name, cl.business_name, cur.code
      `;

      const result = await this.pool.query(query, [clientId]);

      if (result.rows.length === 0) {
        return null;
      }

      const row = result.rows[0];
      return {
        clientId: row.client_id,
        clientName: row.business_name || row.name,
        totalTransactions: parseInt(row.total_transactions),
        totalAmount: parseFloat(row.total_amount || 0),
        currency: row.currency || 'EUR',
        firstTransactionDate: row.first_transaction_date,
        lastTransactionDate: row.last_transaction_date,
        averageAmount: parseFloat(row.average_amount || 0),
        manualMatches: parseInt(row.manual_matches),
        automaticMatches: parseInt(row.automatic_matches),
        patternMatches: parseInt(row.pattern_matches),
        fuzzyMatches: parseInt(row.fuzzy_matches),
        averageConfidence: parseFloat(row.average_confidence || 0),
        lowConfidenceMatches: parseInt(row.low_confidence_matches),
        highConfidenceMatches: parseInt(row.high_confidence_matches),
      };
    } catch (error) {
      logger.error('Failed to get client transaction summary:', error);
      throw error;
    }
  }

  /**
   * Create or update a matching pattern
   */
  async createMatchingPattern(
    pattern: Partial<TransactionMatchingPattern>
  ): Promise<TransactionMatchingPattern> {
    try {
      const query = `
        INSERT INTO financial.transaction_matching_patterns (
          client_id,
          pattern_type,
          pattern,
          confidence,
          amount_min,
          amount_max,
          day_of_month,
          frequency,
          is_active
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING *
      `;

      const result = await this.pool.query(query, [
        pattern.clientId,
        pattern.patternType,
        pattern.pattern,
        pattern.confidence || 0.8,
        pattern.amountMin,
        pattern.amountMax,
        pattern.dayOfMonth,
        pattern.frequency,
        pattern.isActive !== false,
      ]);

      return result.rows[0];
    } catch (error) {
      logger.error('Failed to create matching pattern:', error);
      throw error;
    }
  }

  /**
   * Get matching patterns for a client
   */
  async getClientMatchingPatterns(clientId: string): Promise<TransactionMatchingPattern[]> {
    try {
      const query = `
        SELECT * FROM financial.transaction_matching_patterns
        WHERE client_id = $1
        ORDER BY match_count DESC, created_at DESC
      `;

      const result = await this.pool.query(query, [clientId]);
      return result.rows;
    } catch (error) {
      logger.error('Failed to get client matching patterns:', error);
      throw error;
    }
  }
}
