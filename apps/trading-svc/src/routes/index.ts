import { Router } from 'express';
import { strategiesController } from '../controllers/strategies.controller';
import { tradingPositionsService } from '../services/positions.service';
import { tradingMarketDataService } from '../services/market-data.service';
import { tradingBacktestService } from '../services/backtest.service';
import { tradingStrategiesService } from '../services/strategies.service';
import { checkDatabaseHealth } from '../lib/prisma';
import { Logger } from '../utils/logger';

const logger = new Logger('TradingRoutes');
const router = Router();

// ================================
// HEALTH CHECK
// ================================

router.get('/health', async (req, res) => {
  try {
    const dbHealth = await checkDatabaseHealth();
    const marketDataStatus = tradingMarketDataService.getConnectionStatus();
    
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      services: {
        database: dbHealth.connected ? 'healthy' : 'unhealthy',
        marketData: marketDataStatus.connected ? 'healthy' : 'unhealthy',
        strategies: 'healthy',
        positions: 'healthy',
        backtest: 'healthy',
      },
      details: {
        database: {
          connected: dbHealth.connected,
          latency: dbHealth.latency,
          error: dbHealth.error,
        },
        marketData: {
          connected: marketDataStatus.connected,
          subscriptions: marketDataStatus.subscriptions,
          reconnectAttempts: marketDataStatus.reconnectAttempts,
        },
      },
    };

    const overallHealthy = Object.values(health.services).every(status => status === 'healthy');
    
    res.status(overallHealthy ? 200 : 503).json({
      success: overallHealthy,
      data: health,
    });
  } catch (error) {
    logger.error('Health check failed', error);
    res.status(503).json({
      success: false,
      error: 'Health check failed',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// ================================
// STRATEGIES ROUTES
// ================================

router.get('/strategies', strategiesController.getStrategies);
router.get('/strategies/status', strategiesController.getStrategyStatus);
router.get('/strategies/signals', strategiesController.getActiveSignals);
router.get('/strategies/:id', strategiesController.getStrategy);
router.get('/strategies/:id/performance', strategiesController.getStrategyPerformance);
router.post('/strategies/:id/start', strategiesController.startStrategy);
router.post('/strategies/:id/stop', strategiesController.stopStrategy);
router.post('/strategies/:id/pause', strategiesController.pauseStrategy);
router.put('/strategies/:id/params', strategiesController.updateStrategyParams);

// ================================
// POSITIONS ROUTES
// ================================

router.get('/positions', async (req, res) => {
  try {
    const { status } = req.query;
    const positions = await tradingPositionsService.getAllPositions(status as any);
    res.json({ success: true, data: positions, total: positions.length });
  } catch (error) {
    logger.error('Failed to get positions', error);
    res.status(500).json({ success: false, error: 'Failed to get positions' });
  }
});

router.get('/positions/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const position = await tradingPositionsService.getPosition(id);
    
    if (!position) {
      return res.status(404).json({ success: false, error: 'Position not found' });
    }
    
    res.json({ success: true, data: position });
  } catch (error) {
    logger.error('Failed to get position', error);
    res.status(500).json({ success: false, error: 'Failed to get position' });
  }
});

router.post('/positions/close/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { reason = 'manual_close', market = true } = req.body;
    
    const result = await tradingPositionsService.closePosition(id, reason, market);
    
    if (!result.success) {
      return res.status(400).json({ success: false, error: result.message });
    }
    
    res.json({
      success: true,
      message: result.message,
      data: {
        closedAt: result.closedAt,
        finalPnl: result.finalPnl,
      },
    });
  } catch (error) {
    logger.error('Failed to close position', error);
    res.status(500).json({ success: false, error: 'Failed to close position' });
  }
});

router.post('/positions/close-all', async (req, res) => {
  try {
    const { reason = 'manual_close_all' } = req.body;
    const result = await tradingPositionsService.closeAllPositions(reason);
    
    res.json({
      success: result.success,
      message: result.message,
      data: {
        positionsClosed: result.positionsClosed,
      },
    });
  } catch (error) {
    logger.error('Failed to close all positions', error);
    res.status(500).json({ success: false, error: 'Failed to close all positions' });
  }
});

