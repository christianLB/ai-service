import { useQueryClient } from '@tanstack/react-query';
import { message } from 'antd';
import {
  useInvoicesServiceListInvoices,
  useInvoicesServiceGetInvoice,
  useInvoicesServiceGetInvoiceByNumber,
  useInvoicesServiceGetOverdueInvoices,
  useInvoicesServiceCreateInvoice,
  useInvoicesServiceUpdateInvoice,
  useInvoicesServiceDeleteInvoice,
  useInvoicesServiceMarkInvoicePaid,
  useInvoicesServiceSendInvoice,
  useInvoicesServiceDuplicateInvoice,
  useInvoicesServiceAddInvoiceItem,
  useInvoicesServiceGenerateInvoicePdf,
  useInvoicesServiceDownloadInvoicePdf,
  useInvoicesServiceSendInvoiceEmail,
} from '../generated/hooks/financial/queries/queries';
import type { Invoice, InvoiceFormData, InvoiceItem } from '../types';

const QUERY_KEY = 'invoices';

export interface InvoiceListParams {
  clientId?: string;
  status?: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';
  page?: number;
  limit?: number;
}

/**
 * Hook to fetch all invoices with pagination - using generated OpenAPI hooks
 */
export function useInvoices(params?: InvoiceListParams) {
  return useInvoicesServiceListInvoices({
    clientId: params?.clientId,
    status: params?.status,
    page: params?.page,
    limit: params?.limit,
  });
}

/**
 * Hook to fetch a single invoice by ID - using generated OpenAPI hooks
 */
export function useInvoice(id: string | undefined) {
  return useInvoicesServiceGetInvoice(
    { id: id! },
    undefined,
    { enabled: !!id }
  );
}

/**
 * Hook to fetch invoice by number - using generated OpenAPI hooks
 */
export function useInvoiceByNumber(invoiceNumber: string | undefined) {
  return useInvoicesServiceGetInvoiceByNumber(
    { invoiceNumber: invoiceNumber! },
    undefined,
    { enabled: !!invoiceNumber }
  );
}

/**
 * Hook to fetch overdue invoices - using generated OpenAPI hooks
 */
export function useOverdueInvoices(params?: { page?: number; limit?: number }) {
  return useInvoicesServiceGetOverdueInvoices({
    page: params?.page,
    limit: params?.limit,
  });
}

/**
 * Hook for invoice mutations (create, update, delete) - using generated OpenAPI hooks
 */
export function useInvoiceMutations() {
  const queryClient = useQueryClient();

  const createMutation = useInvoicesServiceCreateInvoice({
    onSuccess: (response: any) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      message.success(response.message || 'Invoice created successfully');
    },
    onError: (error: any) => {
      message.error(error.response?.data?.message || 'Failed to create invoice');
    },
  });

  const updateMutation = useInvoicesServiceUpdateInvoice({
    onSuccess: (response: any, variables) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY, variables.id] });
      message.success(response.message || 'Invoice updated successfully');
    },
    onError: (error: any) => {
      message.error(error.response?.data?.message || 'Failed to update invoice');
    },
  });

  const deleteMutation = useInvoicesServiceDeleteInvoice({
    onSuccess: (response: any) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      message.success(response.message || 'Invoice deleted successfully');
    },
    onError: (error: any) => {
      message.error(error.response?.data?.message || 'Failed to delete invoice');
    },
  });

  const markPaidMutation = useInvoicesServiceMarkInvoicePaid({
    onSuccess: (response: any, variables) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY, variables.id] });
      message.success(response.message || 'Invoice marked as paid');
    },
    onError: (error: any) => {
      message.error(error.response?.data?.message || 'Failed to mark invoice as paid');
    },
  });

  const sendMutation = useInvoicesServiceSendInvoice({
    onSuccess: (response: any, variables) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY, variables.id] });
      message.success(response.message || 'Invoice sent successfully');
    },
    onError: (error: any) => {
      message.error(error.response?.data?.message || 'Failed to send invoice');
    },
  });

  const duplicateMutation = useInvoicesServiceDuplicateInvoice({
    onSuccess: (response: any) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      message.success(response.message || 'Invoice duplicated successfully');
    },
    onError: (error: any) => {
      message.error(error.response?.data?.message || 'Failed to duplicate invoice');
    },
  });

  return {
    create: (data: InvoiceFormData) => createMutation.mutate({ requestBody: data as any }),
    update: (params: { id: string; data: Partial<InvoiceFormData> }) =>
      updateMutation.mutate({ id: params.id, requestBody: params.data as any }),
    delete: (id: string) => deleteMutation.mutate({ id }),
    markPaid: (id: string, data: any) =>
      markPaidMutation.mutate({ id, requestBody: data }),
    send: (id: string, data: any) =>
      sendMutation.mutate({ id, requestBody: data }),
    duplicate: (id: string) => duplicateMutation.mutate({ id }),
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
    isMarkingPaid: markPaidMutation.isPending,
    isSending: sendMutation.isPending,
    isDuplicating: duplicateMutation.isPending,
  };
}

