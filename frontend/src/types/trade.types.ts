// Trade types for frontend
export interface Trade {
  id: string;
  userId: string;
  strategyId?: string;
  positionId?: string;
  symbol: string;
  side: string;
  type: string;
  quantity: number;
  price: number;
  avgFillPrice?: number;
  fees?: number;
  status: string;
  exchange: string;
  exchangeOrderId?: string;
  metadata?: any;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface CreateTrade {
  userId: string;
  strategyId?: string;
  positionId?: string;
  symbol: string;
  side: string;
  type: string;
  quantity: number;
  price: number;
  avgFillPrice?: number;
  fees?: number;
  status: string;
  exchange: string;
  exchangeOrderId?: string;
  metadata?: any;
}

export interface UpdateTrade extends Partial<CreateTrade> {
  id: string;
}

export interface TradeQuery {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  // Add model-specific query filters based on your needs
}