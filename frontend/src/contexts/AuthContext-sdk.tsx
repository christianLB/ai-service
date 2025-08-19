/**
 * Auth Context - SDK Version
 *
 * This context uses the SDK client with openapi-fetch for type-safe API calls.
 * It replaces the axios-based AuthContext.tsx.
 */

import React, { useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import { authApi, setTokens, clearTokens } from '../lib/api-client';
import type { components } from '@ai/contracts';
import type { AuthContextType } from './AuthContextTypes';
import { AuthContext } from './AuthContext.context';

// Use types from the OpenAPI contracts
type User = components['schemas']['User'];
type RegisterDto = components['schemas']['RegisterDto'];

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      // Check if we have a token
      const token = localStorage.getItem('auth_token');
      if (!token) {
        setIsLoading(false);
        return;
      }

      // Check if remember me is disabled and session expired
      const rememberMe = localStorage.getItem('rememberMe') === 'true';
      if (!rememberMe) {
        // Check if session is still valid (e.g., browser wasn't closed)
        const sessionValid = sessionStorage.getItem('session_active') === 'true';
        if (!sessionValid) {
          clearTokens();
          setIsLoading(false);
          return;
        }
      }

      // Verify token by getting current user
      const { data, error } = await authApi.GET('/auth/me', {});

      if (error) {
        console.error('Auth check failed:', error);
        clearTokens();
        sessionStorage.removeItem('session_active');
      } else if (data?.data) {
        setUser(data.data);
        // Set session as active
        sessionStorage.setItem('session_active', 'true');
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      clearTokens();
      sessionStorage.removeItem('session_active');
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    try {
      const { data, error } = await authApi.POST('/auth/login', {
        body: { email, password },
      });

      if (error) {
        throw new Error(error.message || 'Login failed');
      }

      if (data?.data) {
        const { accessToken, refreshToken } = data.data;

        // Store tokens using SDK helper
        setTokens(accessToken, refreshToken);

        // Mark session as active
        sessionStorage.setItem('session_active', 'true');

        // Get user info
        const userResponse = await authApi.GET('/auth/me', {});

        if (userResponse.data?.data) {
          setUser(userResponse.data.data);
        }
      }
    } catch (error: unknown) {
      throw new Error((error as Error).message || 'Login failed');
    }
  };

  const logout = async () => {
    try {
      const refreshToken = localStorage.getItem('refresh_token');
      if (refreshToken) {
        await authApi.POST('/auth/logout', {
          body: { refreshToken },
        });
      }
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      // Clear tokens and state
      clearTokens();
      localStorage.removeItem('rememberMe');
      sessionStorage.removeItem('session_active');
      setUser(null);
    }
  };

  const register = async (data: RegisterDto) => {
    try {
      const { data: response, error } = await authApi.POST('/auth/register', {
        body: data,
      });

      if (error) {
        throw new Error(error.message || 'Registration failed');
      }

      if (response?.data) {
        const { accessToken, refreshToken } = response.data;

        // Store tokens
        setTokens(accessToken, refreshToken);

        // Mark session as active
        sessionStorage.setItem('session_active', 'true');

        // Get user info
        const userResponse = await authApi.GET('/auth/me', {});

        if (userResponse.data?.data) {
          setUser(userResponse.data.data);
        }
      }
    } catch (error: unknown) {
      throw new Error((error as Error).message || 'Registration failed');
    }
  };

  const updateProfile = async (data: Partial<User>) => {
    try {
      const { data: response, error } = await authApi.PUT('/auth/profile', {
        body: data,
      });

      if (error) {
        throw new Error(error.message || 'Profile update failed');
      }

      if (response?.data) {
        setUser(response.data);
      }
    } catch (error: unknown) {
      throw new Error((error as Error).message || 'Profile update failed');
    }
  };

  const changePassword = async (currentPassword: string, newPassword: string) => {
    try {
      const { error } = await authApi.POST('/auth/change-password', {
        body: { currentPassword, newPassword },
      });

      if (error) {
        throw new Error(error.message || 'Password change failed');
      }
    } catch (error: unknown) {
      throw new Error((error as Error).message || 'Password change failed');
    }
  };

  const requestPasswordReset = async (email: string) => {
    try {
      const { error } = await authApi.POST('/auth/forgot-password', {
        body: { email },
      });

      if (error) {
        throw new Error(error.message || 'Password reset request failed');
      }
    } catch (error: unknown) {
      throw new Error((error as Error).message || 'Password reset request failed');
    }
  };

  const resetPassword = async (token: string, newPassword: string) => {
    try {
      const { error } = await authApi.POST('/auth/reset-password', {
        body: { token, newPassword },
      });

      if (error) {
        throw new Error(error.message || 'Password reset failed');
      }
    } catch (error: unknown) {
      throw new Error((error as Error).message || 'Password reset failed');
    }
  };

  const value: AuthContextType = {
    user,
    isLoading,
    isAuthenticated: !!user,
    login,
    logout,
    register,
    updateProfile,
    changePassword,
    requestPasswordReset,
    resetPassword,
    checkAuth,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
