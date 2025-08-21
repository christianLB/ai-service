/**
 * Wrapper hooks that switch between axios and OpenAPI implementations based on feature flags
 * This allows gradual migration and easy rollback if issues arise
 */

import { isFeatureEnabled } from '../config/feature-flags';

// Import both implementations
import * as AxiosHooks from './use-invoice-template';
import * as OpenAPIHooks from './use-invoice-template-openapi';

/**
 * Export the appropriate implementation based on feature flag
 */
export const useInvoiceTemplates = isFeatureEnabled('USE_OPENAPI_INVOICE_TEMPLATE_HOOKS')
  ? OpenAPIHooks.useInvoiceTemplates
  : AxiosHooks.useInvoiceTemplates;

export const useInvoiceTemplate = isFeatureEnabled('USE_OPENAPI_INVOICE_TEMPLATE_HOOKS')
  ? OpenAPIHooks.useInvoiceTemplate
  : AxiosHooks.useInvoiceTemplate;

export const useInvoiceTemplateSearch = isFeatureEnabled('USE_OPENAPI_INVOICE_TEMPLATE_HOOKS')
  ? OpenAPIHooks.useInvoiceTemplateSearch
  : AxiosHooks.useInvoiceTemplateSearch;

export const useInvoiceTemplateMutations = isFeatureEnabled('USE_OPENAPI_INVOICE_TEMPLATE_HOOKS')
  ? OpenAPIHooks.useInvoiceTemplateMutations
  : AxiosHooks.useInvoiceTemplateMutations;

export const useInvoiceTemplatePrefetch = isFeatureEnabled('USE_OPENAPI_INVOICE_TEMPLATE_HOOKS')
  ? OpenAPIHooks.useInvoiceTemplatePrefetch
  : AxiosHooks.useInvoiceTemplatePrefetch;

// Individual mutation hooks
export const useCreateInvoiceTemplate = isFeatureEnabled('USE_OPENAPI_INVOICE_TEMPLATE_HOOKS')
  ? OpenAPIHooks.useCreateInvoiceTemplate
  : AxiosHooks.useCreateInvoiceTemplate;

export const useUpdateInvoiceTemplate = isFeatureEnabled('USE_OPENAPI_INVOICE_TEMPLATE_HOOKS')
  ? OpenAPIHooks.useUpdateInvoiceTemplate
  : AxiosHooks.useUpdateInvoiceTemplate;

export const useDeleteInvoiceTemplate = isFeatureEnabled('USE_OPENAPI_INVOICE_TEMPLATE_HOOKS')
  ? OpenAPIHooks.useDeleteInvoiceTemplate
  : AxiosHooks.useDeleteInvoiceTemplate;