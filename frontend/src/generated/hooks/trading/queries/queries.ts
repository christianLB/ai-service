// generated with @7nohe/openapi-react-query-codegen@1.6.2

import { UseMutationOptions, UseQueryOptions, useMutation, useQuery } from '@tanstack/react-query';
import {
  ArbitrageService,
  BacktestingService,
  MarketDataService,
  StrategiesService,
  TradingService,
} from '../requests/services.gen';
import {
  BacktestRequest,
  CreateStrategyRequest,
  DeployArbitrageRequest,
  ExecuteTradeRequest,
  UpdateStrategyRequest,
} from '../requests/types.gen';
import * as Common from './common';
export const useStrategiesServiceListStrategies = <
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
  useQuery<TData, TError>({
    queryKey: Common.UseStrategiesServiceListStrategiesKeyFn({ active, limit, page }, queryKey),
    queryFn: () => StrategiesService.listStrategies({ active, limit, page }) as TData,
    ...options,
  });
export const useStrategiesServiceGetStrategy = <
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
  useQuery<TData, TError>({
    queryKey: Common.UseStrategiesServiceGetStrategyKeyFn({ strategyId }, queryKey),
    queryFn: () => StrategiesService.getStrategy({ strategyId }) as TData,
    ...options,
  });
export const useTradingServiceGetPositions = <
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
  useQuery<TData, TError>({
    queryKey: Common.UseTradingServiceGetPositionsKeyFn({ exchange }, queryKey),
    queryFn: () => TradingService.getPositions({ exchange }) as TData,
    ...options,
  });
export const useTradingServiceGetBalance = <
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
  useQuery<TData, TError>({
    queryKey: Common.UseTradingServiceGetBalanceKeyFn({ exchange }, queryKey),
    queryFn: () => TradingService.getBalance({ exchange }) as TData,
    ...options,
  });
export const useMarketDataServiceGetMarketData = <
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
  useQuery<TData, TError>({
    queryKey: Common.UseMarketDataServiceGetMarketDataKeyFn({ exchange, symbol }, queryKey),
    queryFn: () => MarketDataService.getMarketData({ exchange, symbol }) as TData,
    ...options,
  });
export const useArbitrageServiceGetArbitrageStatus = <
  TData = Common.ArbitrageServiceGetArbitrageStatusDefaultResponse,
  TError = unknown,
  TQueryKey extends Array<unknown> = unknown[],
>(
  queryKey?: TQueryKey,
  options?: Omit<UseQueryOptions<TData, TError>, 'queryKey' | 'queryFn'>
) =>
  useQuery<TData, TError>({
    queryKey: Common.UseArbitrageServiceGetArbitrageStatusKeyFn(queryKey),
    queryFn: () => ArbitrageService.getArbitrageStatus() as TData,
    ...options,
  });
export const useStrategiesServiceCreateStrategy = <
  TData = Common.StrategiesServiceCreateStrategyMutationResult,
  TError = unknown,
  TContext = unknown,
>(
  options?: Omit<
    UseMutationOptions<
      TData,
      TError,
      {
        requestBody: CreateStrategyRequest;
      },
      TContext
    >,
    'mutationFn'
  >
) =>
  useMutation<
    TData,
    TError,
    {
      requestBody: CreateStrategyRequest;
    },
    TContext
  >({
    mutationFn: ({ requestBody }) =>
      StrategiesService.createStrategy({ requestBody }) as unknown as Promise<TData>,
    ...options,
  });
export const useStrategiesServiceActivateStrategy = <
  TData = Common.StrategiesServiceActivateStrategyMutationResult,
  TError = unknown,
  TContext = unknown,
>(
  options?: Omit<
    UseMutationOptions<
      TData,
      TError,
      {
        strategyId: string;
      },
      TContext
    >,
    'mutationFn'
  >
) =>
  useMutation<
    TData,
    TError,
    {
      strategyId: string;
    },
    TContext
  >({
    mutationFn: ({ strategyId }) =>
      StrategiesService.activateStrategy({ strategyId }) as unknown as Promise<TData>,
    ...options,
  });
export const useStrategiesServiceDeactivateStrategy = <
  TData = Common.StrategiesServiceDeactivateStrategyMutationResult,
  TError = unknown,
  TContext = unknown,
