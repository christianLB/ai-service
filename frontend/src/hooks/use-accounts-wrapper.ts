/**
 * Wrapper hooks that switch between axios and OpenAPI implementations based on feature flags
 * This allows gradual migration and easy rollback if issues arise
 */

import { isFeatureEnabled } from '../config/feature-flags';

// Import both implementations
import * as AxiosHooks from './use-accounts';
import * as OpenAPIHooks from './use-accounts-openapi';

/**
 * Export the appropriate implementation based on feature flag
 */
export const useAccountss = isFeatureEnabled('USE_OPENAPI_ACCOUNTS_HOOKS')
  ? OpenAPIHooks.useAccounts
  : AxiosHooks.useAccountss;

export const useAccounts = isFeatureEnabled('USE_OPENAPI_ACCOUNTS_HOOKS')
  ? OpenAPIHooks.useAccount
  : AxiosHooks.useAccounts;

export const useAccountsSearch = isFeatureEnabled('USE_OPENAPI_ACCOUNTS_HOOKS')
  ? OpenAPIHooks.useAccountsSearch
  : AxiosHooks.useAccountsSearch;

export const useAccountsMutations = isFeatureEnabled('USE_OPENAPI_ACCOUNTS_HOOKS')
  ? OpenAPIHooks.useAccountsMutations
  : AxiosHooks.useAccountsMutations;

export const useAccountsPrefetch = isFeatureEnabled('USE_OPENAPI_ACCOUNTS_HOOKS')
  ? OpenAPIHooks.useAccountsPrefetch
  : AxiosHooks.useAccountsPrefetch;

// Additional OpenAPI-only exports (when available)
export const useAccountStatus = isFeatureEnabled('USE_OPENAPI_ACCOUNTS_HOOKS')
  ? OpenAPIHooks.useAccountStatus
  : undefined;