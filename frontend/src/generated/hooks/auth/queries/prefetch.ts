// generated with @7nohe/openapi-react-query-codegen@1.6.2

import { type QueryClient } from '@tanstack/react-query';
import { AdminService, ProfileService } from '../requests/services.gen';
import { UserRole } from '../requests/types.gen';
import * as Common from './common';
export const prefetchUseProfileServiceGetProfile = (queryClient: QueryClient) =>
  queryClient.prefetchQuery({
    queryKey: Common.UseProfileServiceGetProfileKeyFn(),
    queryFn: () => ProfileService.getProfile(),
  });
export const prefetchUseAdminServiceListUsers = (
  queryClient: QueryClient,
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
  } = {}
) =>
  queryClient.prefetchQuery({
    queryKey: Common.UseAdminServiceListUsersKeyFn({ isActive, limit, page, role }),
    queryFn: () => AdminService.listUsers({ isActive, limit, page, role }),
  });
