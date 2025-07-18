import axios, { AxiosInstance, AxiosError } from 'axios';
import config from '../config';
import logger from './logger';

export class AIServiceClient {
  private client: AxiosInstance;
  private authToken?: string;

  constructor() {
    this.client = axios.create({
      baseURL: config.aiService.url,
      timeout: config.aiService.timeout,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Request interceptor for auth
    this.client.interceptors.request.use(
      (config) => {
        if (this.authToken) {
          config.headers.Authorization = `Bearer ${this.authToken}`;
        }
        return config;
      },
      (error) => {
        logger.error('Request interceptor error', { error: error.message });
        return Promise.reject(error);
      }
    );

    // Response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => response,
      async (error: AxiosError) => {
        const { config: reqConfig, response } = error;
        
        // Log error
        logger.error('AI Service request failed', {
          url: reqConfig?.url,
          status: response?.status,
          data: response?.data,
        });

        // Retry logic for certain errors
        if (
          reqConfig && 
          !reqConfig.headers?.['X-Retry-Count'] &&
          (response?.status === 502 || response?.status === 503)
        ) {
          reqConfig.headers = reqConfig.headers || {};
          reqConfig.headers['X-Retry-Count'] = '1';
          return this.client.request(reqConfig);
        }

        return Promise.reject(error);
      }
    );
  }

  setAuthToken(token: string) {
    this.authToken = token;
  }

  // Financial endpoints
  async getFinancialSummary(period?: string) {
    const response = await this.client.get('/api/financial/dashboard/overview', {
      params: { period },
    });
    return response.data;
  }

  async getTransactions(filters?: any) {
    const response = await this.client.get('/api/financial/transactions', {
      params: filters,
    });
    return response.data;
  }

  async getAccounts() {
    const response = await this.client.get('/api/financial/accounts');
    return response.data;
  }

  async analyzeExpenses(params: { startDate?: string; endDate?: string; category?: string }) {
    const response = await this.client.get('/api/financial/analytics/expenses', {
      params,
    });
    return response.data;
  }

  async syncFinancialData() {
    const response = await this.client.post('/api/financial/sync');
    return response.data;
  }

  // Document endpoints
  async searchDocuments(query: string, filters?: any) {
    const response = await this.client.post('/api/documents/search', {
      query,
      ...filters,
    });
    return response.data;
  }

  async analyzeDocument(documentId: string) {
    const response = await this.client.post(`/api/documents/${documentId}/analyze`);
    return response.data;
  }

  async askDocumentQuestion(documentId: string, question: string) {
    const response = await this.client.post(`/api/documents/${documentId}/ask`, {
      question,
    });
    return response.data;
  }

  async getDocumentById(documentId: string) {
    const response = await this.client.get(`/api/documents/${documentId}`);
    return response.data;
  }

  // System endpoints
  async getSystemStatus() {
    const response = await this.client.get('/status');
    return response.data;
  }

  async getSystemMetrics() {
    const response = await this.client.get('/api/metrics/json');
    return response.data;
  }

  async getNeuralStatus() {
    const response = await this.client.get('/neural');
    return response.data;
  }

  // Invoice endpoints
  async createInvoice(invoiceData: any) {
    const response = await this.client.post('/api/financial/invoices', invoiceData);
    return response.data;
  }

  async getInvoices(filters?: any) {
    const response = await this.client.get('/api/financial/invoices', {
      params: filters,
    });
    return response.data;
  }

  // Category endpoints
  async categorizeTransaction(transactionId: string, category: string) {
    const response = await this.client.post(`/api/financial/transactions/${transactionId}/categorize`, {
      category,
    });
    return response.data;
  }

  async autoCategorizeTransactions() {
    const response = await this.client.post('/api/financial/categorize/auto');
    return response.data;
  }

  // Report generation
  async generateReport(type: string, params: any) {
    const response = await this.client.post('/api/financial/reports/generate', {
      type,
      ...params,
    });
    return response.data;
  }

  // Authentication
  async authenticate(credentials: { email: string; password: string }) {
    const response = await this.client.post('/api/auth/login', credentials);
    if (response.data.token) {
      this.setAuthToken(response.data.token);
    }
    return response.data;
  }
}

// Singleton instance
export const aiServiceClient = new AIServiceClient();