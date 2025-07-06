import { Request, Response } from 'express';
import { ClientManagementService } from '../../services/financial/client-management.service';
import { TransactionMatchingService } from '../../services/financial/transaction-matching.service';
import { logger } from '../../utils/log';
import { Client } from '../../models/financial/client.model';

export class ClientsController {
  private clientService: ClientManagementService;
  private transactionMatchingService: TransactionMatchingService | null = null;

  constructor() {
    this.clientService = new ClientManagementService();
  }

  setTransactionMatchingService(service: TransactionMatchingService) {
    this.transactionMatchingService = service;
  }

  /**
   * Create a new client
   * POST /api/financial/clients
   */
  async createClient(req: Request, res: Response): Promise<void> {
    try {
      const clientData: Partial<Client> = req.body;

      // Validate required fields
      if (!clientData.name || !clientData.email || !clientData.taxId) {
        res.status(400).json({
          success: false,
          error: 'Missing required fields: name, email, taxId'
        });
        return;
      }

      const client = await this.clientService.createClient(clientData);

      res.status(201).json({
        success: true,
        data: { client },
        message: 'Client created successfully'
      });

    } catch (error: any) {
      logger.error('Error creating client:', error);
      
      if (error.message.includes('already exists')) {
        res.status(409).json({
          success: false,
          error: error.message
        });
      } else {
        res.status(500).json({
          success: false,
          error: 'Failed to create client'
        });
      }
    }
  }

