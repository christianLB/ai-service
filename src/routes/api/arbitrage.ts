import { Router, Request, Response } from 'express';
import { authMiddleware } from '../../middleware/auth.middleware';
import { Logger } from '../../utils/logger';
import { strategyEngineService } from '../../services/trading/strategy-engine.service';
import { tradingConnectorService } from '../../services/trading/trading-connector.service';
import { db } from '../../services/database';

const router = Router();
const logger = new Logger('ArbitrageAPI');

// Get arbitrage opportunities history
router.get('/opportunities', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { limit = 20, offset = 0 } = req.query;
    
    const result = await db.pool.query(
      `SELECT 
        t.id,
        t.exchange,
        t.symbol,
        t.side,
        t.quantity,
        t.price,
        t.fee,
        t.status,
        t.executed_at,
        t.metadata
      FROM trading.trades t
      WHERE t.metadata->>'arbitrage' = 'true'
      ORDER BY t.executed_at DESC
      LIMIT $1 OFFSET $2`,
      [limit, offset]
    );
    
    res.json({
      success: true,
      data: result.rows,
      pagination: {
        limit: Number(limit),
        offset: Number(offset),
        total: result.rowCount,
      },
    });
  } catch (error: any) {
    logger.error('Failed to get arbitrage opportunities', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// Get current arbitrage strategy status
router.get('/status', authMiddleware, async (req: Request, res: Response) => {
  try {
    // Get arbitrage strategies from database
    const strategies = await db.pool.query(
      `SELECT 
        s.id,
        s.name,
        s.type,
        s.parameters,
        s.is_active,
        s.is_paper_trading,
        s.created_at,
        s.updated_at,
        COALESCE(sp.total_trades, 0) as total_trades,
        COALESCE(sp.total_pnl, 0) as total_pnl,
        COALESCE(sp.win_rate, 0) as win_rate
      FROM trading.strategies s
      LEFT JOIN trading.strategy_performance sp ON s.id = sp.strategy_id
      WHERE s.type IN ('arbitrage', 'cross_exchange_arbitrage')`
    );
    
    // Check which exchanges are connected
    const connectedExchanges = [];
    const exchanges = ['binance', 'coinbase', 'alpaca', 'kraken'];
    
    for (const exchange of exchanges) {
      const connected = await tradingConnectorService.testConnection(exchange);
      if (connected) {
        connectedExchanges.push(exchange);
      }
    }
    
    res.json({
      success: true,
      data: {
        strategies: strategies.rows,
        connectedExchanges,
        canRunArbitrage: connectedExchanges.length >= 2,
      },
    });
  } catch (error: any) {
    logger.error('Failed to get arbitrage status', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// Deploy cross-exchange arbitrage strategy
router.post('/deploy', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { 
      exchanges = ['binance', 'coinbase', 'alpaca'],
      symbols = ['BTC/USDT', 'ETH/USDT'],
      maxPositionSize = 1000,
      minProfitThreshold = 0.5,
      paperTrading = true,
    } = req.body;
    
    // Validate at least 2 exchanges are connected
    const connectedExchanges = [];
    for (const exchange of exchanges) {
      const connected = await tradingConnectorService.testConnection(exchange);
      if (connected) {
        connectedExchanges.push(exchange);
      }
    }
    
    if (connectedExchanges.length < 2) {
      res.status(400).json({
        success: false,
        error: 'At least 2 exchanges must be connected for arbitrage',
        connectedExchanges,
      });
      return;
    }
    
    // Create or update strategy
    const result = await db.pool.query(
      `INSERT INTO trading.strategies (
        user_id,
        name,
        type,
        parameters,
        risk_parameters,
        is_active,
        is_paper_trading,
        created_at,
        updated_at
      ) VALUES (
        $1,
        $2,
        $3,
        $4,
        $5,
        $6,
        $7,
        NOW(),
        NOW()
      ) 
      ON CONFLICT (user_id, name) 
      DO UPDATE SET 
        parameters = EXCLUDED.parameters,
        is_active = EXCLUDED.is_active,
        is_paper_trading = EXCLUDED.is_paper_trading,
        updated_at = NOW()
      RETURNING id`,
      [
        (req as any).user?.id || null,
        'Cross-Exchange Arbitrage Bot',
        'cross_exchange_arbitrage',
        JSON.stringify({
          minProfitThreshold,
          maxPositionSize,
          exchangeFeePercentage: {
            binance: 0.1,
            coinbase: 0.5,
            kraken: 0.26,
            alpaca: 0.25,
          },
          slippagePercentage: 0.1,
          exchanges: connectedExchanges,
          symbols,
          checkIntervalMs: 3000,
        }),
        JSON.stringify({
          maxDailyLoss: maxPositionSize * 2,
          maxDrawdown: 0.2,
          positionSizing: 'fixed',
          stopLossPercentage: 2,
        }),
        true, // Active
        paperTrading,
      ]
    );
    
    const strategyId = result.rows[0].id;
    
    // Reload strategies in engine to pick up the new one
    await strategyEngineService.loadStrategies();
    
    res.json({
      success: true,
      message: 'Arbitrage strategy deployed successfully',
      data: {
        strategyId,
        connectedExchanges,
        symbols,
        paperTrading,
        status: 'active',
      },
    });
  } catch (error: any) {
    logger.error('Failed to deploy arbitrage strategy', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// Stop arbitrage strategy
router.post('/stop/:strategyId', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { strategyId } = req.params;
    
    // Deactivate in database
    await db.pool.query(
      `UPDATE trading.strategies 
       SET is_active = false, updated_at = NOW() 
       WHERE id = $1`,
      [strategyId]
    );
    
    // Stop in engine
    await strategyEngineService.stopStrategy(strategyId);
    
    res.json({
      success: true,
      message: 'Arbitrage strategy stopped',
      data: {
        strategyId,
        status: 'stopped',
      },
    });
  } catch (error: any) {
    logger.error('Failed to stop arbitrage strategy', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// Get real-time profit tracking
router.get('/profits', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { period = '24h' } = req.query;
    
    let interval = '1 day';
    switch (period) {
      case '1h': interval = '1 hour'; break;
      case '24h': interval = '1 day'; break;
      case '7d': interval = '7 days'; break;
      case '30d': interval = '30 days'; break;
    }
    
    const result = await db.pool.query(
      `SELECT 
        COUNT(*) as total_trades,
        SUM(CASE WHEN t.metadata->>'profit' IS NOT NULL 
            THEN (t.metadata->>'profit')::numeric 
            ELSE 0 END) as total_profit,
        AVG(CASE WHEN t.metadata->>'profit' IS NOT NULL 
            THEN (t.metadata->>'profit')::numeric 
            ELSE 0 END) as avg_profit,
        MAX(CASE WHEN t.metadata->>'profit' IS NOT NULL 
            THEN (t.metadata->>'profit')::numeric 
            ELSE 0 END) as max_profit,
        COUNT(CASE WHEN (t.metadata->>'profit')::numeric > 0 THEN 1 END) as profitable_trades
      FROM trading.trades t
      WHERE t.metadata->>'arbitrage' = 'true'
        AND t.executed_at >= NOW() - INTERVAL '${interval}'`
    );
    
    const stats = result.rows[0];
    const winRate = stats.total_trades > 0 
      ? (stats.profitable_trades / stats.total_trades * 100).toFixed(2)
      : 0;
    
    res.json({
      success: true,
      data: {
        period,
        totalTrades: Number(stats.total_trades),
        totalProfit: Number(stats.total_profit || 0),
        avgProfit: Number(stats.avg_profit || 0),
        maxProfit: Number(stats.max_profit || 0),
        winRate: Number(winRate),
        profitableT

: Number(stats.profitable_trades || 0),
      },
    });
  } catch (error: any) {
    logger.error('Failed to get profit stats', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

export default router;