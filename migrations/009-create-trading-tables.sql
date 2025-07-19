-- Migration: Create trading tables
-- Description: Core tables for the Trading Intelligence module
-- Date: 2025-07-19

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create trading schema
CREATE SCHEMA IF NOT EXISTS trading;

-- ============================================================================
-- TRADING POSITIONS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS trading.positions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    exchange VARCHAR(50) NOT NULL,
    symbol VARCHAR(50) NOT NULL,
    side VARCHAR(10) NOT NULL CHECK (side IN ('buy', 'sell', 'long', 'short')),
    status VARCHAR(20) NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed', 'pending', 'cancelled')),
    
    -- Position details
    quantity DECIMAL(20,8) NOT NULL,
    entry_price DECIMAL(20,8) NOT NULL,
    current_price DECIMAL(20,8),
    exit_price DECIMAL(20,8),
    
    -- Risk management
    stop_loss DECIMAL(20,8),
    take_profit DECIMAL(20,8),
    trailing_stop_distance DECIMAL(20,8),
    
    -- Performance metrics
    realized_pnl DECIMAL(20,8) DEFAULT 0,
    unrealized_pnl DECIMAL(20,8) DEFAULT 0,
    fees DECIMAL(20,8) DEFAULT 0,
    
    -- Strategy information
    strategy_id UUID,
    strategy_name VARCHAR(100),
    confidence_score DECIMAL(5,4),
    
    -- Timestamps
    opened_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    closed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Metadata
    metadata JSONB DEFAULT '{}'
);

-- ============================================================================
-- TRADING STRATEGIES TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS trading.strategies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    type VARCHAR(50) NOT NULL, -- 'arbitrage', 'market_making', 'trend_following', etc.
    status VARCHAR(20) NOT NULL DEFAULT 'inactive' CHECK (status IN ('active', 'inactive', 'testing', 'failed')),
    
    -- Configuration
    parameters JSONB NOT NULL DEFAULT '{}',
    risk_parameters JSONB DEFAULT '{}',
    
    -- Performance tracking
    total_trades INTEGER DEFAULT 0,
    winning_trades INTEGER DEFAULT 0,
    losing_trades INTEGER DEFAULT 0,
    total_pnl DECIMAL(20,8) DEFAULT 0,
    sharpe_ratio DECIMAL(10,4),
    max_drawdown DECIMAL(10,4),
    win_rate DECIMAL(5,4),
    
    -- Activation control
    is_paper_trading BOOLEAN DEFAULT true,
    is_active BOOLEAN DEFAULT false,
    last_execution TIMESTAMPTZ,
    
    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Metadata
    metadata JSONB DEFAULT '{}'
);

-- ============================================================================
-- TRADES HISTORY TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS trading.trades (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    position_id UUID REFERENCES trading.positions(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    strategy_id UUID REFERENCES trading.strategies(id) ON DELETE SET NULL,
    
    -- Trade details
    exchange VARCHAR(50) NOT NULL,
    symbol VARCHAR(50) NOT NULL,
    side VARCHAR(10) NOT NULL CHECK (side IN ('buy', 'sell')),
    type VARCHAR(20) NOT NULL DEFAULT 'market' CHECK (type IN ('market', 'limit', 'stop', 'stop_limit')),
    
    -- Execution details
    quantity DECIMAL(20,8) NOT NULL,
    price DECIMAL(20,8) NOT NULL,
    fee DECIMAL(20,8) DEFAULT 0,
    fee_currency VARCHAR(10),
    
    -- Order information
    exchange_order_id VARCHAR(255),
    status VARCHAR(20) NOT NULL DEFAULT 'executed' CHECK (status IN ('pending', 'executed', 'cancelled', 'failed')),
    
    -- Analysis
    ai_analysis JSONB,
    confidence_score DECIMAL(5,4),
    
    -- Timestamps
    executed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Metadata
    metadata JSONB DEFAULT '{}'
);

-- ============================================================================
-- MARKET DATA CACHE TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS trading.market_data_cache (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    exchange VARCHAR(50) NOT NULL,
    symbol VARCHAR(50) NOT NULL,
    timeframe VARCHAR(10) NOT NULL, -- '1m', '5m', '1h', '1d', etc.
    
    -- OHLCV data
    timestamp TIMESTAMPTZ NOT NULL,
    open DECIMAL(20,8) NOT NULL,
    high DECIMAL(20,8) NOT NULL,
    low DECIMAL(20,8) NOT NULL,
    close DECIMAL(20,8) NOT NULL,
    volume DECIMAL(20,8) NOT NULL,
    
    -- Technical indicators (computed)
    indicators JSONB DEFAULT '{}',
    
    -- Metadata
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    UNIQUE(exchange, symbol, timeframe, timestamp)
);

-- ============================================================================
-- TRADING SIGNALS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS trading.signals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    strategy_id UUID REFERENCES trading.strategies(id) ON DELETE CASCADE,
    
    -- Signal details
    exchange VARCHAR(50) NOT NULL,
    symbol VARCHAR(50) NOT NULL,
    action VARCHAR(20) NOT NULL CHECK (action IN ('buy', 'sell', 'hold', 'close')),
    strength DECIMAL(5,4) NOT NULL CHECK (strength >= 0 AND strength <= 1),
    
    -- Analysis
    analysis JSONB NOT NULL,
    indicators_used JSONB DEFAULT '[]',
    
    -- Execution
    is_executed BOOLEAN DEFAULT false,
    position_id UUID REFERENCES trading.positions(id) ON DELETE SET NULL,
    
    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ,
    executed_at TIMESTAMPTZ,
    
    -- Metadata
    metadata JSONB DEFAULT '{}'
);

