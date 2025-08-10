import { Request, Response } from 'express';
import { Logger } from '../../../utils/logger';

const logger = new Logger('StrategiesController');

class StrategiesController {
  async getStrategies(req: Request, res: Response) {
    try {
      // Mock data
      const strategies = [
        {
          id: 'trend-following',
          name: 'Trend Following',
          description: 'Follows market trends using MA crossovers and momentum indicators',
          status: 'active',
          parameters: {
            fastMA: 20,
            slowMA: 50,
            rsiPeriod: 14,
            stopLoss: 2,
            takeProfit: 5
          },
          parameterSchema: {
            fastMA: { type: 'number', label: 'Fast MA Period', min: 5, max: 50, default: 20 },
            slowMA: { type: 'number', label: 'Slow MA Period', min: 20, max: 200, default: 50 },
            rsiPeriod: { type: 'number', label: 'RSI Period', min: 5, max: 30, default: 14 },
            stopLoss: { type: 'number', label: 'Stop Loss %', min: 0.5, max: 10, step: 0.1, default: 2 },
            takeProfit: { type: 'number', label: 'Take Profit %', min: 1, max: 20, step: 0.1, default: 5 }
          },
          performance: {
            totalTrades: 156,
            winRate: 0.62,
            totalPnL: 12500,
            sharpeRatio: 1.85,
            maxDrawdown: -8.5
          }
        },
        {
          id: 'market-making',
          name: 'Market Making',
          description: 'Provides liquidity by placing limit orders on both sides',
          status: 'paused',
          parameters: {
            spread: 0.2,
            orderSize: 1000,
            orderRefreshInterval: 30000,
            maxExposure: 10000
          },
          parameterSchema: {
            spread: { type: 'number', label: 'Spread %', min: 0.1, max: 1, step: 0.05, default: 0.2 },
            orderSize: { type: 'number', label: 'Order Size (USD)', min: 100, max: 10000, default: 1000 },
            orderRefreshInterval: { type: 'number', label: 'Refresh Interval (ms)', min: 5000, max: 60000, default: 30000 },
            maxExposure: { type: 'number', label: 'Max Exposure (USD)', min: 1000, max: 100000, default: 10000 }
          },
          performance: {
            totalTrades: 842,
            winRate: 0.58,
            totalPnL: 8200,
            sharpeRatio: 1.45,
            maxDrawdown: -5.2
          }
        },
        {
          id: 'arbitrage',
          name: 'Triangular Arbitrage',
          description: 'Exploits price differences across trading pairs',
          status: 'stopped',
          parameters: {
            minProfitThreshold: 0.1,
            maxPositionSize: 5000
          },
          parameterSchema: {
            minProfitThreshold: { type: 'number', label: 'Min Profit %', min: 0.05, max: 1, step: 0.05, default: 0.1 },
            maxPositionSize: { type: 'number', label: 'Max Position Size (USD)', min: 1000, max: 50000, default: 5000 }
          },
          performance: {
            totalTrades: 45,
            winRate: 0.82,
            totalPnL: 3200,
            sharpeRatio: 2.1,
            maxDrawdown: -2.8
          }
        }
      ];

      res.json(strategies);
    } catch (error) {
      logger.error('Failed to get strategies', error);
      res.status(500).json({ error: 'Failed to get strategies' });
    }
  }

  async getStrategy(req: Request, res: Response) {
    try {
      const { id } = req.params;

      // Mock data (same as above but single)
      const strategy = {
        id,
        name: 'Trend Following',
        description: 'Follows market trends using MA crossovers and momentum indicators',
        status: 'active',
        parameters: {
          fastMA: 20,
          slowMA: 50,
          rsiPeriod: 14,
          stopLoss: 2,
          takeProfit: 5
        },
        performance: {
          totalTrades: 156,
          winRate: 0.62,
          totalPnL: 12500,
          sharpeRatio: 1.85,
          maxDrawdown: -8.5
        }
      };

      res.json(strategy);
    } catch (error) {
      logger.error('Failed to get strategy', error);
      res.status(500).json({ error: 'Failed to get strategy' });
    }
  }

  async getStrategyPerformance(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const performance = {
        strategyId: id,
        metrics: {
          totalTrades: 156,
          winRate: 0.62,
          totalPnL: 12500,
          sharpeRatio: 1.85,
          maxDrawdown: -8.5
        },
        recentTrades: [],
        equityCurve: []
      };

      res.json(performance);
    } catch (error) {
      logger.error('Failed to get strategy performance', error);
      res.status(500).json({ error: 'Failed to get strategy performance' });
    }
  }

  async startStrategy(req: Request, res: Response) {
    try {
      const { id } = req.params;
      logger.info(`Starting strategy ${id}`);

      res.json({ success: true, message: 'Strategy started successfully' });
    } catch (error) {
      logger.error('Failed to start strategy', error);
      res.status(500).json({ error: 'Failed to start strategy' });
    }
  }

  async stopStrategy(req: Request, res: Response) {
    try {
      const { id } = req.params;
      logger.info(`Stopping strategy ${id}`);

      res.json({ success: true, message: 'Strategy stopped successfully' });
    } catch (error) {
      logger.error('Failed to stop strategy', error);
      res.status(500).json({ error: 'Failed to stop strategy' });
    }
  }

  async pauseStrategy(req: Request, res: Response) {
    try {
      const { id } = req.params;
      logger.info(`Pausing strategy ${id}`);

      res.json({ success: true, message: 'Strategy paused successfully' });
    } catch (error) {
      logger.error('Failed to pause strategy', error);
      res.status(500).json({ error: 'Failed to pause strategy' });
    }
  }

  async updateStrategyParams(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const params = req.body;

      logger.info(`Updating strategy ${id} params:`, params);

      res.json({ success: true, message: 'Strategy parameters updated successfully' });
    } catch (error) {
      logger.error('Failed to update strategy parameters', error);
      res.status(500).json({ error: 'Failed to update strategy parameters' });
    }
  }
}

export const strategiesController = new StrategiesController();