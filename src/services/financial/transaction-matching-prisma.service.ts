import { prisma } from '../../lib/prisma';
import type { Prisma } from '../../lib/prisma';
import { AppError } from '../../utils/errors';
import logger from '../../utils/logger';

export interface UnlinkedTransaction {
  id: string;
  transactionId: string;
  accountId: string;
  amount: number;
  currency: string;
  description: string | null;
  reference: string | null;
  counterpartyName: string | null;
  date: Date;
  type: string;
  potentialMatches?: PotentialMatch[];
}

export interface PotentialMatch {
  clientId: string;
  clientName: string;
  confidence: number;
  matchType: string;
  reason: string;
}

export interface ClientTransactionLink {
  id: string;
  transactionId: string;
  clientId: string;
  matchType: string;
  matchConfidence: number;
  matchedBy?: string | null;
  matchedAt: Date;
  isManualOverride: boolean;
  previousLinkId?: string | null;
  notes?: string | null;
}

export class TransactionMatchingPrismaService {
  /**
   * Get all unlinked transactions
   */
  async getUnlinkedTransactions(
    limit: number = 100,
    offset: number = 0
  ): Promise<{ transactions: UnlinkedTransaction[], total: number }> {
    try {
      // Get count of unlinked transactions
      const whereClause: Prisma.transactionsWhereInput = {
        status: 'confirmed',
        client_transaction_links: {
          none: {}
        }
      };

      const total = await prisma.transactions.count({
        where: whereClause
      });

      // Get unlinked transactions
      const transactions = await prisma.transactions.findMany({
        where: whereClause,
        include: {
          currencies_transactionsTocurrencies: true
        },
        orderBy: {
          date: 'desc'
        },
        take: limit,
        skip: offset
      });

      // For each transaction, find potential matches
      const transactionsWithMatches = await Promise.all(
        transactions.map(async (tx) => {
          const potentialMatches = await this.findPotentialMatches(tx);
          
          return {
            id: tx.id,
            transactionId: tx.transaction_id,
            accountId: tx.account_id,
            amount: tx.amount.toNumber(),
            currency: tx.currencies_transactionsTocurrencies?.code || 'EUR',
            description: tx.description,
            reference: tx.reference,
            counterpartyName: tx.counterparty_name,
            date: tx.date,
            type: tx.type,
            potentialMatches
          };
        })
      );

      return { 
        transactions: transactionsWithMatches, 
        total 
      };
    } catch (error) {
      logger.error('Failed to get unlinked transactions:', error);
      throw new AppError('Failed to get unlinked transactions', 500);
    }
  }

