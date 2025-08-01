/**
 * Trading module feature flags for Prisma migration
 */
export const TRADING_FEATURE_FLAGS = {
  USE_PRISMA_TRADING_CONNECTOR: process.env.USE_PRISMA_TRADING_CONNECTOR === 'true',
  USE_PRISMA_STRATEGY_ENGINE: process.env.USE_PRISMA_STRATEGY_ENGINE === 'true',
  USE_PRISMA_TRADING_BRAIN: process.env.USE_PRISMA_TRADING_BRAIN === 'true',
  USE_PRISMA_MARKET_DATA: process.env.USE_PRISMA_MARKET_DATA === 'true',
  USE_PRISMA_BACKTEST: process.env.USE_PRISMA_BACKTEST === 'true',
  USE_PRISMA_RISK_MANAGER: process.env.USE_PRISMA_RISK_MANAGER === 'true',
};

// Export all trading types
// TODO: Uncomment these as the type files are created
// export * from './trading-signal';
// export * from './trade-result';
// export * from './candle';
// export * from './strategy';
// export * from './strategy-config';
// export * from './market-analysis';
// export * from './arbitrage';
// export * from './connector';
// export * from './backtest';
// export * from './risk';