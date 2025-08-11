import { io, Socket } from 'socket.io-client';
import api from './api';

// Types
export interface Position {
  id: string;
  exchange: string;
  symbol: string;
  side: 'buy' | 'sell';
  quantity: number;
  entryPrice: number;
  currentPrice: number;
  positionValue: number;
  unrealizedPnl: number;
  realizedPnl?: number;
  stopLoss?: number;
  takeProfit?: number;
  strategyId?: string;
  strategyName?: string;
  openedAt: Date;
  closedAt?: Date;
}

export interface Strategy {
  id: string;
  name: string;
  description: string;
  status: 'active' | 'paused' | 'stopped';
  parameters: StrategyParams;
  parameterSchema: Record<string, ParameterSchema>;
  performance: {
    totalTrades: number;
    winRate: number;
    totalPnL: number;
    sharpeRatio: number;
    maxDrawdown: number;
  };
}

export interface StrategyParams {
  [key: string]: string | number | boolean | string[] | number[];
}

export interface ParameterSchema {
  type: 'number' | 'string' | 'boolean';
  label: string;
  description?: string;
  min?: number;
  max?: number;
  step?: number;
  default?: string | number | boolean;
}

export interface BacktestRequest {
  strategyId: string;
  startDate: string;
  endDate: string;
  symbols: string[];
  initialCapital?: number;
}

export interface BacktestResult {
  id: string;
  strategyId: string;
  startDate: string;
  endDate: string;
  symbols: string[];
  metrics: {
    totalReturn: number;
    sharpeRatio: number;
    maxDrawdown: number;
    winRate: number;
    totalTrades: number;
    profitFactor: number;
  };
  equityCurve: Array<{ date: string; value: number }>;
  trades: Array<{
    id: string;
    symbol: string;
    side: string;
    entryDate: string;
    exitDate: string;
    date: string;
    entryPrice: number;
    exitPrice: number;
    pnl: number;
    returnPct: number;
  }>;
}

export interface TradingWebSocket {
  subscribe: (channels: string[]) => void;
  unsubscribe: (channels: string[]) => void;
  on: (event: string, callback: (data: unknown) => void) => void;
  off: (event: string, callback?: (data: unknown) => void) => void;
  disconnect: () => void;
}

export interface DashboardAlert {
  id: string;
  type: 'success' | 'info' | 'warning' | 'error';
  message: string;
}

export interface DashboardData {
  alerts: DashboardAlert[];
  portfolio: {
    totalValue: number;
    dailyPnL: number;
    weeklyPnL: number;
    monthlyPnL: number;
  };
  positions: {
    open: number;
    profitable: number;
    losing: number;
    totalPnL: number;
  };
  strategies: {
    active: number;
    paused: number;
    stopped: number;
    performance: Record<string, number>;
  };
  marketOverview: {
    btcPrice: number;
    btcChange24h: number;
    marketCap: number;
    fearGreedIndex: number;
  };
}

export interface PerformanceMetrics {
  totalReturn: number;
  totalReturnPercent: number;
  sharpeRatio: number;
  maxDrawdown: number;
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  winRate: number;
  profitFactor: number;
  expectancy: number;
  avgWin: number;
  avgLoss: number;
  equity?: Array<{ date: string; value: number }>;
  monthlyReturns?: Array<{ month: string; return: number }>;
  tradeDistribution?: Array<{ range: string; count: number }>;
}

class TradingService {
  private wsUrl: string;
  private socket: Socket | null = null;
  private maxReconnectAttempts = 5;

  constructor() {
    // Use local WebSocket in development, production URL in production
    const isDevelopment = import.meta.env.DEV || window.location.hostname === 'localhost';
    this.wsUrl = isDevelopment 
      ? 'ws://localhost:3001' 
      : (import.meta.env.VITE_WS_URL || 'wss://ai-service.anaxi.net');
  }

  // WebSocket Management
  connectWebSocket(): TradingWebSocket {
    try {
      if (!this.socket || this.socket.disconnected) {
        const token = localStorage.getItem('auth_token');
        
        this.socket = io(this.wsUrl, {
          path: '/ws/trading',
          auth: {
            token: token || ''
          },
          transports: ['websocket', 'polling'], // Add polling as fallback
          reconnection: true,
          reconnectionAttempts: this.maxReconnectAttempts,
          reconnectionDelay: 1000,
          timeout: 10000, // Add timeout
        });

        this.socket.on('connect', () => {
          console.log('Trading WebSocket connected');
        });

        this.socket.on('disconnect', () => {
          console.log('Trading WebSocket disconnected');
        });

        this.socket.on('connect_error', (error) => {
          console.warn('Trading WebSocket connection error:', error.message);
          // Don't crash the app, just log the warning
        });

        this.socket.on('error', (error) => {
          console.warn('Trading WebSocket error:', error);
          // Don't crash the app, just log the warning
        });
      }
    } catch (error) {
      console.error('Failed to initialize WebSocket:', error);
      // Return a mock object that won't crash the app
      return this.getMockWebSocket();
    }

    return {
      subscribe: (channels: string[]) => {
        this.socket?.emit('subscribe', { channels });
      },
      unsubscribe: (channels: string[]) => {
        this.socket?.emit('unsubscribe', { channels });
      },
      on: (event: string, callback: (data: unknown) => void) => {
        this.socket?.on(event, callback);
      },
      off: (event: string, callback?: (data: unknown) => void) => {
        if (callback) {
          this.socket?.off(event, callback);
        } else {
          this.socket?.off(event);
        }
      },
      disconnect: () => {
        this.socket?.disconnect();
      },
    };
  }