  /**
   * Find potential client matches for a transaction
   */
  private async findPotentialMatches(transaction: any): Promise<PotentialMatch[]> {
    const matches: PotentialMatch[] = [];

    try {
      // 1. Check for exact reference match
      if (transaction.reference) {
        const refMatches = await prisma.client.findMany({
          where: {
            OR: [
              { customFields: { path: ['reference'], equals: transaction.reference } },
              { customFields: { path: ['payment_reference'], equals: transaction.reference } },
              { bankAccount: transaction.reference }
            ]
          },
          take: 5
        });

        refMatches.forEach(client => {
          matches.push({
            clientId: client.id,
            clientName: client.businessName || client.name,
            confidence: 0.95,
            matchType: 'reference',
            reason: 'Reference match'
          });
        });
      }

      // 2. Fuzzy match on counterparty name (using raw SQL for similarity function)
      if (transaction.counterparty_name && matches.length === 0) {
        const nameMatches = await prisma.$queryRaw<Array<{
          id: string;
          name: string;
          business_name: string | null;
          score: number;
        }>>`
          SELECT id, name, business_name,
            GREATEST(
              similarity(LOWER(${transaction.counterparty_name}), LOWER(name)),
              similarity(LOWER(${transaction.counterparty_name}), LOWER(COALESCE(business_name, '')))
            ) as score
          FROM clients
          WHERE GREATEST(
            similarity(LOWER(${transaction.counterparty_name}), LOWER(name)),
            similarity(LOWER(${transaction.counterparty_name}), LOWER(COALESCE(business_name, '')))
          ) > 0.3
          ORDER BY score DESC
          LIMIT 5
        `;

        nameMatches.forEach(client => {
          if (client.score > 0.3) {
            matches.push({
              clientId: client.id,
              clientName: client.business_name || client.name,
              confidence: client.score,
              matchType: 'fuzzy',
              reason: `Name similarity: ${(client.score * 100).toFixed(0)}%`
            });
          }
        });
      }

      // 3. Check matching patterns
      if (matches.length === 0) {
        const patterns = await prisma.transaction_matching_patterns.findMany({
          where: {
            is_active: true,
            OR: [
              {
                AND: [
                  { pattern_type: 'amount_range' },
                  { amount_min: { lte: transaction.amount } },
                  { amount_max: { gte: transaction.amount } }
                ]
              },
              {
                AND: [
                  { pattern_type: 'description' },
                  { pattern: { not: null } }
                ]
              },
              {
                AND: [
                  { pattern_type: 'reference' },
                  { pattern: { not: null } }
                ]
              }
            ]
          },
          include: {
            Client: true
          },
          take: 5
        });

        // Filter patterns based on regex match (done in JS since Prisma doesn't support regex directly)
        for (const pattern of patterns) {
          let isMatch = false;
          
          if (pattern.pattern_type === 'amount_range') {
            isMatch = true; // Already filtered by amount range in query
          } else if (pattern.pattern_type === 'description' && transaction.description && pattern.pattern) {
            const regex = new RegExp(pattern.pattern, 'i');
            isMatch = regex.test(transaction.description);
          } else if (pattern.pattern_type === 'reference' && transaction.reference && pattern.pattern) {
            const regex = new RegExp(pattern.pattern, 'i');
            isMatch = regex.test(transaction.reference);
          }

          if (isMatch && pattern.Client) {
            matches.push({
              clientId: pattern.client_id,
              clientName: pattern.Client.businessName || pattern.Client.name,
              confidence: pattern.confidence.toNumber(),
              matchType: 'pattern',
              reason: `Pattern match: ${pattern.pattern_type}`
            });
          }
        }
      }

      // Sort by confidence
      return matches.sort((a, b) => b.confidence - a.confidence);
    } catch (error) {
      logger.error('Failed to find potential matches:', error);
      return [];
    }
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
    try {
      // Check if transaction exists
      const transaction = await prisma.transactions.findUnique({
        where: { id: transactionId }
      });

      if (!transaction) {
        throw new AppError('Transaction not found', 404);
      }

      // Check if client exists
      const client = await prisma.client.findUnique({
        where: { id: clientId }
      });

      if (!client) {
        throw new AppError('Client not found', 404);
      }

      // Check for existing link
      const existingLink = await prisma.client_transaction_links.findFirst({
        where: { transaction_id: transactionId }
      });

      // Create new link
      const newLink = await prisma.client_transaction_links.create({
        data: {
          transaction_id: transactionId,
          client_id: clientId,
          match_type: 'manual',
          match_confidence: 1.0,
          matched_by: userId,
          matched_at: new Date(),
          is_manual_override: existingLink !== null,
          previous_link_id: existingLink?.id,
          notes
        }
      });

      logger.info(`Transaction ${transactionId} manually linked to client ${clientId}`);

      return {
        id: newLink.id,
        transactionId: newLink.transaction_id,
        clientId: newLink.client_id,
        matchType: newLink.match_type,
        matchConfidence: newLink.match_confidence.toNumber(),
        matchedBy: newLink.matched_by,
        matchedAt: newLink.matched_at,
        isManualOverride: newLink.is_manual_override,
        previousLinkId: newLink.previous_link_id,
        notes: newLink.notes
      };
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Failed to link transaction to client:', error);
      throw new AppError('Failed to link transaction to client', 500);
    }
  }

