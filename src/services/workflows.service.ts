import { prisma } from '../lib/prisma';
import { 
  Workflows, 
  CreateWorkflows, 
  UpdateWorkflows,
  WorkflowsQuery,
  WorkflowsWithRelations
} from '../types/workflows.types';
import { Prisma } from '@prisma/client';
import { AppError } from '../utils/errors';
import logger from '../utils/logger';

const MODEL_NAME = Prisma.ModelName.Workflows;

export class WorkflowsService {
  /**
   * Get all workflowss with pagination and filtering
   */
  async getAll(query: WorkflowsQuery, userId?: string) {
    try {
      const { page, limit, search, sortBy = 'createdAt', sortOrder = 'desc' } = query;
      const skip = (page - 1) * limit;

      // Build where clause
      const where: Prisma.WorkflowsWhereInput = {
        ...(search && {
          OR: [
            { name: { contains: search, mode: 'insensitive' } },
                      ],
        }),
      };

      // Execute queries in parallel
      const [items, total] = await Promise.all([
        prisma.workflows.findMany({
          where,
          skip,
          take: limit,
          orderBy: { [sortBy]: sortOrder },
          include: {
            executions: true,
          },
        }),
        prisma.workflows.count({ where }),
      ]);

      return {
        items,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      };
    } catch (error) {
      logger.error('Error in WorkflowsService.getAll:', error);
      throw new AppError('Failed to fetch workflowss', 500);
    }
  }

  /**
   * Get a single workflows by ID
   */
  async getById(id: string, userId?: string): Promise<WorkflowsWithRelations | null> {
    try {
      const workflows = await prisma.workflows.findFirst({
        where: { 
          id,
        },
        include: {
          executions: true,
        },
      });

      if (!workflows) {
        throw new AppError('Workflows not found', 404);
      }

      return workflows;
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Error in WorkflowsService.getById:', error);
      throw new AppError('Failed to fetch workflows', 500);
    }
  }

  /**
   * Create a new workflows
   */
  async create(data: CreateWorkflows, userId?: string): Promise<Workflows> {
    try {

      const workflows = await prisma.workflows.create({
        data: {
          ...data,
        },
      });

      logger.info(`Workflows created: ${ workflows.id }`);
      return workflows;
    } catch (error) {
      logger.error('Error in WorkflowsService.create:', error);
      if (error.code === 'P2002') {
        throw new AppError('Workflows with this data already exists', 409);
      }
      throw new AppError('Failed to create workflows', 500);
    }
  }

  /**
   * Update a workflows
   */
  async update(id: string, data: UpdateWorkflows, userId?: string): Promise<Workflows> {
    try {
      // Check if exists and user has permission
      const existing = await this.getById(id, userId);
      if (!existing) {
        throw new AppError('Workflows not found', 404);
      }

      const workflows = await prisma.workflows.update({
        where: { id },
        data: {
          ...data,
          id: undefined, // Remove id from data
        },
      });

      logger.info(`Workflows updated: ${id}`);
      return workflows;
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Error in WorkflowsService.update:', error);
      throw new AppError('Failed to update workflows', 500);
    }
  }

  /**
   * Delete a workflows
   */
  async delete(id: string, userId?: string): Promise<void> {
    try {
      // Check if exists and user has permission
      const existing = await this.getById(id, userId);
      if (!existing) {
        throw new AppError('Workflows not found', 404);
      }


      await prisma.workflows.delete({
        where: { id },
      });

      logger.info(`Workflows deleted: ${id}`);
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Error in WorkflowsService.delete:', error);
      throw new AppError('Failed to delete workflows', 500);
    }
  }



}

// Export singleton instance
export const workflowsService = new WorkflowsService();