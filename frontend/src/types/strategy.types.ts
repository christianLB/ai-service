export interface Strategy {
  id: string;
  userId?: string | null;
  name: string;
  type: string;
  status: string;
  parameters: Record<string, any>;
  risk_parameters?: Record<string, any> | null;
  total_trades?: number | null;
  winning_trades?: number | null;
  losing_trades?: number | null;
  total_pnl?: number | null;
  sharpe_ratio?: number | null;
  max_drawdown?: number | null;
  win_rate?: number | null;
  is_paper_trading?: boolean | null;
  isActive?: boolean | null;
  last_execution?: Date | string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
  metadata?: Record<string, any> | null;
  config?: Record<string, any>;
  description?: string;
}

export interface CreateStrategy {
  name: string;
  type: string;
  status?: string;
  parameters?: Record<string, any>;
  config?: Record<string, any>;
  description?: string;
  isActive?: boolean;
}

export interface UpdateStrategy {
  name?: string;
  type?: string;
  status?: string;
  parameters?: Record<string, any>;
  risk_parameters?: Record<string, any> | null;
  isActive?: boolean;
  metadata?: Record<string, any> | null;
  config?: Record<string, any>;
  description?: string;
}

export interface StrategyQuery {
  page?: number;
  limit?: number;
  search?: string;
  type?: string;
  isActive?: boolean;
}