// generated with @7nohe/openapi-react-query-codegen@1.6.2 

import { UseQueryResult } from "@tanstack/react-query";
import { ArbitrageService, BacktestingService, MarketDataService, StrategiesService, TradingService } from "../requests/services.gen";
export type StrategiesServiceGetTradingStrategiesDefaultResponse = Awaited<ReturnType<typeof StrategiesService.getTradingStrategies>>;
export type StrategiesServiceGetTradingStrategiesQueryResult<TData = StrategiesServiceGetTradingStrategiesDefaultResponse, TError = unknown> = UseQueryResult<TData, TError>;
export const useStrategiesServiceGetTradingStrategiesKey = "StrategiesServiceGetTradingStrategies";
export const UseStrategiesServiceGetTradingStrategiesKeyFn = ({ active, limit, page }: {
  active?: boolean;
  limit?: number;
  page?: number;
} = {}, queryKey?: Array<unknown>) => [useStrategiesServiceGetTradingStrategiesKey, ...(queryKey ?? [{ active, limit, page }])];
export type StrategiesServiceGetTradingStrategiesByStrategyIdDefaultResponse = Awaited<ReturnType<typeof StrategiesService.getTradingStrategiesByStrategyId>>;
export type StrategiesServiceGetTradingStrategiesByStrategyIdQueryResult<TData = StrategiesServiceGetTradingStrategiesByStrategyIdDefaultResponse, TError = unknown> = UseQueryResult<TData, TError>;
export const useStrategiesServiceGetTradingStrategiesByStrategyIdKey = "StrategiesServiceGetTradingStrategiesByStrategyId";
export const UseStrategiesServiceGetTradingStrategiesByStrategyIdKeyFn = ({ strategyId }: {
  strategyId: string;
}, queryKey?: Array<unknown>) => [useStrategiesServiceGetTradingStrategiesByStrategyIdKey, ...(queryKey ?? [{ strategyId }])];
export type TradingServiceGetTradesDefaultResponse = Awaited<ReturnType<typeof TradingService.getTrades>>;
export type TradingServiceGetTradesQueryResult<TData = TradingServiceGetTradesDefaultResponse, TError = unknown> = UseQueryResult<TData, TError>;
export const useTradingServiceGetTradesKey = "TradingServiceGetTrades";
export const UseTradingServiceGetTradesKeyFn = ({ endDate, exchange, limit, page, side, startDate, symbol }: {
  endDate?: string;
  exchange?: "binance" | "coinbase" | "alpaca";
  limit?: number;
  page?: number;
  side?: "buy" | "sell";
  startDate?: string;
  symbol?: string;
} = {}, queryKey?: Array<unknown>) => [useTradingServiceGetTradesKey, ...(queryKey ?? [{ endDate, exchange, limit, page, side, startDate, symbol }])];
export type TradingServiceGetTradesByTradeIdDefaultResponse = Awaited<ReturnType<typeof TradingService.getTradesByTradeId>>;
export type TradingServiceGetTradesByTradeIdQueryResult<TData = TradingServiceGetTradesByTradeIdDefaultResponse, TError = unknown> = UseQueryResult<TData, TError>;
export const useTradingServiceGetTradesByTradeIdKey = "TradingServiceGetTradesByTradeId";
export const UseTradingServiceGetTradesByTradeIdKeyFn = ({ tradeId }: {
  tradeId: string;
}, queryKey?: Array<unknown>) => [useTradingServiceGetTradesByTradeIdKey, ...(queryKey ?? [{ tradeId }])];
export type TradingServiceGetTradesSearchDefaultResponse = Awaited<ReturnType<typeof TradingService.getTradesSearch>>;
export type TradingServiceGetTradesSearchQueryResult<TData = TradingServiceGetTradesSearchDefaultResponse, TError = unknown> = UseQueryResult<TData, TError>;
export const useTradingServiceGetTradesSearchKey = "TradingServiceGetTradesSearch";
export const UseTradingServiceGetTradesSearchKeyFn = ({ limit, maxAmount, minAmount, page, query }: {
  limit?: number;
  maxAmount?: number;
  minAmount?: number;
  page?: number;
  query: string;
}, queryKey?: Array<unknown>) => [useTradingServiceGetTradesSearchKey, ...(queryKey ?? [{ limit, maxAmount, minAmount, page, query }])];
export type TradingServiceGetTradingPositionsDefaultResponse = Awaited<ReturnType<typeof TradingService.getTradingPositions>>;
export type TradingServiceGetTradingPositionsQueryResult<TData = TradingServiceGetTradingPositionsDefaultResponse, TError = unknown> = UseQueryResult<TData, TError>;
export const useTradingServiceGetTradingPositionsKey = "TradingServiceGetTradingPositions";
export const UseTradingServiceGetTradingPositionsKeyFn = ({ exchange, limit, page, side, symbol }: {
  exchange?: "binance" | "coinbase" | "alpaca";
  limit?: number;
  page?: number;
  side?: "long" | "short";
  symbol?: string;
} = {}, queryKey?: Array<unknown>) => [useTradingServiceGetTradingPositionsKey, ...(queryKey ?? [{ exchange, limit, page, side, symbol }])];
export type TradingServiceGetTradingPositionsByPositionIdDefaultResponse = Awaited<ReturnType<typeof TradingService.getTradingPositionsByPositionId>>;
export type TradingServiceGetTradingPositionsByPositionIdQueryResult<TData = TradingServiceGetTradingPositionsByPositionIdDefaultResponse, TError = unknown> = UseQueryResult<TData, TError>;
export const useTradingServiceGetTradingPositionsByPositionIdKey = "TradingServiceGetTradingPositionsByPositionId";
export const UseTradingServiceGetTradingPositionsByPositionIdKeyFn = ({ positionId }: {
  positionId: string;
}, queryKey?: Array<unknown>) => [useTradingServiceGetTradingPositionsByPositionIdKey, ...(queryKey ?? [{ positionId }])];
export type TradingServiceGetTradingBalanceDefaultResponse = Awaited<ReturnType<typeof TradingService.getTradingBalance>>;
export type TradingServiceGetTradingBalanceQueryResult<TData = TradingServiceGetTradingBalanceDefaultResponse, TError = unknown> = UseQueryResult<TData, TError>;
export const useTradingServiceGetTradingBalanceKey = "TradingServiceGetTradingBalance";
export const UseTradingServiceGetTradingBalanceKeyFn = ({ exchange }: {
  exchange?: "binance" | "coinbase" | "alpaca";
} = {}, queryKey?: Array<unknown>) => [useTradingServiceGetTradingBalanceKey, ...(queryKey ?? [{ exchange }])];
export type MarketDataServiceGetTradingMarketDataDefaultResponse = Awaited<ReturnType<typeof MarketDataService.getTradingMarketData>>;
export type MarketDataServiceGetTradingMarketDataQueryResult<TData = MarketDataServiceGetTradingMarketDataDefaultResponse, TError = unknown> = UseQueryResult<TData, TError>;
export const useMarketDataServiceGetTradingMarketDataKey = "MarketDataServiceGetTradingMarketData";
export const UseMarketDataServiceGetTradingMarketDataKeyFn = ({ exchange, symbol }: {
  exchange?: "binance" | "coinbase" | "alpaca";
  symbol: string;
}, queryKey?: Array<unknown>) => [useMarketDataServiceGetTradingMarketDataKey, ...(queryKey ?? [{ exchange, symbol }])];
export type ArbitrageServiceGetArbitrageStatusDefaultResponse = Awaited<ReturnType<typeof ArbitrageService.getArbitrageStatus>>;
export type ArbitrageServiceGetArbitrageStatusQueryResult<TData = ArbitrageServiceGetArbitrageStatusDefaultResponse, TError = unknown> = UseQueryResult<TData, TError>;
export const useArbitrageServiceGetArbitrageStatusKey = "ArbitrageServiceGetArbitrageStatus";
export const UseArbitrageServiceGetArbitrageStatusKeyFn = (queryKey?: Array<unknown>) => [useArbitrageServiceGetArbitrageStatusKey, ...(queryKey ?? [])];
export type StrategiesServicePostTradingStrategiesMutationResult = Awaited<ReturnType<typeof StrategiesService.postTradingStrategies>>;
export type StrategiesServicePostTradingStrategiesByStrategyIdActivateMutationResult = Awaited<ReturnType<typeof StrategiesService.postTradingStrategiesByStrategyIdActivate>>;
export type StrategiesServicePostTradingStrategiesByStrategyIdDeactivateMutationResult = Awaited<ReturnType<typeof StrategiesService.postTradingStrategiesByStrategyIdDeactivate>>;
export type TradingServicePostTradesMutationResult = Awaited<ReturnType<typeof TradingService.postTrades>>;
export type TradingServicePostTradingPositionsMutationResult = Awaited<ReturnType<typeof TradingService.postTradingPositions>>;
export type TradingServicePostTradingExecuteMutationResult = Awaited<ReturnType<typeof TradingService.postTradingExecute>>;
export type ArbitrageServicePostArbitrageDeployMutationResult = Awaited<ReturnType<typeof ArbitrageService.postArbitrageDeploy>>;
export type ArbitrageServicePostArbitrageStopMutationResult = Awaited<ReturnType<typeof ArbitrageService.postArbitrageStop>>;
export type BacktestingServicePostTradingBacktestMutationResult = Awaited<ReturnType<typeof BacktestingService.postTradingBacktest>>;
export type StrategiesServicePutTradingStrategiesByStrategyIdMutationResult = Awaited<ReturnType<typeof StrategiesService.putTradingStrategiesByStrategyId>>;
export type TradingServicePutTradesByTradeIdMutationResult = Awaited<ReturnType<typeof TradingService.putTradesByTradeId>>;
export type TradingServicePutTradingPositionsByPositionIdMutationResult = Awaited<ReturnType<typeof TradingService.putTradingPositionsByPositionId>>;
export type StrategiesServiceDeleteTradingStrategiesByStrategyIdMutationResult = Awaited<ReturnType<typeof StrategiesService.deleteTradingStrategiesByStrategyId>>;
export type TradingServiceDeleteTradesByTradeIdMutationResult = Awaited<ReturnType<typeof TradingService.deleteTradesByTradeId>>;
export type TradingServiceDeleteTradingPositionsByPositionIdMutationResult = Awaited<ReturnType<typeof TradingService.deleteTradingPositionsByPositionId>>;
