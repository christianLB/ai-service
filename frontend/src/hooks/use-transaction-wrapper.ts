/**
 * Wrapper hooks that switch between axios and OpenAPI implementations based on feature flags
 * This allows gradual migration and easy rollback if issues arise
 */

import { isFeatureEnabled } from '../config/feature-flags';

// Import OpenAPI implementation
import * as OpenAPIHooks from './use-transaction-openapi';

// For now, we'll export the OpenAPI version directly since axios hooks don't exist
// When axios hooks are created, we can add the switching logic

/**
 * Export the appropriate implementation based on feature flag
 */
export const useTransactions = OpenAPIHooks.useTransactions;
export const useTransaction = OpenAPIHooks.useTransaction;
export const useExportTransactions = OpenAPIHooks.useExportTransactions;
export const useTransactionMutations = OpenAPIHooks.useTransactionMutations;
export const useTransactionPrefetch = OpenAPIHooks.useTransactionPrefetch;