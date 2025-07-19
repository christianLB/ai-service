import { z } from 'zod';
import { MCPTool } from '../types/mcp.types';
import { aiServiceClient as aiServiceAPI } from '../utils/ai-service-client';
import logger from '../utils/logger';

// Schema definitions
const TradeDashboardSchema = z.object({});

const ExecuteTradeSchema = z.object({
  exchange: z.enum(['binance', 'coinbase', 'kraken']),
  symbol: z.string().describe('Trading pair symbol (e.g., BTC/USDT)'),
  side: z.enum(['buy', 'sell']),
  amount: z.number().positive(),
  type: z.enum(['market', 'limit']).default('market').optional(),
  price: z.number().positive().optional(),
  strategyId: z.string().optional(),
});

const AnalyzeMarketSchema = z.object({
  exchange: z.string(),
  symbol: z.string(),
  timeframe: z.enum(['1m', '5m', '15m', '30m', '1h', '4h', '1d']).default('1h').optional(),
});

const ManageStrategySchema = z.object({
  strategyId: z.string(),
  action: z.enum(['start', 'stop', 'pause', 'configure']),
  parameters: z.record(z.any()).optional(),
});

const GetPositionsSchema = z.object({
  status: z.enum(['open', 'closed', 'all']).default('open').optional(),
  symbol: z.string().optional(),
});

const ClosePositionSchema = z.object({
  positionId: z.string(),
  reason: z.string().default('manual_close').optional(),
});

const UpdatePositionRiskSchema = z.object({
  positionId: z.string(),
  stopLoss: z.number().optional(),
  takeProfit: z.number().optional(),
});

