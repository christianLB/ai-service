// Export all trading services
export { tradingConnectorService, TradingConnectorService } from './trading-connector.service';
export { marketDataService, MarketDataService } from './market-data.service';
export { strategyEngineService, StrategyEngineService, BaseStrategy } from './strategy-engine.service';
export { riskManagerService, RiskManagerService } from './risk-manager.service';
export { backtestService, BacktestService } from './backtest.service';
export { tradingBrainService, TradingBrainService } from './trading-brain.service';

// Export connectors
export * from './connectors';

// Export types
export type { 
  TradingSignal, 
  StrategyConfig, 
  StrategyPerformance 
} from './strategy-engine.service';

export type {
  MarketSnapshot,
  OHLCVData,
  MarketDataConfig
} from './market-data.service';

export type {
  RiskParameters,
  RiskMetrics,
  TradeValidation,
  PositionSizeCalculation
} from './risk-manager.service';

export type {
  BacktestConfig,
  BacktestResult,
  BacktestMetrics,
  BacktestTrade
} from './backtest.service';

// Initialize all services
export async function initializeTradingModule(): Promise<void> {
  const { Logger } = await import('../../utils/logger');
  const logger = new Logger('TradingModule');
  
  try {
    logger.info('Initializing Trading Module...');
    
    // Initialize market data service
    const { marketDataService } = await import('./market-data.service');
    await marketDataService.initialize({
      influxUrl: process.env.INFLUXDB_URL || 'http://localhost:8086',
      influxToken: process.env.INFLUXDB_TOKEN || 'dev-token-influxdb-2025',
      influxOrg: process.env.INFLUXDB_ORG || 'ai-trading',
      influxBucket: process.env.INFLUXDB_BUCKET || 'market-data',
    });
    
    // Initialize risk manager
    const { riskManagerService } = await import('./risk-manager.service');
    await riskManagerService.initialize();
    
    // Initialize trading brain
    const { tradingBrainService } = await import('./trading-brain.service');
    await tradingBrainService.initialize();
    
    // Load strategies
    const { strategyEngineService } = await import('./strategy-engine.service');
    await strategyEngineService.loadStrategies();
    
    logger.info('Trading Module initialized successfully');
  } catch (error) {
    logger.error('Failed to initialize Trading Module', error);
    throw error;
  }
}