>(
  options?: Omit<
    UseMutationOptions<
      TData,
      TError,
      {
        strategyId: string;
      },
      TContext
    >,
    'mutationFn'
  >
) =>
  useMutation<
    TData,
    TError,
    {
      strategyId: string;
    },
    TContext
  >({
    mutationFn: ({ strategyId }) =>
      StrategiesService.deactivateStrategy({ strategyId }) as unknown as Promise<TData>,
    ...options,
  });
export const useTradingServiceExecuteTrade = <
  TData = Common.TradingServiceExecuteTradeMutationResult,
  TError = unknown,
  TContext = unknown,
>(
  options?: Omit<
    UseMutationOptions<
      TData,
      TError,
      {
        requestBody: ExecuteTradeRequest;
      },
      TContext
    >,
    'mutationFn'
  >
) =>
  useMutation<
    TData,
    TError,
    {
      requestBody: ExecuteTradeRequest;
    },
    TContext
  >({
    mutationFn: ({ requestBody }) =>
      TradingService.executeTrade({ requestBody }) as unknown as Promise<TData>,
    ...options,
  });
export const useArbitrageServiceDeployArbitrage = <
  TData = Common.ArbitrageServiceDeployArbitrageMutationResult,
  TError = unknown,
  TContext = unknown,
>(
  options?: Omit<
    UseMutationOptions<
      TData,
      TError,
      {
        requestBody: DeployArbitrageRequest;
      },
      TContext
    >,
    'mutationFn'
  >
) =>
  useMutation<
    TData,
    TError,
    {
      requestBody: DeployArbitrageRequest;
    },
    TContext
  >({
    mutationFn: ({ requestBody }) =>
      ArbitrageService.deployArbitrage({ requestBody }) as unknown as Promise<TData>,
    ...options,
  });
export const useArbitrageServiceStopArbitrage = <
  TData = Common.ArbitrageServiceStopArbitrageMutationResult,
  TError = unknown,
  TContext = unknown,
>(
  options?: Omit<UseMutationOptions<TData, TError, void, TContext>, 'mutationFn'>
) =>
  useMutation<TData, TError, void, TContext>({
    mutationFn: () => ArbitrageService.stopArbitrage() as unknown as Promise<TData>,
    ...options,
  });
export const useBacktestingServiceRunBacktest = <
  TData = Common.BacktestingServiceRunBacktestMutationResult,
  TError = unknown,
  TContext = unknown,
>(
  options?: Omit<
    UseMutationOptions<
      TData,
      TError,
      {
        requestBody: BacktestRequest;
      },
      TContext
    >,
    'mutationFn'
  >
) =>
  useMutation<
    TData,
    TError,
    {
      requestBody: BacktestRequest;
    },
    TContext
  >({
    mutationFn: ({ requestBody }) =>
      BacktestingService.runBacktest({ requestBody }) as unknown as Promise<TData>,
    ...options,
  });
export const useStrategiesServiceUpdateStrategy = <
  TData = Common.StrategiesServiceUpdateStrategyMutationResult,
  TError = unknown,
  TContext = unknown,
>(
  options?: Omit<
    UseMutationOptions<
      TData,
      TError,
      {
        requestBody: UpdateStrategyRequest;
        strategyId: string;
      },
      TContext
    >,
    'mutationFn'
  >
) =>
  useMutation<
    TData,
    TError,
    {
      requestBody: UpdateStrategyRequest;
      strategyId: string;
    },
    TContext
  >({
    mutationFn: ({ requestBody, strategyId }) =>
      StrategiesService.updateStrategy({ requestBody, strategyId }) as unknown as Promise<TData>,
    ...options,
  });
export const useStrategiesServiceDeleteStrategy = <
  TData = Common.StrategiesServiceDeleteStrategyMutationResult,
  TError = unknown,
  TContext = unknown,
>(
  options?: Omit<
    UseMutationOptions<
      TData,
      TError,
      {
        strategyId: string;
      },
      TContext
    >,
    'mutationFn'
  >
) =>
  useMutation<
    TData,
    TError,
    {
      strategyId: string;
    },
    TContext
  >({
    mutationFn: ({ strategyId }) =>
      StrategiesService.deleteStrategy({ strategyId }) as unknown as Promise<TData>,
    ...options,
  });
