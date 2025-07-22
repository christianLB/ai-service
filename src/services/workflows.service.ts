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

const MODEL_NAME = Prisma.ModelName.workflows;

export class WorkflowsService {
  /**
   * Get all workflows with pagination and filtering
   */
  async getAll(query: WorkflowsQuery, userId?: string) {
    try {
      const { page, limit, search, sortBy = 'created_at', sortOrder = 'desc' } = query;
      const skip = (page - 1) * limit;

      // Build where clause
      const where: Prisma.workflowsWhereInput = {
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
      throw new AppError('Failed to fetch workflows', 500);
    }
  }

  /**
   * Get a single workflow by ID
   */
  async getById(id: string, userId?: string): Promise<WorkflowsWithRelations | null> {
    try {
      const workflow = await prisma.workflows.findFirst({
        where: { 
          id,
        },
        include: {
          executions: true,
        },
      });

      if (!workflow) {
        throw new AppError('Workflow not found', 404);
      }

      return workflow;
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Error in WorkflowsService.getById:', error);
      throw new AppError('Failed to fetch workflow', 500);
    }
  }

  /**
   * Create a new workflow
   */
  async create(data: CreateWorkflows, userId?: string) {
    try {
      const workflow = await prisma.workflows.create({
        data: {
          ...data,
        },
      });

      logger.info(`Workflow created: ${workflow.id}`);
      return workflow;
    } catch (error) {
      logger.error('Error in WorkflowsService.create:', error);
      if ((error as any).code === 'P2002') {
        throw new AppError('Workflow with this data already exists', 409);
      }
      throw new AppError('Failed to create workflow', 500);
    }
  }

  /**
   * Update a workflow
   */
  async update(id: string, data: UpdateWorkflows, userId?: string) {
    try {
      // Check if exists
      const existing = await this.getById(id, userId);
      if (!existing) {
        throw new AppError('Workflow not found', 404);
      }

      const workflow = await prisma.workflows.update({
        where: { id },
        data,
      });

      logger.info(`Workflow updated: ${id}`);
      return workflow;
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Error in WorkflowsService.update:', error);
      throw new AppError('Failed to update workflow', 500);
    }
  }

  /**
   * Delete a workflow
   */
  async delete(id: string, userId?: string): Promise<void> {
    try {
      // Check if exists
      const existing = await this.getById(id, userId);
      if (!existing) {
        throw new AppError('Workflow not found', 404);
      }

      await prisma.workflows.delete({
        where: { id },
      });

      logger.info(`Workflow deleted: ${id}`);
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Error in WorkflowsService.delete:', error);
      throw new AppError('Failed to delete workflow', 500);
    }
  }
}

// Export singleton instance
export const workflowsService = new WorkflowsService();