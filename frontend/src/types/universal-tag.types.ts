// UniversalTag types for frontend
export interface UniversalTag {
  id: string;
  code: string;
  name: string;
  description?: string;
  entityTypes: string;
  patterns?: unknown;
  rules?: unknown;
  confidence: number;
  embeddingModel?: string;
  path: string;
  level: number;
  color?: string;
  icon?: string;
  isActive: boolean;
  isSystem: boolean;
  metadata?: unknown;
  usageCount: number;
  successRate: number;
  lastUsed?: Date | string;
  parentId?: string;
  entityTags: string;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface CreateUniversalTag {
  code: string;
  name: string;
  description?: string;
  entityTypes: string;
  patterns?: unknown;
  rules?: unknown;
  confidence: number;
  embeddingModel?: string;
  path: string;
  level: number;
  color?: string;
  icon?: string;
  isActive: boolean;
  isSystem: boolean;
  metadata?: unknown;
  usageCount: number;
  successRate: number;
  lastUsed?: Date | string;
  parentId?: string;
  entityTags: string;
}

export interface UpdateUniversalTag extends Partial<CreateUniversalTag> {
  id: string;
}

export interface UniversalTagQuery {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  // Add model-specific query filters based on your needs
}