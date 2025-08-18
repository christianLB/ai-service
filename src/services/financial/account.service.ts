/**
 * Account Service - Manages bank account operations
 * Uses Prisma for database operations
 */
import { Pool } from 'pg';
import { PrismaClient } from '@prisma/client';
import { logger } from '../../utils/log';

const prisma = new PrismaClient();

export interface AccountListOptions {
  page?: number;
  limit?: number;
  bankName?: string;
}

export interface AccountListResult {
  data: unknown[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export class AccountService {
  constructor(private pool: Pool) {}

  /**
   * List all bank accounts with pagination
   */
  async list(options: AccountListOptions): Promise<AccountListResult> {
    const page = options.page || 1;
    const limit = options.limit || 20;
    const skip = (page - 1) * limit;

    try {
      const [accounts, total] = await Promise.all([
        prisma.account.findMany({
          where: options.bankName ? { bankName: options.bankName } : undefined,
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' },
        }),
        prisma.account.count({
          where: options.bankName ? { bankName: options.bankName } : undefined,
        }),
      ]);

      return {
        data: accounts,
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      };
    } catch (error) {
      logger.error('Error listing accounts:', error);
      throw error;
    }
  }

  /**
   * Get account by ID
   */
  async getById(id: string): Promise<unknown | null> {
    try {
      const account = await prisma.account.findUnique({
        where: { id },
        include: {
          transactions: {
            take: 10,
            orderBy: { date: 'desc' },
          },
        },
      });
      return account;
    } catch (error) {
      logger.error('Error getting account:', error);
      throw error;
    }
  }

  /**
   * Create a new bank account
   */
  async create(data: unknown): Promise<unknown> {
    try {
      const account = await prisma.account.create({
        data,
      });
      return account;
    } catch (error) {
      logger.error('Error creating account:', error);
      throw error;
    }
  }

  /**
   * Update an existing account
   */
  async update(id: string, data: unknown): Promise<unknown | null> {
    try {
      const account = await prisma.account.update({
        where: { id },
        data,
      });
      return account;
    } catch (error) {
      if ((error as any).code === 'P2025') {
        return null; // Record not found
      }
      logger.error('Error updating account:', error);
      throw error;
    }
  }

  /**
   * Delete an account
   */
  async delete(id: string): Promise<boolean> {
    try {
      await prisma.account.delete({
        where: { id },
      });
      return true;
    } catch (error) {
      if ((error as any).code === 'P2025') {
        return false; // Record not found
      }
      logger.error('Error deleting account:', error);
      throw error;
    }
  }
}