import { Router, Request, Response } from 'express';
import { InvoiceAttachmentService } from '../../services/financial/invoice-attachment.service';
import { prisma } from '../../lib/prisma';
import multer from 'multer';
import { logger } from '../../utils/logger';
import { z } from 'zod';
import { authMiddleware, AuthRequest } from '../../middleware/auth.middleware';
import rateLimit from 'express-rate-limit';

const router = Router();

// Configure multer for memory storage with security limits
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 25 * 1024 * 1024, // 25MB limit for invoices
    files: 1, // Only one file at a time
    fieldSize: 100 * 1024 // 100KB for field values
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'application/pdf',
      'image/jpeg',
      'image/jpg',
      'image/png',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/plain',
      'text/csv'
    ];

    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`File type ${file.mimetype} is not allowed`));
    }
  }
});

// Initialize service
const attachmentService = new InvoiceAttachmentService(prisma);

// Ensure storage is initialized
attachmentService.init().catch(error => {
  logger.error('Failed to initialize attachment storage:', error);
});

// Validation schemas
const uploadSchema = z.object({
  invoiceId: z.string().uuid(),
  description: z.string().optional()
});

const listSchema = z.object({
  invoiceId: z.string().uuid().optional(),
  limit: z.string().regex(/^\d+$/).transform(Number).optional(),
  offset: z.string().regex(/^\d+$/).transform(Number).optional()
});

/**
 * Upload attachment for an invoice
 * POST /api/invoices/attachments/upload
 */
// Rate limiting for file uploads - more restrictive than normal endpoints
const uploadRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 uploads per window per IP
  message: 'Too many file uploads, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    // Use user ID + IP for rate limiting to prevent abuse
    const userId = (req as AuthRequest).user?.id || 'anonymous';
    const ip = req.headers['x-forwarded-for'] as string || req.ip || 'unknown';
    return `${userId}:${ip}`;
  }
});

router.post('/upload', authMiddleware, uploadRateLimit, upload.single('file'), async (req: AuthRequest, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No file provided'
      });
    }

    // Validate request body
    const validation = uploadSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        success: false,
        error: 'Invalid request data',
        details: validation.error.errors
      });
    }

    const { invoiceId, description } = validation.data;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'User not authenticated'
      });
    }

    // Upload attachment
    const attachment = await attachmentService.uploadAttachment({
      invoiceId,
      fileName: req.file.originalname,
      fileType: req.file.mimetype,
      fileBuffer: req.file.buffer,
      description,
      uploadedBy: userId
    });

    res.json({
      success: true,
      data: {
        id: attachment.id,
        fileName: attachment.fileName,
        fileType: attachment.fileType,
        fileSize: Number(attachment.fileSize),
        description: attachment.description,
        uploadedAt: attachment.uploadedAt,
        downloadUrl: attachmentService.generateDownloadUrl(attachment.id)
      }
    });
  } catch (error: any) {
    logger.error('Error uploading attachment:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to upload attachment'
    });
  }
});

/**
 * Get attachments for an invoice
 * GET /api/invoices/attachments/invoice/:invoiceId
 */
router.get('/invoice/:invoiceId', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { invoiceId } = req.params;

    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'User not authenticated'
      });
    }

    const attachments = await attachmentService.getInvoiceAttachments(invoiceId, userId);

    res.json({
      success: true,
      data: attachments.map(attachment => ({
        id: attachment.id,
        fileName: attachment.fileName,
        fileType: attachment.fileType,
        fileSize: Number(attachment.fileSize),
        description: attachment.description,
        uploadedAt: attachment.uploadedAt,
        uploadedBy: attachment.uploadedBy,
        downloadUrl: attachmentService.generateDownloadUrl(attachment.id)
      }))
    });
  } catch (error: any) {
    logger.error('Error getting invoice attachments:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get attachments'
    });
  }
});

/**
 * Download an attachment
 * GET /api/invoices/attachments/:attachmentId/download
 */
router.get('/:attachmentId/download', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { attachmentId } = req.params;
    const { token } = req.query;

    // Validate token if provided
    if (token) {
      const validation = attachmentService.validateDownloadToken(token as string);
      if (!validation.valid || validation.attachmentId !== attachmentId) {
        return res.status(403).json({
          success: false,
          error: 'Invalid or expired download token'
        });
      }
    }

    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'User not authenticated'
      });
    }

    const result = await attachmentService.downloadAttachment(attachmentId, userId);
    
    if (!result) {
      return res.status(404).json({
        success: false,
        error: 'Attachment not found'
      });
    }

    const { attachment, buffer } = result;

    // Set headers for file download
    res.setHeader('Content-Type', attachment.fileType);
    res.setHeader('Content-Disposition', `attachment; filename="${attachment.fileName}"`);
    res.setHeader('Content-Length', buffer.length.toString());

    res.send(buffer);
  } catch (error: any) {
    logger.error('Error downloading attachment:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to download attachment'
    });
  }
});

/**
 * Delete an attachment
 * DELETE /api/invoices/attachments/:attachmentId
 */
router.delete('/:attachmentId', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { attachmentId } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'User not authenticated'
      });
    }

    const success = await attachmentService.deleteAttachment(attachmentId, userId);

    if (!success) {
      return res.status(404).json({
        success: false,
        error: 'Attachment not found or unauthorized'
      });
    }

    res.json({
      success: true,
      message: 'Attachment deleted successfully'
    });
  } catch (error: any) {
    logger.error('Error deleting attachment:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to delete attachment'
    });
  }
});

/**
 * List attachments with filters
 * GET /api/invoices/attachments
 */
router.get('/', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const validation = listSchema.safeParse(req.query);
    if (!validation.success) {
      return res.status(400).json({
        success: false,
        error: 'Invalid query parameters',
        details: validation.error.errors
      });
    }

    const { invoiceId, limit, offset } = validation.data;
    const userId = req.user?.id;

    const result = await attachmentService.listAttachments({
      invoiceId,
      uploadedBy: userId,
      limit,
      offset
    });

    res.json({
      success: true,
      data: {
        attachments: result.attachments.map(attachment => ({
          id: attachment.id,
          fileName: attachment.fileName,
          fileType: attachment.fileType,
          fileSize: Number(attachment.fileSize),
          description: attachment.description,
          uploadedAt: attachment.uploadedAt,
          uploadedBy: attachment.uploadedBy,
          invoice: (attachment as any).invoice,
          user: (attachment as any).user,
          downloadUrl: attachmentService.generateDownloadUrl(attachment.id)
        })),
        pagination: {
          total: result.total,
          limit: limit || 50,
          offset: offset || 0
        }
      }
    });
  } catch (error: any) {
    logger.error('Error listing attachments:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to list attachments'
    });
  }
});

/**
 * Get attachment statistics
 * GET /api/invoices/attachments/stats
 */
router.get('/stats', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const stats = await attachmentService.getStorageStats();

    res.json({
      success: true,
      data: stats
    });
  } catch (error: any) {
    logger.error('Error getting attachment stats:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get statistics'
    });
  }
});

/**
 * Clean up orphaned files (admin only)
 * POST /api/invoices/attachments/cleanup
 */
router.post('/cleanup', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user;
    
    if (!user || user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Unauthorized - admin access required'
      });
    }

    const cleanedCount = await attachmentService.cleanupOrphanedFiles();

    res.json({
      success: true,
      data: {
        cleanedFiles: cleanedCount
      }
    });
  } catch (error: any) {
    logger.error('Error cleaning up orphaned files:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to cleanup orphaned files'
    });
  }
});

export default router;