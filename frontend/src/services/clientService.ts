import api from './api';
import type { Client, ClientFormData, ClientStats, ApiResponse, PaginatedResponse } from '../types';

export interface ClientListParams {
  status?: string;
  search?: string;
  tags?: string[];
  limit?: number;
  offset?: number;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
}

export interface ClientSearchParams {
  query?: string;
  filters?: {
    status?: string;
    tags?: string[];
    clientType?: string;
    currency?: string;
  };
  limit?: number;
  offset?: number;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
}

class ClientService {
  async createClient(data: ClientFormData): Promise<ApiResponse<{ client: Client }>> {
    const response = await api.post('/financial/clients', data);
    return response.data;
  }

  async getClients(params?: ClientListParams): Promise<PaginatedResponse<Client>> {
    const response = await api.get('/financial/clients', { params });
    
    // Adapter: Transform backend response to match frontend PaginatedResponse interface
    if (response.data.success && response.data.data) {
      const { clients, total, limit, offset } = response.data.data;
      return {
        success: true,
        data: {
          clients,
          pagination: {
            total,
            limit,
            offset,
            hasMore: offset + limit < total
          }
        }
      };
    }
    
    // Return error response as-is
    return response.data;
  }

  async getClient(id: string): Promise<ApiResponse<{ client: Client }>> {
    const response = await api.get(`/financial/clients/${id}`);
    return response.data;
  }

  async getClientByTaxId(taxId: string, taxIdType?: string): Promise<ApiResponse<{ client: Client }>> {
    const response = await api.get(`/financial/clients/tax/${taxId}`, {
      params: { taxIdType }
    });
    return response.data;
  }

  async updateClient(id: string, data: Partial<ClientFormData>): Promise<ApiResponse<{ client: Client }>> {
    const response = await api.put(`/financial/clients/${id}`, data);
    return response.data;
  }

  async deleteClient(id: string): Promise<ApiResponse<void>> {
    const response = await api.delete(`/financial/clients/${id}`);
    return response.data;
  }

  async getClientStats(id: string): Promise<ApiResponse<{ stats: ClientStats }>> {
    const response = await api.get(`/financial/clients/${id}/stats`);
    return response.data;
  }

  async getClientTransactions(
    id: string,
    params?: {
      type?: string;
      startDate?: string;
      endDate?: string;
      limit?: number;
      offset?: number;
    }
  ): Promise<ApiResponse<{
    transactions: Array<{
      id: string;
      amount: number;
      currency: string;
      description: string;
      date: string;
      counterpartyName?: string;
      categoryName?: string;
    }>;
    total: number;
    limit: number;
    offset: number;
  }>> {
    const response = await api.get(`/financial/clients/${id}/transactions`, { params });
    return response.data;
  }

  async searchClients(params: ClientSearchParams): Promise<PaginatedResponse<Client>> {
    const response = await api.post('/financial/clients/search', params);
    
    // Adapter: Transform backend response to match frontend PaginatedResponse interface
    if (response.data.success && response.data.data) {
      const { clients, total, limit, offset } = response.data.data;
      return {
        success: true,
        data: {
          clients,
          pagination: {
            total,
            limit,
            offset,
            hasMore: offset + limit < total
          }
        }
      };
    }
    
    // Return error response as-is
    return response.data;
  }

  async bulkOperations(data: {
    operation: 'update_status' | 'add_tags';
    clientIds: string[];
    data: Record<string, unknown>;
  }): Promise<ApiResponse<{ 
    results: Array<{
      clientId: string;
      operation: string;
      success: boolean;
      error?: string;
    }>;
  }>> {
    const response = await api.post('/financial/clients/bulk', data);
    return response.data;
  }

  async getHealthCheck(): Promise<ApiResponse<{
    status: string;
    database: string;
    timestamp: string;
  }>> {
    const response = await api.get('/financial/clients/health');
    return response.data;
  }
}

export default new ClientService();