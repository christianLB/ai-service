import { Router } from 'express';
import { InvoicesController } from './invoices.controller';
import { authMiddleware } from '../../middleware/auth.middleware';

const router = Router();
const invoicesController = new InvoicesController();

// Health check (no auth required)
router.get('/health', async (req, res) => {
  res.json({
    success: true,
    data: {
      service: 'invoice-management',
      status: 'healthy',
      timestamp: new Date().toISOString(),
    },
  });
});

// Invoice numbering (must be before /:id routes)
router.get('/numbering/next', authMiddleware, async (req, res) => {
  await invoicesController.getNextInvoiceNumber(req, res);
});

router.get('/numbering/sequences', authMiddleware, async (req, res) => {
  await invoicesController.getNumberingSequences(req, res);
});

// Basic CRUD operations
router.post('/', authMiddleware, async (req, res) => {
  await invoicesController.createInvoice(req, res);
});

router.get('/', authMiddleware, async (req, res) => {
  await invoicesController.listInvoices(req, res);
});

router.get('/overdue', authMiddleware, async (req, res) => {
  await invoicesController.getOverdueInvoices(req, res);
});

router.get('/number/:invoiceNumber', authMiddleware, async (req, res) => {
  await invoicesController.getInvoiceByNumber(req, res);
});

router.get('/stats/client/:clientId', authMiddleware, async (req, res) => {
  await invoicesController.getClientInvoiceStats(req, res);
});

router.get('/:id', authMiddleware, async (req, res) => {
  await invoicesController.getInvoice(req, res);
});

router.put('/:id', authMiddleware, async (req, res) => {
  await invoicesController.updateInvoice(req, res);
});

router.delete('/:id', authMiddleware, async (req, res) => {
  await invoicesController.deleteInvoice(req, res);
});

// Invoice actions
router.post('/:id/mark-paid', authMiddleware, async (req, res) => {
  await invoicesController.markAsPaid(req, res);
});

router.post('/:id/send', authMiddleware, async (req, res) => {
  await invoicesController.sendInvoice(req, res);
});

router.post('/:id/duplicate', authMiddleware, async (req, res) => {
  await invoicesController.duplicateInvoice(req, res);
});

// Item management
router.post('/:id/items', authMiddleware, async (req, res) => {
  await invoicesController.addItem(req, res);
});

// Document management
router.post('/:id/attachments', authMiddleware, async (req, res) => {
  await invoicesController.attachDocument(req, res);
});

// PDF Generation and Download
router.post('/:id/generate-pdf', authMiddleware, async (req, res) => {
  await invoicesController.generatePDF(req, res);
});

router.get('/:id/download-pdf', authMiddleware, async (req, res) => {
  await invoicesController.downloadPDF(req, res);
});

router.get('/:id/preview', authMiddleware, async (req, res) => {
  await invoicesController.previewInvoice(req, res);
});

// Email sending
router.post('/:id/send-email', authMiddleware, async (req, res) => {
  await invoicesController.sendInvoiceEmail(req, res);
});

router.post('/:id/send-reminder', authMiddleware, async (req, res) => {
  await invoicesController.sendPaymentReminder(req, res);
});

export default router;
