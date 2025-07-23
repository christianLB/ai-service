import { Router } from 'express';
import { ClientsController } from './clients.controller';
import { authMiddleware } from '../../middleware/auth.middleware';

const router = Router();
const clientsController = new ClientsController();

// Health check (no auth required)
router.get('/health', async (req, res) => {
  res.json({
    success: true,
    data: {
      service: 'client-management',
      status: 'healthy',
      timestamp: new Date().toISOString()
    }
  });
});

// Search and bulk operations (must be before /:id routes)
router.post('/search', authMiddleware, async (req, res) => {
  await clientsController.searchClients(req, res);
});

router.post('/bulk', authMiddleware, async (req, res) => {
  await clientsController.bulkOperations(req, res);
});

// Advanced queries by tax ID (must be before /:id routes)
router.get('/tax/:taxId', authMiddleware, async (req, res) => {
  await clientsController.getClientByTaxId(req, res);
});

// Basic CRUD operations
router.post('/', authMiddleware, async (req, res) => {
  await clientsController.createClient(req, res);
});

router.get('/', authMiddleware, async (req, res) => {
  await clientsController.listClients(req, res);
});

router.get('/:id', authMiddleware, async (req, res) => {
  await clientsController.getClient(req, res);
});

router.put('/:id', authMiddleware, async (req, res) => {
  await clientsController.updateClient(req, res);
});

router.delete('/:id', authMiddleware, async (req, res) => {
  await clientsController.deleteClient(req, res);
});

// Client-specific endpoints
router.get('/:id/stats', authMiddleware, async (req, res) => {
  await clientsController.getClientStats(req, res);
});

router.get('/:id/transactions', authMiddleware, async (req, res) => {
  await clientsController.getClientTransactions(req, res);
});

// Transaction linking endpoints
router.get('/:id/linked-transactions', authMiddleware, async (req, res) => {
  await clientsController.getClientLinkedTransactions(req, res);
});

router.get('/:id/transaction-summary', authMiddleware, async (req, res) => {
  await clientsController.getClientTransactionSummary(req, res);
});

export default router;