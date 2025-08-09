import { EntityTag as PrismaEntityTag, UniversalTag } from '@prisma/client';

export type EntityTag = PrismaEntityTag;

export interface CreateEntityTag {
  entityType: string;
  entityId: string;
  tagId: string;
  method: string;
  confidence?: number;
  appliedBy?: string | null;
  aiProvider?: string | null;
  aiModel?: string | null;
  aiResponse?: any | null;
  aiReasoning?: string | null;
  isVerified?: boolean;
  verifiedBy?: string | null;
  verifiedAt?: Date | null;
  feedback?: string | null;
  isCorrect?: boolean | null;
  sourceEntityType?: string | null;
  sourceEntityId?: string | null;
  relationshipType?: string | null;
}

export interface UpdateEntityTag {
  method?: string;
  confidence?: number;
  appliedBy?: string | null;
  aiProvider?: string | null;
  aiModel?: string | null;
  aiResponse?: any | null;
  aiReasoning?: string | null;
  isVerified?: boolean;
  verifiedBy?: string | null;
  verifiedAt?: Date | null;
  feedback?: string | null;
  isCorrect?: boolean | null;
  sourceEntityType?: string | null;
  sourceEntityId?: string | null;
  relationshipType?: string | null;
}

export interface EntityTagQuery {
  page: number;
  limit: number;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  entityType?: string;
  entityId?: string;
  isVerified?: boolean;
  method?: string;
}

export interface EntityTagWithRelations extends EntityTag {
  universalTag: UniversalTag;
}