  // Dashboard API
  async getDashboard(): Promise<DashboardData> {
    const response = await api.get('/trading/dashboard/overview');
    return response.data;
  }

  async getMetrics() {
    const response = await api.get('/trading/dashboard/metrics');
    return response.data;
  }

  // Positions API
  async getPositions(status: 'open' | 'closed' | 'all' = 'open'): Promise<Position[]> {
    const response = await api.get('/trading/positions', {
      params: { status }
    });
    // API returns { positions: [], summary: {...} }, we need just the array
    return response.data.positions || response.data || [];
  }

  async getPosition(id: string): Promise<Position> {
    const response = await api.get(`/trading/positions/${id}`);
    return response.data;
  }

  async closePosition(id: string, reason: string = 'manual_close') {
    const response = await api.post(`/trading/positions/close/${id}`, {
      reason,
      market: true
    });
    return response.data;
  }

  async updatePositionSLTP(id: string, stopLoss: number, takeProfit: number) {
    const response = await api.put(`/trading/positions/${id}/sl-tp`, {
      stopLoss,
      takeProfit
    });
    return response.data;
  }

  // Strategies API
  async getStrategies(): Promise<Strategy[]> {
    const response = await api.get('/trading/strategies');
    // API returns { strategies: [], total: 0 }, we need just the array
    return response.data.strategies || response.data || [];
  }

  async getStrategy(id: string): Promise<Strategy> {
    const response = await api.get(`/trading/strategies/${id}`);
    return response.data;
  }

  async startStrategy(id: string) {
    const response = await api.post(`/trading/strategies/${id}/start`);
    return response.data;
  }

  async stopStrategy(id: string) {
    const response = await api.post(`/trading/strategies/${id}/stop`);
    return response.data;
  }

  async pauseStrategy(id: string) {
    const response = await api.post(`/trading/strategies/${id}/pause`);
    return response.data;
  }

  async updateStrategyParams(id: string, params: StrategyParams) {
    const response = await api.put(`/trading/strategies/${id}/params`, params);
    return response.data;
  }

  async getStrategyPerformance(id: string) {
    const response = await api.get(`/trading/strategies/${id}/performance`);
    return response.data;
  }

  // Signals API
  async getSignals(limit: number = 50) {
    const response = await api.get('/trading/signals', {
      params: { limit }
    });
    return response.data;
  }

  async createManualSignal(signal: {
    exchange: string;
    symbol: string;
    side: 'buy' | 'sell';
    strength: number;
    reason: string;
  }) {
    const response = await api.post('/trading/signals/manual', signal);
    return response.data;
  }

  // Backtest API
  async runBacktest(request: BacktestRequest): Promise<{ taskId: string }> {
    const response = await api.post('/trading/backtest/run', request);
    return response.data;
  }

  async getBacktestResults(limit: number = 10): Promise<BacktestResult[]> {
    const response = await api.get('/trading/backtest/results', {
      params: { limit }
    });
    // Ensure we return an array, handle both { results: [] } and direct array
    return response.data.results || response.data || [];
  }

  async getBacktestResult(id: string): Promise<BacktestResult> {
    const response = await api.get(`/trading/backtest/results/${id}`);
    return response.data;
  }

  async optimizeStrategy(request: {
    strategyId: string;
    startDate: string;
    endDate: string;
    symbols: string[];
    parameterRanges: Record<string, { min: number; max: number; step: number }>;
  }) {
    const response = await api.post('/trading/backtest/optimize', request);
    return response.data;
  }

  // Trading Actions
  async executeTrade(trade: {
    exchange: string;
    symbol: string;
    side: 'buy' | 'sell';
    amount: number;
    type?: 'market' | 'limit';
    price?: number;
    strategyId?: string;
  }) {
    const response = await api.post('/trading/execute', trade);
    return response.data;
  }

  async analyzeMarket(params: {
    exchange: string;
    symbol: string;
    timeframe?: string;
  }) {
    const response = await api.post('/trading/analyze', params);
    return response.data;
  }

  // Configuration
  async getExchanges() {
    const response = await api.get('/trading/config/exchanges');
    return response.data;
  }

  async getSymbols(exchange: string) {
    const response = await api.get('/trading/config/symbols', {
      params: { exchange }
    });
    return response.data;
  }

  async getPerformanceMetrics(): Promise<PerformanceMetrics> {
    const response = await api.get('/trading/performance/metrics');
    return response.data;
  }

  async updateRiskParams(params: {
    maxPositionSize: number;
    maxDailyLoss: number;
    maxDrawdown: number;
    maxLeverage: number;
  }) {
    const response = await api.put('/trading/config/risk-params', params);
    return response.data;
  }

  // Emergency Controls
  async emergencyStop() {
    const response = await api.post('/trading/config/emergency/stop-all');
    return response.data;
  }

  async closeAllPositions() {
    const response = await api.post('/trading/positions/close-all');
    return response.data;
  }

  // Mock WebSocket for fallback when connection fails
  private getMockWebSocket(): TradingWebSocket {
    console.warn('Using mock WebSocket - real-time features disabled');
    return {
      subscribe: (channels: string[]) => {
        console.log('Mock subscribe:', channels);
      },
      unsubscribe: (channels: string[]) => {
        console.log('Mock unsubscribe:', channels);
      },
      on: (event: string, callback: (data: unknown) => void) => {
        console.log('Mock on:', event);
        void callback; // Intentionally unused in mock
      },
      off: (event: string, callback?: (data: unknown) => void) => {
        console.log('Mock off:', event);
        void callback; // Intentionally unused in mock
      },
      disconnect: () => {
        console.log('Mock disconnect');
      },
    };
  }
}

export const tradingService = new TradingService();