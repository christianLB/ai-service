import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { message } from 'antd';
import api from '../services/api';
import type { 
  MarketData, 
  CreateMarketData, 
  MarketDataQuery 
} from '../types/market-data.types';

const QUERY_KEY = 'market-datas';

interface MarketDataResponse {
  success: boolean;
  data: MarketData;
  message?: string;
}

interface MarketDataListResponse {
  success: boolean;
  data: {
    items: MarketData[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

/**
 * Hook to fetch all marketdatas with pagination
 */
export function useMarketDatas(params?: MarketDataQuery) {
  return useQuery({
    queryKey: [QUERY_KEY, params],
    queryFn: async () => {
      const response = await api.get<MarketDataListResponse>('/market-datas', { params });
      return response.data.data;
    },
  });
}

/**
 * Hook to fetch a single marketdata by ID
 */
export function useMarketData(id: string | undefined) {
  return useQuery({
    queryKey: [QUERY_KEY, id],
    queryFn: async () => {
      if (!id) throw new Error('ID is required');
      const response = await api.get<MarketDataResponse>(`/market-datas/${id}`);
      return response.data.data;
    },
    enabled: !!id,
  });
}

/**
 * Hook to search marketdatas
 */
export function useMarketDataSearch(query: string) {
  return useQuery({
    queryKey: [QUERY_KEY, 'search', query],
    queryFn: async () => {
      const response = await api.get<{ success: boolean; data: MarketData[] }>(
        '/market-datas/search',
        { params: { q: query } }
      );
      return response.data.data;
    },
    enabled: query.length > 0,
  });
}

/**
 * Hook for marketdata mutations (create, update, delete)
 */
export function useMarketDataMutations() {
  const queryClient = useQueryClient();

  const createMutation = useMutation({
    mutationFn: async (data: CreateMarketData) => {
      const response = await api.post<MarketDataResponse>('/market-datas', data);
      return response.data;
    },
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      message.success(response.message || 'MarketData created successfully');
    },
    onError: (error: any) => {
      message.error(error.response?.data?.message || 'Failed to create marketdata');
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<MarketData> }) => {
      const response = await api.put<MarketDataResponse>(`/market-datas/${id}`, data);
      return response.data;
    },
    onSuccess: (response, variables) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY, variables.id] });
      message.success(response.message || 'MarketData updated successfully');
    },
    onError: (error: any) => {
      message.error(error.response?.data?.message || 'Failed to update marketdata');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await api.delete<{ success: boolean; message: string }>(`/market-datas/${id}`);
      return response.data;
    },
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      message.success(response.message || 'MarketData deleted successfully');
    },
    onError: (error: any) => {
      message.error(error.response?.data?.message || 'Failed to delete marketdata');
    },
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      const response = await api.delete<{ success: boolean; data: { count: number }; message: string }>(
        '/market-datas/bulk',
        { data: { ids } }
      );
      return response.data;
    },
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      message.success(response.message || 'MarketDatas deleted successfully');
    },
    onError: (error: any) => {
      message.error(error.response?.data?.message || 'Failed to delete marketdatas');
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
 * Hook to prefetch marketdata data
 */
export function useMarketDataPrefetch() {
  const queryClient = useQueryClient();

  const prefetchMarketData = async (id: string) => {
    await queryClient.prefetchQuery({
      queryKey: [QUERY_KEY, id],
      queryFn: async () => {
        const response = await api.get<MarketDataResponse>(`/market-datas/${id}`);
        return response.data.data;
      },
    });
  };

  const prefetchMarketDatas = async (params?: MarketDataQuery) => {
    await queryClient.prefetchQuery({
      queryKey: [QUERY_KEY, params],
      queryFn: async () => {
        const response = await api.get<MarketDataListResponse>('/market-datas', { params });
        return response.data.data;
      },
    });
  };

  return {
    prefetchMarketData,
    prefetchMarketDatas,
  };
}