router.put('/positions/:id/sl-tp', async (req, res) => {
  try {
    const { id } = req.params;
    const { stopLoss, takeProfit } = req.body;
    
    const result = await tradingPositionsService.updateStopLossTakeProfit(id, stopLoss, takeProfit);
    
    if (!result.success) {
      return res.status(400).json({ success: false, error: result.message });
    }
    
    res.json({ success: true, message: result.message });
  } catch (error) {
    logger.error('Failed to update SL/TP', error);
    res.status(500).json({ success: false, error: 'Failed to update SL/TP' });
  }
});

router.get('/positions/portfolio/summary', async (req, res) => {
  try {
    const summary = await tradingPositionsService.getPortfolioSummary();
    res.json({ success: true, data: summary });
  } catch (error) {
    logger.error('Failed to get portfolio summary', error);
    res.status(500).json({ success: false, error: 'Failed to get portfolio summary' });
  }
});

// ================================
// MARKET DATA ROUTES
// ================================

router.get('/market-data/ticks', async (req, res) => {
  try {
    const { symbol } = req.query;
    
    if (symbol) {
      const tick = await tradingMarketDataService.getCurrentTick(symbol as string);
      res.json({ success: true, data: tick });
    } else {
      const ticks = await tradingMarketDataService.getAllTicks();
      res.json({ success: true, data: ticks, total: ticks.length });
    }
  } catch (error) {
    logger.error('Failed to get market ticks', error);
    res.status(500).json({ success: false, error: 'Failed to get market ticks' });
  }
});

router.get('/market-data/candles', async (req, res) => {
  try {
    const { symbol, timeframe = '1h', limit = 100 } = req.query;
    
    if (!symbol) {
      return res.status(400).json({ success: false, error: 'Symbol is required' });
    }
    
    const candles = await tradingMarketDataService.getMarketData(
      symbol as string,
      timeframe as string,
      parseInt(limit as string)
    );
    
    res.json({ success: true, data: candles, total: candles.length });
  } catch (error) {
    logger.error('Failed to get market candles', error);
    res.status(500).json({ success: false, error: 'Failed to get market candles' });
  }
});

router.get('/market-data/orderbook/:symbol', async (req, res) => {
  try {
    const { symbol } = req.params;
    const orderBook = await tradingMarketDataService.getOrderBook(symbol);
    
    if (!orderBook) {
      return res.status(404).json({ success: false, error: 'Order book not found' });
    }
    
    res.json({ success: true, data: orderBook });
  } catch (error) {
    logger.error('Failed to get order book', error);
    res.status(500).json({ success: false, error: 'Failed to get order book' });
  }
});

router.get('/market-data/indicators', async (req, res) => {
  try {
    const { symbol, timeframe = '1h', limit = 100 } = req.query;
    
    if (!symbol) {
      return res.status(400).json({ success: false, error: 'Symbol is required' });
    }
    
    const indicators = await tradingMarketDataService.getTechnicalIndicators(
      symbol as string,
      timeframe as string,
      parseInt(limit as string)
    );
    
    res.json({ success: true, data: indicators, total: indicators.length });
  } catch (error) {
    logger.error('Failed to get technical indicators', error);
    res.status(500).json({ success: false, error: 'Failed to get technical indicators' });
  }
});

router.get('/market-data/exchanges', async (req, res) => {
  try {
    const exchanges = await tradingMarketDataService.getExchanges();
    res.json({ success: true, data: exchanges, total: exchanges.length });
  } catch (error) {
    logger.error('Failed to get exchanges', error);
    res.status(500).json({ success: false, error: 'Failed to get exchanges' });
  }
});

router.get('/market-data/symbols', async (req, res) => {
  try {
    const { exchange } = req.query;
    const symbols = await tradingMarketDataService.getSupportedSymbols(exchange as string);
    res.json({ success: true, data: symbols, total: symbols.length });
  } catch (error) {
    logger.error('Failed to get symbols', error);
    res.status(500).json({ success: false, error: 'Failed to get symbols' });
  }
});

