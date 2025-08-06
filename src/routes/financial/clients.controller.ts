import { Request, Response } from 'express';
import { clientService } from '../../services/financial/client.service';
import { TransactionMatchingService } from '../../services/financial/transaction-matching.service';
import { logger } from '../../utils/log';
import type { Client, ClientFormData } from '../../types/financial';

export class ClientsController {
  private clientService = clientService;
  private transactionMatchingService: TransactionMatchingService | null = null;

  constructor() {
    // Using Prisma service now
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
      const clientData: ClientFormData = req.body;

      // Validate required fields
      if (!clientData.name) {
        res.status(400).json({
          success: false,
          error: 'Missing required field: name'
        });
        return;
      }

      const userId = (req as any).user?.userId || (req as any).userId;
      const result = await this.clientService.createClient(clientData, userId);

      res.status(201).json(result);

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
      const userId = (req as any).user?.userId || (req as any).userId;
      const result = await this.clientService.getClientById(id, userId);

      res.json(result);

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
      const userId = (req as any).user?.userId || (req as any).userId;
      const updates: Partial<ClientFormData> = req.body;

      // Remove fields that shouldn't be updated directly
      delete (updates as any).id;
      delete (updates as any).createdAt;
      delete (updates as any).updatedAt;

      const result = await this.clientService.updateClient(id, updates, userId);

      res.json(result);

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

      const userId = (req as any).user?.userId || (req as any).userId;
      const options = {
        userId,
        status: status as string,
        search: search as string,
        tags: parsedTags,
        limit: parseInt(limit as string),
        offset: parseInt(offset as string),
        sortBy: sortBy as string,
        sortOrder: sortOrder as 'ASC' | 'DESC'
      };

      const result = await this.clientService.getClients(options);

      res.json(result);

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
      const userId = (req as any).user?.userId || (req as any).userId;
      const result = await this.clientService.deleteClient(id, userId);

      res.json(result);

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
      const userId = (req as any).user?.userId || (req as any).userId;

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
              const result = await this.clientService.updateClient(clientId, {
                status: data.status
              }, userId);
              results.push({ clientId, success: true, client: result.data?.client });
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
                // Get existing tags from metadata
                const customFields = currentClient.customFields as any || {};
                const currentTags = currentClient.tags || [];
                const updatedTags = [...currentTags, ...data.tags];
                const uniqueTags = [...new Set(updatedTags)];
                
                const result = await this.clientService.updateClient(clientId, {
                  tags: uniqueTags
                }, userId);
                results.push({ clientId, success: true, client: result.data?.client });
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
          clients: result.data.clients,
          query,
          filters,
          pagination: {
            total: result.data.total,
            limit,
            offset,
            hasMore: result.data.total > (offset + limit)
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