// generated with @7nohe/openapi-react-query-codegen@1.6.2 

import { InfiniteData, UseInfiniteQueryOptions, useInfiniteQuery } from "@tanstack/react-query";
import { StrategiesService, TradingService } from "../requests/services.gen";
import * as Common from "./common";
export const useStrategiesServiceGetTradingStrategiesInfinite = <TData = InfiniteData<Common.StrategiesServiceGetTradingStrategiesDefaultResponse>, TError = unknown, TQueryKey extends Array<unknown> = unknown[]>({ active, limit }: {
  active?: boolean;
  limit?: number;
} = {}, queryKey?: TQueryKey, options?: Omit<UseInfiniteQueryOptions<TData, TError>, "queryKey" | "queryFn">) => useInfiniteQuery({
  queryKey: Common.UseStrategiesServiceGetTradingStrategiesKeyFn({ active, limit }, queryKey), queryFn: ({ pageParam }) => StrategiesService.getTradingStrategies({ active, limit, page: pageParam as number }) as TData, initialPageParam: "1", getNextPageParam: response => (response as {
    nextPage: string;
  }).nextPage, ...options
});
export const useTradingServiceGetTradesInfinite = <TData = InfiniteData<Common.TradingServiceGetTradesDefaultResponse>, TError = unknown, TQueryKey extends Array<unknown> = unknown[]>({ endDate, exchange, limit, side, startDate, symbol }: {
  endDate?: string;
  exchange?: "binance" | "coinbase" | "alpaca";
  limit?: number;
  side?: "buy" | "sell";
  startDate?: string;
  symbol?: string;
} = {}, queryKey?: TQueryKey, options?: Omit<UseInfiniteQueryOptions<TData, TError>, "queryKey" | "queryFn">) => useInfiniteQuery({
  queryKey: Common.UseTradingServiceGetTradesKeyFn({ endDate, exchange, limit, side, startDate, symbol }, queryKey), queryFn: ({ pageParam }) => TradingService.getTrades({ endDate, exchange, limit, page: pageParam as number, side, startDate, symbol }) as TData, initialPageParam: "1", getNextPageParam: response => (response as {
    nextPage: string;
  }).nextPage, ...options
});
export const useTradingServiceGetTradesSearchInfinite = <TData = InfiniteData<Common.TradingServiceGetTradesSearchDefaultResponse>, TError = unknown, TQueryKey extends Array<unknown> = unknown[]>({ limit, maxAmount, minAmount, query }: {
  limit?: number;
  maxAmount?: number;
  minAmount?: number;
  query: string;
}, queryKey?: TQueryKey, options?: Omit<UseInfiniteQueryOptions<TData, TError>, "queryKey" | "queryFn">) => useInfiniteQuery({
  queryKey: Common.UseTradingServiceGetTradesSearchKeyFn({ limit, maxAmount, minAmount, query }, queryKey), queryFn: ({ pageParam }) => TradingService.getTradesSearch({ limit, maxAmount, minAmount, page: pageParam as number, query }) as TData, initialPageParam: "1", getNextPageParam: response => (response as {
    nextPage: string;
  }).nextPage, ...options
});
export const useTradingServiceGetTradingPositionsInfinite = <TData = InfiniteData<Common.TradingServiceGetTradingPositionsDefaultResponse>, TError = unknown, TQueryKey extends Array<unknown> = unknown[]>({ exchange, limit, side, symbol }: {
  exchange?: "binance" | "coinbase" | "alpaca";
  limit?: number;
  side?: "long" | "short";
  symbol?: string;
} = {}, queryKey?: TQueryKey, options?: Omit<UseInfiniteQueryOptions<TData, TError>, "queryKey" | "queryFn">) => useInfiniteQuery({
  queryKey: Common.UseTradingServiceGetTradingPositionsKeyFn({ exchange, limit, side, symbol }, queryKey), queryFn: ({ pageParam }) => TradingService.getTradingPositions({ exchange, limit, page: pageParam as number, side, symbol }) as TData, initialPageParam: "1", getNextPageParam: response => (response as {
    nextPage: string;
  }).nextPage, ...options
});
