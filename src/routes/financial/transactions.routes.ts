import { Router, Request, Response } from 'express';
import { TransactionMatchingService } from '../../services/financial/transaction-matching.service';
import { FinancialDatabaseService } from '../../services/financial/database.service';
import { logger } from '../../utils/log';

const router = Router();

let transactionMatchingService: TransactionMatchingService;
let databaseService: FinancialDatabaseService;

// Initialize services
const initializeServices = () => {
  if (!transactionMatchingService && databaseService?.pool) {
    transactionMatchingService = new TransactionMatchingService(databaseService.pool);
  }
};

// Set database service (called from parent router)
export const setDatabaseService = (dbService: FinancialDatabaseService) => {
  databaseService = dbService;
  initializeServices();
};

/**
 * GET /api/financial/transactions/unlinked
 * Get transactions without client links
 */
router.get('/unlinked', async (req: Request, res: Response): Promise<void> => {
  try {
    initializeServices();
    
    const { page = '1', limit = '50' } = req.query;
    const offset = (parseInt(page as string) - 1) * parseInt(limit as string);
    
    const result = await transactionMatchingService.getUnlinkedTransactions(
      parseInt(limit as string),
      offset
    );
    
    res.json({
      success: true,
      data: {
        transactions: result.transactions,
        pagination: {
          total: result.total,
          page: parseInt(page as string),
          limit: parseInt(limit as string),
          hasNext: result.total > offset + parseInt(limit as string),
          hasPrev: offset > 0
        }
      }
    });
  } catch (error) {
    logger.error('Failed to get unlinked transactions:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get unlinked transactions',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /api/financial/transactions/:id/link
 * Manually link a transaction to a client
 */
router.post('/:id/link', async (req: Request, res: Response): Promise<void> => {
  try {
    initializeServices();
    
    const { id } = req.params;
    const { clientId, notes, userId } = req.body;
    
    if (!clientId) {
      res.status(400).json({
        success: false,
        error: 'clientId is required'
      });
      return;
    }
    
    const link = await transactionMatchingService.linkTransactionToClient(
      id,
      clientId,
      userId,
      notes
    );
    
    res.json({
      success: true,
      data: link,
      message: 'Transaction successfully linked to client'
    });
  } catch (error) {
    logger.error('Failed to link transaction:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to link transaction',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /api/financial/transactions/auto-match
 * Run automatic matching on transactions
 */
router.post('/auto-match', async (req: Request, res: Response): Promise<void> => {
  try {
    initializeServices();
    
    const { transactionIds } = req.body;
    
    const result = await transactionMatchingService.runAutoMatching(transactionIds);
    
    res.json({
      success: true,
      data: result,
      message: `Processed ${result.processed} transactions, matched ${result.matched}`
    });
  } catch (error) {
    logger.error('Auto-matching failed:', error);
    res.status(500).json({
      success: false,
      error: 'Auto-matching failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/financial/transactions/:id/link
 * Get link information for a transaction
 */
router.get('/:id/link', async (req: Request, res: Response): Promise<void> => {
  try {
    initializeServices();
    
    const { id } = req.params;
    
    const query = `
      SELECT 
        ctl.*,
        c.name as client_name,
        c.business_name as client_business_name,
        c.tax_id as client_tax_id
      FROM financial.client_transaction_links ctl
      JOIN clients c ON ctl.client_id = c.id
      WHERE ctl.transaction_id = $1
      ORDER BY ctl.created_at DESC
      LIMIT 1
    `;
    
    const result = await databaseService.pool.query(query, [id]);
    
    if (result.rows.length === 0) {
      res.status(404).json({
        success: false,
        error: 'No link found for this transaction'
      });
      return;
    }
    
    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    logger.error('Failed to get transaction link:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get transaction link',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * DELETE /api/financial/transactions/:id/link
 * Remove a transaction link
 */
router.delete('/:id/link', async (req: Request, res: Response): Promise<void> => {
  try {
    initializeServices();
    
    const { id } = req.params;
    
    const query = `
      DELETE FROM financial.client_transaction_links
      WHERE transaction_id = $1
      RETURNING id
    `;
    
    const result = await databaseService.pool.query(query, [id]);
    
    if (result.rows.length === 0) {
      res.status(404).json({
        success: false,
        error: 'No link found to delete'
      });
      return;
    }
    
    res.json({
      success: true,
      message: 'Transaction link removed successfully'
    });
  } catch (error) {
    logger.error('Failed to remove transaction link:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to remove transaction link',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/financial/transactions/patterns/:clientId
 * Get matching patterns for a client
 */
router.get('/patterns/:clientId', async (req: Request, res: Response): Promise<void> => {
  try {
    initializeServices();
    
    const { clientId } = req.params;
    
    const patterns = await transactionMatchingService.getClientMatchingPatterns(clientId);
    
    res.json({
      success: true,
      data: patterns,
      count: patterns.length
    });
  } catch (error) {
    logger.error('Failed to get client patterns:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get client patterns',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /api/financial/transactions/patterns
 * Create a new matching pattern
 */
router.post('/patterns', async (req: Request, res: Response): Promise<void> => {
  try {
    initializeServices();
    
    const pattern = await transactionMatchingService.createMatchingPattern(req.body);
    
    res.json({
      success: true,
      data: pattern,
      message: 'Matching pattern created successfully'
    });
  } catch (error) {
    logger.error('Failed to create pattern:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create pattern',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * PUT /api/financial/transactions/patterns/:id
 * Update a matching pattern
 */
router.put('/patterns/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    initializeServices();
    
    const { id } = req.params;
    const updates = req.body;
    
    const query = `
      UPDATE financial.transaction_matching_patterns
      SET 
        pattern = COALESCE($2, pattern),
        confidence = COALESCE($3, confidence),
        amount_min = COALESCE($4, amount_min),
        amount_max = COALESCE($5, amount_max),
        is_active = COALESCE($6, is_active),
        updated_at = NOW()
      WHERE id = $1
      RETURNING *
    `;
    
    const result = await databaseService.pool.query(query, [
      id,
      updates.pattern,
      updates.confidence,
      updates.amountMin,
      updates.amountMax,
      updates.isActive
    ]);
    
    if (result.rows.length === 0) {
      res.status(404).json({
        success: false,
        error: 'Pattern not found'
      });
      return;
    }
    
    res.json({
      success: true,
      data: result.rows[0],
      message: 'Pattern updated successfully'
    });
  } catch (error) {
    logger.error('Failed to update pattern:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update pattern',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * DELETE /api/financial/transactions/patterns/:id
 * Delete a matching pattern
 */
router.delete('/patterns/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    initializeServices();
    
    const { id } = req.params;
    
    const query = `
      DELETE FROM financial.transaction_matching_patterns
      WHERE id = $1
      RETURNING id
    `;
    
    const result = await databaseService.pool.query(query, [id]);
    
    if (result.rows.length === 0) {
      res.status(404).json({
        success: false,
        error: 'Pattern not found'
      });
      return;
    }
    
    res.json({
      success: true,
      message: 'Pattern deleted successfully'
    });
  } catch (error) {
    logger.error('Failed to delete pattern:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete pattern',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;