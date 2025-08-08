import express, { Request, Response } from 'express';
import multer from 'multer';
import { PrismaClient } from '@prisma/client';
import { InvoiceAttachmentService } from '../../services/financial/invoice-attachment.service';
import { AppError } from '../../utils/errors';
import { logger } from '../../utils/log';

const upload = multer({ storage: multer.memoryStorage() });

type RequestWithUser = Request & { user?: { id?: string } };

export function createAttachmentsRouter(prisma?: PrismaClient) {
  const router = express.Router();
  const prismaClient = prisma ?? new PrismaClient();
  const service = new InvoiceAttachmentService(prismaClient, {
    baseDir: process.env.ATTACHMENTS_DIR || undefined,
  });

  // List attachments for an invoice
  router.get('/:invoiceId/attachments', async (req: RequestWithUser, res: Response) => {
    try {
      const { invoiceId } = req.params;
      const userId = req.user?.id || (req.query.userId as string) || 'anonymous'; // TODO: replace with real auth
      const attachments = await service.getInvoiceAttachments(String(invoiceId), String(userId));
      res.json({ attachments, total: attachments.length });
    } catch (err: unknown) {
      const status = err instanceof AppError ? err.statusCode : 500;
      const message = err instanceof Error ? err.message : 'Failed to get attachments';
      res.status(status).json({ error: message });
    }
  });

  // Upload attachment for an invoice
  router.post('/:invoiceId/attachments', upload.single('file'), async (req: RequestWithUser, res: Response) => {
    try {
      const { invoiceId } = req.params;
      const file = req.file;
      if (!file) {
        return res.status(400).json({ error: 'file is required' });
      }

      const userId = req.user?.id || (req.body.userId as string) || 'anonymous'; // TODO: replace with real auth
      const description = req.body?.description as string | undefined;
      const checksum = req.body?.checksum as string | undefined;

      const attachment = await service.uploadAttachment({
        invoiceId: String(invoiceId),
        fileName: file.originalname,
        fileType: file.mimetype,
        fileBuffer: file.buffer,
        description,
        uploadedBy: String(userId),
        checksum,
      });

      res.status(201).json({ attachment });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to upload attachment';
      logger.error('Upload attachment failed', { error: message });
      const status = err instanceof AppError ? err.statusCode : 500;
      res.status(status).json({ error: message });
    }
  });

  // Download attachment by id
  router.get('/attachment/:id/download', async (req: RequestWithUser, res: Response) => {
    try {
      const { id } = req.params;
      const userId = req.user?.id || (req.query.userId as string) || 'anonymous'; // TODO: replace with real auth
      const result = await service.downloadAttachment(String(id), String(userId));
      if (!result) {
        return res.status(404).json({ error: 'Attachment not found' });
      }

      const { attachment, buffer } = result;
      const contentType = attachment.fileType || 'application/octet-stream';
      const fileName = attachment.fileName || 'attachment';
      res.setHeader('Content-Type', contentType);
      res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
      res.setHeader('Content-Length', String(buffer.length));
      res.send(buffer);
    } catch (err: unknown) {
      const status = err instanceof AppError ? err.statusCode : 500;
      const message = err instanceof Error ? err.message : 'Failed to download attachment';
      res.status(status).json({ error: message });
    }
  });

  return router;
}
