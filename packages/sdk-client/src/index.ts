/**
 * @ai/sdk-client - TypeScript SDK for AI Service API
 * 
 * This SDK provides type-safe access to all AI Service endpoints
 */

import createClient from 'openapi-fetch';
import type { paths as GatewayPaths } from '@ai/contracts/src/generated/gateway';
import type { paths as AuthPaths } from '@ai/contracts/src/generated/auth';
import type { paths as FinancialPaths } from '@ai/contracts/src/generated/financial';
import type { paths as TradingPaths } from '@ai/contracts/src/generated/trading';
import type { paths as AICorePaths } from '@ai/contracts/src/generated/ai-core';
import type { paths as CommPaths } from '@ai/contracts/src/generated/comm';

export interface AIServiceClientOptions {
  baseUrl?: string;
  accessToken?: string;
  headers?: Record<string, string>;
}

export class AIServiceClient {
  private baseUrl: string;
  private headers: Record<string, string>;
  
  // Domain-specific clients
  public gateway: ReturnType<typeof createClient<GatewayPaths>>;
  public auth: ReturnType<typeof createClient<AuthPaths>>;
  public financial: ReturnType<typeof createClient<FinancialPaths>>;
  public trading: ReturnType<typeof createClient<TradingPaths>>;
  public aiCore: ReturnType<typeof createClient<AICorePaths>>;
  public comm: ReturnType<typeof createClient<CommPaths>>;

  constructor(options: AIServiceClientOptions = {}) {
    this.baseUrl = options.baseUrl || process.env.VITE_API_URL || 'http://localhost:3001';
    this.headers = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (options.accessToken) {
      this.headers['Authorization'] = `Bearer ${options.accessToken}`;
    }

    // Initialize domain clients
    this.gateway = createClient<GatewayPaths>({
      baseUrl: this.baseUrl,
      headers: this.headers,
    });

    this.auth = createClient<AuthPaths>({
      baseUrl: this.baseUrl,
      headers: this.headers,
    });

    this.financial = createClient<FinancialPaths>({
      baseUrl: this.baseUrl,
      headers: this.headers,
    });

    this.trading = createClient<TradingPaths>({
      baseUrl: this.baseUrl,
      headers: this.headers,
    });

    this.aiCore = createClient<AICorePaths>({
      baseUrl: this.baseUrl,
      headers: this.headers,
    });

    this.comm = createClient<CommPaths>({
      baseUrl: this.baseUrl,
      headers: this.headers,
    });
  }

  /**
   * Set access token for authenticated requests
   */
  setAccessToken(token: string) {
    this.headers['Authorization'] = `Bearer ${token}`;
    
    // Update all domain clients
    const clients = [this.gateway, this.auth, this.financial, this.trading, this.aiCore, this.comm];
    clients.forEach(client => {
      // Update headers for each client
      (client as any).headers = { ...this.headers };
    });
  }

  /**
   * Remove access token
   */
  clearAccessToken() {
    delete this.headers['Authorization'];
    
    // Update all domain clients
    const clients = [this.gateway, this.auth, this.financial, this.trading, this.aiCore, this.comm];
    clients.forEach(client => {
      (client as any).headers = { ...this.headers };
    });
  }

  /**
   * Health check
   */
  async healthCheck() {
    return this.gateway.GET('/health/live');
  }

  /**
   * Login helper
   */
  async login(email: string, password: string) {
    const response = await this.auth.POST('/auth/login', {
      body: { email, password }
    });

    if (response.data?.data?.accessToken) {
      this.setAccessToken(response.data.data.accessToken);
    }

    return response;
  }

  /**
   * Logout helper
   */
  async logout() {
    const response = await this.auth.POST('/auth/logout');
    this.clearAccessToken();
    return response;
  }
}

// Export the client factory
export function createAIServiceClient(options?: AIServiceClientOptions): AIServiceClient {
  return new AIServiceClient(options);
}

// Export types from contracts
export * from '@ai/contracts';

// Default export
export default AIServiceClient;