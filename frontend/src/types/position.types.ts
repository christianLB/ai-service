// Position types for frontend
export interface Position {
  id: string;
  userId: string;
  strategyId?: string;
  symbol: string;
  side: string;
  quantity: number;
  avgEntryPrice: number;
  avgExitPrice?: number;
  realizedPnl?: number;
  unrealizedPnl?: number;
  fees?: number;
  status: string;
  exchange: string;
  openedAt: Date | string;
  closedAt?: Date | string;
  metadata?: any;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface CreatePosition {
  userId: string;
  strategyId?: string;
  symbol: string;
  side: string;
  quantity: number;
  avgEntryPrice: number;
  avgExitPrice?: number;
  realizedPnl?: number;
  unrealizedPnl?: number;
  fees?: number;
  status: string;
  exchange: string;
  openedAt: Date | string;
  closedAt?: Date | string;
  metadata?: any;
}

export interface UpdatePosition extends Partial<CreatePosition> {
  id: string;
}

export interface PositionQuery {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  // Add model-specific query filters based on your needs
}