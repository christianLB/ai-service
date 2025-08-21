import { Router } from 'express';
import { InvoiceTemplatesController } from './invoice-templates.controller';
import { authMiddleware } from '../../middleware/auth.middleware';

const router = Router();
const invoiceTemplatesController = new InvoiceTemplatesController();

// Get all invoice templates
router.get('/', authMiddleware, async (req, res) => {
  await invoiceTemplatesController.getInvoiceTemplates(req, res);
});

// Get a single invoice template
router.get('/:id', authMiddleware, async (req, res) => {
  await invoiceTemplatesController.getInvoiceTemplateById(req, res);
});

// Create a new invoice template
router.post('/', authMiddleware, async (req, res) => {
  await invoiceTemplatesController.createInvoiceTemplate(req, res);
});

// Update an invoice template
router.put('/:id', authMiddleware, async (req, res) => {
  await invoiceTemplatesController.updateInvoiceTemplate(req, res);
});

// Delete an invoice template
router.delete('/:id', authMiddleware, async (req, res) => {
  await invoiceTemplatesController.deleteInvoiceTemplate(req, res);
});

export default router;
