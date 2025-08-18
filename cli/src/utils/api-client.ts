import axios, { AxiosInstance, AxiosResponse, AxiosError } from 'axios';
import type { AuthTokens, CommandResult, CLIError } from '../types';
import { config } from './config';
import { logger } from './logger';

/**
 * API Client for communicating with AI Service
 */
export class APIClient {
  private client: AxiosInstance;
  private tokens: AuthTokens | null = null;

  constructor(baseURL: string) {
    this.client = axios.create({
      baseURL,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Request interceptor to add authentication
    this.client.interceptors.request.use((config) => {
      if (this.tokens?.access) {
        config.headers.Authorization = `Bearer ${this.tokens.access}`;
      }
      return config;
    });

    // Response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => response,
      (error: AxiosError) => {
        return Promise.reject(this.handleApiError(error));
      }
    );
  }

  /**
   * Set authentication tokens
   */
  setTokens(tokens: AuthTokens): void {
    this.tokens = tokens;
  }

  /**
   * Clear authentication tokens
   */
  clearTokens(): void {
    this.tokens = null;
  }

  /**
   * Authenticate with username/password
   */
  async login(email: string, password: string): Promise<AuthTokens> {
    try {
      const response = await this.client.post('/auth/login', {
        email,
        password,
      });

      const tokens: AuthTokens = {
        access: response.data.token,
        refresh: response.data.refreshToken,
        expires: response.data.expires,
        user: response.data.user,
      };

      this.setTokens(tokens);
      return tokens;
    } catch (error) {
      throw this.createError('AUTH_LOGIN_FAILED', 'Login failed', error);
    }
  }

  /**
   * Refresh authentication token
   */
  async refreshToken(): Promise<AuthTokens> {
    if (!this.tokens?.refresh) {
      throw this.createError('AUTH_NO_REFRESH_TOKEN', 'No refresh token available');
    }

    try {
      const response = await this.client.post('/auth/refresh', {
        refreshToken: this.tokens.refresh,
      });

      const tokens: AuthTokens = {
        access: response.data.token,
        refresh: response.data.refreshToken || this.tokens.refresh,
        expires: response.data.expires,
        user: response.data.user,
      };

      this.setTokens(tokens);
      return tokens;
    } catch (error) {
      throw this.createError('AUTH_REFRESH_FAILED', 'Token refresh failed', error);
    }
  }

  /**
   * Get current user info
   */
  async whoami(): Promise<any> {
    try {
      const response = await this.client.get('/auth/me');
      return response.data;
    } catch (error) {
      throw this.createError('AUTH_WHOAMI_FAILED', 'Failed to get user info', error);
    }
  }

  /**
   * Logout (invalidate tokens)
   */
  async logout(): Promise<void> {
    try {
      if (this.tokens?.access) {
        await this.client.post('/auth/logout');
      }
    } catch (error) {
      // Log error but don't throw - logout should always succeed locally
      logger.warn('Server logout failed, clearing local tokens anyway');
    } finally {
      this.clearTokens();
    }
  }

  /**
   * Check API health
   */
  async healthCheck(): Promise<any> {
    try {
      const response = await this.client.get('/health');
      return response.data;
    } catch (error) {
      throw this.createError('API_HEALTH_FAILED', 'Health check failed', error);
    }
  }

  /**
   * Get database migration status
   */
  async getMigrationStatus(): Promise<any[]> {
    try {
      const response = await this.client.get('/admin/migrations/status');
      return response.data;
    } catch (error) {
      throw this.createError('DB_MIGRATION_STATUS_FAILED', 'Failed to get migration status', error);
    }
  }

  /**
   * Run database migrations
   */
  async runMigrations(): Promise<CommandResult> {
    try {
      const response = await this.client.post('/admin/migrations/run');
      return response.data;
    } catch (error) {
      throw this.createError('DB_MIGRATION_RUN_FAILED', 'Failed to run migrations', error);
    }
  }

  /**
   * Rollback database migration
   */
  async rollbackMigration(migrationId?: string): Promise<CommandResult> {
    try {
      const response = await this.client.post('/admin/migrations/rollback', {
        migrationId,
      });
      return response.data;
    } catch (error) {
      throw this.createError('DB_MIGRATION_ROLLBACK_FAILED', 'Failed to rollback migration', error);
    }
  }

  /**
   * Get service status
   */
  async getServiceStatus(): Promise<any> {
    try {
      const response = await this.client.get('/admin/status');
      return response.data;
    } catch (error) {
      throw this.createError('SERVICE_STATUS_FAILED', 'Failed to get service status', error);
    }
  }

  /**
   * Generic GET request
   */
  async get<T = any>(url: string): Promise<T> {
    try {
      const response = await this.client.get(url);
      return response.data;
    } catch (error) {
      throw this.createError('API_GET_FAILED', `GET ${url} failed`, error);
    }
  }

  /**
   * Generic POST request
   */
  async post<T = any>(url: string, data?: any): Promise<T> {
    try {
      const response = await this.client.post(url, data);
      return response.data;
    } catch (error) {
      throw this.createError('API_POST_FAILED', `POST ${url} failed`, error);
    }
  }

  /**
   * Handle API errors
   */
  private handleApiError(error: AxiosError): CLIError {
    const responseData = error.response?.data as any;
    const message = responseData?.message || error.message;
    const statusCode = error.response?.status;
    
    let code = 'API_ERROR';
    
    if (statusCode === 401) {
      code = 'AUTH_UNAUTHORIZED';
    } else if (statusCode === 403) {
      code = 'AUTH_FORBIDDEN';
    } else if (statusCode === 404) {
      code = 'API_NOT_FOUND';
    } else if (statusCode && statusCode >= 500) {
      code = 'API_SERVER_ERROR';
    }

    return this.createError(code, message, error);
  }

  /**
   * Create CLI error from various sources
   */
  private createError(code: string, message: string, source?: any): CLIError {
    const error = new Error(message) as CLIError;
    error.code = code;
    
    if (source?.response?.status) {
      error.statusCode = source.response.status;
    }
    
    if (source?.response?.data) {
      error.context = source.response.data;
    }
    
    return error;
  }
}

// Create API client instance
export const createAPIClient = (baseURL?: string): APIClient => {
  const apiUrl = baseURL || config.getApiUrl();
  return new APIClient(apiUrl);
};