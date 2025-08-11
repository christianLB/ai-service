import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { message } from 'antd';
import api from '../services/api';
import type { AxiosError } from 'axios';
import type { 
  Report, 
  CreateReport, 
  ReportQuery 
} from '../types/report.types';

const QUERY_KEY = 'reports';

interface ReportResponse {
  success: boolean;
  data: Report;
  message?: string;
}

interface ReportListResponse {
  success: boolean;
  data: {
    items: Report[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

/**
 * Hook to fetch all reports with pagination
 */
export function useReports(params?: ReportQuery) {
  return useQuery({
    queryKey: [QUERY_KEY, params],
    queryFn: async () => {
      const response = await api.get<ReportListResponse>('/reports', { params });
      return response.data.data;
    },
  });
}

/**
 * Hook to fetch a single report by ID
 */
export function useReport(id: string | undefined) {
  return useQuery({
    queryKey: [QUERY_KEY, id],
    queryFn: async () => {
      if (!id) throw new Error('ID is required');
      const response = await api.get<ReportResponse>(`/reports/${id}`);
      return response.data.data;
    },
    enabled: !!id,
  });
}

/**
 * Hook to search reports
 */
export function useReportSearch(query: string) {
  return useQuery({
    queryKey: [QUERY_KEY, 'search', query],
    queryFn: async () => {
      const response = await api.get<{ success: boolean; data: Report[] }>(
        '/reports/search',
        { params: { q: query } }
      );
      return response.data.data;
    },
    enabled: query.length > 0,
  });
}

/**
 * Hook for report mutations (create, update, delete)
 */
export function useReportMutations() {
  const queryClient = useQueryClient();

  const createMutation = useMutation({
    mutationFn: async (data: CreateReport) => {
      const response = await api.post<ReportResponse>('/reports', data);
      return response.data;
    },
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      message.success(response.message || 'Report created successfully');
    },
    onError: (error: AxiosError<{ message?: string }>) => {
      message.error((error as any).response?.data?.message || 'Failed to create report');
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Report> }) => {
      const response = await api.put<ReportResponse>(`/reports/${id}`, data);
      return response.data;
    },
    onSuccess: (response, variables) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY, variables.id] });
      message.success(response.message || 'Report updated successfully');
    },
    onError: (error: AxiosError<{ message?: string }>) => {
      message.error((error as any).response?.data?.message || 'Failed to update report');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await api.delete<{ success: boolean; message: string }>(`/reports/${id}`);
      return response.data;
    },
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      message.success(response.message || 'Report deleted successfully');
    },
    onError: (error: AxiosError<{ message?: string }>) => {
      message.error((error as any).response?.data?.message || 'Failed to delete report');
    },
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      const response = await api.delete<{ success: boolean; data: { count: number }; message: string }>(
        '/reports/bulk',
        { data: { ids } }
      );
      return response.data;
    },
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      message.success(response.message || 'Reports deleted successfully');
    },
    onError: (error: AxiosError<{ message?: string }>) => {
      message.error((error as any).response?.data?.message || 'Failed to delete reports');
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
 * Hook to prefetch report data
 */
export function useReportPrefetch() {
  const queryClient = useQueryClient();

  const prefetchReport = async (id: string) => {
    await queryClient.prefetchQuery({
      queryKey: [QUERY_KEY, id],
      queryFn: async () => {
        const response = await api.get<ReportResponse>(`/reports/${id}`);
        return response.data.data;
      },
    });
  };

  const prefetchReports = async (params?: ReportQuery) => {
    await queryClient.prefetchQuery({
      queryKey: [QUERY_KEY, params],
      queryFn: async () => {
        const response = await api.get<ReportListResponse>('/reports', { params });
        return response.data.data;
      },
    });
  };

  return {
    prefetchReport,
    prefetchReports,
  };
}