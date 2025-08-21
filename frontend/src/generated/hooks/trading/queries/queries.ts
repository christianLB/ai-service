// generated with @7nohe/openapi-react-query-codegen@1.6.2 

import { UseMutationOptions, UseQueryOptions, useMutation, useQuery } from "@tanstack/react-query";
import { ArbitrageService, BacktestingService, MarketDataService, StrategiesService, TradingService } from "../requests/services.gen";
import { BacktestRequest, CreatePositionRequest, CreateStrategyRequest, CreateTradeRequest, DeployArbitrageRequest, ExecuteTradeRequest, UpdatePositionRequest, UpdateStrategyRequest, UpdateTradeRequest } from "../requests/types.gen";
import * as Common from "./common";
export const useStrategiesServiceGetTradingStrategies = <TData = Common.StrategiesServiceGetTradingStrategiesDefaultResponse, TError = unknown, TQueryKey extends Array<unknown> = unknown[]>({ active, limit, page }: {
  active?: boolean;
  limit?: number;
  page?: number;
} = {}, queryKey?: TQueryKey, options?: Omit<UseQueryOptions<TData, TError>, "queryKey" | "queryFn">) => useQuery<TData, TError>({ queryKey: Common.UseStrategiesServiceGetTradingStrategiesKeyFn({ active, limit, page }, queryKey), queryFn: () => StrategiesService.getTradingStrategies({ active, limit, page }) as TData, ...options });
export const useStrategiesServiceGetTradingStrategiesByStrategyId = <TData = Common.StrategiesServiceGetTradingStrategiesByStrategyIdDefaultResponse, TError = unknown, TQueryKey extends Array<unknown> = unknown[]>({ strategyId }: {
  strategyId: string;
}, queryKey?: TQueryKey, options?: Omit<UseQueryOptions<TData, TError>, "queryKey" | "queryFn">) => useQuery<TData, TError>({ queryKey: Common.UseStrategiesServiceGetTradingStrategiesByStrategyIdKeyFn({ strategyId }, queryKey), queryFn: () => StrategiesService.getTradingStrategiesByStrategyId({ strategyId }) as TData, ...options });
export const useTradingServiceGetTrades = <TData = Common.TradingServiceGetTradesDefaultResponse, TError = unknown, TQueryKey extends Array<unknown> = unknown[]>({ endDate, exchange, limit, page, side, startDate, symbol }: {
  endDate?: string;
  exchange?: "binance" | "coinbase" | "alpaca";
  limit?: number;
  page?: number;
  side?: "buy" | "sell";
  startDate?: string;
  symbol?: string;
} = {}, queryKey?: TQueryKey, options?: Omit<UseQueryOptions<TData, TError>, "queryKey" | "queryFn">) => useQuery<TData, TError>({ queryKey: Common.UseTradingServiceGetTradesKeyFn({ endDate, exchange, limit, page, side, startDate, symbol }, queryKey), queryFn: () => TradingService.getTrades({ endDate, exchange, limit, page, side, startDate, symbol }) as TData, ...options });
export const useTradingServiceGetTradesByTradeId = <TData = Common.TradingServiceGetTradesByTradeIdDefaultResponse, TError = unknown, TQueryKey extends Array<unknown> = unknown[]>({ tradeId }: {
  tradeId: string;
}, queryKey?: TQueryKey, options?: Omit<UseQueryOptions<TData, TError>, "queryKey" | "queryFn">) => useQuery<TData, TError>({ queryKey: Common.UseTradingServiceGetTradesByTradeIdKeyFn({ tradeId }, queryKey), queryFn: () => TradingService.getTradesByTradeId({ tradeId }) as TData, ...options });
export const useTradingServiceGetTradesSearch = <TData = Common.TradingServiceGetTradesSearchDefaultResponse, TError = unknown, TQueryKey extends Array<unknown> = unknown[]>({ limit, maxAmount, minAmount, page, query }: {
  limit?: number;
  maxAmount?: number;
  minAmount?: number;
  page?: number;
  query: string;
}, queryKey?: TQueryKey, options?: Omit<UseQueryOptions<TData, TError>, "queryKey" | "queryFn">) => useQuery<TData, TError>({ queryKey: Common.UseTradingServiceGetTradesSearchKeyFn({ limit, maxAmount, minAmount, page, query }, queryKey), queryFn: () => TradingService.getTradesSearch({ limit, maxAmount, minAmount, page, query }) as TData, ...options });
export const useTradingServiceGetTradingPositions = <TData = Common.TradingServiceGetTradingPositionsDefaultResponse, TError = unknown, TQueryKey extends Array<unknown> = unknown[]>({ exchange, limit, page, side, symbol }: {
  exchange?: "binance" | "coinbase" | "alpaca";
  limit?: number;
  page?: number;
  side?: "long" | "short";
  symbol?: string;
} = {}, queryKey?: TQueryKey, options?: Omit<UseQueryOptions<TData, TError>, "queryKey" | "queryFn">) => useQuery<TData, TError>({ queryKey: Common.UseTradingServiceGetTradingPositionsKeyFn({ exchange, limit, page, side, symbol }, queryKey), queryFn: () => TradingService.getTradingPositions({ exchange, limit, page, side, symbol }) as TData, ...options });
export const useTradingServiceGetTradingPositionsByPositionId = <TData = Common.TradingServiceGetTradingPositionsByPositionIdDefaultResponse, TError = unknown, TQueryKey extends Array<unknown> = unknown[]>({ positionId }: {
  positionId: string;
}, queryKey?: TQueryKey, options?: Omit<UseQueryOptions<TData, TError>, "queryKey" | "queryFn">) => useQuery<TData, TError>({ queryKey: Common.UseTradingServiceGetTradingPositionsByPositionIdKeyFn({ positionId }, queryKey), queryFn: () => TradingService.getTradingPositionsByPositionId({ positionId }) as TData, ...options });
export const useTradingServiceGetTradingBalance = <TData = Common.TradingServiceGetTradingBalanceDefaultResponse, TError = unknown, TQueryKey extends Array<unknown> = unknown[]>({ exchange }: {
  exchange?: "binance" | "coinbase" | "alpaca";
} = {}, queryKey?: TQueryKey, options?: Omit<UseQueryOptions<TData, TError>, "queryKey" | "queryFn">) => useQuery<TData, TError>({ queryKey: Common.UseTradingServiceGetTradingBalanceKeyFn({ exchange }, queryKey), queryFn: () => TradingService.getTradingBalance({ exchange }) as TData, ...options });
export const useMarketDataServiceGetTradingMarketData = <TData = Common.MarketDataServiceGetTradingMarketDataDefaultResponse, TError = unknown, TQueryKey extends Array<unknown> = unknown[]>({ exchange, symbol }: {
  exchange?: "binance" | "coinbase" | "alpaca";
  symbol: string;
}, queryKey?: TQueryKey, options?: Omit<UseQueryOptions<TData, TError>, "queryKey" | "queryFn">) => useQuery<TData, TError>({ queryKey: Common.UseMarketDataServiceGetTradingMarketDataKeyFn({ exchange, symbol }, queryKey), queryFn: () => MarketDataService.getTradingMarketData({ exchange, symbol }) as TData, ...options });
export const useArbitrageServiceGetArbitrageStatus = <TData = Common.ArbitrageServiceGetArbitrageStatusDefaultResponse, TError = unknown, TQueryKey extends Array<unknown> = unknown[]>(queryKey?: TQueryKey, options?: Omit<UseQueryOptions<TData, TError>, "queryKey" | "queryFn">) => useQuery<TData, TError>({ queryKey: Common.UseArbitrageServiceGetArbitrageStatusKeyFn(queryKey), queryFn: () => ArbitrageService.getArbitrageStatus() as TData, ...options });
export const useStrategiesServicePostTradingStrategies = <TData = Common.StrategiesServicePostTradingStrategiesMutationResult, TError = unknown, TContext = unknown>(options?: Omit<UseMutationOptions<TData, TError, {
  requestBody: CreateStrategyRequest;
}, TContext>, "mutationFn">) => useMutation<TData, TError, {
  requestBody: CreateStrategyRequest;
}, TContext>({ mutationFn: ({ requestBody }) => StrategiesService.postTradingStrategies({ requestBody }) as unknown as Promise<TData>, ...options });
export const useStrategiesServicePostTradingStrategiesByStrategyIdActivate = <TData = Common.StrategiesServicePostTradingStrategiesByStrategyIdActivateMutationResult, TError = unknown, TContext = unknown>(options?: Omit<UseMutationOptions<TData, TError, {
  strategyId: string;
}, TContext>, "mutationFn">) => useMutation<TData, TError, {
  strategyId: string;
}, TContext>({ mutationFn: ({ strategyId }) => StrategiesService.postTradingStrategiesByStrategyIdActivate({ strategyId }) as unknown as Promise<TData>, ...options });
export const useStrategiesServicePostTradingStrategiesByStrategyIdDeactivate = <TData = Common.StrategiesServicePostTradingStrategiesByStrategyIdDeactivateMutationResult, TError = unknown, TContext = unknown>(options?: Omit<UseMutationOptions<TData, TError, {
  strategyId: string;
}, TContext>, "mutationFn">) => useMutation<TData, TError, {
  strategyId: string;
}, TContext>({ mutationFn: ({ strategyId }) => StrategiesService.postTradingStrategiesByStrategyIdDeactivate({ strategyId }) as unknown as Promise<TData>, ...options });
export const useTradingServicePostTrades = <TData = Common.TradingServicePostTradesMutationResult, TError = unknown, TContext = unknown>(options?: Omit<UseMutationOptions<TData, TError, {
  requestBody: CreateTradeRequest;
}, TContext>, "mutationFn">) => useMutation<TData, TError, {
  requestBody: CreateTradeRequest;
}, TContext>({ mutationFn: ({ requestBody }) => TradingService.postTrades({ requestBody }) as unknown as Promise<TData>, ...options });
export const useTradingServicePostTradingPositions = <TData = Common.TradingServicePostTradingPositionsMutationResult, TError = unknown, TContext = unknown>(options?: Omit<UseMutationOptions<TData, TError, {
  requestBody: CreatePositionRequest;
}, TContext>, "mutationFn">) => useMutation<TData, TError, {
  requestBody: CreatePositionRequest;
}, TContext>({ mutationFn: ({ requestBody }) => TradingService.postTradingPositions({ requestBody }) as unknown as Promise<TData>, ...options });
export const useTradingServicePostTradingExecute = <TData = Common.TradingServicePostTradingExecuteMutationResult, TError = unknown, TContext = unknown>(options?: Omit<UseMutationOptions<TData, TError, {
  requestBody: ExecuteTradeRequest;
}, TContext>, "mutationFn">) => useMutation<TData, TError, {
  requestBody: ExecuteTradeRequest;
}, TContext>({ mutationFn: ({ requestBody }) => TradingService.postTradingExecute({ requestBody }) as unknown as Promise<TData>, ...options });
export const useArbitrageServicePostArbitrageDeploy = <TData = Common.ArbitrageServicePostArbitrageDeployMutationResult, TError = unknown, TContext = unknown>(options?: Omit<UseMutationOptions<TData, TError, {
  requestBody: DeployArbitrageRequest;
}, TContext>, "mutationFn">) => useMutation<TData, TError, {
  requestBody: DeployArbitrageRequest;
}, TContext>({ mutationFn: ({ requestBody }) => ArbitrageService.postArbitrageDeploy({ requestBody }) as unknown as Promise<TData>, ...options });
export const useArbitrageServicePostArbitrageStop = <TData = Common.ArbitrageServicePostArbitrageStopMutationResult, TError = unknown, TContext = unknown>(options?: Omit<UseMutationOptions<TData, TError, void, TContext>, "mutationFn">) => useMutation<TData, TError, void, TContext>({ mutationFn: () => ArbitrageService.postArbitrageStop() as unknown as Promise<TData>, ...options });
export const useBacktestingServicePostTradingBacktest = <TData = Common.BacktestingServicePostTradingBacktestMutationResult, TError = unknown, TContext = unknown>(options?: Omit<UseMutationOptions<TData, TError, {
  requestBody: BacktestRequest;
}, TContext>, "mutationFn">) => useMutation<TData, TError, {
  requestBody: BacktestRequest;
}, TContext>({ mutationFn: ({ requestBody }) => BacktestingService.postTradingBacktest({ requestBody }) as unknown as Promise<TData>, ...options });
export const useStrategiesServicePutTradingStrategiesByStrategyId = <TData = Common.StrategiesServicePutTradingStrategiesByStrategyIdMutationResult, TError = unknown, TContext = unknown>(options?: Omit<UseMutationOptions<TData, TError, {
  requestBody: UpdateStrategyRequest;
  strategyId: string;
}, TContext>, "mutationFn">) => useMutation<TData, TError, {
  requestBody: UpdateStrategyRequest;
  strategyId: string;
}, TContext>({ mutationFn: ({ requestBody, strategyId }) => StrategiesService.putTradingStrategiesByStrategyId({ requestBody, strategyId }) as unknown as Promise<TData>, ...options });
export const useTradingServicePutTradesByTradeId = <TData = Common.TradingServicePutTradesByTradeIdMutationResult, TError = unknown, TContext = unknown>(options?: Omit<UseMutationOptions<TData, TError, {
  requestBody: UpdateTradeRequest;
  tradeId: string;
}, TContext>, "mutationFn">) => useMutation<TData, TError, {
  requestBody: UpdateTradeRequest;
  tradeId: string;
}, TContext>({ mutationFn: ({ requestBody, tradeId }) => TradingService.putTradesByTradeId({ requestBody, tradeId }) as unknown as Promise<TData>, ...options });
export const useTradingServicePutTradingPositionsByPositionId = <TData = Common.TradingServicePutTradingPositionsByPositionIdMutationResult, TError = unknown, TContext = unknown>(options?: Omit<UseMutationOptions<TData, TError, {
  positionId: string;
  requestBody: UpdatePositionRequest;
}, TContext>, "mutationFn">) => useMutation<TData, TError, {
  positionId: string;
  requestBody: UpdatePositionRequest;
}, TContext>({ mutationFn: ({ positionId, requestBody }) => TradingService.putTradingPositionsByPositionId({ positionId, requestBody }) as unknown as Promise<TData>, ...options });
export const useStrategiesServiceDeleteTradingStrategiesByStrategyId = <TData = Common.StrategiesServiceDeleteTradingStrategiesByStrategyIdMutationResult, TError = unknown, TContext = unknown>(options?: Omit<UseMutationOptions<TData, TError, {
  strategyId: string;
}, TContext>, "mutationFn">) => useMutation<TData, TError, {
  strategyId: string;
}, TContext>({ mutationFn: ({ strategyId }) => StrategiesService.deleteTradingStrategiesByStrategyId({ strategyId }) as unknown as Promise<TData>, ...options });
export const useTradingServiceDeleteTradesByTradeId = <TData = Common.TradingServiceDeleteTradesByTradeIdMutationResult, TError = unknown, TContext = unknown>(options?: Omit<UseMutationOptions<TData, TError, {
  tradeId: string;
}, TContext>, "mutationFn">) => useMutation<TData, TError, {
  tradeId: string;
}, TContext>({ mutationFn: ({ tradeId }) => TradingService.deleteTradesByTradeId({ tradeId }) as unknown as Promise<TData>, ...options });
export const useTradingServiceDeleteTradingPositionsByPositionId = <TData = Common.TradingServiceDeleteTradingPositionsByPositionIdMutationResult, TError = unknown, TContext = unknown>(options?: Omit<UseMutationOptions<TData, TError, {
  positionId: string;
}, TContext>, "mutationFn">) => useMutation<TData, TError, {
  positionId: string;
}, TContext>({ mutationFn: ({ positionId }) => TradingService.deleteTradingPositionsByPositionId({ positionId }) as unknown as Promise<TData>, ...options });
