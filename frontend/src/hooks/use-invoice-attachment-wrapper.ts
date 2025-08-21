/**
 * Wrapper hooks that switch between axios and OpenAPI implementations based on feature flags
 * This allows gradual migration and easy rollback if issues arise
 */

import { isFeatureEnabled } from '../config/feature-flags';

// Import both implementations
import * as AxiosHooks from './use-invoice-attachment';
import * as OpenAPIHooks from './use-invoice-attachment-openapi';

/**
 * Export the appropriate implementation based on feature flag
 */
export const useInvoiceAttachments = isFeatureEnabled('USE_OPENAPI_INVOICE_ATTACHMENT_HOOKS')
  ? OpenAPIHooks.useInvoiceAttachments
  : AxiosHooks.useInvoiceAttachments;

export const useInvoiceAttachment = isFeatureEnabled('USE_OPENAPI_INVOICE_ATTACHMENT_HOOKS')
  ? OpenAPIHooks.useInvoiceAttachment
  : AxiosHooks.useInvoiceAttachment;

export const useInvoiceAttachmentSearch = isFeatureEnabled('USE_OPENAPI_INVOICE_ATTACHMENT_HOOKS')
  ? OpenAPIHooks.useInvoiceAttachmentSearch
  : AxiosHooks.useInvoiceAttachmentSearch;

export const useInvoiceAttachmentMutations = isFeatureEnabled('USE_OPENAPI_INVOICE_ATTACHMENT_HOOKS')
  ? OpenAPIHooks.useInvoiceAttachmentMutations
  : AxiosHooks.useInvoiceAttachmentMutations;

export const useInvoiceAttachmentPrefetch = isFeatureEnabled('USE_OPENAPI_INVOICE_ATTACHMENT_HOOKS')
  ? OpenAPIHooks.useInvoiceAttachmentPrefetch
  : AxiosHooks.useInvoiceAttachmentPrefetch;