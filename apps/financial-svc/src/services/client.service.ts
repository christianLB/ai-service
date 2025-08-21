import { PrismaClient, Prisma } from '@prisma/client';
import type { Client } from '@prisma/client';

// Initialize Prisma client configured for financial schema
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
});

export interface ClientFormData {
  name: string;
  businessName?: string;
  taxId: string;
  taxIdType?: string;
  email: string;
  phone?: string;
  address?: any;
  clientType?: string;
  currency?: string;
  language?: string;
  timezone?: string;
  paymentTerms?: number;
  paymentMethod?: string;
  bankAccount?: string;
  creditLimit?: number;
  status?: string;
  customFields?: any;
  tags?: string[];
  notes?: string;
  metadata?: any;
}

export interface ClientQuery {
  userId: string;
  limit?: number;
  offset?: number;
  search?: string;
  status?: string;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
}

export class ClientService {
  /**
   * Get all clients with pagination and filtering
   */
  async getClients(params: ClientQuery) {
    const {
      userId,
      limit = 20,
      offset = 0,
      search,
      status,
      sortBy = 'createdAt',
      sortOrder = 'DESC',
    } = params;

    try {
      // Build where clause
      const where: Prisma.ClientWhereInput = {
        userId,
        ...(status && { status }),
        ...(search && {
          OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { email: { contains: search, mode: 'insensitive' } },
            { taxId: { contains: search, mode: 'insensitive' } },
          ],
        }),
      };

      // Get total count
      const total = await prisma.client.count({ where });

      // Get clients
      const clients = await prisma.client.findMany({
        where,
        skip: offset,
        take: limit,
        orderBy: { [this.mapFieldName(sortBy)]: sortOrder.toLowerCase() as any },
        include: {
          invoices: {
            select: {
              id: true,
              invoiceNumber: true,
              total: true,
              status: true,
              createdAt: true,
            },
            orderBy: { createdAt: 'desc' },
            take: 5,
          },
        },
      });

      // Calculate stats for each client
      const clientsWithStats = await Promise.all(
        clients.map(async (client: Client) => {
          const stats = await this.getClientStats(client.id);
          return {
            ...client,
            ...stats,
          };
        })
      );

      return {
        success: true,
        data: {
          clients: clientsWithStats,
          total,
          limit,
          offset,
        },
      };
    } catch (error) {
      console.error('Error fetching clients:', error);
      throw new Error('Failed to fetch clients');
    }
  }

  /**
   * Get a single client by ID
   */
  async getClientById(clientId: string, userId?: string) {
    try {
      const where: Prisma.ClientWhereInput = { 
        id: clientId,
        ...(userId && { userId }),
      };

      const client = await prisma.client.findFirst({
        where,
        include: {
          invoices: {
            orderBy: { createdAt: 'desc' },
            take: 10,
          },
        },
      });

      if (!client) {
        throw new Error('Client not found');
      }

      const stats = await this.getClientStats(clientId);

      return {
        success: true,
        data: {
          client: {
            ...client,
            ...stats,
          },
        },
      };
    } catch (error) {
      console.error('Error fetching client:', error);
      throw error;
    }
  }

  /**
   * Create a new client
   */
  async createClient(data: ClientFormData, userId: string) {
    try {
      const client = await prisma.client.create({
        data: {
          ...data,
          userId,
          customFields: data.metadata || data.customFields || {},
        },
      });

      console.log(`Client created: ${client.id} by user ${userId}`);

      return {
        success: true,
        data: { client },
        message: 'Client created successfully',
      };
    } catch (error: any) {
      console.error('Error creating client:', error);
      if (error.code === 'P2002') {
        throw new Error('A client with this email or tax ID already exists');
      }
      throw new Error('Failed to create client');
    }
  }

  /**
   * Update a client
   */
  async updateClient(clientId: string, updates: Partial<ClientFormData>, userId?: string) {
    try {
      // Check if client exists and belongs to user
      const where: Prisma.ClientWhereInput = { 
        id: clientId,
        ...(userId && { userId }),
      };

      const existing = await prisma.client.findFirst({ where });

      if (!existing) {
        throw new Error('Client not found');
      }

      // Update client
      const client = await prisma.client.update({
        where: { id: clientId },
        data: {
          ...updates,
          customFields: updates.metadata || updates.customFields,
          updatedAt: new Date(),
        },
      });

      console.log(`Client updated: ${clientId} by user ${userId || 'system'}`);

      return {
        success: true,
        data: { client },
        message: 'Client updated successfully',
      };
    } catch (error) {
      console.error('Error updating client:', error);
      throw error;
    }
  }

  /**
   * Delete a client
   */
  async deleteClient(clientId: string, userId?: string) {
    try {
      // Check if client exists and belongs to user
      const where: Prisma.ClientWhereInput = { 
        id: clientId,
        ...(userId && { userId }),
      };

      const client = await prisma.client.findFirst({
        where,
        include: {
          invoices: {
            select: { id: true },
          },
        },
      });

      if (!client) {
        throw new Error('Client not found');
      }

      // Check if client has invoices
      if (client.invoices.length > 0) {
        throw new Error('Cannot delete client with existing invoices');
      }

      // Delete client
      await prisma.client.delete({
        where: { id: clientId },
      });

      console.log(`Client deleted: ${clientId} by user ${userId || 'system'}`);

      return {
        success: true,
        message: 'Client deleted successfully',
      };
    } catch (error) {
      console.error('Error deleting client:', error);
      throw error;
    }
  }

  /**
   * Get client stats
   */
  async getClientStats(clientId: string) {
    try {
      const invoices = await prisma.invoice.findMany({
        where: { clientId },
        select: {
          total: true,
          status: true,
        },
      });

      const totalRevenue = invoices.reduce(
        (sum: number, inv: any) => sum + Number(inv.total || 0),
        0
      );
      const totalInvoices = invoices.length;
      const totalPaid = invoices
        .filter((inv: any) => inv.status === 'paid')
        .reduce((sum: number, inv: any) => sum + Number(inv.total || 0), 0);
      const totalPending = invoices
        .filter((inv: any) => ['sent', 'overdue'].includes(inv.status))
        .reduce((sum: number, inv: any) => sum + Number(inv.total || 0), 0);

      return {
        totalRevenue,
        totalInvoices,
        totalPaid,
        totalPending,
      };
    } catch (error) {
      console.error('Error getting client stats:', error);
      return {
        totalRevenue: 0,
        totalInvoices: 0,
        totalPaid: 0,
        totalPending: 0,
      };
    }
  }

  /**
   * Get client by tax ID
   */
  async getClientByTaxId(taxId: string, taxIdType?: string) {
    try {
      const where: Prisma.ClientWhereInput = {
        taxId,
        ...(taxIdType && { taxIdType }),
      };

      const client = await prisma.client.findFirst({
        where,
        include: {
          invoices: {
            orderBy: { createdAt: 'desc' },
            take: 5,
          },
        },
      });

      if (!client) {
        return null;
      }

      const stats = await this.getClientStats(client.id);

      return {
        ...client,
        ...stats,
      };
    } catch (error) {
      console.error('Error fetching client by tax ID:', error);
      throw new Error('Failed to fetch client by tax ID');
    }
  }

  /**
   * Search clients
   */
  async searchClients(params: {
    userId: string;
    query?: string;
    filters?: {
      status?: string;
      tags?: string[];
      clientType?: string;
      currency?: string;
    };
    limit?: number;
    offset?: number;
  }) {
    const { userId, query, filters = {}, limit = 20, offset = 0 } = params;

    try {
      const where: Prisma.ClientWhereInput = {
        userId,
        ...(filters.status && { status: filters.status }),
        ...(filters.clientType && { clientType: filters.clientType }),
        ...(filters.currency && { currency: filters.currency }),
        ...(query && {
          OR: [
            { name: { contains: query, mode: 'insensitive' } },
            { email: { contains: query, mode: 'insensitive' } },
            { taxId: { contains: query, mode: 'insensitive' } },
          ],
        }),
      };

      const [clients, total] = await Promise.all([
        prisma.client.findMany({
          where,
          skip: offset,
          take: limit,
          orderBy: { createdAt: 'desc' },
        }),
        prisma.client.count({ where }),
      ]);

      return {
        success: true,
        data: {
          clients,
          total,
          limit,
          offset,
        },
      };
    } catch (error) {
      console.error('Error searching clients:', error);
      throw new Error('Failed to search clients');
    }
  }

  /**
   * Map field names from camelCase to snake_case
   */
  private mapFieldName(field: string): string {
    const fieldMap: Record<string, string> = {
      createdAt: 'createdAt',
      updatedAt: 'updatedAt',
      created_at: 'createdAt',
      updated_at: 'updatedAt',
      name: 'name',
      email: 'email',
      businessName: 'businessName',
      business_name: 'businessName',
    };
    return fieldMap[field] || 'createdAt';
  }
}

// Export singleton instance
export const clientService = new ClientService();