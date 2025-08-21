import { PrismaClient } from '@prisma/client';
import { Logger } from '../../utils/logger';

const logger = new Logger('TransactionManagementService');
const prisma = new PrismaClient();

export class TransactionManagementService {
  /**
   * Delete a transaction permanently
   * @param transactionId - The ID of the transaction to delete
   * @param userId - The ID of the user performing the deletion
   * @returns Promise<void>
   * @throws Error if transaction not found
   */
  async deleteTransaction(transactionId: string, userId: string): Promise<void> {
    try {
      logger.info(`Attempting to delete transaction ${transactionId} by user ${userId}`);

      // First, verify the transaction exists
      const transaction = await prisma.transactions.findUnique({
        where: { id: transactionId },
      });

      if (!transaction) {
        throw new Error('Transaction not found');
      }

      // Delete related records first (due to foreign key constraints)
      // Delete client transaction links
      await prisma.client_transaction_links.deleteMany({
        where: { transaction_id: transactionId },
      });

      // Delete transaction categorizations
      await prisma.transaction_categorizations.deleteMany({
        where: { transaction_id: transactionId },
      });

      // Perform the deletion
      await prisma.transactions.delete({
        where: { id: transactionId },
      });

      // Log the deletion for audit purposes
      logger.info(`Transaction ${transactionId} successfully deleted by user ${userId}`, {
        transactionId,
        userId,
        amount: transaction.amount,
        date: transaction.date,
        description: transaction.description,
      });
    } catch (error) {
      logger.error(`Failed to delete transaction ${transactionId}`, error);
      throw error;
    }
  }

  /**
   * Get a single transaction by ID
   * @param transactionId - The ID of the transaction
   * @returns Promise<Transaction | null>
   */
  async getTransaction(transactionId: string) {
    return prisma.transactions.findUnique({
      where: { id: transactionId },
    });
  }
}

// Export singleton instance
export const transactionManagementService = new TransactionManagementService();
