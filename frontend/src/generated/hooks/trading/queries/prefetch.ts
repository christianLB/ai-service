// generated with @7nohe/openapi-react-query-codegen@1.6.2

import { type QueryClient } from '@tanstack/react-query';
import {
  ArbitrageService,
  MarketDataService,
  StrategiesService,
  TradingService,
} from '../requests/services.gen';
import * as Common from './common';
export const prefetchUseStrategiesServiceListStrategies = (
  queryClient: QueryClient,
  {
    active,
    limit,
    page,
  }: {
    active?: boolean;
    limit?: number;
    page?: number;
  } = {}
) =>
  queryClient.prefetchQuery({
    queryKey: Common.UseStrategiesServiceListStrategiesKeyFn({ active, limit, page }),
    queryFn: () => StrategiesService.listStrategies({ active, limit, page }),
  });
export const prefetchUseStrategiesServiceGetStrategy = (
  queryClient: QueryClient,
  {
    strategyId,
  }: {
    strategyId: string;
  }
) =>
  queryClient.prefetchQuery({
    queryKey: Common.UseStrategiesServiceGetStrategyKeyFn({ strategyId }),
    queryFn: () => StrategiesService.getStrategy({ strategyId }),
  });
export const prefetchUseTradingServiceGetPositions = (
  queryClient: QueryClient,
  {
    exchange,
  }: {
    exchange?: 'binance' | 'coinbase' | 'alpaca';
  } = {}
) =>
  queryClient.prefetchQuery({
    queryKey: Common.UseTradingServiceGetPositionsKeyFn({ exchange }),
    queryFn: () => TradingService.getPositions({ exchange }),
  });
export const prefetchUseTradingServiceGetBalance = (
  queryClient: QueryClient,
  {
    exchange,
  }: {
    exchange?: 'binance' | 'coinbase' | 'alpaca';
  } = {}
) =>
  queryClient.prefetchQuery({
    queryKey: Common.UseTradingServiceGetBalanceKeyFn({ exchange }),
    queryFn: () => TradingService.getBalance({ exchange }),
  });
export const prefetchUseMarketDataServiceGetMarketData = (
  queryClient: QueryClient,
  {
    exchange,
    symbol,
  }: {
    exchange?: 'binance' | 'coinbase' | 'alpaca';
    symbol: string;
  }
) =>
  queryClient.prefetchQuery({
    queryKey: Common.UseMarketDataServiceGetMarketDataKeyFn({ exchange, symbol }),
    queryFn: () => MarketDataService.getMarketData({ exchange, symbol }),
  });
export const prefetchUseArbitrageServiceGetArbitrageStatus = (queryClient: QueryClient) =>
  queryClient.prefetchQuery({
    queryKey: Common.UseArbitrageServiceGetArbitrageStatusKeyFn(),
    queryFn: () => ArbitrageService.getArbitrageStatus(),
  });
