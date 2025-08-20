import { Request, Response } from 'express';
import { Logger } from '../utils/logger';
import { tradingStrategiesService } from '../services/strategies.service';

const logger = new Logger('TradingStrategiesController');

export class StrategiesController {
  async getStrategies(req: Request, res: Response) {
    try {
      const strategies = await tradingStrategiesService.getAllStrategies();
      res.json({ success: true, data: strategies, total: strategies.length });
    } catch (error) {
      logger.error('Failed to get strategies', error);
      res.status(500).json({ success: false, error: 'Failed to get strategies' });
    }
  }

  async getStrategy(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const strategy = await tradingStrategiesService.getStrategy(id);
      
      if (!strategy) {
        return res.status(404).json({ success: false, error: 'Strategy not found' });
      }

      res.json({ success: true, data: strategy });
    } catch (error) {
      logger.error('Failed to get strategy', error);
      res.status(500).json({ success: false, error: 'Failed to get strategy' });
    }
  }

  async getStrategyPerformance(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const performance = await tradingStrategiesService.getStrategyPerformance(id);
      
      if (!performance) {
        return res.status(404).json({ success: false, error: 'Strategy not found' });
      }

      res.json({ success: true, data: performance });
    } catch (error) {
      logger.error('Failed to get strategy performance', error);
      res.status(500).json({ success: false, error: 'Failed to get strategy performance' });
    }
  }

  async startStrategy(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const result = await tradingStrategiesService.startStrategy(id);
      
      if (!result.success) {
        return res.status(400).json({ success: false, error: result.message });
      }

      res.json({ success: true, message: result.message });
    } catch (error) {
      logger.error('Failed to start strategy', error);
      res.status(500).json({ success: false, error: 'Failed to start strategy' });
    }
  }

  async stopStrategy(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const result = await tradingStrategiesService.stopStrategy(id);
      
      if (!result.success) {
        return res.status(400).json({ success: false, error: result.message });
      }

      res.json({ success: true, message: result.message });
    } catch (error) {
      logger.error('Failed to stop strategy', error);
      res.status(500).json({ success: false, error: 'Failed to stop strategy' });
    }
  }

  async pauseStrategy(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const result = await tradingStrategiesService.pauseStrategy(id);
      
      if (!result.success) {
        return res.status(400).json({ success: false, error: result.message });
      }

      res.json({ success: true, message: result.message });
    } catch (error) {
      logger.error('Failed to pause strategy', error);
      res.status(500).json({ success: false, error: 'Failed to pause strategy' });
    }
  }

  async updateStrategyParams(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const parameters = req.body;
      
      const result = await tradingStrategiesService.updateStrategyParameters(id, parameters);
      
      if (!result.success) {
        return res.status(400).json({ success: false, error: result.message });
      }

      res.json({ success: true, message: result.message });
    } catch (error) {
      logger.error('Failed to update strategy parameters', error);
      res.status(500).json({ success: false, error: 'Failed to update strategy parameters' });
    }
  }

  async getStrategyStatus(req: Request, res: Response) {
    try {
      const status = await tradingStrategiesService.getStrategyStatus();
      res.json({ success: true, data: status });
    } catch (error) {
      logger.error('Failed to get strategy status', error);
      res.status(500).json({ success: false, error: 'Failed to get strategy status' });
    }
  }

  async getActiveSignals(req: Request, res: Response) {
    try {
      const { strategyId } = req.query;
      const signals = await tradingStrategiesService.getActiveSignals(strategyId as string);
      res.json({ success: true, data: signals, total: signals.length });
    } catch (error) {
      logger.error('Failed to get active signals', error);
      res.status(500).json({ success: false, error: 'Failed to get active signals' });
    }
  }
}

export const strategiesController = new StrategiesController();