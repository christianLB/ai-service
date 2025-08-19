// generated with @7nohe/openapi-react-query-codegen@1.6.2

import { UseQueryOptions, useSuspenseQuery } from '@tanstack/react-query';
import {
  ArbitrageService,
  MarketDataService,
  StrategiesService,
  TradingService,
} from '../requests/services.gen';
import * as Common from './common';
export const useStrategiesServiceListStrategiesSuspense = <
  TData = Common.StrategiesServiceListStrategiesDefaultResponse,
  TError = unknown,
  TQueryKey extends Array<unknown> = unknown[],
>(
  {
    active,
    limit,
    page,
  }: {
    active?: boolean;
    limit?: number;
    page?: number;
  } = {},
  queryKey?: TQueryKey,
  options?: Omit<UseQueryOptions<TData, TError>, 'queryKey' | 'queryFn'>
) =>
  useSuspenseQuery<TData, TError>({
    queryKey: Common.UseStrategiesServiceListStrategiesKeyFn({ active, limit, page }, queryKey),
    queryFn: () => StrategiesService.listStrategies({ active, limit, page }) as TData,
    ...options,
  });
export const useStrategiesServiceGetStrategySuspense = <
  TData = Common.StrategiesServiceGetStrategyDefaultResponse,
  TError = unknown,
  TQueryKey extends Array<unknown> = unknown[],
>(
  {
    strategyId,
  }: {
    strategyId: string;
  },
  queryKey?: TQueryKey,
  options?: Omit<UseQueryOptions<TData, TError>, 'queryKey' | 'queryFn'>
) =>
  useSuspenseQuery<TData, TError>({
    queryKey: Common.UseStrategiesServiceGetStrategyKeyFn({ strategyId }, queryKey),
    queryFn: () => StrategiesService.getStrategy({ strategyId }) as TData,
    ...options,
  });
export const useTradingServiceGetPositionsSuspense = <
  TData = Common.TradingServiceGetPositionsDefaultResponse,
  TError = unknown,
  TQueryKey extends Array<unknown> = unknown[],
>(
  {
    exchange,
  }: {
    exchange?: 'binance' | 'coinbase' | 'alpaca';
  } = {},
  queryKey?: TQueryKey,
  options?: Omit<UseQueryOptions<TData, TError>, 'queryKey' | 'queryFn'>
) =>
  useSuspenseQuery<TData, TError>({
    queryKey: Common.UseTradingServiceGetPositionsKeyFn({ exchange }, queryKey),
    queryFn: () => TradingService.getPositions({ exchange }) as TData,
    ...options,
  });
export const useTradingServiceGetBalanceSuspense = <
  TData = Common.TradingServiceGetBalanceDefaultResponse,
  TError = unknown,
  TQueryKey extends Array<unknown> = unknown[],
>(
  {
    exchange,
  }: {
    exchange?: 'binance' | 'coinbase' | 'alpaca';
  } = {},
  queryKey?: TQueryKey,
  options?: Omit<UseQueryOptions<TData, TError>, 'queryKey' | 'queryFn'>
) =>
  useSuspenseQuery<TData, TError>({
    queryKey: Common.UseTradingServiceGetBalanceKeyFn({ exchange }, queryKey),
    queryFn: () => TradingService.getBalance({ exchange }) as TData,
    ...options,
  });
export const useMarketDataServiceGetMarketDataSuspense = <
  TData = Common.MarketDataServiceGetMarketDataDefaultResponse,
  TError = unknown,
  TQueryKey extends Array<unknown> = unknown[],
>(
  {
    exchange,
    symbol,
  }: {
    exchange?: 'binance' | 'coinbase' | 'alpaca';
    symbol: string;
  },
  queryKey?: TQueryKey,
  options?: Omit<UseQueryOptions<TData, TError>, 'queryKey' | 'queryFn'>
) =>
  useSuspenseQuery<TData, TError>({
    queryKey: Common.UseMarketDataServiceGetMarketDataKeyFn({ exchange, symbol }, queryKey),
    queryFn: () => MarketDataService.getMarketData({ exchange, symbol }) as TData,
    ...options,
  });
export const useArbitrageServiceGetArbitrageStatusSuspense = <
  TData = Common.ArbitrageServiceGetArbitrageStatusDefaultResponse,
  TError = unknown,
  TQueryKey extends Array<unknown> = unknown[],
>(
  queryKey?: TQueryKey,
  options?: Omit<UseQueryOptions<TData, TError>, 'queryKey' | 'queryFn'>
) =>
  useSuspenseQuery<TData, TError>({
    queryKey: Common.UseArbitrageServiceGetArbitrageStatusKeyFn(queryKey),
    queryFn: () => ArbitrageService.getArbitrageStatus() as TData,
    ...options,
  });
