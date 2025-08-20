/**
 * Wrapper hooks that switch between axios and OpenAPI implementations based on feature flags
 * This allows gradual migration and easy rollback if issues arise
 */

import { isFeatureEnabled } from '../config/feature-flags';

// Import both implementations (axios version would need to be created from invoiceService)
import * as OpenAPIHooks from './use-invoice-openapi';

// For now, we'll export the OpenAPI version directly since axios hooks don't exist
// When axios hooks are created, we can add the switching logic

/**
 * Export the appropriate implementation based on feature flag
 */
export const useInvoices = OpenAPIHooks.useInvoices;
export const useInvoice = OpenAPIHooks.useInvoice;
export const useInvoiceByNumber = OpenAPIHooks.useInvoiceByNumber;
export const useOverdueInvoices = OpenAPIHooks.useOverdueInvoices;
export const useInvoiceMutations = OpenAPIHooks.useInvoiceMutations;
export const useAddInvoiceItem = OpenAPIHooks.useAddInvoiceItem;
export const useGenerateInvoicePdf = OpenAPIHooks.useGenerateInvoicePdf;
export const useDownloadInvoicePdf = OpenAPIHooks.useDownloadInvoicePdf;
export const useSendInvoiceEmail = OpenAPIHooks.useSendInvoiceEmail;
export const useInvoicePrefetch = OpenAPIHooks.useInvoicePrefetch;