// generated with @7nohe/openapi-react-query-codegen@1.6.2 

import { UseQueryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { ArbitrageService, MarketDataService, StrategiesService, TradingService } from "../requests/services.gen";
import * as Common from "./common";
export const useStrategiesServiceGetTradingStrategiesSuspense = <TData = Common.StrategiesServiceGetTradingStrategiesDefaultResponse, TError = unknown, TQueryKey extends Array<unknown> = unknown[]>({ active, limit, page }: {
  active?: boolean;
  limit?: number;
  page?: number;
} = {}, queryKey?: TQueryKey, options?: Omit<UseQueryOptions<TData, TError>, "queryKey" | "queryFn">) => useSuspenseQuery<TData, TError>({ queryKey: Common.UseStrategiesServiceGetTradingStrategiesKeyFn({ active, limit, page }, queryKey), queryFn: () => StrategiesService.getTradingStrategies({ active, limit, page }) as TData, ...options });
export const useStrategiesServiceGetTradingStrategiesByStrategyIdSuspense = <TData = Common.StrategiesServiceGetTradingStrategiesByStrategyIdDefaultResponse, TError = unknown, TQueryKey extends Array<unknown> = unknown[]>({ strategyId }: {
  strategyId: string;
}, queryKey?: TQueryKey, options?: Omit<UseQueryOptions<TData, TError>, "queryKey" | "queryFn">) => useSuspenseQuery<TData, TError>({ queryKey: Common.UseStrategiesServiceGetTradingStrategiesByStrategyIdKeyFn({ strategyId }, queryKey), queryFn: () => StrategiesService.getTradingStrategiesByStrategyId({ strategyId }) as TData, ...options });
export const useTradingServiceGetTradesSuspense = <TData = Common.TradingServiceGetTradesDefaultResponse, TError = unknown, TQueryKey extends Array<unknown> = unknown[]>({ endDate, exchange, limit, page, side, startDate, symbol }: {
  endDate?: string;
  exchange?: "binance" | "coinbase" | "alpaca";
  limit?: number;
  page?: number;
  side?: "buy" | "sell";
  startDate?: string;
  symbol?: string;
} = {}, queryKey?: TQueryKey, options?: Omit<UseQueryOptions<TData, TError>, "queryKey" | "queryFn">) => useSuspenseQuery<TData, TError>({ queryKey: Common.UseTradingServiceGetTradesKeyFn({ endDate, exchange, limit, page, side, startDate, symbol }, queryKey), queryFn: () => TradingService.getTrades({ endDate, exchange, limit, page, side, startDate, symbol }) as TData, ...options });
export const useTradingServiceGetTradesByTradeIdSuspense = <TData = Common.TradingServiceGetTradesByTradeIdDefaultResponse, TError = unknown, TQueryKey extends Array<unknown> = unknown[]>({ tradeId }: {
  tradeId: string;
}, queryKey?: TQueryKey, options?: Omit<UseQueryOptions<TData, TError>, "queryKey" | "queryFn">) => useSuspenseQuery<TData, TError>({ queryKey: Common.UseTradingServiceGetTradesByTradeIdKeyFn({ tradeId }, queryKey), queryFn: () => TradingService.getTradesByTradeId({ tradeId }) as TData, ...options });
export const useTradingServiceGetTradesSearchSuspense = <TData = Common.TradingServiceGetTradesSearchDefaultResponse, TError = unknown, TQueryKey extends Array<unknown> = unknown[]>({ limit, maxAmount, minAmount, page, query }: {
  limit?: number;
  maxAmount?: number;
  minAmount?: number;
  page?: number;
  query: string;
}, queryKey?: TQueryKey, options?: Omit<UseQueryOptions<TData, TError>, "queryKey" | "queryFn">) => useSuspenseQuery<TData, TError>({ queryKey: Common.UseTradingServiceGetTradesSearchKeyFn({ limit, maxAmount, minAmount, page, query }, queryKey), queryFn: () => TradingService.getTradesSearch({ limit, maxAmount, minAmount, page, query }) as TData, ...options });
export const useTradingServiceGetTradingPositionsSuspense = <TData = Common.TradingServiceGetTradingPositionsDefaultResponse, TError = unknown, TQueryKey extends Array<unknown> = unknown[]>({ exchange, limit, page, side, symbol }: {
  exchange?: "binance" | "coinbase" | "alpaca";
  limit?: number;
  page?: number;
  side?: "long" | "short";
  symbol?: string;
} = {}, queryKey?: TQueryKey, options?: Omit<UseQueryOptions<TData, TError>, "queryKey" | "queryFn">) => useSuspenseQuery<TData, TError>({ queryKey: Common.UseTradingServiceGetTradingPositionsKeyFn({ exchange, limit, page, side, symbol }, queryKey), queryFn: () => TradingService.getTradingPositions({ exchange, limit, page, side, symbol }) as TData, ...options });
export const useTradingServiceGetTradingPositionsByPositionIdSuspense = <TData = Common.TradingServiceGetTradingPositionsByPositionIdDefaultResponse, TError = unknown, TQueryKey extends Array<unknown> = unknown[]>({ positionId }: {
  positionId: string;
}, queryKey?: TQueryKey, options?: Omit<UseQueryOptions<TData, TError>, "queryKey" | "queryFn">) => useSuspenseQuery<TData, TError>({ queryKey: Common.UseTradingServiceGetTradingPositionsByPositionIdKeyFn({ positionId }, queryKey), queryFn: () => TradingService.getTradingPositionsByPositionId({ positionId }) as TData, ...options });
export const useTradingServiceGetTradingBalanceSuspense = <TData = Common.TradingServiceGetTradingBalanceDefaultResponse, TError = unknown, TQueryKey extends Array<unknown> = unknown[]>({ exchange }: {
  exchange?: "binance" | "coinbase" | "alpaca";
} = {}, queryKey?: TQueryKey, options?: Omit<UseQueryOptions<TData, TError>, "queryKey" | "queryFn">) => useSuspenseQuery<TData, TError>({ queryKey: Common.UseTradingServiceGetTradingBalanceKeyFn({ exchange }, queryKey), queryFn: () => TradingService.getTradingBalance({ exchange }) as TData, ...options });
export const useMarketDataServiceGetTradingMarketDataSuspense = <TData = Common.MarketDataServiceGetTradingMarketDataDefaultResponse, TError = unknown, TQueryKey extends Array<unknown> = unknown[]>({ exchange, symbol }: {
  exchange?: "binance" | "coinbase" | "alpaca";
  symbol: string;
}, queryKey?: TQueryKey, options?: Omit<UseQueryOptions<TData, TError>, "queryKey" | "queryFn">) => useSuspenseQuery<TData, TError>({ queryKey: Common.UseMarketDataServiceGetTradingMarketDataKeyFn({ exchange, symbol }, queryKey), queryFn: () => MarketDataService.getTradingMarketData({ exchange, symbol }) as TData, ...options });
export const useArbitrageServiceGetArbitrageStatusSuspense = <TData = Common.ArbitrageServiceGetArbitrageStatusDefaultResponse, TError = unknown, TQueryKey extends Array<unknown> = unknown[]>(queryKey?: TQueryKey, options?: Omit<UseQueryOptions<TData, TError>, "queryKey" | "queryFn">) => useSuspenseQuery<TData, TError>({ queryKey: Common.UseArbitrageServiceGetArbitrageStatusKeyFn(queryKey), queryFn: () => ArbitrageService.getArbitrageStatus() as TData, ...options });
