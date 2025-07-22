import { prisma } from '../lib/prisma';
import { 
  Accounts, 
  CreateAccounts, 
  UpdateAccounts,
  AccountsQuery,
  AccountsWithRelations
} from '../types/accounts.types';
import { Prisma } from '@prisma/client';
import { AppError } from '../utils/errors';
import logger from '../utils/logger';

const MODEL_NAME = Prisma.ModelName.accounts;

export class AccountsService {
  /**
   * Get all accountss with pagination and filtering
   */
  async getAll(query: AccountsQuery, userId?: string) {
    try {
      const { page, limit, search, sortBy = 'createdAt', sortOrder = 'desc' } = query;
      const skip = (page - 1) * limit;

      // Build where clause
      const where: Prisma.accountsWhereInput = {
        ...(search && {
          OR: [
            { name: { contains: search, mode: 'insensitive' } },
                      ],
        }),
      };

      // Execute queries in parallel
      const [items, total] = await Promise.all([
        prisma.accounts.findMany({
          where,
          skip,
          take: limit,
          orderBy: { [sortBy]: sortOrder },
          include: {
          },
        }),
        prisma.accounts.count({ where }),
      ]);

      return {
        items,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      };
    } catch (error) {
      logger.error('Error in AccountsService.getAll:', error);
      throw new AppError('Failed to fetch accountss', 500);
    }
  }

  /**
   * Get a single accounts by ID
   */
  async getById(id: string, userId?: string): Promise<AccountsWithRelations | null> {
    try {
      const accounts = await prisma.accounts.findFirst({
        where: { 
          id,
        },
        include: {
        },
      });

      if (!accounts) {
        throw new AppError('Accounts not found', 404);
      }

      return accounts;
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Error in AccountsService.getById:', error);
      throw new AppError('Failed to fetch accounts', 500);
    }
  }

  /**
   * Create a new accounts
   */
  async create(data: CreateAccounts, userId?: string): Promise<Accounts> {
    try {

      const accounts = await prisma.accounts.create({
        data: {
          ...data,
        },
      });

      logger.info(`Accounts created: ${ accounts.id }`);
      return accounts;
    } catch (error) {
      logger.error('Error in AccountsService.create:', error);
      if (error.code === 'P2002') {
        throw new AppError('Accounts with this data already exists', 409);
      }
      throw new AppError('Failed to create accounts', 500);
    }
  }

  /**
   * Update a accounts
   */
  async update(id: string, data: UpdateAccounts, userId?: string): Promise<Accounts> {
    try {
      // Check if exists and user has permission
      const existing = await this.getById(id, userId);
      if (!existing) {
        throw new AppError('Accounts not found', 404);
      }

      const accounts = await prisma.accounts.update({
        where: { id },
        data: {
          ...data,
          id: undefined, // Remove id from data
        },
      });

      logger.info(`Accounts updated: ${id}`);
      return accounts;
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Error in AccountsService.update:', error);
      throw new AppError('Failed to update accounts', 500);
    }
  }

  /**
   * Delete a accounts
   */
  async delete(id: string, userId?: string): Promise<void> {
    try {
      // Check if exists and user has permission
      const existing = await this.getById(id, userId);
      if (!existing) {
        throw new AppError('Accounts not found', 404);
      }


      await prisma.accounts.delete({
        where: { id },
      });

      logger.info(`Accounts deleted: ${id}`);
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Error in AccountsService.delete:', error);
      throw new AppError('Failed to delete accounts', 500);
    }
  }



}

// Export singleton instance
export const accountsService = new AccountsService();