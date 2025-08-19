/**
 * SDK Adapter for openapi-react-query-codegen
 *
 * This file configures the generated hooks to use our existing SDK client
 * instead of the default fetch implementation.
 */

import { OpenAPI } from './requests/core/OpenAPI';
import { getAuthToken } from '../../lib/api-client';

// Configure the OpenAPI client to match our SDK settings
OpenAPI.BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001';
OpenAPI.VERSION = '1.0.0';
OpenAPI.WITH_CREDENTIALS = false;
OpenAPI.CREDENTIALS = 'include';

// Add authentication token to all requests
OpenAPI.TOKEN = () => {
  const token = getAuthToken();
  return token || '';
};

// Add authorization header interceptor
OpenAPI.interceptors.request.use((request) => {
  const token = getAuthToken();
  if (token) {
    request.headers = {
      ...request.headers,
      Authorization: `Bearer ${token}`,
    };
  }
  return request;
});

// Handle 401 responses for token refresh
OpenAPI.interceptors.response.use(async (response) => {
  if (response.status === 401) {
    // Token refresh logic could go here
    // For now, we'll let the component handle it
  }
  return response;
});

// Export a function to update the token when it changes
export function updateApiToken(token: string | null) {
  OpenAPI.TOKEN = token || '';
}

// Export the configured OpenAPI object
export { OpenAPI as configuredApi };
