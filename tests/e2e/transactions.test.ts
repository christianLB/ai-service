import { describe, it, expect, beforeAll } from '@jest/globals';
import axios from 'axios';

const API_BASE = process.env.API_URL || 'http://localhost:3005';

describe('Transaction API E2E Tests', () => {
  let apiClient: any;

  beforeAll(() => {
    apiClient = axios.create({
      baseURL: API_BASE,
      timeout: 5000,
      validateStatus: () => true, // Don't throw on any status
    });
  });

  describe('GET /api/financial/transactions', () => {
    it('should return paginated transactions with default pagination', async () => {
      const response = await apiClient.get('/api/financial/transactions');
      
      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('transactions');
      expect(response.data).toHaveProperty('total');
      expect(response.data).toHaveProperty('page');
      expect(response.data).toHaveProperty('limit');
      expect(response.data).toHaveProperty('stats');
      
      // Default pagination values
      expect(response.data.page).toBe(1);
      expect(response.data.limit).toBe(20);
      expect(Array.isArray(response.data.transactions)).toBe(true);
      
      // Stats structure
      expect(response.data.stats).toHaveProperty('totalIncome');
      expect(response.data.stats).toHaveProperty('totalExpenses');
    });

    it('should accept valid pagination parameters', async () => {
      const response = await apiClient.get('/api/financial/transactions', {
        params: { page: 2, limit: 10 }
      });
      
      expect(response.status).toBe(200);
      expect(response.data.page).toBe(2);
      expect(response.data.limit).toBe(10);
      expect(response.data.transactions.length).toBeLessThanOrEqual(10);
    });

    it('should return 400 for invalid pagination (page=0)', async () => {
      const response = await apiClient.get('/api/financial/transactions', {
        params: { page: 0 }
      });
      
      expect(response.status).toBe(400);
      expect(response.data).toHaveProperty('message');
      expect(response.data).toHaveProperty('code');
      expect(response.data.code).toBe('BAD_REQUEST');
      expect(response.data.message).toMatch(/page.*must be at least 1/i);
    });

    it('should return 400 for invalid pagination (limit > 100)', async () => {
      const response = await apiClient.get('/api/financial/transactions', {
        params: { limit: 200 }
      });
      
      expect(response.status).toBe(400);
      expect(response.data).toHaveProperty('message');
      expect(response.data).toHaveProperty('code');
      expect(response.data.code).toBe('BAD_REQUEST');
      expect(response.data.message).toMatch(/limit.*maximum.*100/i);
    });

    it('should filter transactions by type', async () => {
      const response = await apiClient.get('/api/financial/transactions', {
        params: { type: 'credit' }
      });
      
      expect(response.status).toBe(200);
      expect(response.data.transactions).toBeDefined();
      // All returned transactions should be of type 'credit'
      response.data.transactions.forEach((t: any) => {
        if (t.type) {
          expect(t.type).toBe('credit');
        }
      });
    });

    it('should filter transactions by status', async () => {
      const response = await apiClient.get('/api/financial/transactions', {
        params: { status: 'confirmed' }
      });
      
      expect(response.status).toBe(200);
      expect(response.data.transactions).toBeDefined();
      // All returned transactions should have status 'confirmed'
      response.data.transactions.forEach((t: any) => {
        if (t.status) {
          expect(t.status).toBe('confirmed');
        }
      });
    });

    it('should filter transactions by date range', async () => {
      const dateFrom = '2024-01-01';
      const dateTo = '2024-12-31';
      
      const response = await apiClient.get('/api/financial/transactions', {
        params: { dateFrom, dateTo }
      });
      
      expect(response.status).toBe(200);
      expect(response.data.transactions).toBeDefined();
      
      // All returned transactions should be within the date range
      response.data.transactions.forEach((t: any) => {
        if (t.date) {
          const txDate = new Date(t.date);
          expect(txDate >= new Date(dateFrom)).toBe(true);
          expect(txDate <= new Date(dateTo)).toBe(true);
        }
      });
    });

    it('should filter transactions by amount range', async () => {
      const response = await apiClient.get('/api/financial/transactions', {
        params: { minAmount: 100, maxAmount: 1000 }
      });
      
      expect(response.status).toBe(200);
      expect(response.data.transactions).toBeDefined();
      
      // All returned transactions should be within the amount range
      response.data.transactions.forEach((t: any) => {
        if (t.amount !== undefined) {
          expect(t.amount).toBeGreaterThanOrEqual(100);
          expect(t.amount).toBeLessThanOrEqual(1000);
        }
      });
    });

    it('should search transactions by description', async () => {
      const response = await apiClient.get('/api/financial/transactions', {
        params: { search: 'payment' }
      });
      
      expect(response.status).toBe(200);
      expect(response.data.transactions).toBeDefined();
      
      // Transactions should contain search term in description or counterparty
      response.data.transactions.forEach((t: any) => {
        const hasMatch = 
          (t.description && t.description.toLowerCase().includes('payment')) ||
          (t.counterparty_name && t.counterparty_name.toLowerCase().includes('payment'));
        
        if (t.description || t.counterparty_name) {
          expect(hasMatch).toBe(true);
        }
      });
    });
  });

  describe('GET /api/financial/transactions/:id', () => {
    it('should return 404 for non-existent transaction', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      const response = await apiClient.get(`/api/financial/transactions/${fakeId}`);
      
      expect(response.status).toBe(404);
      expect(response.data).toHaveProperty('message');
      expect(response.data).toHaveProperty('code');
      expect(response.data.code).toBe('NOT_FOUND');
    });

    it('should return 400 for invalid UUID format', async () => {
      const response = await apiClient.get('/api/financial/transactions/invalid-id');
      
      // Could be 400 or 404 depending on implementation
      expect([400, 404]).toContain(response.status);
      expect(response.data).toHaveProperty('message');
      expect(response.data).toHaveProperty('code');
    });
  });

  describe('GET /api/financial/transactions/export', () => {
    it('should export transactions as CSV by default', async () => {
      const response = await apiClient.get('/api/financial/transactions/export');
      
      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toMatch(/text\/csv/);
      expect(typeof response.data).toBe('string');
      
      // CSV should have header row
      const lines = response.data.split('\n');
      expect(lines[0]).toMatch(/Date.*Description.*Amount.*Currency.*Type.*Status/);
    });

    it('should export transactions as JSON when specified', async () => {
      const response = await apiClient.get('/api/financial/transactions/export', {
        params: { format: 'json' }
      });
      
      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toMatch(/application\/json/);
      expect(Array.isArray(response.data)).toBe(true);
      
      // Each transaction should have expected properties
      if (response.data.length > 0) {
        const tx = response.data[0];
        expect(tx).toHaveProperty('id');
        expect(tx).toHaveProperty('transaction_id');
        expect(tx).toHaveProperty('amount');
        expect(tx).toHaveProperty('date');
      }
    });

    it('should apply filters to export', async () => {
      const dateFrom = '2024-01-01';
      const dateTo = '2024-12-31';
      
      const response = await apiClient.get('/api/financial/transactions/export', {
        params: { format: 'json', dateFrom, dateTo }
      });
      
      expect(response.status).toBe(200);
      expect(Array.isArray(response.data)).toBe(true);
      
      // All exported transactions should be within the date range
      response.data.forEach((t: any) => {
        if (t.date) {
          const txDate = new Date(t.date);
          expect(txDate >= new Date(dateFrom)).toBe(true);
          expect(txDate <= new Date(dateTo)).toBe(true);
        }
      });
    });
  });
});