router.get('/market-data/summary', async (req, res) => {
  try {
    const summary = await tradingMarketDataService.getMarketSummary();
    res.json({ success: true, data: summary });
  } catch (error) {
    logger.error('Failed to get market summary', error);
    res.status(500).json({ success: false, error: 'Failed to get market summary' });
  }
});

// ================================
// BACKTEST ROUTES
// ================================

router.post('/backtest/run', async (req, res) => {
  try {
    const request = req.body;
    const result = await tradingBacktestService.runBacktest(request);
    res.json({ success: true, data: result });
  } catch (error) {
    logger.error('Failed to run backtest', error);
    res.status(500).json({ success: false, error: 'Failed to run backtest' });
  }
});

router.get('/backtest/results', async (req, res) => {
  try {
    const { limit = 10 } = req.query;
    const results = await tradingBacktestService.getBacktestResults(parseInt(limit as string));
    res.json({ success: true, data: results, total: results.length });
  } catch (error) {
    logger.error('Failed to get backtest results', error);
    res.status(500).json({ success: false, error: 'Failed to get backtest results' });
  }
});

router.get('/backtest/results/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await tradingBacktestService.getBacktestResult(id);
    
    if (!result) {
      return res.status(404).json({ success: false, error: 'Backtest result not found' });
    }
    
    res.json({ success: true, data: result });
  } catch (error) {
    logger.error('Failed to get backtest result', error);
    res.status(500).json({ success: false, error: 'Failed to get backtest result' });
  }
});

router.post('/backtest/optimize', async (req, res) => {
  try {
    const request = req.body;
    const result = await tradingBacktestService.optimizeStrategy(request);
    res.json({ success: true, data: result });
  } catch (error) {
    logger.error('Failed to optimize strategy', error);
    res.status(500).json({ success: false, error: 'Failed to optimize strategy' });
  }
});

router.get('/backtest/jobs', async (req, res) => {
  try {
    const jobs = await tradingBacktestService.getActiveJobs();
    res.json({ success: true, data: jobs, total: jobs.length });
  } catch (error) {
    logger.error('Failed to get active jobs', error);
    res.status(500).json({ success: false, error: 'Failed to get active jobs' });
  }
});

router.get('/backtest/jobs/:taskId/status', async (req, res) => {
  try {
    const { taskId } = req.params;
    const status = await tradingBacktestService.getJobStatus(taskId);
    
    if (!status) {
      return res.status(404).json({ success: false, error: 'Job not found' });
    }
    
    res.json({ success: true, data: status });
  } catch (error) {
    logger.error('Failed to get job status', error);
    res.status(500).json({ success: false, error: 'Failed to get job status' });
  }
});

router.post('/backtest/jobs/:taskId/cancel', async (req, res) => {
  try {
    const { taskId } = req.params;
    const result = await tradingBacktestService.cancelJob(taskId);
    
    if (!result.success) {
      return res.status(400).json({ success: false, error: result.message });
    }
    
    res.json({ success: true, message: result.message });
  } catch (error) {
    logger.error('Failed to cancel job', error);
    res.status(500).json({ success: false, error: 'Failed to cancel job' });
  }
});

// ================================
// SERVICE STATS
// ================================

router.get('/stats', async (req, res) => {
  try {
    const backtestStats = await tradingBacktestService.getServiceStats();
    const portfolioSummary = await tradingPositionsService.getPortfolioSummary();
    const marketSummary = await tradingMarketDataService.getMarketSummary();
    const strategyStatus = await tradingStrategiesService.getStrategyStatus();
    
    const stats = {
      timestamp: new Date().toISOString(),
      backtest: backtestStats,
      portfolio: portfolioSummary,
      market: marketSummary,
      strategies: strategyStatus,
    };
    
    res.json({ success: true, data: stats });
  } catch (error) {
    logger.error('Failed to get service stats', error);
    res.status(500).json({ success: false, error: 'Failed to get service stats' });
  }
});

export { router as tradingRoutes };