/**
 * Hook to add invoice items - using generated OpenAPI hooks
 */
export function useAddInvoiceItem() {
  const queryClient = useQueryClient();

  return useInvoicesServiceAddInvoiceItem({
    onSuccess: (response: any, variables) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY, variables.id] });
      message.success('Item added successfully');
    },
    onError: (error: any) => {
      message.error(error.response?.data?.message || 'Failed to add item');
    },
  });
}

/**
 * Hook to generate invoice PDF - using generated OpenAPI hooks
 */
export function useGenerateInvoicePdf() {
  const queryClient = useQueryClient();

  return useInvoicesServiceGenerateInvoicePdf({
    onSuccess: (response: any, variables) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY, variables.id] });
      message.success('PDF generated successfully');
    },
    onError: (error: any) => {
      message.error(error.response?.data?.message || 'Failed to generate PDF');
    },
  });
}

/**
 * Hook to download invoice PDF - using generated OpenAPI hooks
 */
export function useDownloadInvoicePdf(id: string | undefined) {
  return useInvoicesServiceDownloadInvoicePdf(
    { id: id! },
    undefined,
    { 
      enabled: !!id,
      onSuccess: (data: any) => {
        // Handle PDF download
        if (data) {
          const blob = new Blob([data], { type: 'application/pdf' });
          const url = window.URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = `invoice-${id}.pdf`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          window.URL.revokeObjectURL(url);
        }
      },
    }
  );
}

/**
 * Hook to send invoice email - using generated OpenAPI hooks
 */
export function useSendInvoiceEmail() {
  const queryClient = useQueryClient();

  return useInvoicesServiceSendInvoiceEmail({
    onSuccess: (response: any, variables) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY, variables.id] });
      message.success('Email sent successfully');
    },
    onError: (error: any) => {
      message.error(error.response?.data?.message || 'Failed to send email');
    },
  });
}

/**
 * Hook to prefetch invoice data - using generated OpenAPI hooks
 */
export function useInvoicePrefetch() {
  const queryClient = useQueryClient();

  const prefetchInvoice = async (id: string) => {
    await queryClient.prefetchQuery({
      queryKey: ['InvoicesService.getInvoice', { id }],
      queryFn: async () => {
        // This will be handled by the generated hook's queryFn
        return {};
      },
    });
  };

  const prefetchInvoices = async (params?: InvoiceListParams) => {
    await queryClient.prefetchQuery({
      queryKey: [
        'InvoicesService.listInvoices',
        {
          clientId: params?.clientId,
          status: params?.status,
          page: params?.page,
          limit: params?.limit,
        },
      ],
      queryFn: async () => {
        // This will be handled by the generated hook's queryFn
        return {};
      },
    });
  };

  return {
    prefetchInvoice,
    prefetchInvoices,
  };
}