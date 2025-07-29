import React, { useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import { api } from '../services/api';
import type { User, AuthContextType } from './AuthContextTypes';
import { AuthContext } from './AuthContext.context';

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
          localStorage.removeItem('auth_token');
          localStorage.removeItem('refresh_token');
          setIsLoading(false);
          return;
        }
      }

      // Verify token by getting current user
      const response = await api.get('/auth/me');
      setUser(response.data);
      
      // Set session as active
      sessionStorage.setItem('session_active', 'true');
    } catch (error) {
      console.error('Auth check failed:', error);
      localStorage.removeItem('auth_token');
      localStorage.removeItem('refresh_token');
      sessionStorage.removeItem('session_active');
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    try {
      const response = await api.post('/auth/login', { email, password });
      const { accessToken, refreshToken } = response.data;

      // Store tokens
      localStorage.setItem('auth_token', accessToken);
      localStorage.setItem('refresh_token', refreshToken);
      
      // Mark session as active
      sessionStorage.setItem('session_active', 'true');

      // Get user info
      const userResponse = await api.get('/auth/me');
      setUser(userResponse.data);
    } catch (error) {
      if (error && typeof error === 'object' && 'response' in error) {
        const axiosError = error as { response?: { data?: { error?: string } } };
        throw new Error(axiosError.response?.data?.error || 'Login failed');
      }
      throw new Error('Login failed');
    }
  };

  const logout = async () => {
    try {
      const refreshToken = localStorage.getItem('refresh_token');
      if (refreshToken) {
        await api.post('/auth/logout', { refreshToken });
      }
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      // Clear local storage and state
      localStorage.removeItem('auth_token');
      localStorage.removeItem('refresh_token');
      localStorage.removeItem('rememberMe');
      sessionStorage.removeItem('session_active');
      setUser(null);
    }
  };

  const refreshToken = async () => {
    try {
      const refreshToken = localStorage.getItem('refresh_token');
      if (!refreshToken) {
        throw new Error('No refresh token');
      }

      const response = await api.post('/auth/refresh', { refreshToken });
      const { accessToken, refreshToken: newRefreshToken } = response.data;

      // Update tokens
      localStorage.setItem('auth_token', accessToken);
      localStorage.setItem('refresh_token', newRefreshToken);
    } catch (error) {
      console.error('Token refresh failed:', error);
      await logout();
      throw error;
    }
  };

  const value: AuthContextType = {
    user,
    isAuthenticated: !!user,
    isLoading,
    login,
    logout,
    refreshToken
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};