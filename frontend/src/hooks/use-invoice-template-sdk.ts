/**
 * Invoice Template Management Hook - SDK Version
 *
 * This hook uses the SDK client with openapi-fetch for type-safe API calls.
 * It replaces the axios-based use-invoice-template.ts hook.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { message } from 'antd';
import { financialApi } from '../lib/api-client';
import type { components } from '@ai/contracts';

// Use types from the OpenAPI contracts
type CreateInvoiceTemplateDto = components['schemas']['CreateInvoiceTemplateDto'];
type UpdateInvoiceTemplateDto = components['schemas']['UpdateInvoiceTemplateDto'];
type InvoiceTemplateQuery = {
  page?: number;
  limit?: number;
  search?: string;
  isActive?: boolean;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
};

const QUERY_KEY = 'invoice-templates';

/**
 * Hook to fetch all invoice templates with pagination
 */
export function useInvoiceTemplates(params?: InvoiceTemplateQuery) {
  return useQuery({
    queryKey: [QUERY_KEY, params],
    queryFn: async () => {
      const { data, error } = await financialApi.GET('/invoice-templates', {
        params: {
          query: params,
        },
      });

      if (error) {
        throw new Error(error.message || 'Failed to fetch invoice templates');
      }

      return data?.data;
    },
  });
}

/**
 * Hook to fetch a single invoice template by ID
 */
export function useInvoiceTemplate(id: string | undefined) {
  return useQuery({
    queryKey: [QUERY_KEY, id],
    queryFn: async () => {
      if (!id) throw new Error('ID is required');

      const { data, error } = await financialApi.GET('/invoice-templates/{id}', {
        params: {
          path: { id },
        },
      });

      if (error) {
        throw new Error(error.message || 'Failed to fetch invoice template');
      }

      return data?.data;
    },
    enabled: !!id,
  });
}

/**
 * Hook to search invoice templates
 */
export function useInvoiceTemplateSearch(query: string) {
  return useQuery({
    queryKey: [QUERY_KEY, 'search', query],
    queryFn: async () => {
      const { data, error } = await financialApi.GET('/invoice-templates/search', {
        params: {
          query: { q: query },
        },
      });

      if (error) {
        throw new Error(error.message || 'Failed to search invoice templates');
      }

      return data?.data;
    },
    enabled: query.length > 0,
  });
}

/**
 * Hook to create invoice template mutation
 */
export function useCreateInvoiceTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (templateData: CreateInvoiceTemplateDto) => {
      const { data, error } = await financialApi.POST('/invoice-templates', {
        body: templateData,
      });

      if (error) {
        throw error;
      }

      return data;
    },
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      message.success(response?.message || 'Invoice template created successfully');
    },
    onError: (error: unknown) => {
      message.error(error.message || 'Failed to create invoice template');
    },
  });
}

/**
 * Hook to update invoice template mutation
 */
export function useUpdateInvoiceTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateInvoiceTemplateDto }) => {
      const { data: response, error } = await financialApi.PUT('/invoice-templates/{id}', {
        params: {
          path: { id },
        },
        body: data,
      });

      if (error) {
        throw error;
      }

      return response;
    },
    onSuccess: (response, variables) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY, variables.id] });
      message.success(response?.message || 'Invoice template updated successfully');
    },
    onError: (error: unknown) => {
      message.error(error.message || 'Failed to update invoice template');
    },
  });
}

/**
 * Hook to delete invoice template mutation
 */
export function useDeleteInvoiceTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await financialApi.DELETE('/invoice-templates/{id}', {
        params: {
          path: { id },
        },
      });

      if (error) {
        throw error;
      }

      return data;
    },
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      message.success(response?.message || 'Invoice template deleted successfully');
    },
    onError: (error: unknown) => {
      message.error(error.message || 'Failed to delete invoice template');
    },
  });
}

/**
 * Hook to duplicate invoice template
 */
export function useDuplicateInvoiceTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await financialApi.POST('/invoice-templates/{id}/duplicate', {
        params: {
          path: { id },
        },
      });

      if (error) {
        throw error;
      }

      return data;
    },
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      message.success(response?.message || 'Invoice template duplicated successfully');
    },
    onError: (error: unknown) => {
      message.error(error.message || 'Failed to duplicate invoice template');
    },
  });
}

/**
 * Hook to set default invoice template
 */
export function useSetDefaultInvoiceTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await financialApi.POST('/invoice-templates/{id}/set-default', {
        params: {
          path: { id },
        },
      });

      if (error) {
        throw error;
      }

      return data;
    },
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      message.success(response?.message || 'Default invoice template set successfully');
    },
    onError: (error: unknown) => {
      message.error(error.message || 'Failed to set default invoice template');
    },
  });
}

/**
 * Hook for invoice template mutations (combined for backward compatibility)
 */
export function useInvoiceTemplateMutations() {
  const createMutation = useCreateInvoiceTemplate();
  const updateMutation = useUpdateInvoiceTemplate();
  const deleteMutation = useDeleteInvoiceTemplate();
  const duplicateMutation = useDuplicateInvoiceTemplate();
  const setDefaultMutation = useSetDefaultInvoiceTemplate();

  return {
    create: createMutation.mutate,
    update: updateMutation.mutate,
    delete: deleteMutation.mutate,
    duplicate: duplicateMutation.mutate,
    setDefault: setDefaultMutation.mutate,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
    isDuplicating: duplicateMutation.isPending,
    isSettingDefault: setDefaultMutation.isPending,
  };
}

/**
 * Hook to prefetch invoice template data
 */
export function useInvoiceTemplatePrefetch() {
  const queryClient = useQueryClient();

  const prefetchInvoiceTemplate = async (id: string) => {
    await queryClient.prefetchQuery({
      queryKey: [QUERY_KEY, id],
      queryFn: async () => {
        const { data, error } = await financialApi.GET('/invoice-templates/{id}', {
          params: {
            path: { id },
          },
        });

        if (error) {
          throw new Error(error.message || 'Failed to fetch invoice template');
        }

        return data?.data;
      },
    });
  };

  const prefetchInvoiceTemplates = async (params?: InvoiceTemplateQuery) => {
    await queryClient.prefetchQuery({
      queryKey: [QUERY_KEY, params],
      queryFn: async () => {
        const { data, error } = await financialApi.GET('/invoice-templates', {
          params: {
            query: params,
          },
        });

        if (error) {
          throw new Error(error.message || 'Failed to fetch invoice templates');
        }

        return data?.data;
      },
    });
  };

  return {
    prefetchInvoiceTemplate,
    prefetchInvoiceTemplates,
  };
}
