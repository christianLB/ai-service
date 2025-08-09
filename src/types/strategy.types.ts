import { Strategy as PrismaStrategy, StrategyTradingPair, Trade, Position, Alert, Order } from '@prisma/client';

export type Strategy = PrismaStrategy;

export interface CreateStrategy {
  userId?: string | null;
  name: string;
  type: string;
  status?: string;
  parameters?: any;
  risk_parameters?: any | null;
  is_paper_trading?: boolean | null;
  isActive?: boolean | null;
  metadata?: any | null;
}

export interface UpdateStrategy {
  name?: string;
  type?: string;
  status?: string;
  parameters?: any;
  risk_parameters?: any | null;
  total_trades?: number | null;
  winning_trades?: number | null;
  losing_trades?: number | null;
  total_pnl?: number | null;
  sharpe_ratio?: number | null;
  max_drawdown?: number | null;
  win_rate?: number | null;
  is_paper_trading?: boolean | null;
  isActive?: boolean | null;
  last_execution?: Date | null;
  metadata?: any | null;
}

export interface StrategyQuery {
  page: number;
  limit: number;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  userId?: string | null;
  status?: string;
  type?: string;
  isActive?: boolean;
  is_paper_trading?: boolean;
}

export interface StrategyWithRelations extends Strategy {
  strategyTradingPairs?: StrategyTradingPair[];
  trades?: Trade[];
  positions?: Position[];
  alerts?: Alert[];
  orders?: Order[];
}