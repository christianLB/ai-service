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
  quoteVolume?: number | null;
  trades?: number | null;
  timeframe: string;
  metadata?: any | null;
  createdAt: Date | string;
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
  quoteVolume?: number | null;
  trades?: number | null;
  timeframe: string;
  metadata?: any | null;
}

export interface UpdateMarketData {
  open?: number;
  high?: number;
  low?: number;
  close?: number;
  volume?: number;
  quoteVolume?: number | null;
  trades?: number | null;
  timeframe?: string;
  metadata?: any | null;
}