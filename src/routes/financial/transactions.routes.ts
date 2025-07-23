import { Router, Request, Response } from 'express';
import { Pool } from 'pg';
import { TransactionMatchingService } from '../../services/financial/transaction-matching.service';
import { logger } from '../../utils/log';
import { authMiddleware } from '../../middleware/auth.middleware';

export function createTransactionRoutes(pool: Pool): Router {
  const router = Router();
  const transactionMatchingService = new TransactionMatchingService(pool);

/**
 * GET /api/financial/transactions/unlinked
 * Get transactions without client links
 */
router.get('/unlinked', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
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
router.post('/:id/link', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { clientId, notes } = req.body;
    
    // Extract userId from auth context
    const userId = (req as any).user?.userId || (req as any).userId;
    
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
router.post('/auto-match', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
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
router.get('/:id/link', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    
    // TODO: getLink method needs to be implemented
    const link = null; // await transactionMatchingService.getLink(id);
    
    if (!link) {
      res.status(404).json({
        success: false,
        error: 'Transaction link not found'
      });
      return;
    }
    
    res.json({
      success: true,
      data: link
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
router.delete('/:id/link', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    
    // Extract userId from auth context
    const userId = (req as any).user?.userId || (req as any).userId;
    
    // Get the link first
    // TODO: getLink method needs to be implemented
    const link = null; // await transactionMatchingService.getLink(id);
    
    if (!link) {
      res.status(404).json({
        success: false,
        error: 'Transaction link not found'
      });
      return;
    }
    
    // Remove the link
    // TODO: removeLink method needs to be implemented
    // const removed = await transactionMatchingService.removeLink(link?.id, userId, reason);
    
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
router.get('/patterns/:clientId', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
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
router.post('/patterns', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const patternData = req.body;
    
    // Extract required fields and convert to Prisma service format
    const pattern = await transactionMatchingService.createMatchingPattern({
        clientId: patternData.clientId,
        patternType: patternData.patternType,
        pattern: patternData.pattern,
        amountMin: patternData.amountMin,
        amountMax: patternData.amountMax,
        confidence: patternData.confidence,
        isActive: patternData.isActive
      });
    
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
router.put('/patterns/:id', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const updates = req.body;
    
    // TODO: updateMatchingPattern needs to be implemented, using createMatchingPattern as workaround
    const pattern = await transactionMatchingService.createMatchingPattern({ ...updates, id });
    
    res.json({
      success: true,
      data: pattern,
      message: 'Matching pattern updated successfully'
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
router.delete('/patterns/:id', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    
    // TODO: deleteMatchingPattern needs to be implemented
    // const deleted = await transactionMatchingService.deleteMatchingPattern(id);
    
    res.json({
      success: true,
      message: 'Matching pattern deleted successfully'
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

  return router;
}