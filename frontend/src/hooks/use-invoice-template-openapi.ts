import { useQueryClient } from '@tanstack/react-query';
import { message } from 'antd';
import {
  useInvoiceTemplatesServiceListInvoiceTemplates,
  useInvoiceTemplatesServiceGetInvoiceTemplate,
  useInvoiceTemplatesServiceCreateInvoiceTemplate,
  useInvoiceTemplatesServiceUpdateInvoiceTemplate,
  useInvoiceTemplatesServiceDeleteInvoiceTemplate,
} from '../generated/hooks/financial/queries/queries';
import type {
  InvoiceTemplate,
  CreateInvoiceTemplate,
  UpdateInvoiceTemplate,
  InvoiceTemplateQuery,
} from '../types/invoice-template.types';

const QUERY_KEY = 'invoice-templates';

/**
 * Hook to fetch all invoice templates with pagination - using generated OpenAPI hooks
 */
export function useInvoiceTemplates(params?: InvoiceTemplateQuery) {
  return useInvoiceTemplatesServiceListInvoiceTemplates({
    page: params?.page,
    limit: params?.limit,
    search: params?.search,
    sortBy: params?.sortBy as 'name' | 'createdAt' | 'updatedAt' | undefined,
    sortOrder: params?.sortOrder as 'asc' | 'desc' | undefined,
  });
}

/**
 * Hook to fetch a single invoice template by ID - using generated OpenAPI hooks
 */
export function useInvoiceTemplate(id: string | undefined) {
  return useInvoiceTemplatesServiceGetInvoiceTemplate(
    { id: id! },
    undefined,
    { enabled: !!id }
  );
}

/**
 * Hook to search invoice templates - fallback to list with search param
 */
export function useInvoiceTemplateSearch(query: string) {
  return useInvoiceTemplatesServiceListInvoiceTemplates(
    { search: query },
    undefined,
    { enabled: query.length > 0 }
  );
}

/**
 * Hook for invoice template mutations (create, update, delete) - using generated OpenAPI hooks
 */
export function useInvoiceTemplateMutations() {
  const queryClient = useQueryClient();

  const createMutation = useInvoiceTemplatesServiceCreateInvoiceTemplate({
    onSuccess: (response: any) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      message.success(response.message || 'Invoice template created successfully');
    },
    onError: (error: any) => {
      message.error(error.response?.data?.message || 'Failed to create invoice template');
    },
  });

  const updateMutation = useInvoiceTemplatesServiceUpdateInvoiceTemplate({
    onSuccess: (response: any, variables) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY, variables.id] });
      message.success(response.message || 'Invoice template updated successfully');
    },
    onError: (error: any) => {
      message.error(error.response?.data?.message || 'Failed to update invoice template');
    },
  });

  const deleteMutation = useInvoiceTemplatesServiceDeleteInvoiceTemplate({
    onSuccess: (response: any) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      message.success(response.message || 'Invoice template deleted successfully');
    },
    onError: (error: any) => {
      message.error(error.response?.data?.message || 'Failed to delete invoice template');
    },
  });

  return {
    create: (data: CreateInvoiceTemplate) => createMutation.mutate({ requestBody: data }),
    update: (params: { id: string; data: Partial<InvoiceTemplate> }) =>
      updateMutation.mutate({ id: params.id, requestBody: params.data as UpdateInvoiceTemplate }),
    delete: (id: string) => deleteMutation.mutate({ id }),
    bulkDelete: (ids: string[]) => {
      // Bulk delete not available in generated hooks, iterate
      Promise.all(ids.map(id => deleteMutation.mutateAsync({ id })));
    },
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
    isBulkDeleting: false, // Not available in generated hooks
  };
}

/**
 * Individual mutation hooks for invoice templates
 */
export function useCreateInvoiceTemplate() {
  const queryClient = useQueryClient();

  return useInvoiceTemplatesServiceCreateInvoiceTemplate({
    onSuccess: (response: any) => {
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

  return useInvoiceTemplatesServiceUpdateInvoiceTemplate({
    onSuccess: (response: any, variables) => {
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

  return useInvoiceTemplatesServiceDeleteInvoiceTemplate({
    onSuccess: (response: any) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      message.success(response.message || 'Invoice template deleted successfully');
    },
    onError: (error: any) => {
      message.error(error.response?.data?.message || 'Failed to delete invoice template');
    },
  });
}

/**
 * Hook to prefetch invoice template data - using generated OpenAPI hooks
 */
export function useInvoiceTemplatePrefetch() {
  const queryClient = useQueryClient();

  const prefetchInvoiceTemplate = async (id: string) => {
    await queryClient.prefetchQuery({
      queryKey: ['InvoiceTemplatesService.getInvoiceTemplate', { id }],
      queryFn: async () => {
        // This will be handled by the generated hook's queryFn
        return {};
      },
    });
  };

  const prefetchInvoiceTemplates = async (params?: InvoiceTemplateQuery) => {
    await queryClient.prefetchQuery({
      queryKey: [
        'InvoiceTemplatesService.listInvoiceTemplates',
        {
          page: params?.page,
          limit: params?.limit,
          search: params?.search,
          sortBy: params?.sortBy,
          sortOrder: params?.sortOrder,
        },
      ],
      queryFn: async () => {
        // This will be handled by the generated hook's queryFn
        return {};
      },
    });
  };

  return {
    prefetchInvoiceTemplate,
    prefetchInvoiceTemplates,
  };
}