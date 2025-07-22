import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { message } from 'antd';
import api from '../services/api';
import type { 
  InvoiceTemplate, 
  CreateInvoiceTemplate, 
  UpdateInvoiceTemplate,
  InvoiceTemplateQuery 
} from '../types/invoice-template.types';

const QUERY_KEY = 'invoice-templates';

interface InvoiceTemplateResponse {
  success: boolean;
  data: InvoiceTemplate;
  message?: string;
}

interface InvoiceTemplateListResponse {
  success: boolean;
  data: {
    items: InvoiceTemplate[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

/**
 * Hook to fetch all invoicetemplates with pagination
 */
export function useInvoiceTemplates(params?: InvoiceTemplateQuery) {
  return useQuery({
    queryKey: [QUERY_KEY, params],
    queryFn: async () => {
      const response = await api.get<InvoiceTemplateListResponse>('/invoice-templates', { params });
      return response.data.data;
    },
  });
}

/**
 * Hook to fetch a single invoicetemplate by ID
 */
export function useInvoiceTemplate(id: string | undefined) {
  return useQuery({
    queryKey: [QUERY_KEY, id],
    queryFn: async () => {
      if (!id) throw new Error('ID is required');
      const response = await api.get<InvoiceTemplateResponse>(`/invoice-templates/${id}`);
      return response.data.data;
    },
    enabled: !!id,
  });
}

/**
 * Hook to search invoicetemplates
 */
export function useInvoiceTemplateSearch(query: string) {
  return useQuery({
    queryKey: [QUERY_KEY, 'search', query],
    queryFn: async () => {
      const response = await api.get<{ success: boolean; data: InvoiceTemplate[] }>(
        '/invoice-templates/search',
        { params: { q: query } }
      );
      return response.data.data;
    },
    enabled: query.length > 0,
  });
}

/**
 * Hook for invoicetemplate mutations (create, update, delete)
 */
export function useInvoiceTemplateMutations() {
  const queryClient = useQueryClient();

  const createMutation = useMutation({
    mutationFn: async (data: CreateInvoiceTemplate) => {
      const response = await api.post<InvoiceTemplateResponse>('/invoice-templates', data);
      return response.data;
    },
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      message.success(response.message || 'InvoiceTemplate created successfully');
    },
    onError: (error: any) => {
      message.error(error.response?.data?.message || 'Failed to create invoicetemplate');
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<InvoiceTemplate> }) => {
      const response = await api.put<InvoiceTemplateResponse>(`/invoice-templates/${id}`, data);
      return response.data;
    },
    onSuccess: (response, variables) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY, variables.id] });
      message.success(response.message || 'InvoiceTemplate updated successfully');
    },
    onError: (error: any) => {
      message.error(error.response?.data?.message || 'Failed to update invoicetemplate');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await api.delete<{ success: boolean; message: string }>(`/invoice-templates/${id}`);
      return response.data;
    },
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      message.success(response.message || 'InvoiceTemplate deleted successfully');
    },
    onError: (error: any) => {
      message.error(error.response?.data?.message || 'Failed to delete invoicetemplate');
    },
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      const response = await api.delete<{ success: boolean; data: { count: number }; message: string }>(
        '/invoice-templates/bulk',
        { data: { ids } }
      );
      return response.data;
    },
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      message.success(response.message || 'InvoiceTemplates deleted successfully');
    },
    onError: (error: any) => {
      message.error(error.response?.data?.message || 'Failed to delete invoicetemplates');
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
 * Individual mutation hooks for invoice templates
 */
export function useCreateInvoiceTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateInvoiceTemplate) => {
      const response = await api.post<InvoiceTemplateResponse>('/invoice-templates', data);
      return response.data;
    },
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      message.success(response.message || 'Invoice template created successfully');
    },
    onError: (error: any) => {
      message.error(error.response?.data?.message || 'Failed to create invoice template');
    },
  });
}

export function useUpdateInvoiceTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...data }: UpdateInvoiceTemplate) => {
      const response = await api.put<InvoiceTemplateResponse>(`/invoice-templates/${id}`, data);
      return response.data;
    },
    onSuccess: (response, variables) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY, variables.id] });
      message.success(response.message || 'Invoice template updated successfully');
    },
    onError: (error: any) => {
      message.error(error.response?.data?.message || 'Failed to update invoice template');
    },
  });
}

export function useDeleteInvoiceTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await api.delete<{ success: boolean; message: string }>(`/invoice-templates/${id}`);
      return response.data;
    },
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      message.success(response.message || 'Invoice template deleted successfully');
    },
    onError: (error: any) => {
      message.error(error.response?.data?.message || 'Failed to delete invoice template');
    },
  });
}

/**
 * Hook to prefetch invoicetemplate data
 */
export function useInvoiceTemplatePrefetch() {
  const queryClient = useQueryClient();

  const prefetchInvoiceTemplate = async (id: string) => {
    await queryClient.prefetchQuery({
      queryKey: [QUERY_KEY, id],
      queryFn: async () => {
        const response = await api.get<InvoiceTemplateResponse>(`/invoice-templates/${id}`);
        return response.data.data;
      },
    });
  };

  const prefetchInvoiceTemplates = async (params?: InvoiceTemplateQuery) => {
    await queryClient.prefetchQuery({
      queryKey: [QUERY_KEY, params],
      queryFn: async () => {
        const response = await api.get<InvoiceTemplateListResponse>('/invoice-templates', { params });
        return response.data.data;
      },
    });
  };

  return {
    prefetchInvoiceTemplate,
    prefetchInvoiceTemplates,
  };
}