  /**
   * Get client by ID
   * GET /api/financial/clients/:id
   */
  async getClient(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const client = await this.clientService.getClient(id);

      if (!client) {
        res.status(404).json({
          success: false,
          error: 'Client not found'
        });
        return;
      }

      res.json({
        success: true,
        data: { client }
      });

    } catch (error: any) {
      logger.error('Error getting client:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get client'
      });
    }
  }

  /**
   * Get client by tax ID
   * GET /api/financial/clients/tax/:taxId
   */
  async getClientByTaxId(req: Request, res: Response): Promise<void> {
    try {
      const { taxId } = req.params;
      const { taxIdType } = req.query;

      const client = await this.clientService.getClientByTaxId(
        taxId, 
        taxIdType as string
      );

      if (!client) {
        res.status(404).json({
          success: false,
          error: 'Client not found'
        });
        return;
      }

      res.json({
        success: true,
        data: { client }
      });

    } catch (error: any) {
      logger.error('Error getting client by tax ID:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get client'
      });
    }
  }

  /**
   * Update client
   * PUT /api/financial/clients/:id
   */
  async updateClient(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const updates: Partial<Client> = req.body;

      // Remove fields that shouldn't be updated directly
      delete updates.id;
      delete updates.totalRevenue;
      delete updates.totalInvoices;
      delete updates.outstandingBalance;
      delete updates.createdAt;
      delete updates.updatedAt;

      const client = await this.clientService.updateClient(id, updates);

      res.json({
        success: true,
        data: { client },
        message: 'Client updated successfully'
      });

    } catch (error: any) {
      logger.error('Error updating client:', error);
      
      if (error.message === 'Client not found') {
        res.status(404).json({
          success: false,
          error: 'Client not found'
        });
      } else {
        res.status(500).json({
          success: false,
          error: 'Failed to update client'
        });
      }
    }
  }

  /**
   * List clients with filters
   * GET /api/financial/clients
   */
  async listClients(req: Request, res: Response): Promise<void> {
    try {
      const {
        status,
        search,
        tags,
        limit = '50',
        offset = '0',
        sortBy = 'created_at',
        sortOrder = 'DESC'
      } = req.query;

      // Parse tags if provided
      let parsedTags: string[] | undefined;
      if (tags) {
        try {
          parsedTags = typeof tags === 'string' ? JSON.parse(tags) : tags as string[];
        } catch (e) {
          res.status(400).json({
            success: false,
            error: 'Invalid tags format. Expected JSON array.'
          });
          return;
        }
      }

      const options = {
        status: status as string,
        search: search as string,
        tags: parsedTags,
        limit: parseInt(limit as string),
        offset: parseInt(offset as string),
        sortBy: sortBy as string,
        sortOrder: sortOrder as 'ASC' | 'DESC'
      };

      const result = await this.clientService.listClients(options);

      res.json({
        success: true,
        data: {
          clients: result.clients,
          pagination: {
            total: result.total,
            limit: options.limit,
            offset: options.offset,
            hasMore: result.total > (options.offset + options.limit)
          }
        }
      });

    } catch (error: any) {
      logger.error('Error listing clients:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to list clients'
      });
    }
  }

  /**
   * Get client statistics
   * GET /api/financial/clients/:id/stats
   */
  async getClientStats(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const stats = await this.clientService.getClientStats(id);

      res.json({
        success: true,
        data: { stats }
      });

    } catch (error: any) {
      logger.error('Error getting client stats:', error);
      
      if (error.message === 'Client not found') {
        res.status(404).json({
          success: false,
          error: 'Client not found'
        });
      } else {
        res.status(500).json({
          success: false,
          error: 'Failed to get client statistics'
        });
      }
    }
  }

  /**
   * Get client transactions
   * GET /api/financial/clients/:id/transactions
   */
  async getClientTransactions(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const {
        type,
        startDate,
        endDate,
        limit = '50',
        offset = '0'
      } = req.query;

      const options = {
        type: type as string,
        startDate: startDate ? new Date(startDate as string) : undefined,
        endDate: endDate ? new Date(endDate as string) : undefined,
        limit: parseInt(limit as string),
        offset: parseInt(offset as string)
      };

      const transactions = await this.clientService.getClientTransactions(id, options);

      res.json({
        success: true,
        data: {
          transactions,
          pagination: {
            limit: options.limit,
            offset: options.offset
          }
        }
      });

    } catch (error: any) {
      logger.error('Error getting client transactions:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get client transactions'
      });
    }
  }

  /**
   * Delete client
   * DELETE /api/financial/clients/:id
   */
  async deleteClient(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      await this.clientService.deleteClient(id);

      res.json({
        success: true,
        message: 'Client deleted successfully'
      });

    } catch (error: any) {
      logger.error('Error deleting client:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to delete client'
      });
    }
  }

  /**
   * Bulk operations
   * POST /api/financial/clients/bulk
   */
  async bulkOperations(req: Request, res: Response): Promise<void> {
    try {
      const { operation, clientIds, data } = req.body;

      if (!operation || !clientIds || !Array.isArray(clientIds)) {
        res.status(400).json({
          success: false,
          error: 'Missing required fields: operation, clientIds'
        });
        return;
      }

      const results = [];

      switch (operation) {
        case 'update_status':
          if (!data?.status) {
            res.status(400).json({
              success: false,
              error: 'Missing status for bulk update'
            });
            return;
          }

          for (const clientId of clientIds) {
            try {
              const client = await this.clientService.updateClient(clientId, {
                status: data.status
              });
              results.push({ clientId, success: true, client });
            } catch (error: any) {
              results.push({ clientId, success: false, error: error.message });
            }
          }
          break;

        case 'add_tags':
          if (!data?.tags || !Array.isArray(data.tags)) {
            res.status(400).json({
              success: false,
              error: 'Missing tags array for bulk operation'
            });
            return;
          }

          for (const clientId of clientIds) {
            try {
              const currentClient = await this.clientService.getClient(clientId);
              if (currentClient) {
                const updatedTags = [...(currentClient.tags || []), ...data.tags];
                const uniqueTags = [...new Set(updatedTags)];
                
                const client = await this.clientService.updateClient(clientId, {
                  tags: uniqueTags
                });
                results.push({ clientId, success: true, client });
              } else {
                results.push({ clientId, success: false, error: 'Client not found' });
              }
            } catch (error: any) {
              results.push({ clientId, success: false, error: error.message });
            }
          }
          break;

        default:
          res.status(400).json({
            success: false,
            error: 'Invalid operation. Supported: update_status, add_tags'
          });
          return;
      }

      res.json({
        success: true,
        data: { results },
        message: `Bulk ${operation} completed`
      });

    } catch (error: any) {
      logger.error('Error in bulk operations:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to perform bulk operations'
      });
    }
  }

  /**
   * Search clients with advanced filters
   * POST /api/financial/clients/search
   */
  async searchClients(req: Request, res: Response): Promise<void> {
    try {
      const {
        query,
        filters = {},
        limit = 50,
        offset = 0,
        sortBy = 'created_at',
        sortOrder = 'DESC'
      } = req.body;

      const searchOptions = {
        search: query,
        status: filters.status,
        tags: filters.tags,
        clientType: filters.clientType,
        currency: filters.currency,
        limit,
        offset,
        sortBy,
        sortOrder
      };

      const result = await this.clientService.listClients(searchOptions);

      res.json({
        success: true,
        data: {
          clients: result.clients,
          query,
          filters,
          pagination: {
            total: result.total,
            limit,
            offset,
            hasMore: result.total > (offset + limit)
          }
        }
      });

    } catch (error: any) {
      logger.error('Error searching clients:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to search clients'
      });
    }
  }

  /**
   * Get client linked transactions
   * GET /api/financial/clients/:id/linked-transactions
   */
  async getClientLinkedTransactions(req: Request, res: Response): Promise<void> {
    try {
      if (!this.transactionMatchingService) {
        res.status(503).json({
          success: false,
          error: 'Transaction matching service not initialized'
        });
        return;
      }

      const { id } = req.params;
      const { startDate, endDate } = req.query;

      const transactions = await this.transactionMatchingService.getClientTransactions(
        id,
        startDate ? new Date(startDate as string) : undefined,
        endDate ? new Date(endDate as string) : undefined
      );

      res.json({
        success: true,
        data: {
          transactions,
          count: transactions.length
        }
      });

    } catch (error: any) {
      logger.error('Error getting client linked transactions:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get client linked transactions'
      });
    }
  }

  /**
   * Get client transaction summary
   * GET /api/financial/clients/:id/transaction-summary
   */
  async getClientTransactionSummary(req: Request, res: Response): Promise<void> {
    try {
      if (!this.transactionMatchingService) {
        res.status(503).json({
          success: false,
          error: 'Transaction matching service not initialized'
        });
        return;
      }

      const { id } = req.params;

      const summary = await this.transactionMatchingService.getClientTransactionSummary(id);

      if (!summary) {
        res.status(404).json({
          success: false,
          error: 'Client not found or no transaction data'
        });
        return;
      }

      res.json({
        success: true,
        data: { summary }
      });

    } catch (error: any) {
      logger.error('Error getting client transaction summary:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get client transaction summary'
      });
    }
  }
}