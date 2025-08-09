// MarketData types for frontend
export interface MarketData {
  id: string;
  exchangeId: string;
  tradingPairId: string;
  timestamp: Date | string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  quoteVolume?: number;
  trades?: number;
  timeframe: string;
  metadata?: any;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface CreateMarketData {
  exchangeId: string;
  tradingPairId: string;
  timestamp: Date | string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  quoteVolume?: number;
  trades?: number;
  timeframe: string;
  metadata?: any;
}

export interface UpdateMarketData extends Partial<CreateMarketData> {
  id: string;
}

export interface MarketDataQuery {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  // Add model-specific query filters based on your needs
}