const RunBacktestSchema = z.object({
  strategyId: z.string(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  symbols: z.array(z.string()),
  initialCapital: z.number().default(10000).optional(),
});

const GetPerformanceSchema = z.object({
  timeRange: z.enum(['1D', '1W', '1M', '3M', '6M', '1Y', 'ALL']).default('1M').optional(),
  strategyId: z.string().optional(),
});

const EmergencyStopSchema = z.object({
  closePositions: z.boolean().default(false).optional(),
  reason: z.string(),
});

const GetSignalsSchema = z.object({
  limit: z.number().default(50).optional(),
  strategyId: z.string().optional(),
});

// Risk validation helper
async function validateTrade(params: any): Promise<{ approved: boolean; reason?: string }> {
  try {
    const dashboard = await aiServiceAPI.get('/trading/dashboard/overview');
    const portfolioValue = dashboard.portfolio.totalValue;
    const maxPositionSize = 0.1; // 10% max position size
    
    // Get current price
    const priceResponse = await aiServiceAPI.get(`/trading/price/${params.exchange}/${params.symbol}`);
    const proposedSize = params.amount * priceResponse.price;
    
    if (proposedSize > portfolioValue * maxPositionSize) {
      return {
        approved: false,
        reason: `Position size exceeds maximum allowed (${maxPositionSize * 100}% of portfolio)`
      };
    }
    
    return { approved: true };
  } catch (error) {
    logger.error('Trade validation error', { error });
    return { approved: false, reason: 'Unable to validate trade' };
  }
}

// Trading tools
export const tradingTools: MCPTool[] = [
  {
    name: 'get_trading_dashboard',
    description: 'Get comprehensive trading dashboard overview including portfolio value, P&L, positions, and strategy status',
    category: 'trading',
    requiresAuth: true,
    inputSchema: TradeDashboardSchema,
    handler: async () => {
      logger.info('Getting trading dashboard');
      const result = await aiServiceAPI.get('/trading/dashboard/overview');
      return { success: true, data: result };
    },
  },
  {
    name: 'execute_trade',
    description: 'Execute a trade with automatic risk management validation',
    category: 'trading',
    requiresAuth: true,
    inputSchema: ExecuteTradeSchema,
    handler: async (params) => {
      logger.info('Executing trade', { params });
      
      // Validate trade
      const validation = await validateTrade(params);
      if (!validation.approved) {
        return { 
          success: false, 
          error: validation.reason 
        };
      }
      
      const result = await aiServiceAPI.post('/trading/execute', params);
      return { success: true, data: result };
    },
  },
  {
    name: 'analyze_market',
    description: 'Get AI-powered market analysis for a trading pair including technical indicators, sentiment, and trade recommendations',
    category: 'trading',
    requiresAuth: true,
    inputSchema: AnalyzeMarketSchema,
    handler: async (params) => {
      logger.info('Analyzing market', { params });
      const result = await aiServiceAPI.post('/trading/analyze', params);
      return { success: true, data: result };
    },
  },
  {
    name: 'manage_strategy',
    description: 'Start, stop, pause, or configure a trading strategy',
    category: 'trading',
    requiresAuth: true,
    inputSchema: ManageStrategySchema,
    handler: async (params) => {
      logger.info('Managing strategy', { params });
      const { strategyId, action, parameters } = params;
      const result = await aiServiceAPI.post(
        `/trading/strategies/${strategyId}/${action}`,
        parameters || {}
      );
      return { success: true, data: result };
    },
  },
  {
    name: 'get_positions',
    description: 'Get current trading positions with P&L, entry/exit prices, and risk metrics',
    category: 'trading',
    requiresAuth: true,
    inputSchema: GetPositionsSchema,
    handler: async (params) => {
      logger.info('Getting positions', { params });
      const queryParams = new URLSearchParams();
      if (params.status) queryParams.append('status', params.status);
      if (params.symbol) queryParams.append('symbol', params.symbol);
      
      const result = await aiServiceAPI.get(`/trading/positions?${queryParams}`);
      return { success: true, data: result };
    },
  },
  {
    name: 'close_position',
    description: 'Close an open trading position at market price',
    category: 'trading',
    requiresAuth: true,
    inputSchema: ClosePositionSchema,
    handler: async (params) => {
      logger.info('Closing position', { params });
      const result = await aiServiceAPI.post(
        `/trading/positions/close/${params.positionId}`,
        { reason: params.reason }
      );
      return { success: true, data: result };
    },
  },
  {
    name: 'update_position_risk',
    description: 'Update stop loss and take profit levels for an open position',
    category: 'trading',
    requiresAuth: true,
    inputSchema: UpdatePositionRiskSchema,
    handler: async (params) => {
      logger.info('Updating position risk', { params });
      const { positionId, ...updates } = params;
      const result = await aiServiceAPI.put(
        `/trading/positions/${positionId}/sl-tp`,
        updates
      );
      return { success: true, data: result };
    },
  },
  {
    name: 'run_backtest',
    description: 'Run a strategy backtest on historical data',
    category: 'trading',
    requiresAuth: true,
    inputSchema: RunBacktestSchema,
    handler: async (params) => {
      logger.info('Running backtest', { params });
      const result = await aiServiceAPI.post('/trading/backtest/run', params);
      return { success: true, data: result };
    },
  },
  {
    name: 'get_performance_metrics',
    description: 'Get detailed performance metrics including Sharpe ratio, drawdown, win rate, and P&L breakdown',
    category: 'trading',
    requiresAuth: true,
    inputSchema: GetPerformanceSchema,
    handler: async (params) => {
      logger.info('Getting performance metrics', { params });
      const queryParams = new URLSearchParams();
      if (params.timeRange) queryParams.append('timeRange', params.timeRange);
      if (params.strategyId) queryParams.append('strategyId', params.strategyId);
      
      const result = await aiServiceAPI.get(`/trading/performance/metrics?${queryParams}`);
      return { success: true, data: result };
    },
  },
  {
    name: 'emergency_stop_trading',
    description: 'Emergency stop all trading activities and optionally close all positions',
    category: 'trading',
    requiresAuth: true,
    inputSchema: EmergencyStopSchema,
    handler: async (params) => {
      logger.info('Emergency stop trading', { params });
      
      const result = await aiServiceAPI.post('/trading/emergency/stop-all', {
        reason: params.reason
      });
      
      if (params.closePositions) {
        await aiServiceAPI.post('/trading/positions/close-all', {
          reason: `Emergency stop: ${params.reason}`
        });
      }
      
      return { success: true, data: result };
    },
  },
  {
    name: 'get_trading_signals',
    description: 'Get recent trading signals from all active strategies',
    category: 'trading',
    requiresAuth: true,
    inputSchema: GetSignalsSchema,
    handler: async (params) => {
      logger.info('Getting trading signals', { params });
      const queryParams = new URLSearchParams();
      queryParams.append('limit', params.limit?.toString() || '50');
      if (params.strategyId) queryParams.append('strategyId', params.strategyId);
      
      const result = await aiServiceAPI.get(`/trading/signals?${queryParams}`);
      return { success: true, data: result };
    },
  },
  {
    name: 'get_risk_metrics',
    description: 'Get current risk metrics including exposure, drawdown, and risk limits',
    category: 'trading',
    requiresAuth: true,
    inputSchema: z.object({}),
    handler: async () => {
      logger.info('Getting risk metrics');
      const result = await aiServiceAPI.get('/trading/risk/metrics');
      return { success: true, data: result };
    },
  },
];