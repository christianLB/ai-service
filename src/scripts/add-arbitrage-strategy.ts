import { db } from '../services/database';
import { Logger } from '../utils/logger';

const logger = new Logger('AddArbitrageStrategy');

async function addCrossExchangeArbitrageStrategy() {
  try {
    // Initialize database
    await db.initialize();

    // Check if strategy already exists
    const existing = await db.pool.query(
      "SELECT id FROM trading.strategies WHERE type = 'cross_exchange_arbitrage' LIMIT 1"
    );

    if (existing.rows.length > 0) {
      logger.info('Cross-exchange arbitrage strategy already exists');
      return;
    }

    // Insert new strategy
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
        NULL,
        $1,
        $2,
        $3,
        $4,
        $5,
        $6,
        NOW(),
        NOW()
      ) RETURNING id`,
      [
        'Cross-Exchange Arbitrage Bot',
        'cross_exchange_arbitrage',
        JSON.stringify({
          minProfitThreshold: 0.5, // 0.5% minimum profit
          maxPositionSize: 5000, // $5000 max per trade
          exchangeFeePercentage: {
            binance: 0.1,
            coinbase: 0.5,
            kraken: 0.26,
            alpaca: 0.25,
          },
          slippagePercentage: 0.1,
          exchanges: ['binance', 'coinbase', 'alpaca'],
          symbols: ['BTC/USDT', 'ETH/USDT'],
          checkIntervalMs: 3000,
        }),
        JSON.stringify({
          maxDailyLoss: 1000,
          maxDrawdown: 0.2,
          positionSizing: 'fixed',
          stopLossPercentage: 2,
        }),
        false, // Start inactive - user needs to configure exchanges first
        true, // Start in paper trading mode
      ]
    );

    logger.info('Cross-exchange arbitrage strategy added successfully', {
      strategyId: result.rows[0].id,
    });

    // Add strategy parameters documentation
    await db.pool.query(
      `INSERT INTO trading.strategy_descriptions (
        strategy_id,
        description,
        features,
        requirements,
        created_at
      ) VALUES ($1, $2, $3, $4, NOW())`,
      [
        result.rows[0].id,
        'Monitors price differences across multiple exchanges (Binance, Coinbase, Alpaca) and executes profitable arbitrage trades when spreads exceed fees + minimum threshold.',
        JSON.stringify([
          'Real-time price monitoring across exchanges',
          'Automatic trade execution',
          'Support for crypto and stocks (via Alpaca)',
          'Fee-aware profit calculations',
          'Risk management with position limits',
        ]),
        JSON.stringify([
          'API credentials for at least 2 exchanges',
          'Sufficient balance on each exchange',
          'Fast internet connection',
          'Understanding of arbitrage risks',
        ]),
      ]
    );

    logger.info('Strategy documentation added');
  } catch (error) {
    logger.error('Failed to add arbitrage strategy', error);
    throw error;
  } finally {
    await db.close();
  }
}

// Run if called directly
if (require.main === module) {
  addCrossExchangeArbitrageStrategy()
    .then(() => {
      logger.info('Script completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      logger.error('Script failed', error);
      process.exit(1);
    });
}

export { addCrossExchangeArbitrageStrategy };
