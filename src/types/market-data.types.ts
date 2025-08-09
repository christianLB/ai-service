import { MarketData as PrismaMarketData, Exchange, TradingPair } from '@prisma/client';

export type MarketData = PrismaMarketData;

export interface CreateMarketData {
  exchangeId: string;
  tradingPairId: string;
  timestamp: Date;
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

export interface MarketDataQuery {
  page: number;
  limit: number;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  exchangeId?: string;
  tradingPairId?: string;
  timeframe?: string;
  startDate?: Date;
  endDate?: Date;
}

export interface MarketDataWithRelations extends MarketData {
  exchange?: Exchange;
  tradingPair?: TradingPair;
}