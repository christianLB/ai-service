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
  equityCurve: Array<{ date: string; equity: number }>;
  trades: Array<{
    symbol: string;
    side: string;
    entryDate: string;
    exitDate: string;
    pnl: number;
  }>;
}

export interface TradingWebSocket {
  subscribe: (channels: string[]) => void;
  unsubscribe: (channels: string[]) => void;
  on: (event: string, callback: (data: unknown) => void) => void;
  off: (event: string, callback?: (data: unknown) => void) => void;
  disconnect: () => void;
}

class TradingService {
  private wsUrl: string;
  private socket: Socket | null = null;
  private maxReconnectAttempts = 5;

  constructor() {
    this.wsUrl = import.meta.env.VITE_WS_URL || 'wss://ai-service.anaxi.net';
  }

  // WebSocket Management
  connectWebSocket(): TradingWebSocket {
    if (!this.socket || this.socket.disconnected) {
      const token = localStorage.getItem('auth_token');
      
      this.socket = io(this.wsUrl, {
        path: '/ws/trading',
        auth: {
          token: token || ''
        },
        transports: ['websocket'],
        reconnection: true,
        reconnectionAttempts: this.maxReconnectAttempts,
        reconnectionDelay: 1000,
      });

      this.socket.on('connect', () => {
        console.log('Trading WebSocket connected');
      });

      this.socket.on('disconnect', () => {
        console.log('Trading WebSocket disconnected');
      });

      this.socket.on('error', (error) => {
        console.error('Trading WebSocket error:', error);
      });
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
  async getDashboard() {
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
    return response.data;
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
    return response.data;
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
    return response.data;
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

  async getPerformanceMetrics() {
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
}

export const tradingService = new TradingService();