-- ============================================================================
-- BACKTESTING RESULTS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS trading.backtest_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    strategy_id UUID REFERENCES trading.strategies(id) ON DELETE CASCADE,
    
    -- Test parameters
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    initial_capital DECIMAL(20,8) NOT NULL,
    
    -- Results
    final_capital DECIMAL(20,8) NOT NULL,
    total_return DECIMAL(10,4),
    total_trades INTEGER NOT NULL,
    winning_trades INTEGER NOT NULL,
    losing_trades INTEGER NOT NULL,
    
    -- Performance metrics
    sharpe_ratio DECIMAL(10,4),
    sortino_ratio DECIMAL(10,4),
    max_drawdown DECIMAL(10,4),
    win_rate DECIMAL(5,4),
    profit_factor DECIMAL(10,4),
    
    -- Detailed results
    trades JSONB NOT NULL DEFAULT '[]',
    equity_curve JSONB NOT NULL DEFAULT '[]',
    
    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    
    -- Metadata
    metadata JSONB DEFAULT '{}'
);

-- ============================================================================
-- TRADING CONFIGURATION TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS trading.config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    config_key VARCHAR(100) NOT NULL,
    config_value JSONB NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, config_key)
);

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================

-- Positions indexes
CREATE INDEX idx_trading_positions_user_status ON trading.positions(user_id, status);
CREATE INDEX idx_trading_positions_symbol ON trading.positions(symbol);
CREATE INDEX idx_trading_positions_opened_at ON trading.positions(opened_at DESC);
CREATE INDEX idx_trading_positions_strategy ON trading.positions(strategy_id);

-- Trades indexes
CREATE INDEX idx_trading_trades_user ON trading.trades(user_id);
CREATE INDEX idx_trading_trades_position ON trading.trades(position_id);
CREATE INDEX idx_trading_trades_executed_at ON trading.trades(executed_at DESC);
CREATE INDEX idx_trading_trades_symbol ON trading.trades(symbol);

-- Market data indexes
CREATE INDEX idx_market_data_lookup ON trading.market_data_cache(exchange, symbol, timeframe, timestamp DESC);
CREATE INDEX idx_market_data_timestamp ON trading.market_data_cache(timestamp DESC);

-- Signals indexes
CREATE INDEX idx_trading_signals_strategy ON trading.signals(strategy_id);
CREATE INDEX idx_trading_signals_symbol ON trading.signals(symbol);
CREATE INDEX idx_trading_signals_created ON trading.signals(created_at DESC);
CREATE INDEX idx_trading_signals_not_executed ON trading.signals(is_executed) WHERE is_executed = false;

-- Strategies indexes
CREATE INDEX idx_trading_strategies_user ON trading.strategies(user_id);
CREATE INDEX idx_trading_strategies_active ON trading.strategies(is_active) WHERE is_active = true;

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Update timestamp trigger
CREATE OR REPLACE FUNCTION trading.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to tables with updated_at
CREATE TRIGGER update_trading_positions_updated_at BEFORE UPDATE ON trading.positions
    FOR EACH ROW EXECUTE FUNCTION trading.update_updated_at_column();

CREATE TRIGGER update_trading_strategies_updated_at BEFORE UPDATE ON trading.strategies
    FOR EACH ROW EXECUTE FUNCTION trading.update_updated_at_column();

CREATE TRIGGER update_trading_config_updated_at BEFORE UPDATE ON trading.config
    FOR EACH ROW EXECUTE FUNCTION trading.update_updated_at_column();

-- ============================================================================
-- DEFAULT CONFIGURATION
-- ============================================================================

-- Insert default trading configuration
INSERT INTO trading.config (user_id, config_key, config_value, description) VALUES
    (NULL, 'global.trading_mode', '"paper"', 'Trading mode: paper or live'),
    (NULL, 'global.max_position_size_usd', '1000', 'Maximum position size in USD'),
    (NULL, 'global.max_open_positions', '5', 'Maximum number of open positions'),
    (NULL, 'global.risk_per_trade', '0.02', 'Maximum risk per trade (2%)'),
    (NULL, 'global.stop_loss_percentage', '0.05', 'Default stop loss (5%)'),
    (NULL, 'global.take_profit_percentage', '0.10', 'Default take profit (10%)'),
    (NULL, 'global.enable_trailing_stop', 'false', 'Enable trailing stop by default'),
    (NULL, 'global.min_confidence_score', '0.7', 'Minimum confidence score to execute trade')
ON CONFLICT (user_id, config_key) DO NOTHING;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON SCHEMA trading IS 'Trading Intelligence module schema';
COMMENT ON TABLE trading.positions IS 'Active and historical trading positions';
COMMENT ON TABLE trading.strategies IS 'Trading strategies configuration and performance';
COMMENT ON TABLE trading.trades IS 'Executed trades history';
COMMENT ON TABLE trading.market_data_cache IS 'Cached market data for analysis';
COMMENT ON TABLE trading.signals IS 'Trading signals generated by strategies';
COMMENT ON TABLE trading.backtest_results IS 'Historical backtesting results';
COMMENT ON TABLE trading.config IS 'Trading module configuration';