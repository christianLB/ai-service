// generated with @7nohe/openapi-react-query-codegen@1.6.2

import { InfiniteData, UseInfiniteQueryOptions, useInfiniteQuery } from '@tanstack/react-query';
import { AdminService } from '../requests/services.gen';
import { UserRole } from '../requests/types.gen';
import * as Common from './common';
export const useAdminServiceListUsersInfinite = <
  TData = InfiniteData<Common.AdminServiceListUsersDefaultResponse>,
  TError = unknown,
  TQueryKey extends Array<unknown> = unknown[],
>(
  {
    isActive,
    limit,
    role,
  }: {
    isActive?: boolean;
    limit?: number;
    role?: UserRole;
  } = {},
  queryKey?: TQueryKey,
  options?: Omit<UseInfiniteQueryOptions<TData, TError>, 'queryKey' | 'queryFn'>
) =>
  useInfiniteQuery({
    queryKey: Common.UseAdminServiceListUsersKeyFn({ isActive, limit, role }, queryKey),
    queryFn: ({ pageParam }) =>
      AdminService.listUsers({ isActive, limit, page: pageParam as number, role }) as TData,
    initialPageParam: '1',
    getNextPageParam: (response) =>
      (
        response as {
          nextPage: string;
        }
      ).nextPage,
    ...options,
  });
