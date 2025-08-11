// Decoupled from Prisma model types to avoid build failures when client types change
export type UniversalTag = Record<string, unknown>;

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
  lastUsed?: Date | null;
}

export interface UniversalTagQuery {
  page: number;
  limit: number;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  isActive?: boolean;
  isSystem?: boolean;
  parentId?: string | null;
}

export interface UniversalTagWithRelations extends UniversalTag {
  parent?: UniversalTag | null;
  children?: UniversalTag[];
  entityTags?: Record<string, unknown>[];
}
