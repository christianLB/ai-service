// EntityTag types for frontend
export interface EntityTag {
  id: string;
  entityType: string;
  entityId: string;
  method: string;
  confidence: number;
  appliedBy?: string;
  aiProvider?: string;
  aiModel?: string;
  aiResponse?: unknown;
  aiReasoning?: string;
  isVerified: boolean;
  verifiedBy?: string;
  verifiedAt?: Date | string;
  feedback?: string;
  isCorrect?: boolean;
  sourceEntityType?: string;
  sourceEntityId?: string;
  relationshipType?: string;
  tagId: string;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface CreateEntityTag {
  entityType: string;
  entityId: string;
  method: string;
  confidence: number;
  appliedBy?: string;
  aiProvider?: string;
  aiModel?: string;
  aiResponse?: unknown;
  aiReasoning?: string;
  isVerified: boolean;
  verifiedBy?: string;
  verifiedAt?: Date | string;
  feedback?: string;
  isCorrect?: boolean;
  sourceEntityType?: string;
  sourceEntityId?: string;
  relationshipType?: string;
  tagId: string;
}

export interface UpdateEntityTag extends Partial<CreateEntityTag> {
  id: string;
}

export interface EntityTagQuery {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  // Add model-specific query filters based on your needs
}