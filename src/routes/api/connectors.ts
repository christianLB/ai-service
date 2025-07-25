import { Router, Request, Response } from 'express';
import { authMiddleware } from '../../middleware/auth.middleware';
import { Logger } from '../../utils/logger';
import { tradingConnectorService } from '../../services/trading/trading-connector.service';
import { AlpacaConfig } from '../../services/trading/connectors/alpaca.connector';

const router = Router();
const logger = new Logger('ConnectorsAPI');

// Get available connectors
router.get('/available', authMiddleware, async (req: Request, res: Response) => {
  try {
    const connectors = [
      {
        id: 'binance',
        name: 'Binance',
        type: 'crypto',
        features: ['spot', 'futures', 'margin'],
        requiredFields: ['apiKey', 'secret'],
        optionalFields: ['testnet'],
      },
      {
        id: 'coinbase',
        name: 'Coinbase',
        type: 'crypto',
        features: ['spot'],
        requiredFields: ['apiKey', 'secret', 'passphrase'],
        optionalFields: [],
      },
      {
        id: 'kraken',
        name: 'Kraken',
        type: 'crypto',
        features: ['spot', 'margin'],
        requiredFields: ['apiKey', 'secret'],
        optionalFields: [],
      },
      {
        id: 'alpaca',
        name: 'Alpaca Markets',
        type: 'stocks_crypto',
        features: ['stocks', 'crypto', 'paper_trading'],
        requiredFields: ['apiKey', 'secret'],
        optionalFields: ['paper'],
        description: 'US stocks and crypto trading with paper trading support',
      },
    ];

    res.json({
      success: true,
      data: connectors,
    });
  } catch (error: any) {
    logger.error('Failed to get available connectors', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// Configure Alpaca connector
router.post('/alpaca/configure', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { apiKey, apiSecret, paper = true } = req.body;
    const userId = (req as any).user?.id;

    if (!apiKey || !apiSecret) {
      res.status(400).json({
        success: false,
        error: 'API key and secret are required',
      });
      return;
    }

    // Save configuration
    await tradingConnectorService.saveExchangeConfig(
      'alpaca',
      {
        apiKey,
        secret: apiSecret,
        testnet: paper,
      },
      userId
    );

    // Test connection
    try {
      const exchange = await tradingConnectorService.initializeExchange('alpaca', userId);
      
      res.json({
        success: true,
        message: 'Alpaca connector configured successfully',
        data: {
          exchangeId: exchange.id,
          name: exchange.name,
          connected: exchange.connected,
          paper,
        },
      });
    } catch (testError: any) {
      logger.error('Failed to connect to Alpaca', testError);
      res.status(400).json({
        success: false,
        error: 'Failed to connect to Alpaca. Please check your credentials.',
        details: testError.message,
      });
      return;
    }
  } catch (error: any) {
    logger.error('Failed to configure Alpaca', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// Test connector connection
router.post('/:exchangeId/test', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { exchangeId } = req.params;
    const userId = (req as any).user?.id;

    const connected = await tradingConnectorService.testConnection(exchangeId, userId);

    res.json({
      success: true,
      data: {
        exchangeId,
        connected,
        timestamp: new Date(),
      },
    });
  } catch (error: any) {
    logger.error('Failed to test connection', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// Get connector status
router.get('/:exchangeId/status', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { exchangeId } = req.params;
    const userId = (req as any).user?.id;

    const exchange = await tradingConnectorService.getExchange(exchangeId, userId);

    if (!exchange) {
      res.status(404).json({
        success: false,
        error: 'Connector not found or not configured',
      });
      return;
    }

    // Get balance for additional status info
    let balance = null;
    try {
      balance = await tradingConnectorService.getBalance(exchangeId, userId);
    } catch (balanceError) {
      logger.debug('Could not fetch balance', balanceError);
    }

    res.json({
      success: true,
      data: {
        exchangeId: exchange.id,
        name: exchange.name,
        connected: exchange.connected,
        lastSync: exchange.lastSync,
        balance: balance ? {
          total: balance.total,
          free: balance.free,
        } : null,
      },
    });
  } catch (error: any) {
    logger.error('Failed to get connector status', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// Get positions for Alpaca (stocks/crypto)
router.get('/alpaca/positions', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    
    const exchange = await tradingConnectorService.getExchange('alpaca', userId);
    
    if (!exchange) {
      res.status(404).json({
        success: false,
        error: 'Alpaca connector not configured',
      });
      return;
    }

    if (!('getPositions' in exchange.exchange)) {
      res.status(400).json({
        success: false,
        error: 'This connector does not support positions',
      });
      return;
    }

    const positions = await exchange.exchange.getPositions();

    res.json({
      success: true,
      data: positions,
    });
  } catch (error: any) {
    logger.error('Failed to get positions', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

export default router;