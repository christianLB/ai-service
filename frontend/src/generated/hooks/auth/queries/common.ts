// generated with @7nohe/openapi-react-query-codegen@1.6.2

import { UseQueryResult } from '@tanstack/react-query';
import { AdminService, AuthenticationService, ProfileService } from '../requests/services.gen';
import { UserRole } from '../requests/types.gen';
export type ProfileServiceGetProfileDefaultResponse = Awaited<
  ReturnType<typeof ProfileService.getProfile>
>;
export type ProfileServiceGetProfileQueryResult<
  TData = ProfileServiceGetProfileDefaultResponse,
  TError = unknown,
> = UseQueryResult<TData, TError>;
export const useProfileServiceGetProfileKey = 'ProfileServiceGetProfile';
export const UseProfileServiceGetProfileKeyFn = (queryKey?: Array<unknown>) => [
  useProfileServiceGetProfileKey,
  ...(queryKey ?? []),
];
export type AdminServiceListUsersDefaultResponse = Awaited<
  ReturnType<typeof AdminService.listUsers>
>;
export type AdminServiceListUsersQueryResult<
  TData = AdminServiceListUsersDefaultResponse,
  TError = unknown,
> = UseQueryResult<TData, TError>;
export const useAdminServiceListUsersKey = 'AdminServiceListUsers';
export const UseAdminServiceListUsersKeyFn = (
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
  queryKey?: Array<unknown>
) => [useAdminServiceListUsersKey, ...(queryKey ?? [{ isActive, limit, page, role }])];
export type AuthenticationServiceRegisterMutationResult = Awaited<
  ReturnType<typeof AuthenticationService.register>
>;
export type AuthenticationServiceLoginMutationResult = Awaited<
  ReturnType<typeof AuthenticationService.login>
>;
export type AuthenticationServiceRefreshTokenMutationResult = Awaited<
  ReturnType<typeof AuthenticationService.refreshToken>
>;
export type AuthenticationServiceLogoutMutationResult = Awaited<
  ReturnType<typeof AuthenticationService.logout>
>;
export type AuthenticationServiceForgotPasswordMutationResult = Awaited<
  ReturnType<typeof AuthenticationService.forgotPassword>
>;
export type AuthenticationServiceResetPasswordMutationResult = Awaited<
  ReturnType<typeof AuthenticationService.resetPassword>
>;
export type ProfileServiceUpdateProfileMutationResult = Awaited<
  ReturnType<typeof ProfileService.updateProfile>
>;
export type AdminServiceDeleteUserMutationResult = Awaited<
  ReturnType<typeof AdminService.deleteUser>
>;
