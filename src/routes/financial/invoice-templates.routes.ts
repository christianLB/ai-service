import { Router } from 'express';
import { InvoiceTemplatesController } from './invoice-templates.controller';

const router = Router();
const invoiceTemplatesController = new InvoiceTemplatesController();

// Get all invoice templates
router.get('/', async (req, res) => {
  await invoiceTemplatesController.getInvoiceTemplates(req, res);
});

// Get a single invoice template
router.get('/:id', async (req, res) => {
  await invoiceTemplatesController.getInvoiceTemplateById(req, res);
});

// Create a new invoice template
router.post('/', async (req, res) => {
  await invoiceTemplatesController.createInvoiceTemplate(req, res);
});

// Update an invoice template
router.put('/:id', async (req, res) => {
  await invoiceTemplatesController.updateInvoiceTemplate(req, res);
});

// Delete an invoice template
router.delete('/:id', async (req, res) => {
  await invoiceTemplatesController.deleteInvoiceTemplate(req, res);
});

export default router;