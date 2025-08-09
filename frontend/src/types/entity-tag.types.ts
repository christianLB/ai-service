export interface EntityTag {
  id: string;
  entityType: string;
  entityId: string;
  tagId: string;
  method: string;
  confidence: number;
  appliedBy?: string | null;
  aiProvider?: string | null;
  aiModel?: string | null;
  aiResponse?: any | null;
  aiReasoning?: string | null;
  isVerified: boolean;
  verifiedBy?: string | null;
  verifiedAt?: Date | string | null;
  feedback?: string | null;
  isCorrect?: boolean | null;
  sourceEntityType?: string | null;
  sourceEntityId?: string | null;
  relationshipType?: string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
}

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
  verifiedAt?: Date | string | null;
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
  verifiedAt?: Date | string | null;
  feedback?: string | null;
  isCorrect?: boolean | null;
  sourceEntityType?: string | null;
  sourceEntityId?: string | null;
  relationshipType?: string | null;
}