  /**
   * Run automatic matching for unlinked transactions
   */
  async runAutoMatching(transactionIds?: string[]): Promise<{
    matched: number,
    processed: number,
    results: Array<{ transactionId: string, clientId: string, confidence: number }>
  }> {
    const results: Array<{ transactionId: string, clientId: string, confidence: number }> = [];
    let matched = 0;
    let processed = 0;

    try {
      // Get transactions to process
      const whereClause: Prisma.transactionsWhereInput = {
        status: 'confirmed',
        client_transaction_links: {
          none: {}
        }
      };

      if (transactionIds && transactionIds.length > 0) {
        whereClause.id = { in: transactionIds };
      }

      const transactions = await prisma.transactions.findMany({
        where: whereClause,
        include: {
          currencies_transactionsTocurrencies: true
        },
        take: 100 // Process max 100 at a time
      });

      // Process each transaction
      for (const transaction of transactions) {
        processed++;
        
        const potentialMatches = await this.findPotentialMatches(transaction);
        
        // Auto-link if confidence is high enough (>= 0.85)
        const highConfidenceMatch = potentialMatches.find(m => m.confidence >= 0.85);
        
        if (highConfidenceMatch) {
          try {
            await prisma.client_transaction_links.create({
              data: {
                transaction_id: transaction.id,
                client_id: highConfidenceMatch.clientId,
                match_type: highConfidenceMatch.matchType,
                match_confidence: highConfidenceMatch.confidence,
                matched_by: 'system',
                matched_at: new Date(),
                is_manual_override: false,
                notes: `Auto-matched: ${highConfidenceMatch.reason}`
              }
            });

            matched++;
            results.push({
              transactionId: transaction.id,
              clientId: highConfidenceMatch.clientId,
              confidence: highConfidenceMatch.confidence
            });

            logger.info(`Transaction ${transaction.id} auto-matched to client ${highConfidenceMatch.clientId} with confidence ${highConfidenceMatch.confidence}`);
          } catch (error) {
            logger.error(`Failed to auto-link transaction ${transaction.id}:`, error);
          }
        }
      }

      return { matched, processed, results };
    } catch (error) {
      logger.error('Failed to run auto-matching:', error);
      throw new AppError('Failed to run auto-matching', 500);
    }
  }

  /**
   * Get client transaction links with details
   */
  async getClientTransactionLinks(
    clientId: string,
    params?: {
      startDate?: Date;
      endDate?: Date;
      limit?: number;
      offset?: number;
    }
  ): Promise<{
    links: any[],
    total: number,
    summary: {
      totalAmount: number;
      transactionCount: number;
      earliestDate?: Date;
      latestDate?: Date;
    }
  }> {
    try {
      const { startDate, endDate, limit = 50, offset = 0 } = params || {};

      // Build where clause
      const whereClause: Prisma.client_transaction_linksWhereInput = {
        client_id: clientId
      };

      // Add date filter if provided
      if (startDate || endDate) {
        whereClause.transactions = {
          date: {
            ...(startDate && { gte: startDate }),
            ...(endDate && { lte: endDate })
          }
        };
      }

      // Get total count
      const total = await prisma.client_transaction_links.count({
        where: whereClause
      });

      // Get links with transaction details
      const links = await prisma.client_transaction_links.findMany({
        where: whereClause,
        include: {
          transactions: {
            include: {
              currencies_transactionsTocurrencies: true
            }
          }
        },
        orderBy: {
          transactions: {
            date: 'desc'
          }
        },
        take: limit,
        skip: offset
      });

      // Calculate summary
      const allTransactions = await prisma.client_transaction_links.findMany({
        where: { client_id: clientId },
        include: {
          transactions: true
        }
      });

      const summary = allTransactions.reduce((acc, link) => {
        if (link.transactions) {
          acc.totalAmount += link.transactions.amount.toNumber();
          acc.transactionCount++;
          
          if (!acc.earliestDate || link.transactions.date < acc.earliestDate) {
            acc.earliestDate = link.transactions.date;
          }
          if (!acc.latestDate || link.transactions.date > acc.latestDate) {
            acc.latestDate = link.transactions.date;
          }
        }
        return acc;
      }, {
        totalAmount: 0,
        transactionCount: 0,
        earliestDate: undefined as Date | undefined,
        latestDate: undefined as Date | undefined
      });

      return { links, total, summary };
    } catch (error) {
      logger.error('Failed to get client transaction links:', error);
      throw new AppError('Failed to get client transaction links', 500);
    }
  }

  /**
   * Unlink a transaction from a client
   */
  async unlinkTransaction(linkId: string, userId?: string, reason?: string): Promise<void> {
    try {
      const link = await prisma.client_transaction_links.findUnique({
        where: { id: linkId }
      });

      if (!link) {
        throw new AppError('Link not found', 404);
      }

      // Delete the link
      await prisma.client_transaction_links.delete({
        where: { id: linkId }
      });

      logger.info(`Transaction link ${linkId} removed by ${userId || 'system'}. Reason: ${reason || 'Not specified'}`);
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Failed to unlink transaction:', error);
      throw new AppError('Failed to unlink transaction', 500);
    }
  }

  /**
   * Get matching patterns for a client
   */
  async getClientMatchingPatterns(clientId: string): Promise<any[]> {
    try {
      const patterns = await prisma.transaction_matching_patterns.findMany({
        where: {
          client_id: clientId
        },
        orderBy: [
          { match_count: 'desc' },
          { created_at: 'desc' }
        ]
      });

      return patterns;
    } catch (error) {
      logger.error('Failed to get client matching patterns:', error);
      throw new AppError('Failed to get client matching patterns', 500);
    }
  }

