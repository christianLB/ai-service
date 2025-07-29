import api from './api';
import { notification } from 'antd';
import type { AxiosError } from 'axios';

// Types
export interface Tag {
  id: string;
  name: string;
  slug: string;
  description?: string;
  color?: string;
  icon?: string;
  metadata?: Record<string, unknown>;
  isActive: boolean;
  isSystem: boolean;
  usageCount: number;
  lastUsedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTagDto {
  name: string;
  description?: string;
  color?: string;
  icon?: string;
  metadata?: Record<string, unknown>;
  isActive?: boolean;
}

export type UpdateTagDto = Partial<CreateTagDto>;

export interface TagQuery {
  search?: string;
  isActive?: boolean;
  isSystem?: boolean;
  limit?: number;
  offset?: number;
  sortBy?: 'name' | 'usageCount' | 'lastUsedAt' | 'createdAt';
  sortOrder?: 'asc' | 'desc';
}

export interface EntityTag {
  tagId: string;
  entityType: string;
  entityId: string;
  confidence?: number;
  source: 'manual' | 'ai' | 'rule' | 'import';
  metadata?: Record<string, unknown>;
  taggedBy?: string;
  taggedAt: string;
  tag?: Tag;
}

export interface TagEntityDto {
  tagIds: string[];
  confidence?: number;
  source?: 'manual' | 'ai' | 'rule' | 'import';
  metadata?: Record<string, unknown>;
}

export interface BatchTagOperation {
  operation: 'add' | 'remove' | 'replace';
  entities: Array<{
    type: string;
    id: string;
  }>;
  tagIds: string[];
  options?: {
    confidence?: number;
    source?: string;
    metadata?: Record<string, unknown>;
  };
}

export interface TagMetrics {
  tagId: string;
  usageCount: number;
  entityBreakdown: Record<string, number>;
  confidenceStats: {
    average: number;
    min: number;
    max: number;
  };
  sourceBreakdown: Record<string, number>;
  trend: Array<{
    date: string;
    count: number;
  }>;
}

class TaggingService {
  // Tag Management
  async getTags(query?: TagQuery) {
    try {
      const params = new URLSearchParams();
      if (query) {
        Object.entries(query).forEach(([key, value]) => {
          if (value !== undefined) {
            params.append(key, String(value));
          }
        });
      }
      
      const response = await api.get(`/tags?${params.toString()}`);
      return response.data;
    } catch (error) {
      const axiosError = error as AxiosError<{ message?: string }>;
      notification.error({
        message: 'Error fetching tags',
        description: axiosError.response?.data?.message || 'Failed to load tags'
      });
      throw error;
    }
  }

  async getTag(id: string) {
    try {
      const response = await api.get(`/tags/${id}`);
      return response.data;
    } catch (error) {
      const axiosError = error as AxiosError<{ message?: string }>;
      notification.error({
        message: 'Error fetching tag',
        description: axiosError.response?.data?.message || 'Failed to load tag details'
      });
      throw error;
    }
  }

  async createTag(data: CreateTagDto) {
    try {
      const response = await api.post('/tags', data);
      notification.success({
        message: 'Tag created',
        description: `Tag "${data.name}" has been created successfully`
      });
      return response.data;
    } catch (error) {
      const axiosError = error as AxiosError<{ message?: string }>;
      notification.error({
        message: 'Error creating tag',
        description: axiosError.response?.data?.message || 'Failed to create tag'
      });
      throw error;
    }
  }

  async updateTag(id: string, data: UpdateTagDto) {
    try {
      const response = await api.put(`/tags/${id}`, data);
      notification.success({
        message: 'Tag updated',
        description: 'Tag has been updated successfully'
      });
      return response.data;
    } catch (error) {
      const axiosError = error as AxiosError<{ message?: string }>;
      notification.error({
        message: 'Error updating tag',
        description: axiosError.response?.data?.message || 'Failed to update tag'
      });
      throw error;
    }
  }

  async deleteTag(id: string, options?: { mode?: 'cascade' | 'reassign' | 'orphan'; reassignToId?: string }) {
    try {
      const params = new URLSearchParams();
      if (options?.mode) {
        params.append('mode', options.mode);
      }
      if (options?.reassignToId) {
        params.append('reassignToId', options.reassignToId);
      }
      
      const response = await api.delete(`/tags/${id}?${params.toString()}`);
      notification.success({
        message: 'Tag deleted',
        description: 'Tag has been deleted successfully'
      });
      return response.data;
    } catch (error) {
      const axiosError = error as AxiosError<{ message?: string }>;
      notification.error({
        message: 'Error deleting tag',
        description: axiosError.response?.data?.message || 'Failed to delete tag'
      });
      throw error;
    }
  }

  async searchTags(query: string) {
    try {
      const response = await api.get(`/tags/search?q=${encodeURIComponent(query)}`);
      return response.data;
    } catch (error) {
      console.error('Error searching tags:', error);
      return { data: [] };
    }
  }

  // Entity Tagging
  async tagEntity(entityType: string, entityId: string, data: TagEntityDto) {
    try {
      const response = await api.post(`/entities/${entityType}/${entityId}/tags`, data);
      notification.success({
        message: 'Entity tagged',
        description: `Successfully added ${data.tagIds.length} tag(s)`
      });
      return response.data;
    } catch (error) {
      const axiosError = error as AxiosError<{ message?: string }>;
      notification.error({
        message: 'Error tagging entity',
        description: axiosError.response?.data?.message || 'Failed to tag entity'
      });
      throw error;
    }
  }

