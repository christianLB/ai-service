// generated with @7nohe/openapi-react-query-codegen@1.6.2 

import { type QueryClient } from "@tanstack/react-query";
import { ArbitrageService, MarketDataService, StrategiesService, TradingService } from "../requests/services.gen";
import * as Common from "./common";
export const ensureUseStrategiesServiceGetTradingStrategiesData = (queryClient: QueryClient, { active, limit, page }: {
  active?: boolean;
  limit?: number;
  page?: number;
} = {}) => queryClient.ensureQueryData({ queryKey: Common.UseStrategiesServiceGetTradingStrategiesKeyFn({ active, limit, page }), queryFn: () => StrategiesService.getTradingStrategies({ active, limit, page }) });
export const ensureUseStrategiesServiceGetTradingStrategiesByStrategyIdData = (queryClient: QueryClient, { strategyId }: {
  strategyId: string;
}) => queryClient.ensureQueryData({ queryKey: Common.UseStrategiesServiceGetTradingStrategiesByStrategyIdKeyFn({ strategyId }), queryFn: () => StrategiesService.getTradingStrategiesByStrategyId({ strategyId }) });
export const ensureUseTradingServiceGetTradesData = (queryClient: QueryClient, { endDate, exchange, limit, page, side, startDate, symbol }: {
  endDate?: string;
  exchange?: "binance" | "coinbase" | "alpaca";
  limit?: number;
  page?: number;
  side?: "buy" | "sell";
  startDate?: string;
  symbol?: string;
} = {}) => queryClient.ensureQueryData({ queryKey: Common.UseTradingServiceGetTradesKeyFn({ endDate, exchange, limit, page, side, startDate, symbol }), queryFn: () => TradingService.getTrades({ endDate, exchange, limit, page, side, startDate, symbol }) });
export const ensureUseTradingServiceGetTradesByTradeIdData = (queryClient: QueryClient, { tradeId }: {
  tradeId: string;
}) => queryClient.ensureQueryData({ queryKey: Common.UseTradingServiceGetTradesByTradeIdKeyFn({ tradeId }), queryFn: () => TradingService.getTradesByTradeId({ tradeId }) });
export const ensureUseTradingServiceGetTradesSearchData = (queryClient: QueryClient, { limit, maxAmount, minAmount, page, query }: {
  limit?: number;
  maxAmount?: number;
  minAmount?: number;
  page?: number;
  query: string;
}) => queryClient.ensureQueryData({ queryKey: Common.UseTradingServiceGetTradesSearchKeyFn({ limit, maxAmount, minAmount, page, query }), queryFn: () => TradingService.getTradesSearch({ limit, maxAmount, minAmount, page, query }) });
export const ensureUseTradingServiceGetTradingPositionsData = (queryClient: QueryClient, { exchange, limit, page, side, symbol }: {
  exchange?: "binance" | "coinbase" | "alpaca";
  limit?: number;
  page?: number;
  side?: "long" | "short";
  symbol?: string;
} = {}) => queryClient.ensureQueryData({ queryKey: Common.UseTradingServiceGetTradingPositionsKeyFn({ exchange, limit, page, side, symbol }), queryFn: () => TradingService.getTradingPositions({ exchange, limit, page, side, symbol }) });
export const ensureUseTradingServiceGetTradingPositionsByPositionIdData = (queryClient: QueryClient, { positionId }: {
  positionId: string;
}) => queryClient.ensureQueryData({ queryKey: Common.UseTradingServiceGetTradingPositionsByPositionIdKeyFn({ positionId }), queryFn: () => TradingService.getTradingPositionsByPositionId({ positionId }) });
export const ensureUseTradingServiceGetTradingBalanceData = (queryClient: QueryClient, { exchange }: {
  exchange?: "binance" | "coinbase" | "alpaca";
} = {}) => queryClient.ensureQueryData({ queryKey: Common.UseTradingServiceGetTradingBalanceKeyFn({ exchange }), queryFn: () => TradingService.getTradingBalance({ exchange }) });
export const ensureUseMarketDataServiceGetTradingMarketDataData = (queryClient: QueryClient, { exchange, symbol }: {
  exchange?: "binance" | "coinbase" | "alpaca";
  symbol: string;
}) => queryClient.ensureQueryData({ queryKey: Common.UseMarketDataServiceGetTradingMarketDataKeyFn({ exchange, symbol }), queryFn: () => MarketDataService.getTradingMarketData({ exchange, symbol }) });
export const ensureUseArbitrageServiceGetArbitrageStatusData = (queryClient: QueryClient) => queryClient.ensureQueryData({ queryKey: Common.UseArbitrageServiceGetArbitrageStatusKeyFn(), queryFn: () => ArbitrageService.getArbitrageStatus() });
