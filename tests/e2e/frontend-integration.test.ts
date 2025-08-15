import { describe, it, expect, beforeAll } from '@jest/globals';
import axios from 'axios';

const API_BASE = process.env.API_URL || 'http://localhost:3005';

describe('Frontend Integration E2E Tests', () => {
  let apiClient: any;

  beforeAll(() => {
    apiClient = axios.create({
      baseURL: API_BASE,
      timeout: 5000,
      validateStatus: () => true,
    });
  });

  describe('Accounts Page Data Loading', () => {
    it('should load accounts list with pagination', async () => {
      const response = await apiClient.get('/api/financial/accounts');
      
      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('accounts');
      expect(response.data).toHaveProperty('total');
      expect(response.data).toHaveProperty('page');
      expect(response.data).toHaveProperty('limit');
      
      // Validate account structure for frontend
      if (response.data.accounts.length > 0) {
        const account = response.data.accounts[0];
        expect(account).toHaveProperty('id');
        expect(account).toHaveProperty('name');
        expect(account).toHaveProperty('provider');
        expect(account).toHaveProperty('currency');
        expect(account).toHaveProperty('createdAt');
      }
    });

    it('should handle pagination correctly', async () => {
      const page1 = await apiClient.get('/api/financial/accounts', {
        params: { page: 1, limit: 5 }
      });
      
      expect(page1.status).toBe(200);
      expect(page1.data.page).toBe(1);
      expect(page1.data.limit).toBe(5);
      expect(page1.data.accounts.length).toBeLessThanOrEqual(5);
      
      if (page1.data.total > 5) {
        const page2 = await apiClient.get('/api/financial/accounts', {
          params: { page: 2, limit: 5 }
        });
        
        expect(page2.status).toBe(200);
        expect(page2.data.page).toBe(2);
        expect(page2.data.limit).toBe(5);
        
        // Ensure different data on different pages
        const page1Ids = page1.data.accounts.map((a: any) => a.id);
        const page2Ids = page2.data.accounts.map((a: any) => a.id);
        const overlap = page1Ids.filter((id: string) => page2Ids.includes(id));
        expect(overlap.length).toBe(0);
      }
    });
  });

  describe('Clients Page Data Loading', () => {
    it('should load clients list with pagination', async () => {
      const response = await apiClient.get('/api/financial/clients');
      
      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('clients');
      expect(response.data).toHaveProperty('total');
      expect(response.data).toHaveProperty('page');
      expect(response.data).toHaveProperty('limit');
      
      // Validate client structure for frontend
      if (response.data.clients.length > 0) {
        const client = response.data.clients[0];
        expect(client).toHaveProperty('id');
        expect(client).toHaveProperty('name');
        expect(client).toHaveProperty('email');
        expect(client).toHaveProperty('status');
        expect(client).toHaveProperty('createdAt');
      }
    });

    it('should filter clients by email', async () => {
      const response = await apiClient.get('/api/financial/clients', {
        params: { email: 'demo' }
      });
      
      expect(response.status).toBe(200);
      expect(response.data.clients).toBeDefined();
      
      response.data.clients.forEach((client: any) => {
        if (client.email) {
          expect(client.email.toLowerCase()).toContain('demo');
        }
      });
    });

    it('should filter clients by name', async () => {
      const response = await apiClient.get('/api/financial/clients', {
        params: { name: 'acme' }
      });
      
      expect(response.status).toBe(200);
      expect(response.data.clients).toBeDefined();
      
      response.data.clients.forEach((client: any) => {
        if (client.name) {
          expect(client.name.toLowerCase()).toContain('acme');
        }
      });
    });
  });

  describe('Invoices Page Data Loading', () => {
    it('should load invoices list with pagination', async () => {
      const response = await apiClient.get('/api/financial/invoices');
      
      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('invoices');
      expect(response.data).toHaveProperty('total');
      expect(response.data).toHaveProperty('page');
      expect(response.data).toHaveProperty('limit');
      
      // Validate invoice structure for frontend
      if (response.data.invoices.length > 0) {
        const invoice = response.data.invoices[0];
        expect(invoice).toHaveProperty('id');
        expect(invoice).toHaveProperty('invoiceNumber');
        expect(invoice).toHaveProperty('status');
        expect(invoice).toHaveProperty('total');
        expect(invoice).toHaveProperty('issueDate');
      }
    });

    it('should filter invoices by status', async () => {
      const response = await apiClient.get('/api/financial/invoices', {
        params: { status: 'draft' }
      });
      
      expect(response.status).toBe(200);
      expect(response.data.invoices).toBeDefined();
      
      response.data.invoices.forEach((invoice: any) => {
        expect(invoice.status).toBe('draft');
      });
    });

    it('should filter invoices by clientId', async () => {
      // First get a client
      const clientsResponse = await apiClient.get('/api/financial/clients', {
        params: { limit: 1 }
      });
      
      if (clientsResponse.data.clients.length > 0) {
        const clientId = clientsResponse.data.clients[0].id;
        
        const response = await apiClient.get('/api/financial/invoices', {
          params: { clientId }
        });
        
        expect(response.status).toBe(200);
        expect(response.data.invoices).toBeDefined();
        
        response.data.invoices.forEach((invoice: any) => {
          expect(invoice.clientId).toBe(clientId);
        });
      }
    });
  });

  describe('Transactions Page Data Loading', () => {
    it('should load transactions list with pagination and stats', async () => {
      const response = await apiClient.get('/api/financial/transactions');
      
      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('transactions');
      expect(response.data).toHaveProperty('total');
      expect(response.data).toHaveProperty('page');
      expect(response.data).toHaveProperty('limit');
      expect(response.data).toHaveProperty('stats');
      
      // Validate stats for dashboard display
      expect(response.data.stats).toHaveProperty('totalIncome');
      expect(response.data.stats).toHaveProperty('totalExpenses');
      expect(typeof response.data.stats.totalIncome).toBe('number');
      expect(typeof response.data.stats.totalExpenses).toBe('number');
      
      // Validate transaction structure for frontend
      if (response.data.transactions.length > 0) {
        const transaction = response.data.transactions[0];
        expect(transaction).toHaveProperty('id');
        expect(transaction).toHaveProperty('transaction_id');
        expect(transaction).toHaveProperty('account_id');
        expect(transaction).toHaveProperty('amount');
        expect(transaction).toHaveProperty('type');
        expect(transaction).toHaveProperty('date');
      }
    });

    it('should support combined filters for complex queries', async () => {
      const response = await apiClient.get('/api/financial/transactions', {
        params: {
          type: 'credit',
          status: 'confirmed',
          minAmount: 10,
          maxAmount: 10000,
          page: 1,
          limit: 10
        }
      });
      
      expect(response.status).toBe(200);
      expect(response.data.transactions).toBeDefined();
      expect(response.data.page).toBe(1);
      expect(response.data.limit).toBe(10);
      
      // Validate all filters are applied
      response.data.transactions.forEach((t: any) => {
        if (t.type) expect(t.type).toBe('credit');
        if (t.status) expect(t.status).toBe('confirmed');
        if (t.amount !== undefined) {
          expect(t.amount).toBeGreaterThanOrEqual(10);
          expect(t.amount).toBeLessThanOrEqual(10000);
        }
      });
    });
  });

  describe('Attachments Page Data Loading', () => {
    it('should load attachments list with pagination', async () => {
      const response = await apiClient.get('/api/financial/attachments');
      
      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('attachments');
      expect(response.data).toHaveProperty('total');
      expect(response.data).toHaveProperty('page');
      expect(response.data).toHaveProperty('limit');
      
      // Validate attachment structure for frontend
      if (response.data.attachments.length > 0) {
        const attachment = response.data.attachments[0];
        expect(attachment).toHaveProperty('id');
        expect(attachment).toHaveProperty('invoiceId');
        expect(attachment).toHaveProperty('fileName');
        expect(attachment).toHaveProperty('fileSize');
        expect(attachment).toHaveProperty('fileType');
        expect(attachment).toHaveProperty('uploadedAt');
      }
    });

    it('should filter attachments by invoiceId', async () => {
      // First get an invoice
      const invoicesResponse = await apiClient.get('/api/financial/invoices', {
        params: { limit: 1 }
      });
      
      if (invoicesResponse.data.invoices.length > 0) {
        const invoiceId = invoicesResponse.data.invoices[0].id;
        
        const response = await apiClient.get('/api/financial/attachments', {
          params: { invoiceId }
        });
        
        expect(response.status).toBe(200);
        expect(response.data.attachments).toBeDefined();
        
        response.data.attachments.forEach((attachment: any) => {
          expect(attachment.invoiceId).toBe(invoiceId);
        });
      }
    });
  });

  describe('Error Propagation', () => {
    it('should propagate 400 errors with standardized format', async () => {
      const response = await apiClient.get('/api/financial/transactions', {
        params: { page: -1 }
      });
      
      expect(response.status).toBe(400);
      expect(response.data).toHaveProperty('message');
      expect(response.data).toHaveProperty('code');
      expect(response.data.code).toBe('BAD_REQUEST');
      expect(typeof response.data.message).toBe('string');
    });

    it('should propagate 404 errors with standardized format', async () => {
      const response = await apiClient.get('/api/financial/clients/00000000-0000-0000-0000-000000000000');
      
      expect(response.status).toBe(404);
      expect(response.data).toHaveProperty('message');
      expect(response.data).toHaveProperty('code');
      expect(response.data.code).toBe('NOT_FOUND');
    });

    it('should handle service unavailability gracefully', async () => {
      // This test would need a way to simulate service being down
      // For now, we just verify the structure is correct for any error
      const response = await apiClient.get('/api/nonexistent/endpoint');
      
      expect(response.status).toBeGreaterThanOrEqual(400);
      if (response.data && typeof response.data === 'object') {
        // If we get an error response, it should have the expected structure
        if (response.data.message) {
          expect(typeof response.data.message).toBe('string');
        }
      }
    });
  });
});