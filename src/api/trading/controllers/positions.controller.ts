import { Request, Response } from 'express';
import { Logger } from '../../../utils/logger';

const logger = new Logger('PositionsController');

class PositionsController {
  async getPositions(req: Request, res: Response) {
    try {
      const { status: _status = 'open' } = req.query;

      // Mock data
      const positions = [
        {
          id: '1',
          exchange: 'binance',
          symbol: 'BTC/USDT',
          side: 'buy',
          quantity: 0.5,
          entryPrice: 65000,
          currentPrice: 68500,
          positionValue: 34250,
          unrealizedPnl: 1750,
          stopLoss: 63000,
          takeProfit: 70000,
          openedAt: new Date('2024-01-15'),
        },
        {
          id: '2',
          exchange: 'binance',
          symbol: 'ETH/USDT',
          side: 'buy',
          quantity: 10,
          entryPrice: 3200,
          currentPrice: 3350,
          positionValue: 33500,
          unrealizedPnl: 1500,
          stopLoss: 3100,
          takeProfit: 3500,
          strategyId: 'trend-following',
          strategyName: 'Trend Following',
          openedAt: new Date('2024-01-16'),
        },
      ];

      res.json(positions);
    } catch (error) {
      logger.error('Failed to get positions', error);
      res.status(500).json({ error: 'Failed to get positions' });
    }
  }

  async getPosition(req: Request, res: Response) {
    try {
      const { id } = req.params;

      // Mock data
      const position = {
        id,
        exchange: 'binance',
        symbol: 'BTC/USDT',
        side: 'buy',
        quantity: 0.5,
        entryPrice: 65000,
        currentPrice: 68500,
        positionValue: 34250,
        unrealizedPnl: 1750,
        stopLoss: 63000,
        takeProfit: 70000,
        openedAt: new Date('2024-01-15'),
      };

      res.json(position);
    } catch (error) {
      logger.error('Failed to get position', error);
      res.status(500).json({ error: 'Failed to get position' });
    }
  }

  async closePosition(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { reason = 'manual_close', market = true } = req.body;

      logger.info(`Closing position ${id} - reason: ${reason}, market: ${market}`);

      res.json({
        success: true,
        message: 'Position closed successfully',
        closedAt: new Date(),
        finalPnl: 1750,
      });
    } catch (error) {
      logger.error('Failed to close position', error);
      res.status(500).json({ error: 'Failed to close position' });
    }
  }

  async closeAllPositions(req: Request, res: Response) {
    try {
      logger.info('Closing all positions');

      res.json({
        success: true,
        message: 'All positions closed successfully',
        positionsClosed: 2,
      });
    } catch (error) {
      logger.error('Failed to close all positions', error);
      res.status(500).json({ error: 'Failed to close all positions' });
    }
  }

  async updateStopLossTakeProfit(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { stopLoss, takeProfit } = req.body;

      logger.info(`Updating SL/TP for position ${id} - SL: ${stopLoss}, TP: ${takeProfit}`);

      res.json({
        success: true,
        message: 'Stop loss and take profit updated successfully',
      });
    } catch (error) {
      logger.error('Failed to update SL/TP', error);
      res.status(500).json({ error: 'Failed to update SL/TP' });
    }
  }
}

export const positionsController = new PositionsController();
