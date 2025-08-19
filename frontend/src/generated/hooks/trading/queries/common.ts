// generated with @7nohe/openapi-react-query-codegen@1.6.2

import { UseQueryResult } from '@tanstack/react-query';
import {
  ArbitrageService,
  BacktestingService,
  MarketDataService,
  StrategiesService,
  TradingService,
} from '../requests/services.gen';
export type StrategiesServiceListStrategiesDefaultResponse = Awaited<
  ReturnType<typeof StrategiesService.listStrategies>
>;
export type StrategiesServiceListStrategiesQueryResult<
  TData = StrategiesServiceListStrategiesDefaultResponse,
  TError = unknown,
> = UseQueryResult<TData, TError>;
export const useStrategiesServiceListStrategiesKey = 'StrategiesServiceListStrategies';
export const UseStrategiesServiceListStrategiesKeyFn = (
  {
    active,
    limit,
    page,
  }: {
    active?: boolean;
    limit?: number;
    page?: number;
  } = {},
  queryKey?: Array<unknown>
) => [useStrategiesServiceListStrategiesKey, ...(queryKey ?? [{ active, limit, page }])];
export type StrategiesServiceGetStrategyDefaultResponse = Awaited<
  ReturnType<typeof StrategiesService.getStrategy>
>;
export type StrategiesServiceGetStrategyQueryResult<
  TData = StrategiesServiceGetStrategyDefaultResponse,
  TError = unknown,
> = UseQueryResult<TData, TError>;
export const useStrategiesServiceGetStrategyKey = 'StrategiesServiceGetStrategy';
export const UseStrategiesServiceGetStrategyKeyFn = (
  {
    strategyId,
  }: {
    strategyId: string;
  },
  queryKey?: Array<unknown>
) => [useStrategiesServiceGetStrategyKey, ...(queryKey ?? [{ strategyId }])];
export type TradingServiceGetPositionsDefaultResponse = Awaited<
  ReturnType<typeof TradingService.getPositions>
>;
export type TradingServiceGetPositionsQueryResult<
  TData = TradingServiceGetPositionsDefaultResponse,
  TError = unknown,
> = UseQueryResult<TData, TError>;
export const useTradingServiceGetPositionsKey = 'TradingServiceGetPositions';
export const UseTradingServiceGetPositionsKeyFn = (
  {
    exchange,
  }: {
    exchange?: 'binance' | 'coinbase' | 'alpaca';
  } = {},
  queryKey?: Array<unknown>
) => [useTradingServiceGetPositionsKey, ...(queryKey ?? [{ exchange }])];
export type TradingServiceGetBalanceDefaultResponse = Awaited<
  ReturnType<typeof TradingService.getBalance>
>;
export type TradingServiceGetBalanceQueryResult<
  TData = TradingServiceGetBalanceDefaultResponse,
  TError = unknown,
> = UseQueryResult<TData, TError>;
export const useTradingServiceGetBalanceKey = 'TradingServiceGetBalance';
export const UseTradingServiceGetBalanceKeyFn = (
  {
    exchange,
  }: {
    exchange?: 'binance' | 'coinbase' | 'alpaca';
  } = {},
  queryKey?: Array<unknown>
) => [useTradingServiceGetBalanceKey, ...(queryKey ?? [{ exchange }])];
export type MarketDataServiceGetMarketDataDefaultResponse = Awaited<
  ReturnType<typeof MarketDataService.getMarketData>
>;
export type MarketDataServiceGetMarketDataQueryResult<
  TData = MarketDataServiceGetMarketDataDefaultResponse,
  TError = unknown,
> = UseQueryResult<TData, TError>;
export const useMarketDataServiceGetMarketDataKey = 'MarketDataServiceGetMarketData';
export const UseMarketDataServiceGetMarketDataKeyFn = (
  {
    exchange,
    symbol,
  }: {
    exchange?: 'binance' | 'coinbase' | 'alpaca';
    symbol: string;
  },
  queryKey?: Array<unknown>
) => [useMarketDataServiceGetMarketDataKey, ...(queryKey ?? [{ exchange, symbol }])];
export type ArbitrageServiceGetArbitrageStatusDefaultResponse = Awaited<
  ReturnType<typeof ArbitrageService.getArbitrageStatus>
>;
export type ArbitrageServiceGetArbitrageStatusQueryResult<
  TData = ArbitrageServiceGetArbitrageStatusDefaultResponse,
  TError = unknown,
> = UseQueryResult<TData, TError>;
export const useArbitrageServiceGetArbitrageStatusKey = 'ArbitrageServiceGetArbitrageStatus';
export const UseArbitrageServiceGetArbitrageStatusKeyFn = (queryKey?: Array<unknown>) => [
  useArbitrageServiceGetArbitrageStatusKey,
  ...(queryKey ?? []),
];
export type StrategiesServiceCreateStrategyMutationResult = Awaited<
  ReturnType<typeof StrategiesService.createStrategy>
>;
export type StrategiesServiceActivateStrategyMutationResult = Awaited<
  ReturnType<typeof StrategiesService.activateStrategy>
>;
export type StrategiesServiceDeactivateStrategyMutationResult = Awaited<
  ReturnType<typeof StrategiesService.deactivateStrategy>
>;
export type TradingServiceExecuteTradeMutationResult = Awaited<
  ReturnType<typeof TradingService.executeTrade>
>;
export type ArbitrageServiceDeployArbitrageMutationResult = Awaited<
  ReturnType<typeof ArbitrageService.deployArbitrage>
>;
export type ArbitrageServiceStopArbitrageMutationResult = Awaited<
  ReturnType<typeof ArbitrageService.stopArbitrage>
>;
export type BacktestingServiceRunBacktestMutationResult = Awaited<
  ReturnType<typeof BacktestingService.runBacktest>
>;
export type StrategiesServiceUpdateStrategyMutationResult = Awaited<
  ReturnType<typeof StrategiesService.updateStrategy>
>;
export type StrategiesServiceDeleteStrategyMutationResult = Awaited<
  ReturnType<typeof StrategiesService.deleteStrategy>
>;
