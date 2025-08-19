// generated with @7nohe/openapi-react-query-codegen@1.6.2

import { type QueryClient } from '@tanstack/react-query';
import {
  ArbitrageService,
  MarketDataService,
  StrategiesService,
  TradingService,
} from '../requests/services.gen';
import * as Common from './common';
export const ensureUseStrategiesServiceListStrategiesData = (
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
  queryClient.ensureQueryData({
    queryKey: Common.UseStrategiesServiceListStrategiesKeyFn({ active, limit, page }),
    queryFn: () => StrategiesService.listStrategies({ active, limit, page }),
  });
export const ensureUseStrategiesServiceGetStrategyData = (
  queryClient: QueryClient,
  {
    strategyId,
  }: {
    strategyId: string;
  }
) =>
  queryClient.ensureQueryData({
    queryKey: Common.UseStrategiesServiceGetStrategyKeyFn({ strategyId }),
    queryFn: () => StrategiesService.getStrategy({ strategyId }),
  });
export const ensureUseTradingServiceGetPositionsData = (
  queryClient: QueryClient,
  {
    exchange,
  }: {
    exchange?: 'binance' | 'coinbase' | 'alpaca';
  } = {}
) =>
  queryClient.ensureQueryData({
    queryKey: Common.UseTradingServiceGetPositionsKeyFn({ exchange }),
    queryFn: () => TradingService.getPositions({ exchange }),
  });
export const ensureUseTradingServiceGetBalanceData = (
  queryClient: QueryClient,
  {
    exchange,
  }: {
    exchange?: 'binance' | 'coinbase' | 'alpaca';
  } = {}
) =>
  queryClient.ensureQueryData({
    queryKey: Common.UseTradingServiceGetBalanceKeyFn({ exchange }),
    queryFn: () => TradingService.getBalance({ exchange }),
  });
export const ensureUseMarketDataServiceGetMarketDataData = (
  queryClient: QueryClient,
  {
    exchange,
    symbol,
  }: {
    exchange?: 'binance' | 'coinbase' | 'alpaca';
    symbol: string;
  }
) =>
  queryClient.ensureQueryData({
    queryKey: Common.UseMarketDataServiceGetMarketDataKeyFn({ exchange, symbol }),
    queryFn: () => MarketDataService.getMarketData({ exchange, symbol }),
  });
export const ensureUseArbitrageServiceGetArbitrageStatusData = (queryClient: QueryClient) =>
  queryClient.ensureQueryData({
    queryKey: Common.UseArbitrageServiceGetArbitrageStatusKeyFn(),
    queryFn: () => ArbitrageService.getArbitrageStatus(),
  });
