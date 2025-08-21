// generated with @7nohe/openapi-react-query-codegen@1.6.2

import { UseQueryOptions, useSuspenseQuery } from '@tanstack/react-query';
import { AdminService, ProfileService } from '../requests/services.gen';
import { UserRole } from '../requests/types.gen';
import * as Common from './common';
export const useProfileServiceGetProfileSuspense = <
  TData = Common.ProfileServiceGetProfileDefaultResponse,
  TError = unknown,
  TQueryKey extends Array<unknown> = unknown[],
>(
  queryKey?: TQueryKey,
  options?: Omit<UseQueryOptions<TData, TError>, 'queryKey' | 'queryFn'>
) =>
  useSuspenseQuery<TData, TError>({
    queryKey: Common.UseProfileServiceGetProfileKeyFn(queryKey),
    queryFn: () => ProfileService.getProfile() as TData,
    ...options,
  });
export const useAdminServiceListUsersSuspense = <
  TData = Common.AdminServiceListUsersDefaultResponse,
  TError = unknown,
  TQueryKey extends Array<unknown> = unknown[],
>(
  {
    isActive,
    limit,
    page,
    role,
  }: {
    isActive?: boolean;
    limit?: number;
    page?: number;
    role?: UserRole;
  } = {},
  queryKey?: TQueryKey,
  options?: Omit<UseQueryOptions<TData, TError>, 'queryKey' | 'queryFn'>
) =>
  useSuspenseQuery<TData, TError>({
    queryKey: Common.UseAdminServiceListUsersKeyFn({ isActive, limit, page, role }, queryKey),
    queryFn: () => AdminService.listUsers({ isActive, limit, page, role }) as TData,
    ...options,
  });
