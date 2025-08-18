/**
 * Financial routes using typed contracts for Single Source of Truth
 * This file demonstrates contract-first API development
 */
import { Router } from 'express';
import { createTypedFinancialRouter, createErrorResponse } from '../utils/typed-router';
import { requireAuth } from '../middleware/auth.middleware';
import { ClientService } from '../services/financial/client.service';
import { InvoiceService } from '../services/financial/invoice-storage.service';
import { TransactionService } from '../services/financial/transaction-categorization.service';
import { AccountService } from '../services/financial/account.service';
import { db } from '../services/database';
import { logger } from '../utils/log';

// Initialize services
const clientService = new ClientService(db.pool);
const invoiceService = new InvoiceService(db.pool);
const transactionService = new TransactionService(db.pool);
const accountService = new AccountService(db.pool);

// Create typed router
const typedRouter = createTypedFinancialRouter();

/**
 * GET /api/financial/clients
 * List all clients with pagination and search
 */
typedRouter.getClients(async (req, res) => {
  try {
    const { page = 1, limit = 20, search } = req.query;
    
    const clients = await clientService.list({
      page: Number(page),
      limit: Number(limit),
      search: search || undefined,
    });
    
    // Response is typed automatically based on OpenAPI spec
    res.json({
      clients: clients.data,
      pagination: {
        page: clients.page,
        limit: clients.limit,
        total: clients.total,
        totalPages: clients.totalPages,
      },
    });
  } catch (error) {
    logger.error('Error fetching clients:', error);
    res.status(500).json(createErrorResponse(500, 'Failed to fetch clients'));
  }
});

/**
 * POST /api/financial/clients
 * Create a new client
 */
typedRouter.createClient(async (req, res) => {
  try {
    // Request body is typed based on OpenAPI spec
    const clientData = req.body;
    
    const newClient = await clientService.create(clientData);
    
    res.status(201).json({
      client: newClient,
      message: 'Client created successfully',
    });
  } catch (error) {
    logger.error('Error creating client:', error);
    res.status(500).json(createErrorResponse(500, 'Failed to create client'));
  }
});

/**
 * PUT /api/financial/clients/:id
 * Update an existing client
 */
typedRouter.updateClient(async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    
    const updatedClient = await clientService.update(id, updates);
    
    if (!updatedClient) {
      res.status(404).json(createErrorResponse(404, 'Client not found'));
      return;
    }
    
    res.json({
      client: updatedClient,
      message: 'Client updated successfully',
    });
  } catch (error) {
    logger.error('Error updating client:', error);
    res.status(500).json(createErrorResponse(500, 'Failed to update client'));
  }
});

/**
 * DELETE /api/financial/clients/:id
 * Delete a client
 */
typedRouter.deleteClient(async (req, res) => {
  try {
    const { id } = req.params;
    
    const deleted = await clientService.delete(id);
    
    if (!deleted) {
      res.status(404).json(createErrorResponse(404, 'Client not found'));
      return;
    }
    
    res.json({
      message: 'Client deleted successfully',
    });
  } catch (error) {
    logger.error('Error deleting client:', error);
    res.status(500).json(createErrorResponse(500, 'Failed to delete client'));
  }
});

/**
 * GET /api/financial/invoices
 * List all invoices with filtering
 */
typedRouter.getInvoices(async (req, res) => {
  try {
    const { page = 1, limit = 20, clientId, status } = req.query;
    
    const invoices = await invoiceService.list({
      page: Number(page),
      limit: Number(limit),
      clientId: clientId || undefined,
      status: status || undefined,
    });
    
    res.json({
      invoices: invoices.data,
      pagination: {
        page: invoices.page,
        limit: invoices.limit,
        total: invoices.total,
        totalPages: invoices.totalPages,
      },
    });
  } catch (error) {
    logger.error('Error fetching invoices:', error);
    res.status(500).json(createErrorResponse(500, 'Failed to fetch invoices'));
  }
});

/**
 * POST /api/financial/invoices
 * Create a new invoice
 */
typedRouter.createInvoice(async (req, res) => {
  try {
    const invoiceData = req.body;
    
    const newInvoice = await invoiceService.create(invoiceData);
    
    res.status(201).json({
      invoice: newInvoice,
      message: 'Invoice created successfully',
    });
  } catch (error) {
    logger.error('Error creating invoice:', error);
    res.status(500).json(createErrorResponse(500, 'Failed to create invoice'));
  }
});

/**
 * GET /api/financial/transactions
 * List all transactions with filtering
 */
typedRouter.getTransactions(async (req, res) => {
  try {
    const { page = 1, limit = 50, accountId, startDate, endDate } = req.query;
    
    const transactions = await transactionService.list({
      page: Number(page),
      limit: Number(limit),
      accountId: accountId || undefined,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
    });
    
    res.json({
      transactions: transactions.data,
      pagination: {
        page: transactions.page,
        limit: transactions.limit,
        total: transactions.total,
        totalPages: transactions.totalPages,
      },
    });
  } catch (error) {
    logger.error('Error fetching transactions:', error);
    res.status(500).json(createErrorResponse(500, 'Failed to fetch transactions'));
  }
});

/**
 * GET /api/financial/accounts
 * List all bank accounts
 */
typedRouter.getAccounts(async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    
    const accounts = await accountService.list({
      page: Number(page),
      limit: Number(limit),
    });
    
    res.json({
      accounts: accounts.data,
      pagination: {
        page: accounts.page,
        limit: accounts.limit,
        total: accounts.total,
        totalPages: accounts.totalPages,
      },
    });
  } catch (error) {
    logger.error('Error fetching accounts:', error);
    res.status(500).json(createErrorResponse(500, 'Failed to fetch accounts'));
  }
});

/**
 * GET /api/financial/accounts/:id
 * Get a specific account by ID
 */
typedRouter.getAccount(async (req, res) => {
  try {
    const { id } = req.params;
    
    const account = await accountService.getById(id);
    
    if (!account) {
      res.status(404).json(createErrorResponse(404, 'Account not found'));
      return;
    }
    
    res.json({
      account,
    });
  } catch (error) {
    logger.error('Error fetching account:', error);
    res.status(500).json(createErrorResponse(500, 'Failed to fetch account'));
  }
});

// Create main router and apply auth middleware
const router = Router();
router.use(requireAuth); // All financial routes require authentication
router.use(typedRouter.router);

export default router;