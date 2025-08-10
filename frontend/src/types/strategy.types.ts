// Strategy types for frontend
export interface Strategy {
  id: string;
  userId?: string;
  name: string;
  type: string;
  status: string;
  parameters: unknown;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface CreateStrategy {
  name: string;
  type: string;
  status: string;
  parameters: unknown;
}

export interface UpdateStrategy extends Partial<CreateStrategy> {
  id: string;
}

export interface StrategyQuery {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  // Add model-specific query filters based on your needs
}