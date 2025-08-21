/**
 * API Client Singleton
 *
 * This is the centralized API client for the frontend application.
 * It uses the SDK client with openapi-fetch for type-safe API calls.
 *
 * IMPORTANT: This replaces the old axios-based api.ts service
 */

import { createAIServiceClient } from '@ai/sdk-client';

// Get the API URL from environment or use default
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

// Create the SDK client instance
export const apiClient = createAIServiceClient({
  baseUrl: API_BASE_URL,
});

// Helper function to get auth token from localStorage
export function getAuthToken(): string | null {
  return localStorage.getItem('auth_token');
}

// Helper function to get refresh token from localStorage
function getRefreshToken(): string | null {
  return localStorage.getItem('refresh_token');
}

// Helper function to set tokens in localStorage
export function setTokens(accessToken: string, refreshToken: string) {
  localStorage.setItem('auth_token', accessToken);
  localStorage.setItem('refresh_token', refreshToken);
  apiClient.setAccessToken(accessToken);
}

// Helper function to clear tokens
export function clearTokens() {
  localStorage.removeItem('auth_token');
  localStorage.removeItem('refresh_token');
  apiClient.clearAccessToken();
}

// Initialize with stored token if available
const storedToken = getAuthToken();
if (storedToken) {
  apiClient.setAccessToken(storedToken);
}

// Token refresh logic
let isRefreshing = false;
let refreshPromise: Promise<void> | null = null;

/**
 * Refresh the access token using the refresh token
 */
export async function refreshAccessToken(): Promise<void> {
  if (isRefreshing && refreshPromise) {
    return refreshPromise;
  }

  isRefreshing = true;

  refreshPromise = (async () => {
    try {
      const refreshToken = getRefreshToken();

      if (!refreshToken) {
        throw new Error('No refresh token available');
      }

      const response = await apiClient.auth.POST('/auth/refresh', {
        body: { refreshToken },
      });

      if (response.error) {
        throw new Error(response.error.message || 'Token refresh failed');
      }

      if (response.data?.data) {
        const { accessToken, refreshToken: newRefreshToken } = response.data.data;
        setTokens(accessToken, newRefreshToken);
      }
    } catch (error) {
      // Clear tokens on refresh failure
      clearTokens();
      // Redirect to login
      window.location.href = '/login';
      throw error;
    } finally {
      isRefreshing = false;
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

/**
 * Wrapper for API calls with automatic token refresh on 401
 */
export async function apiCall<T>(apiFunction: () => Promise<T>): Promise<T> {
  try {
    return await apiFunction();
  } catch (error: unknown) {
    // Check if it's a 401 Unauthorized error
    if (error?.response?.status === 401) {
      // Try to refresh the token
      await refreshAccessToken();
      // Retry the original request
      return await apiFunction();
    }
    throw error;
  }
}

// Export the client for direct use
export default apiClient;

// Export specific API modules for convenience
export const authApi = apiClient.auth;
export const financialApi = apiClient.financial;
export const tradingApi = apiClient.trading;
export const aiCoreApi = apiClient.aiCore;
export const commApi = apiClient.comm;
