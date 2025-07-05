import { Router } from 'express';
import { InvoicesController } from './invoices.controller';

const router = Router();
const invoicesController = new InvoicesController();

// Basic CRUD operations
router.post('/', async (req, res) => {
  await invoicesController.createInvoice(req, res);
});

router.get('/', async (req, res) => {
  await invoicesController.listInvoices(req, res);
});

router.get('/overdue', async (req, res) => {
  await invoicesController.getOverdueInvoices(req, res);
});

router.get('/number/:invoiceNumber', async (req, res) => {
  await invoicesController.getInvoiceByNumber(req, res);
});

router.get('/stats/client/:clientId', async (req, res) => {
  await invoicesController.getClientInvoiceStats(req, res);
});

router.get('/:id', async (req, res) => {
  await invoicesController.getInvoice(req, res);
});

router.put('/:id', async (req, res) => {
  await invoicesController.updateInvoice(req, res);
});

router.delete('/:id', async (req, res) => {
  await invoicesController.deleteInvoice(req, res);
});

// Invoice actions
router.post('/:id/mark-paid', async (req, res) => {
  await invoicesController.markAsPaid(req, res);
});

router.post('/:id/send', async (req, res) => {
  await invoicesController.sendInvoice(req, res);
});

router.post('/:id/duplicate', async (req, res) => {
  await invoicesController.duplicateInvoice(req, res);
});

// Item management
router.post('/:id/items', async (req, res) => {
  await invoicesController.addItem(req, res);
});

// Document management
router.post('/:id/attachments', async (req, res) => {
  await invoicesController.attachDocument(req, res);
});

// Health check
router.get('/health', async (req, res) => {
  res.json({
    success: true,
    data: {
      service: 'invoice-management',
      status: 'healthy',
      timestamp: new Date().toISOString()
    }
  });
});

export default router;