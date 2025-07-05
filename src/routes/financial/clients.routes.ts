import { Router } from 'express';
import { ClientsController } from './clients.controller';

const router = Router();
const clientsController = new ClientsController();

// Basic CRUD operations
router.post('/', async (req, res) => {
  await clientsController.createClient(req, res);
});

router.get('/', async (req, res) => {
  await clientsController.listClients(req, res);
});

router.get('/:id', async (req, res) => {
  await clientsController.getClient(req, res);
});

router.put('/:id', async (req, res) => {
  await clientsController.updateClient(req, res);
});

router.delete('/:id', async (req, res) => {
  await clientsController.deleteClient(req, res);
});

// Advanced queries
router.get('/tax/:taxId', async (req, res) => {
  await clientsController.getClientByTaxId(req, res);
});

router.get('/:id/stats', async (req, res) => {
  await clientsController.getClientStats(req, res);
});

router.get('/:id/transactions', async (req, res) => {
  await clientsController.getClientTransactions(req, res);
});

// Search and bulk operations
router.post('/search', async (req, res) => {
  await clientsController.searchClients(req, res);
});

router.post('/bulk', async (req, res) => {
  await clientsController.bulkOperations(req, res);
});

// Health check
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

export default router;