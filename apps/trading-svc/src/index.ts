import express from "express";
import cors from "cors";
import helmet from "helmet";
import { Pool } from "pg";
import Redis from "ioredis";
import Queue from "bull";
import { env } from "@ai/config";
// @ts-ignore - package types not built yet
// @ts-ignore - package built locally
import { createStandardObservability } from "@ai/observability";
import { TradingFSM, TradingState, TradingEvent, TradingStrategy } from "@ai/trading";
import { TradingController } from "./trading-controller";

// DB and Redis clients
const pool = new Pool({ connectionString: env.DATABASE_URL });
const redis = new Redis(env.REDIS_URL);

// Initialize Bull queues for trading
const tradingFSMQueue = new Queue('trading-fsm', env.REDIS_URL);
const strategyExecutionQueue = new Queue('strategy-execution', env.REDIS_URL);

// Store active FSM sessions
const activeSessions = new Map<string, TradingFSM>();

// Initialize Trading Controller
const tradingController = new TradingController();

// Create observability setup
const observability = createStandardObservability({
  serviceName: 'trading-svc',
  version: process.env.npm_package_version,
  environment: process.env.NODE_ENV,
  dependencies: {
    database: { connectionString: env.DATABASE_URL },
    redis: { url: env.REDIS_URL }
  }
});

const { metricsRegistry } = observability;

// Create business-specific metrics for Trading Service
const tradesExecuted = metricsRegistry!.createCounter(
  'trades_executed_total',
  'Total number of trades executed',
  ['exchange', 'symbol', 'side', 'status']
);

const tradingStrategyDuration = metricsRegistry!.createHistogram(
  'trading_strategy_duration_seconds',
  'Duration of trading strategy execution',
  ['strategy', 'status'],
  [0.001, 0.01, 0.1, 0.5, 1, 5, 10, 30]
);

const marketDataLatency = metricsRegistry!.createHistogram(
  'market_data_latency_seconds',
  'Latency of market data updates',
  ['exchange', 'symbol'],
  [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1]
);

const positionsTotal = metricsRegistry!.createGauge(
  'positions_total',
  'Total number of open positions',
  ['exchange', 'symbol', 'side']
);

const portfolioValue = metricsRegistry!.createGauge(
  'portfolio_value_usd',
  'Total portfolio value in USD',
  ['exchange']
);

const priceAlerts = metricsRegistry!.createCounter(
  'price_alerts_triggered_total',
  'Total price alerts triggered',
  ['symbol', 'alert_type']
);

const app = express();
app.use(helmet());
app.use(cors());
app.use(express.json());

// Setup observability middleware
observability.setupExpress(app);

// Add health endpoints directly
app.get('/health', (_req, res) => {
  res.json({ status: 'healthy', service: 'trading-svc' });
});

app.get('/health/live', (_req, res) => {
  res.json({ ok: true });
});

app.get('/health/ready', async (_req, res) => {
  try {
    // Check database and redis
    await pool.query('SELECT 1');
    await redis.ping();
    res.json({ ok: true });
  } catch (error) {
    res.status(503).json({ ok: false, error: 'Dependencies not ready' });
  }
});

app.get('/metrics', (_req, res) => {
  res.type('text/plain; version=0.0.4');
  res.send(`# HELP service_info Service information
# TYPE service_info gauge
service_info{service="trading-svc"} 1
`);
});

// =============================================================================
// F4 TRADING FSM ENDPOINTS - Required for F4 completion
// =============================================================================

/**
 * POST /v1/trading/deploy - Deploy a trading strategy
 * This endpoint creates a new FSM session and starts the trading workflow
 */
