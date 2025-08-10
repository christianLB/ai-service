import { prisma } from '../../lib/prisma';
import type { Prisma, Client } from '../../lib/prisma';
import type { ClientFormData } from '../../types/financial/index';
import { AppError } from '../../utils/errors';
import logger from '../../utils/logger';

export class ClientService {
  /**
   * Get all clients with pagination and filtering
   */
  async getClients(params: {
    userId: string;
    limit?: number;
    offset?: number;
    search?: string;
    status?: string;
    sortBy?: string;
    sortOrder?: 'ASC' | 'DESC';
  }) {
    const { userId, limit = 20, offset = 0, search, status, sortBy = 'created_at', sortOrder = 'DESC' } = params;

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
      logger.error('Error fetching clients:', error);
      throw new AppError('Failed to fetch clients', 500);
    }
  }

  /**
   * Get a single client by ID
   */
  async getClientById(clientId: string, userId: string) {
    try {
      const client = await prisma.client.findFirst({
        where: { id: clientId, userId },
        include: {
          invoices: {
            orderBy: { createdAt: 'desc' },
            take: 10,
          },
        },
      });

      if (!client) {
        throw new AppError('Client not found', 404);
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
      if (error instanceof AppError) {
        throw error;
      }
      logger.error('Error fetching client:', error);
      throw new AppError('Failed to fetch client', 500);
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
          customFields: data.metadata || {},
        },
      });

      logger.info(`Client created: ${client.id} by user ${userId}`);

      return {
        success: true,
        data: { client },
        message: 'Client created successfully',
      };
    } catch (error: any) {
      logger.error('Error creating client:', error);
      if (error.code === 'P2002') {
        throw new AppError('A client with this email or tax ID already exists', 409);
      }
      throw new AppError('Failed to create client', 500);
    }
  }

  /**
   * Update a client
   */
  async updateClient(clientId: string, updates: Partial<ClientFormData>, userId: string) {
    try {
      // Check if client exists and belongs to user
      const existing = await prisma.client.findFirst({
        where: { id: clientId, userId },
      });

      if (!existing) {
        throw new AppError('Client not found', 404);
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

      logger.info(`Client updated: ${clientId} by user ${userId}`);

      return {
        success: true,
        data: { client },
        message: 'Client updated successfully',
      };
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      logger.error('Error updating client:', error);
      throw new AppError('Failed to update client', 500);
    }
  }

  /**
   * Delete a client
   */
  async deleteClient(clientId: string, userId: string) {
    try {
      // Check if client exists and belongs to user
      const client = await prisma.client.findFirst({
        where: { id: clientId, userId },
        include: {
          invoices: {
            select: { id: true },
          },
        },
      });

      if (!client) {
        throw new AppError('Client not found', 404);
      }

      // Check if client has invoices
      if (client.invoices.length > 0) {
        throw new AppError('Cannot delete client with existing invoices', 400);
      }

      // Delete client
      await prisma.client.delete({
        where: { id: clientId },
      });

      logger.info(`Client deleted: ${clientId} by user ${userId}`);

      return {
        success: true,
        message: 'Client deleted successfully',
      };
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      logger.error('Error deleting client:', error);
      throw new AppError('Failed to delete client', 500);
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

      const totalRevenue = invoices.reduce((sum: number, inv: any) => sum + Number(inv.total || 0), 0);
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
      logger.error('Error getting client stats:', error);
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
      logger.error('Error fetching client by tax ID:', error);
      throw new AppError('Failed to fetch client by tax ID', 500);
    }
  }

  /**
   * Get client transactions
   * Note: Currently the schema doesn't directly link transactions to clients
   * This would need to be implemented through invoices or a separate relation
   */
  async getClientTransactions(clientId: string, options?: {
    type?: string;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
    offset?: number;
  }) {
    try {
      const { type, startDate, endDate, limit = 50, offset = 0 } = options || {};

      // TODO: Implement proper client transaction linking
      // For now, we can get transactions through invoices
      const client = await prisma.client.findUnique({
        where: { id: clientId },
        include: {
          invoices: {
            where: {
              status: 'paid',
              ...(startDate || endDate ? {
                paidAt: {
                  ...(startDate && { gte: startDate }),
                  ...(endDate && { lte: endDate }),
                },
              } : {}),
            },
            skip: offset,
            take: limit,
            orderBy: { paidDate: 'desc' },
          },
        },
      });

      if (!client) {
        throw new AppError('Client not found', 404);
      }

      // Transform invoices to transaction-like structure
      const transactions = client.invoices.map((invoice: any) => ({
        id: invoice.id,
        type: 'invoice_payment',
        amount: invoice.total,
        currency: invoice.currency,
        description: `Payment for invoice ${invoice.invoiceNumber}`,
        date: invoice.paidAt || invoice.createdAt,
        clientId: clientId,
        invoiceId: invoice.id,
      }));

      return transactions;
    } catch (error) {
      logger.error('Error fetching client transactions:', error);
      throw new AppError('Failed to fetch client transactions', 500);
    }
  }

  /**
   * Alias for getClients to match controller expectations
   */
  async listClients(params: any) {
    return this.getClients(params);
  }

  /**
   * Get single client (simple wrapper for getClientById without userId requirement)
   */
  async getClient(clientId: string) {
    try {
      const client = await prisma.client.findUnique({
        where: { id: clientId },
        include: {
          invoices: {
            orderBy: { createdAt: 'desc' },
            take: 10,
          },
        },
      });

      if (!client) {
        throw new AppError('Client not found', 404);
      }

      const stats = await this.getClientStats(clientId);

      return {
        ...client,
        ...stats,
      };
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      logger.error('Error fetching client:', error);
      throw new AppError('Failed to fetch client', 500);
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
        // Tags filtering would need to be implemented via metadata field
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
      logger.error('Error searching clients:', error);
      throw new AppError('Failed to search clients', 500);
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