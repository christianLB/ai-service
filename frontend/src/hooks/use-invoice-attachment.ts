import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { message } from 'antd';
import api from '../services/api';
import type { AxiosError } from 'axios';
import type {
  InvoiceAttachment,
  CreateInvoiceAttachment,
  InvoiceAttachmentQuery,
} from '../types/invoice-attachment.types';

const QUERY_KEY = 'invoice-attachments';

interface InvoiceAttachmentResponse {
  success: boolean;
  data: InvoiceAttachment;
  message?: string;
}

interface InvoiceAttachmentListResponse {
  success: boolean;
  data: {
    items: InvoiceAttachment[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

/**
 * Hook to fetch all invoiceattachments with pagination
 */
export function useInvoiceAttachments(params?: InvoiceAttachmentQuery) {
  return useQuery({
    queryKey: [QUERY_KEY, params],
    queryFn: async () => {
      const response = await api.get<InvoiceAttachmentListResponse>('/invoice-attachments', {
        params,
      });
      return response.data.data;
    },
  });
}

/**
 * Hook to fetch a single invoiceattachment by ID
 */
export function useInvoiceAttachment(id: string | undefined) {
  return useQuery({
    queryKey: [QUERY_KEY, id],
    queryFn: async () => {
      if (!id) throw new Error('ID is required');
      const response = await api.get<InvoiceAttachmentResponse>(`/invoice-attachments/${id}`);
      return response.data.data;
    },
    enabled: !!id,
  });
}

/**
 * Hook to search invoiceattachments
 */
export function useInvoiceAttachmentSearch(query: string) {
  return useQuery({
    queryKey: [QUERY_KEY, 'search', query],
    queryFn: async () => {
      const response = await api.get<{ success: boolean; data: InvoiceAttachment[] }>(
        '/invoice-attachments/search',
        { params: { q: query } }
      );
      return response.data.data;
    },
    enabled: query.length > 0,
  });
}

/**
 * Hook for invoiceattachment mutations (create, update, delete)
 */
export function useInvoiceAttachmentMutations() {
  const queryClient = useQueryClient();

  const createMutation = useMutation({
    mutationFn: async (data: CreateInvoiceAttachment) => {
      const response = await api.post<InvoiceAttachmentResponse>('/invoice-attachments', data);
      return response.data;
    },
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      message.success(response.message || 'InvoiceAttachment created successfully');
    },
    onError: (error: AxiosError<{ message?: string }>) => {
      message.error(error.response?.data?.message || 'Failed to create invoiceattachment');
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<InvoiceAttachment> }) => {
      const response = await api.put<InvoiceAttachmentResponse>(`/invoice-attachments/${id}`, data);
      return response.data;
    },
    onSuccess: (response, variables) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY, variables.id] });
      message.success(response.message || 'InvoiceAttachment updated successfully');
    },
    onError: (error: AxiosError<{ message?: string }>) => {
      message.error(error.response?.data?.message || 'Failed to update invoiceattachment');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await api.delete<{ success: boolean; message: string }>(
        `/invoice-attachments/${id}`
      );
      return response.data;
    },
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      message.success(response.message || 'InvoiceAttachment deleted successfully');
    },
    onError: (error: AxiosError<{ message?: string }>) => {
      message.error(error.response?.data?.message || 'Failed to delete invoiceattachment');
    },
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      const response = await api.delete<{
        success: boolean;
        data: { count: number };
        message: string;
      }>('/invoice-attachments/bulk', { data: { ids } });
      return response.data;
    },
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      message.success(response.message || 'InvoiceAttachments deleted successfully');
    },
    onError: (error: AxiosError<{ message?: string }>) => {
      message.error(error.response?.data?.message || 'Failed to delete invoiceattachments');
    },
  });

  return {
    create: createMutation.mutate,
    update: updateMutation.mutate,
    delete: deleteMutation.mutate,
    bulkDelete: bulkDeleteMutation.mutate,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
    isBulkDeleting: bulkDeleteMutation.isPending,
  };
}

/**
 * Hook to prefetch invoiceattachment data
 */
export function useInvoiceAttachmentPrefetch() {
  const queryClient = useQueryClient();

  const prefetchInvoiceAttachment = async (id: string) => {
    await queryClient.prefetchQuery({
      queryKey: [QUERY_KEY, id],
      queryFn: async () => {
        const response = await api.get<InvoiceAttachmentResponse>(`/invoice-attachments/${id}`);
        return response.data.data;
      },
    });
  };

  const prefetchInvoiceAttachments = async (params?: InvoiceAttachmentQuery) => {
    await queryClient.prefetchQuery({
      queryKey: [QUERY_KEY, params],
      queryFn: async () => {
        const response = await api.get<InvoiceAttachmentListResponse>('/invoice-attachments', {
          params,
        });
        return response.data.data;
      },
    });
  };

  return {
    prefetchInvoiceAttachment,
    prefetchInvoiceAttachments,
  };
}