app.post("/v1/trading/deploy", async (req, res) => {
  const startTime = Date.now();
  
  try {
    const { strategyName, exchange, symbol, timeframe, parameters, riskLimits } = req.body;
    
    // Validate required fields
    if (!strategyName || !exchange || !symbol) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields: strategyName, exchange, symbol"
      });
    }
    
    // Generate session ID
    const sessionId = `strategy_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Create strategy configuration
    const strategy: TradingStrategy = {
      id: sessionId,
      name: strategyName,
      symbol,
      exchange,
      timeframe: timeframe || '5m',
      parameters: parameters || {},
      riskLimits: riskLimits || {
        maxPositionSize: 1000,
        maxLoss: 100,
        maxDrawdown: 0.1
      }
    };
    
    // Create new FSM instance
    const fsm = new TradingFSM(sessionId, strategy, tradingFSMQueue, redis);
    
    // Store FSM in active sessions
    activeSessions.set(sessionId, fsm);
    
    // Listen for FSM events
    fsm.on('state-changed', async (event: any) => {
      console.log(`[FSM] State changed: ${event.from} -> ${event.to} (session: ${sessionId})`);
      
      // Record state change metric
      const labels = { 
        from: event.from, 
        to: event.to, 
        strategy: strategyName 
      };
      
      // Update metrics based on state
      if (event.to === TradingState.LIVE) {
        positionsTotal.inc({ exchange, symbol, side: 'long' });
      } else if (event.to === TradingState.STOPPED) {
        positionsTotal.reset();
      }
    });
    
    // Deploy the strategy (transition from IDLE to ANALYZING)
    const deployed = await fsm.processEvent(TradingEvent.DEPLOY);
    
    if (!deployed) {
      activeSessions.delete(sessionId);
      return res.status(500).json({
        success: false,
        message: "Failed to deploy strategy"
      });
    }
    
    // Record deployment metric
    tradesExecuted.inc({ 
      exchange, 
      symbol, 
      side: 'deploy', 
      status: 'initiated' 
    });
    
    const duration = (Date.now() - startTime) / 1000;
    tradingStrategyDuration.observe({ strategy: strategyName, status: 'deploy' }, duration);
    
    res.json({
      success: true,
      sessionId,
      state: fsm.getCurrentState(),
      strategy,
      message: "Trading strategy deployed successfully",
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    const duration = (Date.now() - startTime) / 1000;
    tradingStrategyDuration.observe({ strategy: 'unknown', status: 'error' }, duration);
    
    res.status(500).json({
      success: false,
      message: (err as Error).message
    });
  }
});

/**
 * POST /v1/trading/stop/:sessionId - Stop a trading strategy
 * This endpoint stops an active trading session
 */
app.post("/v1/trading/stop/:sessionId", async (req, res) => {
  const startTime = Date.now();
  const { sessionId } = req.params;
  
  try {
    // Get FSM from active sessions or load from Redis
    let fsm = activeSessions.get(sessionId);
    
    if (!fsm) {
      const loadedFsm = await TradingFSM.loadFromRedis(sessionId, tradingFSMQueue, redis);
      if (!loadedFsm) {
        return res.status(404).json({
          success: false,
          message: "Trading session not found"
        });
      }
      fsm = loadedFsm;
      activeSessions.set(sessionId, fsm);
    }
    
    const currentState = fsm.getCurrentState();
    
    // Check if already stopped
    if (currentState === TradingState.STOPPED) {
      return res.json({
        success: true,
        message: "Trading session is already stopped",
        sessionId,
        state: currentState
      });
    }
    
    // Process STOP event
    const stopped = await fsm.processEvent(TradingEvent.STOP);
    
    if (!stopped) {
      return res.status(400).json({
        success: false,
        message: "Cannot stop trading session from current state",
        currentState
      });
    }
    
    // Clean up active session
    activeSessions.delete(sessionId);
    
    // Record stop metric
    const context = fsm.getContext();
    tradesExecuted.inc({ 
      exchange: context.strategy.exchange, 
      symbol: context.strategy.symbol, 
      side: 'stop', 
      status: 'completed' 
    });
    
    const duration = (Date.now() - startTime) / 1000;
    tradingStrategyDuration.observe({ 
      strategy: context.strategy.name, 
      status: 'stop' 
    }, duration);
    
    res.json({
      success: true,
      message: "Trading session stopped successfully",
      sessionId,
      state: fsm.getCurrentState(),
      finalMetrics: context.metrics,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: (err as Error).message
    });
  }
});

/**
 * GET /v1/trading/status/:sessionId - Get trading session status
 */
app.get("/v1/trading/status/:sessionId", async (req, res) => {
  const { sessionId } = req.params;
  
  try {
    // Get FSM from active sessions or load from Redis
    let fsm = activeSessions.get(sessionId);
    
    if (!fsm) {
      const loadedFsm = await TradingFSM.loadFromRedis(sessionId, tradingFSMQueue, redis);
      if (!loadedFsm) {
        return res.status(404).json({
          success: false,
          message: "Trading session not found"
        });
      }
      fsm = loadedFsm;
    }
    
    const context = fsm.getContext();
    const history = fsm.getStateHistory();
    const availableEvents = fsm.getAvailableEvents();
    
    // Calculate session duration
    const duration = Date.now() - context.startTime.getTime();
    
    res.json({
      success: true,
      sessionId,
      state: fsm.getCurrentState(),
      previousState: context.previousState,
      strategy: context.strategy,
      metrics: context.metrics,
      errors: context.errors.slice(-10), // Last 10 errors
      availableActions: availableEvents,
      sessionDuration: Math.floor(duration / 1000),
      stateHistory: history.slice(-20), // Last 20 state changes
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: (err as Error).message
    });
  }
});

/**
 * GET /v1/trading/sessions - List all active trading sessions
 */
app.get("/v1/trading/sessions", async (req, res) => {
  try {
    const sessions = [];
    
    // Get all sessions from Redis
    const keys = await redis.keys('fsm:*');
    
    for (const key of keys) {
      const data = await redis.get(key);
      if (data) {
        try {
          const parsed = JSON.parse(data);
          sessions.push({
            sessionId: parsed.context.sessionId,
            state: parsed.state,
            strategy: parsed.context.strategy.name,
            symbol: parsed.context.strategy.symbol,
            exchange: parsed.context.strategy.exchange,
            startTime: parsed.context.startTime,
            metrics: parsed.context.metrics
          });
        } catch (e) {
          console.error(`Failed to parse session data for ${key}:`, e);
        }
      }
    }
    
    res.json({
      success: true,
      totalSessions: sessions.length,
      activeSessions: sessions.filter(s => s.state === TradingState.LIVE).length,
      sessions,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: (err as Error).message
    });
  }
});

/**
 * POST /v1/trading/backtest - Queue a backtest job
 */
app.post("/v1/trading/backtest", async (req, res) => {
  try {
    const { strategy, startDate, endDate, symbol, exchange } = req.body;
    
    if (!strategy || !startDate || !endDate || !symbol) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields: strategy, startDate, endDate, symbol"
      });
    }
    
    // Add backtest job to queue
    const job = await strategyExecutionQueue.add('backtest', {
      strategy,
      startDate,
      endDate,
      symbol,
      exchange: exchange || 'binance',
      timestamp: new Date().toISOString()
    }, {
      priority: 5,
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 2000
      }
    });
    
    res.json({
      success: true,
      jobId: job.id,
      message: "Backtest job queued successfully",
      estimatedTime: "2-5 minutes",
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: (err as Error).message
    });
  }
});

// =============================================================================
// ADDITIONAL TRADING ENDPOINTS (from TradingController)
// =============================================================================

// Get strategy history
app.get("/v1/trading/history/:strategyId", (req, res) => tradingController.getStrategyHistory(req, res));

// Get system status
app.get("/v1/trading/system-status", (req, res) => tradingController.getSystemStatus(req, res));

// Emergency stop all strategies
app.post("/v1/trading/emergency-stop", (req, res) => tradingController.emergencyStopAll(req, res));

// =============================================================================
// LEGACY ENDPOINTS (for backward compatibility)
// =============================================================================

// Mock trading execution endpoint
app.post("/api/trading/execute", async (req, res) => {
  const startTime = Date.now();
  try {
    const { exchange, symbol, side, quantity, price } = req.body;
    
    if (!exchange || !symbol || !side || !quantity) {
      return res.status(400).json({ 
        message: "Missing required fields: exchange, symbol, side, quantity" 
      });
    }

    // Simulate trade execution
    const tradeId = `trade_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const executionPrice = price || Math.random() * 50000; // Mock price
    
    // Record successful trade
    tradesExecuted.inc({ 
      exchange, 
      symbol, 
      side, 
      status: 'executed' 
    });
    
    const duration = (Date.now() - startTime) / 1000;
    tradingStrategyDuration.observe({ strategy: 'manual_execution', status: 'success' }, duration);
    
    res.json({
      tradeId,
      exchange,
      symbol,
      side,
      quantity,
      executionPrice,
      status: 'executed',
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    const duration = (Date.now() - startTime) / 1000;
    tradingStrategyDuration.observe({ strategy: 'manual_execution', status: 'error' }, duration);
    
    tradesExecuted.inc({ 
      exchange: req.body?.exchange || 'unknown', 
      symbol: req.body?.symbol || 'unknown', 
      side: req.body?.side || 'unknown', 
      status: 'failed' 
    });
    
    res.status(500).json({ message: (err as Error).message });
  }
});

