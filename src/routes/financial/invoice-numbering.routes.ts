import { Router } from 'express';
import { authMiddleware } from '../../middleware/auth.middleware';
import { InvoiceNumberingService } from '../../services/financial/invoice-numbering.service';
import { prisma } from '../../lib/prisma';
import { AppError } from '../../utils/errors';
import logger from '../../utils/logger';

const router = Router();

// Apply auth middleware to all routes
router.use(authMiddleware);

// Initialize the numbering service
const numberingService = new InvoiceNumberingService(prisma, {
  defaultPrefix: 'INV',
  defaultFormat: 'PREFIX-YYYY-0000',
  yearlyReset: true
});

/**
 * GET /api/financial/invoice-numbering/sequences
 * Get all numbering sequences
 */
router.get('/sequences', async (req, res, next) => {
  try {
    const sequences = await numberingService.getAllSequences();
    
    res.json({
      success: true,
      data: {
        sequences,
        total: sequences.length
      }
    });
  } catch (error) {
    logger.error('Error fetching sequences:', error);
    next(new AppError('Failed to fetch sequences', 500));
  }
});

/**
 * GET /api/financial/invoice-numbering/sequences/:series
 * Get sequences for a specific series
 */
router.get('/sequences/:series', async (req, res, next) => {
  try {
    const { series } = req.params;
    const sequences = await numberingService.getSequenceInfo(series);
    
    res.json({
      success: true,
      data: {
        sequences,
        total: sequences.length
      }
    });
  } catch (error) {
    logger.error('Error fetching sequence info:', error);
    next(new AppError('Failed to fetch sequence info', 500));
  }
});

/**
 * GET /api/financial/invoice-numbering/preview
 * Preview the next invoice number
 */
router.get('/preview', async (req, res, next) => {
  try {
    const { series = 'DEFAULT', prefix = 'INV', format, year } = req.query;
    
    // Get the last used number without incrementing
    const lastUsed = await numberingService.getLastUsedNumber(
      series as string,
      prefix as string,
      year ? parseInt(year as string) : undefined
    );
    
    // Calculate what the next number would be
    let nextNumber: string;
    if (lastUsed) {
      // Extract the numeric part and increment
      const match = lastUsed.match(/\d+$/);
      if (match) {
        const currentNum = parseInt(match[0]);
        const paddingLength = match[0].length;
        const nextNum = (currentNum + 1).toString().padStart(paddingLength, '0');
        nextNumber = lastUsed.replace(/\d+$/, nextNum);
      } else {
        nextNumber = `${prefix as string}-${new Date().getFullYear()}-0001`;
      }
    } else {
      nextNumber = `${prefix as string}-${new Date().getFullYear()}-0001`;
    }
    
    res.json({
      success: true,
      data: {
        lastUsed,
        nextNumber,
        series,
        prefix,
        format: format || 'PREFIX-YYYY-0000'
      }
    });
  } catch (error) {
    logger.error('Error previewing next number:', error);
    next(new AppError('Failed to preview next number', 500));
  }
});

/**
 * POST /api/financial/invoice-numbering/set-next
 * Set the next invoice number
 */
router.post('/set-next', async (req, res, next) => {
  try {
    const { series = 'DEFAULT', prefix = 'INV', nextNumber, year } = req.body;
    
    if (!nextNumber || typeof nextNumber !== 'number') {
      throw new AppError('Next number is required and must be a number', 400);
    }
    
    await numberingService.setNextNumber(
      series,
      prefix,
      nextNumber,
      year || new Date().getFullYear()
    );
    
    res.json({
      success: true,
      message: 'Next invoice number set successfully',
      data: {
        series,
        prefix,
        nextNumber,
        year: year || new Date().getFullYear()
      }
    });
  } catch (error) {
    logger.error('Error setting next number:', error);
    next(new AppError('Failed to set next number', 500));
  }
});

/**
 * POST /api/financial/invoice-numbering/reset
 * Reset a numbering sequence
 */
router.post('/reset', async (req, res, next) => {
  try {
    const { series = 'DEFAULT', prefix = 'INV', year } = req.body;
    
    // Add confirmation check for safety
    if (!req.body.confirm) {
      throw new AppError('Please confirm the reset operation by setting confirm: true', 400);
    }
    
    await numberingService.resetSequence(
      series,
      prefix,
      year || new Date().getFullYear()
    );
    
    res.json({
      success: true,
      message: 'Sequence reset successfully',
      data: {
        series,
        prefix,
        year: year || new Date().getFullYear()
      }
    });
  } catch (error) {
    logger.error('Error resetting sequence:', error);
    next(new AppError('Failed to reset sequence', 500));
  }
});

/**
 * GET /api/financial/invoice-numbering/statistics
 * Get numbering statistics
 */
router.get('/statistics', async (req, res, next) => {
  try {
    const statistics = await numberingService.getStatistics();
    
    res.json({
      success: true,
      data: statistics
    });
  } catch (error) {
    logger.error('Error fetching statistics:', error);
    next(new AppError('Failed to fetch statistics', 500));
  }
});

/**
 * POST /api/financial/invoice-numbering/validate
 * Validate an invoice number
 */
router.post('/validate', async (req, res, next) => {
  try {
    const { invoiceNumber } = req.body;
    
    if (!invoiceNumber) {
      throw new AppError('Invoice number is required', 400);
    }
    
    const isValid = await numberingService.validateInvoiceNumber(invoiceNumber);
    
    res.json({
      success: true,
      data: {
        invoiceNumber,
        isValid,
        message: isValid ? 'Invoice number is available' : 'Invoice number already exists'
      }
    });
  } catch (error) {
    logger.error('Error validating invoice number:', error);
    next(new AppError('Failed to validate invoice number', 500));
  }
});

export default router;