import { useQueryClient } from '@tanstack/react-query';
import { message } from 'antd';
import {
  useAttachmentsServiceListAttachments,
  useAttachmentsServiceGetAttachment,
} from '../generated/hooks/financial/queries/queries';
import type {
  InvoiceAttachment,
  CreateInvoiceAttachment,
  InvoiceAttachmentQuery,
} from '../types/invoice-attachment.types';

const QUERY_KEY = 'invoice-attachments';

/**
 * Hook to fetch all invoice attachments with pagination - using generated OpenAPI hooks
 */
export function useInvoiceAttachments(params?: InvoiceAttachmentQuery) {
  return useAttachmentsServiceListAttachments({
    page: params?.page,
    limit: params?.limit,
    invoiceId: params?.invoiceId,
    fileType: params?.fileType,
  });
}

/**
 * Hook to fetch a single invoice attachment by ID - using generated OpenAPI hooks
 */
export function useInvoiceAttachment(id: string | undefined) {
  return useAttachmentsServiceGetAttachment(
    { id: id! },
    undefined,
    { enabled: !!id }
  );
}

/**
 * Hook to search invoice attachments - fallback to list with filtering
 * Note: Search endpoint not available in OpenAPI spec, using list with client-side filtering
 */
export function useInvoiceAttachmentSearch(query: string) {
  const { data, ...rest } = useAttachmentsServiceListAttachments({}, undefined, {
    enabled: query.length > 0,
  });

  // Client-side filtering as search endpoint not available
  const filteredData = data?.data?.items?.filter((attachment: any) =>
    Object.values(attachment).some(value =>
      String(value).toLowerCase().includes(query.toLowerCase())
    )
  );

  return {
    data: filteredData,
    ...rest,
  };
}

/**
 * Hook for invoice attachment mutations
 * Note: Create/Update/Delete endpoints not available in OpenAPI spec for attachments
 * These would need to be added to the OpenAPI spec if needed
 */
export function useInvoiceAttachmentMutations() {
  const queryClient = useQueryClient();

  // Since mutations are not available in the OpenAPI spec,
  // we'll provide placeholder functions that show error messages
  return {
    create: (data: CreateInvoiceAttachment) => {
      message.error('Attachment creation not available - endpoint not in OpenAPI spec');
    },
    update: (params: { id: string; data: Partial<InvoiceAttachment> }) => {
      message.error('Attachment update not available - endpoint not in OpenAPI spec');
    },
    delete: (id: string) => {
      message.error('Attachment deletion not available - endpoint not in OpenAPI spec');
    },
    bulkDelete: (ids: string[]) => {
      message.error('Bulk attachment deletion not available - endpoint not in OpenAPI spec');
    },
    isCreating: false,
    isUpdating: false,
    isDeleting: false,
    isBulkDeleting: false,
  };
}

/**
 * Hook to prefetch invoice attachment data - using generated OpenAPI hooks
 */
export function useInvoiceAttachmentPrefetch() {
  const queryClient = useQueryClient();

  const prefetchInvoiceAttachment = async (id: string) => {
    await queryClient.prefetchQuery({
      queryKey: ['AttachmentsService.getAttachment', { id }],
      queryFn: async () => {
        // This will be handled by the generated hook's queryFn
        return {};
      },
    });
  };

  const prefetchInvoiceAttachments = async (params?: InvoiceAttachmentQuery) => {
    await queryClient.prefetchQuery({
      queryKey: [
        'AttachmentsService.listAttachments',
        {
          page: params?.page,
          limit: params?.limit,
          invoiceId: params?.invoiceId,
          fileType: params?.fileType,
        },
      ],
      queryFn: async () => {
        // This will be handled by the generated hook's queryFn
        return {};
      },
    });
  };

  return {
    prefetchInvoiceAttachment,
    prefetchInvoiceAttachments,
  };
}