import { Router } from 'express';
import { dashboardRouter } from './dashboard.routes';
import { positionsRouter } from './positions.routes';
import { strategiesRouter } from './strategies.routes';
import { backtestRouter } from './backtest.routes';
import { performanceRouter } from './performance.routes';
import { configRouter } from './config.routes';

const router = Router();

// Trading routes
router.use('/dashboard', dashboardRouter);
router.use('/positions', positionsRouter);
router.use('/strategies', strategiesRouter);
router.use('/backtest', backtestRouter);
router.use('/performance', performanceRouter);
router.use('/config', configRouter);

// Health check
router.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'trading' });
});

// AI Provider Status
router.get('/ai-status', async (req, res) => {
  try {
    const { tradingBrainService } = await import('../../services/trading/trading-brain.service');
    const { claudeAIService } = await import('../../services/ai/claude.service');

    const aiProvider = tradingBrainService.getCurrentAIProvider();
    const claudeReady = claudeAIService.isReady();
    const claudeModel = claudeAIService.getCurrentModel();

    res.json({
      currentProvider: aiProvider,
      providers: {
        claude: {
          ready: claudeReady,
          model: claudeModel,
          priority: 'primary'
        },
        openai: {
          ready: aiProvider.includes('OpenAI'),
          model: 'gpt-4',
          priority: 'fallback'
        }
      },
      status: claudeReady || aiProvider.includes('OpenAI') ? 'active' : 'limited'
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to get AI status',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Test Claude AI
router.get('/test-claude', async (req, res) => {
  try {
    const { claudeAIService } = await import('../../services/ai/claude.service');

    // Initialize if not already done
    if (!claudeAIService.isReady()) {
      await claudeAIService.initialize();
    }

    const testContext = {
      symbol: 'BTC/USDT',
      exchange: 'binance',
      currentPrice: 45000,
      priceChange24h: 2.5,
      volume24h: 1000000,
      volatility: 1.5,
      technicalIndicators: {
        rsi: 65,
        trend: 'bullish',
        macd: { value: 100, signal: 90, histogram: 10 }
      },
      orderBook: {
        bidDepth: 100000,
        askDepth: 100000,
        spread: 0.1
      }
    };

    const decision = await claudeAIService.analyzeTradingOpportunity(testContext);

    res.json({
      testResult: 'success',
      claudeReady: claudeAIService.isReady(),
      model: claudeAIService.getCurrentModel(),
      decision: decision || 'No decision returned'
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to test Claude',
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
  }
});

export { router as tradingRouter };