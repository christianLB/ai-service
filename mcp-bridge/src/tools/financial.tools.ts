import { z } from 'zod';
import { MCPTool } from '../types/mcp.types';
import { aiServiceClient } from '../utils/ai-service-client';

// Get Financial Summary Tool
export const getFinancialSummaryTool: MCPTool = {
  name: 'get_financial_summary',
  description: 'Get a comprehensive financial summary including balance, recent transactions, and key metrics',
  category: 'financial',
  requiresAuth: true,
  inputSchema: z.object({
    period: z.enum(['day', 'week', 'month', 'year']).optional().describe('Time period for the summary'),
  }),
  handler: async (params) => {
    try {
      const data = await aiServiceClient.getFinancialSummary(params.period);
      return {
        success: true,
        data,
        metadata: {
          duration: 0,
          cached: false,
        },
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
      };
    }
  },
};

// Get Account Balance Tool
export const getAccountBalanceTool: MCPTool = {
  name: 'get_account_balance',
  description: 'Get current balance and details for all financial accounts',
  category: 'financial',
  requiresAuth: true,
  inputSchema: z.object({}),
  handler: async () => {
    try {
      const accounts = await aiServiceClient.getAccounts();
      return {
        success: true,
        data: {
          accounts,
          totalBalance: accounts.reduce((sum: number, acc: any) => sum + (acc.balance || 0), 0),
        },
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
      };
    }
  },
};

// Analyze Expenses Tool
export const analyzeExpensesTool: MCPTool = {
  name: 'analyze_expenses',
  description: 'Analyze expenses by category with trends and insights',
  category: 'financial',
  requiresAuth: true,
  inputSchema: z.object({
    startDate: z.string().optional().describe('Start date in YYYY-MM-DD format'),
    endDate: z.string().optional().describe('End date in YYYY-MM-DD format'),
    category: z.string().optional().describe('Filter by specific category'),
  }),
  handler: async (params) => {
    try {
      const data = await aiServiceClient.analyzeExpenses(params);
      return {
        success: true,
        data,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
      };
    }
  },
};

// Get Transactions Tool
export const getTransactionsTool: MCPTool = {
  name: 'get_transactions',
  description: 'Get financial transactions with optional filters',
  category: 'financial',
  requiresAuth: true,
  inputSchema: z.object({
    limit: z.number().min(1).max(100).optional().default(20).describe('Number of transactions to return'),
    offset: z.number().min(0).optional().default(0).describe('Offset for pagination'),
    accountId: z.string().optional().describe('Filter by account ID'),
    category: z.string().optional().describe('Filter by category'),
    startDate: z.string().optional().describe('Start date in YYYY-MM-DD format'),
    endDate: z.string().optional().describe('End date in YYYY-MM-DD format'),
    minAmount: z.number().optional().describe('Minimum transaction amount'),
    maxAmount: z.number().optional().describe('Maximum transaction amount'),
  }),
  handler: async (params) => {
    try {
      const data = await aiServiceClient.getTransactions(params);
      return {
        success: true,
        data,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
      };
    }
  },
};

// Create Invoice Tool
export const createInvoiceTool: MCPTool = {
  name: 'create_invoice',
  description: 'Create a new invoice with auto-generated number',
  category: 'financial',
  requiresAuth: true,
  inputSchema: z.object({
    clientName: z.string().describe('Name of the client'),
    clientEmail: z.string().email().optional().describe('Client email address'),
    items: z.array(z.object({
      description: z.string(),
      quantity: z.number().positive(),
      unitPrice: z.number().positive(),
      taxRate: z.number().min(0).max(1).optional().default(0.21),
    })).describe('Invoice line items'),
    currency: z.enum(['EUR', 'USD']).optional().default('EUR'),
    dueDate: z.string().optional().describe('Due date in YYYY-MM-DD format'),
    notes: z.string().optional().describe('Additional notes'),
  }),
  handler: async (params) => {
    try {
      const data = await aiServiceClient.createInvoice(params);
      return {
        success: true,
        data,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
      };
    }
  },
};

// Categorize Transaction Tool
export const categorizeTransactionTool: MCPTool = {
  name: 'categorize_transaction',
  description: 'Categorize a specific transaction using AI or manual category',
  category: 'financial',
  requiresAuth: true,
  inputSchema: z.object({
    transactionId: z.string().describe('ID of the transaction to categorize'),
    category: z.string().describe('Category to assign'),
    subcategory: z.string().optional().describe('Optional subcategory'),
  }),
  handler: async (params) => {
    try {
      const data = await aiServiceClient.categorizeTransaction(
        params.transactionId,
        params.category
      );
      return {
        success: true,
        data,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
      };
    }
  },
};

// Auto-categorize Transactions Tool
export const autoCategorizeTransactionsTool: MCPTool = {
  name: 'auto_categorize_transactions',
  description: 'Automatically categorize all uncategorized transactions using AI',
  category: 'financial',
  requiresAuth: true,
  rateLimit: {
    maxPerMinute: 5,
    maxPerHour: 20,
  },
  inputSchema: z.object({
    limit: z.number().min(1).max(100).optional().default(50).describe('Maximum number of transactions to process'),
  }),
  handler: async (_params) => {
    try {
      const data = await aiServiceClient.autoCategorizeTransactions();
      return {
        success: true,
        data,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
      };
    }
  },
};

// Generate Financial Report Tool
export const generateFinancialReportTool: MCPTool = {
  name: 'generate_financial_report',
  description: 'Generate a comprehensive financial report in PDF format',
  category: 'financial',
  requiresAuth: true,
  rateLimit: {
    maxPerMinute: 2,
    maxPerHour: 10,
  },
  inputSchema: z.object({
    type: z.enum(['monthly', 'quarterly', 'yearly', 'custom']).describe('Type of report'),
    startDate: z.string().optional().describe('Start date for custom reports'),
    endDate: z.string().optional().describe('End date for custom reports'),
    includeCharts: z.boolean().optional().default(true).describe('Include visual charts'),
    includeForecast: z.boolean().optional().default(false).describe('Include cashflow forecast'),
  }),
  handler: async (params) => {
    try {
      const data = await aiServiceClient.generateReport(params.type, params);
      return {
        success: true,
        data,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
      };
    }
  },
};

// Sync Financial Data Tool
export const syncFinancialDataTool: MCPTool = {
  name: 'sync_financial_data',
  description: 'Manually trigger synchronization of bank data via GoCardless',
  category: 'financial',
  requiresAuth: true,
  rateLimit: {
    maxPerMinute: 1,
    maxPerHour: 5,
  },
  inputSchema: z.object({}),
  handler: async () => {
    try {
      const data = await aiServiceClient.syncFinancialData();
      return {
        success: true,
        data,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
      };
    }
  },
};

// Export all financial tools
export const financialTools: MCPTool[] = [
  getFinancialSummaryTool,
  getAccountBalanceTool,
  analyzeExpensesTool,
  getTransactionsTool,
  createInvoiceTool,
  categorizeTransactionTool,
  autoCategorizeTransactionsTool,
  generateFinancialReportTool,
  syncFinancialDataTool,
];