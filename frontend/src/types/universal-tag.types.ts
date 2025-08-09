export interface UniversalTag {
  id: string;
  code: string;
  name: string;
  description?: string | null;
  entityTypes: string[];
  patterns?: any | null;
  rules?: any | null;
  confidence: number;
  embeddingModel?: string | null;
  path: string;
  level: number;
  color?: string | null;
  icon?: string | null;
  isActive: boolean;
  isSystem: boolean;
  metadata?: any | null;
  usageCount: number;
  successRate: number;
  lastUsed?: Date | string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
  parentId?: string | null;
}

export interface CreateUniversalTag {
  code: string;
  name: string;
  description?: string | null;
  entityTypes?: string[];
  patterns?: any | null;
  rules?: any | null;
  confidence?: number;
  embeddingModel?: string | null;
  path: string;
  level?: number;
  color?: string | null;
  icon?: string | null;
  isActive?: boolean;
  isSystem?: boolean;
  metadata?: any | null;
  parentId?: string | null;
}

export interface UpdateUniversalTag {
  code?: string;
  name?: string;
  description?: string | null;
  entityTypes?: string[];
  patterns?: any | null;
  rules?: any | null;
  confidence?: number;
  embeddingModel?: string | null;
  path?: string;
  level?: number;
  color?: string | null;
  icon?: string | null;
  isActive?: boolean;
  isSystem?: boolean;
  metadata?: any | null;
  parentId?: string | null;
  usageCount?: number;
  successRate?: number;
  lastUsed?: Date | string | null;
}