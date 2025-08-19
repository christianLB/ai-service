// generated with @7nohe/openapi-react-query-codegen@1.6.2

import { InfiniteData, UseInfiniteQueryOptions, useInfiniteQuery } from '@tanstack/react-query';
import { StrategiesService } from '../requests/services.gen';
import * as Common from './common';
export const useStrategiesServiceListStrategiesInfinite = <
  TData = InfiniteData<Common.StrategiesServiceListStrategiesDefaultResponse>,
  TError = unknown,
  TQueryKey extends Array<unknown> = unknown[],
>(
  {
    active,
    limit,
  }: {
    active?: boolean;
    limit?: number;
  } = {},
  queryKey?: TQueryKey,
  options?: Omit<UseInfiniteQueryOptions<TData, TError>, 'queryKey' | 'queryFn'>
) =>
  useInfiniteQuery({
    queryKey: Common.UseStrategiesServiceListStrategiesKeyFn({ active, limit }, queryKey),
    queryFn: ({ pageParam }) =>
      StrategiesService.listStrategies({ active, limit, page: pageParam as number }) as TData,
    initialPageParam: '1',
    getNextPageParam: (response) =>
      (
        response as {
          nextPage: string;
        }
      ).nextPage,
    ...options,
  });
