import { Request, Response } from 'express';
import { Logger } from '../../../utils/logger';

const logger = new Logger('DashboardController');

class DashboardController {
  async getOverview(req: Request, res: Response) {
    try {
      // Mock data for now
      const overview = {
        portfolio: {
          totalValue: 150000,
          dailyPnL: 2500,
          weeklyPnL: 8000,
          monthlyPnL: 15000,
          exposure: {
            BTC: 40,
            ETH: 30,
            BNB: 20,
            OTHER: 10
          }
        },
        positions: {
          open: 5,
          profitable: 3,
          losing: 2,
          totalPnL: 12500
        },
        strategies: {
          active: 2,
          paused: 1,
          stopped: 1,
          performance: {
            'trend-following': 8.5,
            'market-making': 5.2
          }
        },
        marketOverview: {
          btcPrice: 68500,
          btcChange24h: 2.5,
          marketCap: 1.35e12,
          fearGreedIndex: 72
        },
        alerts: [
          {
            id: '1',
            type: 'info',
            message: 'Market volatility increasing',
            timestamp: new Date()
          }
        ]
      };

      res.json(overview);
    } catch (error) {
      logger.error('Failed to get dashboard overview', error);
      res.status(500).json({ error: 'Failed to get dashboard overview' });
    }
  }

  async getMetrics(req: Request, res: Response) {
    try {
      const metrics = {
        totalReturn: 25.5,
        sharpeRatio: 1.8,
        maxDrawdown: -12.3,
        winRate: 0.65,
        avgWinLoss: 1.85,
        totalTrades: 342,
        profitFactor: 2.1
      };

      res.json(metrics);
    } catch (error) {
      logger.error('Failed to get metrics', error);
      res.status(500).json({ error: 'Failed to get metrics' });
    }
  }
}

export const dashboardController = new DashboardController();