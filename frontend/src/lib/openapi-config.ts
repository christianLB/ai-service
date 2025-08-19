/**
 * Configuration for generated OpenAPI hooks
 * Integrates with existing SDK authentication
 */

import { OpenAPI } from '../generated/hooks/financial/requests/core/OpenAPI';
import { OpenAPI as TradingOpenAPI } from '../generated/hooks/trading/requests/core/OpenAPI';
import { OpenAPI as AuthOpenAPI } from '../generated/hooks/auth/requests/core/OpenAPI';
import { OpenAPI as AIOpenAPI } from '../generated/hooks/ai/requests/core/OpenAPI';
import { getAuthToken } from './api-client';

// Get API base URL from environment
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

/**
 * Configure all OpenAPI clients with authentication
 */
export function configureOpenAPIClients() {
  // Configure Financial API
  OpenAPI.BASE = API_BASE_URL;
  OpenAPI.TOKEN = getAuthToken;
  OpenAPI.HEADERS = {
    'Content-Type': 'application/json',
  };

  // Configure Trading API
  TradingOpenAPI.BASE = API_BASE_URL;
  TradingOpenAPI.TOKEN = getAuthToken;
  TradingOpenAPI.HEADERS = {
    'Content-Type': 'application/json',
  };

  // Configure Auth API
  AuthOpenAPI.BASE = API_BASE_URL;
  AuthOpenAPI.TOKEN = getAuthToken;
  AuthOpenAPI.HEADERS = {
    'Content-Type': 'application/json',
  };

  // Configure AI/Communication API
  AIOpenAPI.BASE = API_BASE_URL;
  AIOpenAPI.TOKEN = getAuthToken;
  AIOpenAPI.HEADERS = {
    'Content-Type': 'application/json',
  };
}

// Configure on module load
configureOpenAPIClients();

// Re-configure when auth changes
export function updateOpenAPIAuth() {
  const token = getAuthToken();

  OpenAPI.TOKEN = token;
  TradingOpenAPI.TOKEN = token;
  AuthOpenAPI.TOKEN = token;
  AIOpenAPI.TOKEN = token;
}

// Export for use in components
export { OpenAPI, TradingOpenAPI, AuthOpenAPI, AIOpenAPI };
