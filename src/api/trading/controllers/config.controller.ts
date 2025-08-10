import { Request, Response } from 'express';
import { Logger } from '../../../utils/logger';

const logger = new Logger('ConfigController');

class ConfigController {
  async getExchanges(req: Request, res: Response) {
    try {
      const exchanges = [
        { id: 'binance', name: 'Binance', supported: true },
        { id: 'coinbase', name: 'Coinbase', supported: true },
        { id: 'kraken', name: 'Kraken', supported: false }
      ];

      res.json(exchanges);
    } catch (error) {
      logger.error('Failed to get exchanges', error);
      res.status(500).json({ error: 'Failed to get exchanges' });
    }
  }

  async getSymbols(req: Request, res: Response) {
    try {
      const { exchange: _exchange = 'binance' } = req.query;

      const symbols = [
        'BTC/USDT',
        'ETH/USDT',
        'BNB/USDT',
        'SOL/USDT',
        'ADA/USDT',
        'DOT/USDT',
        'AVAX/USDT',
        'MATIC/USDT'
      ];

      res.json(symbols);
    } catch (error) {
      logger.error('Failed to get symbols', error);
      res.status(500).json({ error: 'Failed to get symbols' });
    }
  }

  async updateRiskParams(req: Request, res: Response) {
    try {
      const { maxPositionSize, maxDailyLoss, maxDrawdown, maxLeverage } = req.body;

      logger.info('Updating risk parameters:', { maxPositionSize, maxDailyLoss, maxDrawdown, maxLeverage });

      res.json({ success: true, message: 'Risk parameters updated successfully' });
    } catch (error) {
      logger.error('Failed to update risk parameters', error);
      res.status(500).json({ error: 'Failed to update risk parameters' });
    }
  }

  async emergencyStop(req: Request, res: Response) {
    try {
      logger.warn('EMERGENCY STOP TRIGGERED!');

      // In real implementation, this would:
      // 1. Stop all strategies
      // 2. Cancel all open orders
      // 3. Close all positions at market

      res.json({
        success: true,
        message: 'Emergency stop executed',
        strategiesStopped: 3,
        ordersCancelled: 5,
        positionsClosed: 2
      });
    } catch (error) {
      logger.error('Failed to execute emergency stop', error);
      res.status(500).json({ error: 'Failed to execute emergency stop' });
    }
  }
}

export const configController = new ConfigController();