// Mock market data endpoint
app.get("/api/trading/market-data/:exchange/:symbol", async (req, res) => {
  const startTime = Date.now();
  try {
    const { exchange, symbol } = req.params;
    
    // Simulate fetching market data
    await new Promise(resolve => setTimeout(resolve, Math.random() * 100)); // 0-100ms delay
    
    const mockData = {
      exchange,
      symbol,
      price: Math.random() * 50000,
      volume: Math.random() * 1000000,
      timestamp: new Date().toISOString()
    };
    
    const latency = (Date.now() - startTime) / 1000;
    marketDataLatency.observe({ exchange, symbol }, latency);
    
    res.json(mockData);
  } catch (err) {
    res.status(500).json({ message: (err as Error).message });
  }
});

// Mock portfolio status endpoint
app.get("/api/trading/portfolio/:exchange", async (req, res) => {
  try {
    const { exchange } = req.params;
    
    // Mock portfolio data
    const mockValue = Math.random() * 100000;
    portfolioValue.set({ exchange }, mockValue);
    
    // Mock positions
    const positions = [
      { symbol: 'BTC/USD', side: 'long', quantity: 0.5 },
      { symbol: 'ETH/USD', side: 'short', quantity: 2.1 }
    ];
    
    positionsTotal.reset();
    positions.forEach(pos => {
      positionsTotal.set({ exchange, symbol: pos.symbol, side: pos.side }, pos.quantity);
    });
    
    res.json({
      exchange,
      totalValue: mockValue,
      positions,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    res.status(500).json({ message: (err as Error).message });
  }
});

// Function to update trading metrics periodically
async function updateTradingMetrics() {
  try {
    // Simulate random market events and price alerts
    const symbols = ['BTC/USD', 'ETH/USD', 'ADA/USD', 'SOL/USD'];
    const alertTypes = ['price_above', 'price_below', 'volume_spike'];
    
    // Random price alert
    if (Math.random() < 0.1) { // 10% chance
      const symbol = symbols[Math.floor(Math.random() * symbols.length)];
      const alertType = alertTypes[Math.floor(Math.random() * alertTypes.length)];
      priceAlerts.inc({ symbol, alert_type: alertType });
    }
  } catch (error) {
    console.error('Failed to update trading metrics:', error);
  }
}

// Update trading metrics every 10 seconds
setInterval(updateTradingMetrics, 10000);
// Initial update
updateTradingMetrics();

const port = Number(process.env.PORT ?? 3002);

// Initialize trading service and start server
async function startServer() {
  try {
    console.log('🚀 Starting Trading Service...');
    
    // Initialize the trading controller
    await tradingController.initialize();
    
    // Schedule periodic cleanup of completed strategies
    setInterval(() => {
      tradingController.cleanupCompletedStrategies();
    }, 60000); // Every minute
    
    // Start the Express server
    app.listen(port, () => {
      console.log(`✅ [trading-svc] listening on :${port}`);
      console.log(`📊 Trading API available at:`);
      console.log(`   - POST /v1/trading/deploy - Deploy strategy`);
      console.log(`   - POST /v1/trading/stop/:id - Stop strategy`);
      console.log(`   - GET  /v1/trading/status/:id - Get status`);
      console.log(`   - GET  /v1/trading/system-status - System overview`);
      console.log(`   - POST /v1/trading/emergency-stop - Emergency stop`);
    });
    
    // Graceful shutdown
    process.on('SIGTERM', async () => {
      console.log('🛑 SIGTERM received, shutting down gracefully...');
      await tradingController.shutdown();
      process.exit(0);
    });
    
    process.on('SIGINT', async () => {
      console.log('🛑 SIGINT received, shutting down gracefully...');
      await tradingController.shutdown();
      process.exit(0);
    });
    
  } catch (error) {
    console.error('❌ Failed to start Trading Service:', error);
    process.exit(1);
  }
}

startServer();