  async getEntityTags(entityType: string, entityId: string) {
    try {
      const response = await api.get(`/entities/${entityType}/${entityId}/tags`);
      return response.data;
    } catch (error) {
      console.error('Error fetching entity tags:', error);
      return { data: [] };
    }
  }

  async removeEntityTag(entityType: string, entityId: string, tagId: string) {
    try {
      const response = await api.delete(`/entities/${entityType}/${entityId}/tags/${tagId}`);
      notification.success({
        message: 'Tag removed',
        description: 'Tag has been removed from entity'
      });
      return response.data;
    } catch (error) {
      const axiosError = error as AxiosError<{ message?: string }>;
      notification.error({
        message: 'Error removing tag',
        description: axiosError.response?.data?.message || 'Failed to remove tag'
      });
      throw error;
    }
  }

  async updateEntityTag(entityType: string, entityId: string, tagId: string, data: { confidence?: number; metadata?: Record<string, string | number | boolean> }) {
    try {
      const response = await api.patch(`/entities/${entityType}/${entityId}/tags/${tagId}`, data);
      return response.data;
    } catch (error) {
      const axiosError = error as AxiosError<{ message?: string }>;
      notification.error({
        message: 'Error updating tag',
        description: axiosError.response?.data?.message || 'Failed to update tag'
      });
      throw error;
    }
  }

  async findEntitiesByTag(tagId: string, entityType?: string) {
    try {
      const params = entityType ? `?type=${entityType}` : '';
      const response = await api.get(`/entities/by-tag/${tagId}${params}`);
      return response.data;
    } catch (error) {
      const axiosError = error as AxiosError<{ message?: string }>;
      notification.error({
        message: 'Error finding entities',
        description: axiosError.response?.data?.message || 'Failed to find entities by tag'
      });
      throw error;
    }
  }

  // Batch Operations
  async batchTagOperation(operation: BatchTagOperation) {
    try {
      const response = await api.post('/tagging/batch', operation);
      notification.success({
        message: 'Batch operation completed',
        description: `Successfully processed ${operation.entities.length} entities`
      });
      return response.data;
    } catch (error) {
      const axiosError = error as AxiosError<{ message?: string }>;
      notification.error({
        message: 'Batch operation failed',
        description: axiosError.response?.data?.message || 'Failed to complete batch operation'
      });
      throw error;
    }
  }

  // AI Operations
  async retagEntity(entityType: string, entityId: string, options?: { provider?: 'claude' | 'openai'; strategy?: string }) {
    try {
      const response = await api.post('/tagging/retag', {
        entityType,
        entityId,
        ...options
      });
      notification.success({
        message: 'AI retagging completed',
        description: 'Entity has been retagged using AI'
      });
      return response.data;
    } catch (error) {
      const axiosError = error as AxiosError<{ message?: string }>;
      notification.error({
        message: 'AI retagging failed',
        description: axiosError.response?.data?.message || 'Failed to retag entity'
      });
      throw error;
    }
  }

  async provideFeedback(entityType: string, entityId: string, tagId: string, feedback: { correct: boolean; reason?: string }) {
    try {
      const response = await api.post('/tagging/feedback', {
        entityType,
        entityId,
        tagId,
        ...feedback
      });
      notification.success({
        message: 'Feedback submitted',
        description: 'Thank you for improving our AI tagging'
      });
      return response.data;
    } catch (error) {
      console.error('Error submitting feedback:', error);
      throw error;
    }
  }

  // Analytics
  async getTagMetrics(tagId: string) {
    try {
      const response = await api.get(`/tags/${tagId}/metrics`);
      return response.data;
    } catch (error) {
      const axiosError = error as AxiosError<{ message?: string }>;
      notification.error({
        message: 'Error fetching metrics',
        description: axiosError.response?.data?.message || 'Failed to load tag metrics'
      });
      throw error;
    }
  }

  async getTaggingAccuracy(options?: { startDate?: string; endDate?: string; provider?: string }) {
    try {
      const params = new URLSearchParams();
      if (options) {
        Object.entries(options).forEach(([key, value]) => {
          if (value) params.append(key, value);
        });
      }
      const response = await api.get(`/tagging/accuracy?${params.toString()}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching accuracy metrics:', error);
      return { data: null };
    }
  }

  // Utility methods
  generateTagColor(): string {
    const colors = [
      '#1890ff', '#52c41a', '#faad14', '#f5222d', '#722ed1',
      '#13c2c2', '#eb2f96', '#fa8c16', '#a0d911', '#2f54eb'
    ];
    return colors[Math.floor(Math.random() * colors.length)];
  }

  validateTagName(name: string): { valid: boolean; error?: string } {
    if (!name || name.trim().length === 0) {
      return { valid: false, error: 'Tag name is required' };
    }
    if (name.length < 2) {
      return { valid: false, error: 'Tag name must be at least 2 characters' };
    }
    if (name.length > 50) {
      return { valid: false, error: 'Tag name must be less than 50 characters' };
    }
    if (!/^[a-zA-Z0-9\s\-_]+$/.test(name)) {
      return { valid: false, error: 'Tag name can only contain letters, numbers, spaces, hyphens, and underscores' };
    }
    return { valid: true };
  }
}

export const taggingService = new TaggingService();