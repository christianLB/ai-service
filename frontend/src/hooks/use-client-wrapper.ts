/**
 * Wrapper hooks that switch between axios and OpenAPI implementations based on feature flags
 * This allows gradual migration and easy rollback if issues arise
 */

import { isFeatureEnabled } from '../config/feature-flags';

// Import both implementations
import * as AxiosHooks from './use-client';
import * as OpenAPIHooks from './use-client-openapi';

/**
 * Export the appropriate implementation based on feature flag
 */
export const useClients = isFeatureEnabled('USE_OPENAPI_CLIENT_HOOKS')
  ? OpenAPIHooks.useClients
  : AxiosHooks.useClients;

export const useClient = isFeatureEnabled('USE_OPENAPI_CLIENT_HOOKS')
  ? OpenAPIHooks.useClient
  : AxiosHooks.useClient;

export const useClientSearch = isFeatureEnabled('USE_OPENAPI_CLIENT_HOOKS')
  ? OpenAPIHooks.useClientSearch
  : AxiosHooks.useClientSearch;

export const useClientMutations = isFeatureEnabled('USE_OPENAPI_CLIENT_HOOKS')
  ? OpenAPIHooks.useClientMutations
  : AxiosHooks.useClientMutations;

export const useClientPrefetch = isFeatureEnabled('USE_OPENAPI_CLIENT_HOOKS')
  ? OpenAPIHooks.useClientPrefetch
  : AxiosHooks.useClientPrefetch;