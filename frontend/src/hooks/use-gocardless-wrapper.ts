/**
 * Wrapper hooks that switch between axios and OpenAPI implementations based on feature flags
 * This allows gradual migration and easy rollback if issues arise
 * Note: No axios version exists for GoCardless, but wrapper created for consistency
 */

import { isFeatureEnabled } from '../config/feature-flags';

// Import OpenAPI implementation (no axios version exists)
import * as OpenAPIHooks from './use-gocardless-openapi';

/**
 * Export the OpenAPI implementation based on feature flag
 * Since no axios version exists, we always use OpenAPI when enabled
 */
export const useGoCardlessCredentials = isFeatureEnabled('USE_OPENAPI_GOCARDLESS_HOOKS')
  ? OpenAPIHooks.useGoCardlessCredentials
  : () => ({ data: null, isLoading: false, error: new Error('GoCardless hooks disabled') });

export const useGoCardlessStatus = isFeatureEnabled('USE_OPENAPI_GOCARDLESS_HOOKS')
  ? OpenAPIHooks.useGoCardlessStatus
  : () => ({ data: null, isLoading: false, error: new Error('GoCardless hooks disabled') });

export const useGoCardlessMutations = isFeatureEnabled('USE_OPENAPI_GOCARDLESS_HOOKS')
  ? OpenAPIHooks.useGoCardlessMutations
  : () => ({
      configure: () => console.warn('GoCardless hooks disabled'),
      testConnection: () => console.warn('GoCardless hooks disabled'),
      diagnose: () => console.warn('GoCardless hooks disabled'),
      deleteCredentials: () => console.warn('GoCardless hooks disabled'),
      isConfiguring: false,
      isTesting: false,
      isDiagnosing: false,
      isDeleting: false,
    });

export const useGoCardlessSync = isFeatureEnabled('USE_OPENAPI_GOCARDLESS_HOOKS')
  ? OpenAPIHooks.useGoCardlessSync
  : () => ({
      manualSync: () => console.warn('GoCardless hooks disabled'),
      syncAccounts: () => console.warn('GoCardless hooks disabled'),
      syncBalances: () => console.warn('GoCardless hooks disabled'),
      syncTransactions: () => console.warn('GoCardless hooks disabled'),
      isManualSyncing: false,
      isSyncingAccounts: false,
      isSyncingBalances: false,
      isSyncingTransactions: false,
    });