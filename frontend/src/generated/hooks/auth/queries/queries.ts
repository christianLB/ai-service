// generated with @7nohe/openapi-react-query-codegen@1.6.2

import { UseMutationOptions, UseQueryOptions, useMutation, useQuery } from '@tanstack/react-query';
import { AdminService, AuthenticationService, ProfileService } from '../requests/services.gen';
import {
  ForgotPasswordRequest,
  LoginRequest,
  RefreshTokenRequest,
  RegisterRequest,
  ResetPasswordRequest,
  UpdateProfileRequest,
  UserRole,
} from '../requests/types.gen';
import * as Common from './common';
export const useProfileServiceGetProfile = <
  TData = Common.ProfileServiceGetProfileDefaultResponse,
  TError = unknown,
  TQueryKey extends Array<unknown> = unknown[],
>(
  queryKey?: TQueryKey,
  options?: Omit<UseQueryOptions<TData, TError>, 'queryKey' | 'queryFn'>
) =>
  useQuery<TData, TError>({
    queryKey: Common.UseProfileServiceGetProfileKeyFn(queryKey),
    queryFn: () => ProfileService.getProfile() as TData,
    ...options,
  });
export const useAdminServiceListUsers = <
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
  useQuery<TData, TError>({
    queryKey: Common.UseAdminServiceListUsersKeyFn({ isActive, limit, page, role }, queryKey),
    queryFn: () => AdminService.listUsers({ isActive, limit, page, role }) as TData,
    ...options,
  });
export const useAuthenticationServiceRegister = <
  TData = Common.AuthenticationServiceRegisterMutationResult,
  TError = unknown,
  TContext = unknown,
>(
  options?: Omit<
    UseMutationOptions<
      TData,
      TError,
      {
        requestBody: RegisterRequest;
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
      requestBody: RegisterRequest;
    },
    TContext
  >({
    mutationFn: ({ requestBody }) =>
      AuthenticationService.register({ requestBody }) as unknown as Promise<TData>,
    ...options,
  });
export const useAuthenticationServiceLogin = <
  TData = Common.AuthenticationServiceLoginMutationResult,
  TError = unknown,
  TContext = unknown,
>(
  options?: Omit<
    UseMutationOptions<
      TData,
      TError,
      {
        requestBody: LoginRequest;
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
      requestBody: LoginRequest;
    },
    TContext
  >({
    mutationFn: ({ requestBody }) =>
      AuthenticationService.login({ requestBody }) as unknown as Promise<TData>,
    ...options,
  });
export const useAuthenticationServiceRefreshToken = <
  TData = Common.AuthenticationServiceRefreshTokenMutationResult,
  TError = unknown,
  TContext = unknown,
>(
  options?: Omit<
    UseMutationOptions<
      TData,
      TError,
      {
        requestBody: RefreshTokenRequest;
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
      requestBody: RefreshTokenRequest;
    },
    TContext
  >({
    mutationFn: ({ requestBody }) =>
      AuthenticationService.refreshToken({ requestBody }) as unknown as Promise<TData>,
    ...options,
  });
export const useAuthenticationServiceLogout = <
  TData = Common.AuthenticationServiceLogoutMutationResult,
  TError = unknown,
  TContext = unknown,
>(
  options?: Omit<UseMutationOptions<TData, TError, void, TContext>, 'mutationFn'>
) =>
  useMutation<TData, TError, void, TContext>({
    mutationFn: () => AuthenticationService.logout() as unknown as Promise<TData>,
    ...options,
  });
export const useAuthenticationServiceForgotPassword = <
  TData = Common.AuthenticationServiceForgotPasswordMutationResult,
  TError = unknown,
  TContext = unknown,
>(
  options?: Omit<
    UseMutationOptions<
      TData,
      TError,
      {
        requestBody: ForgotPasswordRequest;
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
      requestBody: ForgotPasswordRequest;
    },
    TContext
  >({
    mutationFn: ({ requestBody }) =>
      AuthenticationService.forgotPassword({ requestBody }) as unknown as Promise<TData>,
    ...options,
  });
export const useAuthenticationServiceResetPassword = <
  TData = Common.AuthenticationServiceResetPasswordMutationResult,
  TError = unknown,
  TContext = unknown,
>(
  options?: Omit<
    UseMutationOptions<
      TData,
      TError,
      {
        requestBody: ResetPasswordRequest;
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
      requestBody: ResetPasswordRequest;
    },
    TContext
  >({
    mutationFn: ({ requestBody }) =>
      AuthenticationService.resetPassword({ requestBody }) as unknown as Promise<TData>,
    ...options,
  });
export const useProfileServiceUpdateProfile = <
  TData = Common.ProfileServiceUpdateProfileMutationResult,
  TError = unknown,
  TContext = unknown,
>(
  options?: Omit<
    UseMutationOptions<
      TData,
      TError,
      {
        requestBody: UpdateProfileRequest;
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
      requestBody: UpdateProfileRequest;
    },
    TContext
  >({
    mutationFn: ({ requestBody }) =>
      ProfileService.updateProfile({ requestBody }) as unknown as Promise<TData>,
    ...options,
  });
export const useAdminServiceDeleteUser = <
  TData = Common.AdminServiceDeleteUserMutationResult,
  TError = unknown,
  TContext = unknown,
>(
  options?: Omit<
    UseMutationOptions<
      TData,
      TError,
      {
        userId: string;
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
      userId: string;
    },
    TContext
  >({
    mutationFn: ({ userId }) => AdminService.deleteUser({ userId }) as unknown as Promise<TData>,
    ...options,
  });