  /**
   * Create or update a matching pattern
   */
  async saveMatchingPattern(
    clientId: string,
    pattern: {
      patternType: 'amount_range' | 'description' | 'reference';
      pattern?: string;
      amountMin?: number;
      amountMax?: number;
      confidence?: number;
      isActive?: boolean;
    }
  ): Promise<any> {
    try {
      const data: Prisma.transaction_matching_patternsCreateInput = {
        client_id: clientId,
        pattern_type: pattern.patternType,
        pattern: pattern.pattern,
        amount_min: pattern.amountMin,
        amount_max: pattern.amountMax,
        confidence: pattern.confidence || 0.8,
        is_active: pattern.isActive !== false,
        Client: {
          connect: { id: clientId }
        }
      };

      const result = await prisma.transaction_matching_patterns.create({
        data
      });

      logger.info(`Matching pattern created for client ${clientId}: ${pattern.patternType}`);
      return result;
    } catch (error) {
      logger.error('Failed to save matching pattern:', error);
      throw new AppError('Failed to save matching pattern', 500);
    }
  }

  /**
   * Get transaction link by transaction ID
   */
  async getTransactionLink(transactionId: string): Promise<ClientTransactionLink | null> {
    try {
      const link = await prisma.client_transaction_links.findFirst({
        where: {
          transaction_id: transactionId
        }
      });

      if (!link) {
        return null;
      }

      return {
        id: link.id,
        transactionId: link.transaction_id,
        clientId: link.client_id,
        confidence: link.confidence.toNumber(),
        method: link.method,
        confirmedBy: link.confirmed_by || undefined,
        confirmedAt: link.confirmed_at || undefined,
        notes: link.notes || undefined,
        createdAt: link.created_at,
        updatedAt: link.updated_at
      };
    } catch (error) {
      logger.error('Failed to get transaction link:', error);
      throw new AppError('Failed to get transaction link', 500);
    }
  }

  /**
   * Remove transaction link
   */
  async removeTransactionLink(linkId: string, userId?: string, reason?: string): Promise<boolean> {
    try {
      // Log the removal for audit purposes
      logger.info(`Removing transaction link ${linkId} by user ${userId}`, { reason });

      // Delete the link
      await prisma.client_transaction_links.delete({
        where: {
          id: linkId
        }
      });

      return true;
    } catch (error) {
      logger.error('Failed to remove transaction link:', error);
      throw new AppError('Failed to remove transaction link', 500);
    }
  }

  /**
   * Update matching pattern
   */
  async updateMatchingPattern(
    patternId: string,
    updates: Partial<{
      patternType: string;
      pattern: string;
      amountMin?: number;
      amountMax?: number;
      confidence: number;
      isActive: boolean;
    }>
  ): Promise<any> {
    try {
      const data: any = {
        updated_at: new Date()
      };

      if (updates.patternType !== undefined) data.pattern_type = updates.patternType;
      if (updates.pattern !== undefined) data.pattern = updates.pattern;
      if (updates.amountMin !== undefined) data.amount_min = new Prisma.Decimal(updates.amountMin);
      if (updates.amountMax !== undefined) data.amount_max = new Prisma.Decimal(updates.amountMax);
      if (updates.confidence !== undefined) data.confidence = new Prisma.Decimal(updates.confidence);
      if (updates.isActive !== undefined) data.is_active = updates.isActive;

      const result = await prisma.transaction_matching_patterns.update({
        where: {
          id: patternId
        },
        data
      });

      logger.info(`Matching pattern ${patternId} updated`);
      return result;
    } catch (error) {
      logger.error('Failed to update matching pattern:', error);
      throw new AppError('Failed to update matching pattern', 500);
    }
  }

  /**
   * Delete matching pattern
   */
  async deleteMatchingPattern(patternId: string): Promise<boolean> {
    try {
      await prisma.transaction_matching_patterns.delete({
        where: {
          id: patternId
        }
      });

      logger.info(`Matching pattern ${patternId} deleted`);
      return true;
    } catch (error) {
      logger.error('Failed to delete matching pattern:', error);
      throw new AppError('Failed to delete matching pattern', 500);
    }
  }
}

// Export singleton instance
export const transactionMatchingPrismaService = new TransactionMatchingPrismaService();