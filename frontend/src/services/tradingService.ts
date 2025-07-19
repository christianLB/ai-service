import { io, Socket } from 'socket.io-client';

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
  [key: string]: any;
}

export interface ParameterSchema {
  type: 'number' | 'string' | 'boolean';
  label: string;
  description?: string;
  min?: number;
  max?: number;
  step?: number;
  default?: any;
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
  on: (event: string, callback: (data: any) => void) => void;
  off: (event: string, callback?: (data: any) => void) => void;
  disconnect: () => void;
}

class TradingService {
  private apiUrl: string;
  private wsUrl: string;
  private socket: Socket | null = null;
  private maxReconnectAttempts = 5;

  constructor() {
    this.apiUrl = import.meta.env.VITE_API_URL || 'https://ai-service.anaxi.net/api';
    this.wsUrl = import.meta.env.VITE_WS_URL || 'wss://ai-service.anaxi.net';
  }

  // WebSocket Management
  connectWebSocket(): TradingWebSocket {
    if (!this.socket || this.socket.disconnected) {
      this.socket = io(this.wsUrl, {
        path: '/ws/trading',
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
      on: (event: string, callback: (data: any) => void) => {
        this.socket?.on(event, callback);
      },
      off: (event: string, callback?: (data: any) => void) => {
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
    const response = await fetch(`${this.apiUrl}/trading/dashboard/overview`, {
      credentials: 'include',
    });
    if (!response.ok) throw new Error('Failed to fetch dashboard');
    return response.json();
  }

  async getMetrics() {
    const response = await fetch(`${this.apiUrl}/trading/dashboard/metrics`, {
      credentials: 'include',
    });
    if (!response.ok) throw new Error('Failed to fetch metrics');
    return response.json();
  }

  // Positions API
  async getPositions(status: 'open' | 'closed' | 'all' = 'open'): Promise<Position[]> {
    const response = await fetch(`${this.apiUrl}/trading/positions?status=${status}`, {
      credentials: 'include',
    });
    if (!response.ok) throw new Error('Failed to fetch positions');
    return response.json();
  }

  async getPosition(id: string): Promise<Position> {
    const response = await fetch(`${this.apiUrl}/trading/positions/${id}`, {
      credentials: 'include',
    });
    if (!response.ok) throw new Error('Failed to fetch position');
    return response.json();
  }

  async closePosition(id: string, reason: string = 'manual_close') {
    const response = await fetch(`${this.apiUrl}/trading/positions/close/${id}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ reason, market: true }),
    });
    if (!response.ok) throw new Error('Failed to close position');
    return response.json();
  }

  async updatePositionSLTP(id: string, stopLoss: number, takeProfit: number) {
    const response = await fetch(`${this.apiUrl}/trading/positions/${id}/sl-tp`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ stopLoss, takeProfit }),
    });
    if (!response.ok) throw new Error('Failed to update SL/TP');
    return response.json();
  }

  // Strategies API
  async getStrategies(): Promise<Strategy[]> {
    const response = await fetch(`${this.apiUrl}/trading/strategies`, {
      credentials: 'include',
    });
    if (!response.ok) throw new Error('Failed to fetch strategies');
    return response.json();
  }

  async getStrategy(id: string): Promise<Strategy> {
    const response = await fetch(`${this.apiUrl}/trading/strategies/${id}`, {
      credentials: 'include',
    });
    if (!response.ok) throw new Error('Failed to fetch strategy');
    return response.json();
  }

  async startStrategy(id: string) {
    const response = await fetch(`${this.apiUrl}/trading/strategies/${id}/start`, {
      method: 'POST',
      credentials: 'include',
    });
    if (!response.ok) throw new Error('Failed to start strategy');
    return response.json();
  }

  async stopStrategy(id: string) {
    const response = await fetch(`${this.apiUrl}/trading/strategies/${id}/stop`, {
      method: 'POST',
      credentials: 'include',
    });
    if (!response.ok) throw new Error('Failed to stop strategy');
    return response.json();
  }

  async pauseStrategy(id: string) {
    const response = await fetch(`${this.apiUrl}/trading/strategies/${id}/pause`, {
      method: 'POST',
      credentials: 'include',
    });
    if (!response.ok) throw new Error('Failed to pause strategy');
    return response.json();
  }

  async updateStrategyParams(id: string, params: StrategyParams) {
    const response = await fetch(`${this.apiUrl}/trading/strategies/${id}/params`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(params),
    });
    if (!response.ok) throw new Error('Failed to update strategy parameters');
    return response.json();
  }

  async getStrategyPerformance(id: string) {
    const response = await fetch(`${this.apiUrl}/trading/strategies/${id}/performance`, {
      credentials: 'include',
    });
    if (!response.ok) throw new Error('Failed to fetch strategy performance');
    return response.json();
  }

  // Signals API
  async getSignals(limit: number = 50) {
    const response = await fetch(`${this.apiUrl}/trading/signals?limit=${limit}`, {
      credentials: 'include',
    });
    if (!response.ok) throw new Error('Failed to fetch signals');
    return response.json();
  }

  async createManualSignal(signal: {
    exchange: string;
    symbol: string;
    side: 'buy' | 'sell';
    strength: number;
    reason: string;
  }) {
    const response = await fetch(`${this.apiUrl}/trading/signals/manual`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(signal),
    });
    if (!response.ok) throw new Error('Failed to create manual signal');
    return response.json();
  }

  // Backtest API
  async runBacktest(request: BacktestRequest): Promise<{ taskId: string }> {
    const response = await fetch(`${this.apiUrl}/trading/backtest/run`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(request),
    });
    if (!response.ok) throw new Error('Failed to start backtest');
    return response.json();
  }

  async getBacktestResults(limit: number = 10): Promise<BacktestResult[]> {
    const response = await fetch(`${this.apiUrl}/trading/backtest/results?limit=${limit}`, {
      credentials: 'include',
    });
    if (!response.ok) throw new Error('Failed to fetch backtest results');
    return response.json();
  }

  async getBacktestResult(id: string): Promise<BacktestResult> {
    const response = await fetch(`${this.apiUrl}/trading/backtest/results/${id}`, {
      credentials: 'include',
    });
    if (!response.ok) throw new Error('Failed to fetch backtest result');
    return response.json();
  }

  async optimizeStrategy(request: {
    strategyId: string;
    startDate: string;
    endDate: string;
    symbols: string[];
    parameterRanges: Record<string, { min: number; max: number; step: number }>;
  }) {
    const response = await fetch(`${this.apiUrl}/trading/backtest/optimize`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(request),
    });
    if (!response.ok) throw new Error('Failed to start optimization');
    return response.json();
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
    const response = await fetch(`${this.apiUrl}/trading/execute`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(trade),
    });
    if (!response.ok) throw new Error('Failed to execute trade');
    return response.json();
  }

  async analyzeMarket(params: {
    exchange: string;
    symbol: string;
    timeframe?: string;
  }) {
    const response = await fetch(`${this.apiUrl}/trading/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(params),
    });
    if (!response.ok) throw new Error('Failed to analyze market');
    return response.json();
  }

  // Configuration
  async getExchanges() {
    const response = await fetch(`${this.apiUrl}/trading/config/exchanges`, {
      credentials: 'include',
    });
    if (!response.ok) throw new Error('Failed to fetch exchanges');
    return response.json();
  }

  async getSymbols(exchange: string) {
    const response = await fetch(`${this.apiUrl}/trading/config/symbols?exchange=${exchange}`, {
      credentials: 'include',
    });
    if (!response.ok) throw new Error('Failed to fetch symbols');
    return response.json();
  }

  async getPerformanceMetrics() {
    const response = await fetch(`${this.apiUrl}/trading/performance/metrics`, {
      credentials: 'include',
    });
    if (!response.ok) throw new Error('Failed to fetch performance metrics');
    return response.json();
  }

  async updateRiskParams(params: {
    maxPositionSize: number;
    maxDailyLoss: number;
    maxDrawdown: number;
    maxLeverage: number;
  }) {
    const response = await fetch(`${this.apiUrl}/trading/config/risk-params`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(params),
    });
    if (!response.ok) throw new Error('Failed to update risk parameters');
    return response.json();
  }

  // Emergency Controls
  async emergencyStop() {
    const response = await fetch(`${this.apiUrl}/trading/emergency/stop-all`, {
      method: 'POST',
      credentials: 'include',
    });
    if (!response.ok) throw new Error('Failed to execute emergency stop');
    return response.json();
  }

  async closeAllPositions() {
    const response = await fetch(`${this.apiUrl}/trading/positions/close-all`, {
      method: 'POST',
      credentials: 'include',
    });
    if (!response.ok) throw new Error('Failed to close all positions');
    return response.json();
  }
}

export const tradingService = new TradingService();