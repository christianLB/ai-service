// Temporary stub for invoice-attachment routes to allow app to start
import { Router } from 'express';

const router = Router();

// Stub routes - not functional
router.get('/:invoiceId/attachments', (req, res) => {
  res.json({ attachments: [], total: 0 });
});

router.post('/:invoiceId/attachments', (req, res) => {
  res.status(501).json({ error: 'Not implemented' });
});

router.get('/attachments/:attachmentId', (req, res) => {
  res.status(501).json({ error: 'Not implemented' });
});

router.delete('/attachments/:attachmentId', (req, res) => {
  res.status(501).json({ error: 'Not implemented' });
});

export default router;