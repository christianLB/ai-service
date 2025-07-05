import api from './api';
import type { Invoice, InvoiceFormData, InvoiceItem, ApiResponse, PaginatedResponse } from '../types';

export interface InvoiceListParams {
  clientId?: string;
  status?: string;
  type?: string;
  startDate?: string;
  endDate?: string;
  search?: string;
  limit?: number;
  offset?: number;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
}

class InvoiceService {
  async createInvoice(data: InvoiceFormData): Promise<ApiResponse<{ invoice: Invoice }>> {
    const response = await api.post('/financial/invoices', data);
    return response.data;
  }

  async getInvoices(params?: InvoiceListParams): Promise<PaginatedResponse<Invoice>> {
    const response = await api.get('/financial/invoices', { params });
    return response.data;
  }

  async getInvoice(id: string): Promise<ApiResponse<{ invoice: Invoice }>> {
    const response = await api.get(`/financial/invoices/${id}`);
    return response.data;
  }

  async getInvoiceByNumber(invoiceNumber: string): Promise<ApiResponse<{ invoice: Invoice }>> {
    const response = await api.get(`/financial/invoices/number/${invoiceNumber}`);
    return response.data;
  }

  async updateInvoice(id: string, data: Partial<InvoiceFormData>): Promise<ApiResponse<{ invoice: Invoice }>> {
    const response = await api.put(`/financial/invoices/${id}`, data);
    return response.data;
  }

  async deleteInvoice(id: string): Promise<ApiResponse<void>> {
    const response = await api.delete(`/financial/invoices/${id}`);
    return response.data;
  }

  async getOverdueInvoices(): Promise<ApiResponse<{ invoices: Invoice[]; count: number }>> {
    const response = await api.get('/financial/invoices/overdue');
    return response.data;
  }

  async markAsPaid(
    id: string,
    data: { paidDate?: string; paymentReference?: string }
  ): Promise<ApiResponse<{ invoice: Invoice }>> {
    const response = await api.post(`/financial/invoices/${id}/mark-paid`, data);
    return response.data;
  }

  async addItem(id: string, item: Omit<InvoiceItem, 'id' | 'amount' | 'total'>): Promise<ApiResponse<{ invoice: Invoice }>> {
    const response = await api.post(`/financial/invoices/${id}/items`, item);
    return response.data;
  }

  async attachDocument(
    id: string,
    document: {
      type: 'fiscal_invoice' | 'receipt' | 'contract' | 'delivery_note' | 'other';
      documentId: string;
      fileName?: string;
      description?: string;
    }
  ): Promise<ApiResponse<{ invoice: Invoice }>> {
    const response = await api.post(`/financial/invoices/${id}/attachments`, document);
    return response.data;
  }

  async getClientInvoiceStats(clientId: string): Promise<ApiResponse<{
    stats: {
      totalInvoices: number;
      totalRevenue: number;
      paidInvoices: number;
      pendingInvoices: number;
      overdueInvoices: number;
      averageAmount: number;
      lastInvoiceDate?: string;
    }
  }>> {
    const response = await api.get(`/financial/invoices/stats/client/${clientId}`);
    return response.data;
  }

  async sendInvoice(
    id: string,
    data: { sendMethod?: string; recipients?: string[] }
  ): Promise<ApiResponse<{ invoice: Invoice }>> {
    const response = await api.post(`/financial/invoices/${id}/send`, data);
    return response.data;
  }

  async duplicateInvoice(id: string): Promise<ApiResponse<{ invoice: Invoice }>> {
    const response = await api.post(`/financial/invoices/${id}/duplicate`);
    return response.data;
  }

  async getHealthCheck(): Promise<ApiResponse<any>> {
    const response = await api.get('/financial/invoices/health');
    return response.data;
  }
}

export default new InvoiceService();