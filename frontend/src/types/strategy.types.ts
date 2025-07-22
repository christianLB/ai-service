// Strategy types for frontend
export interface Strategy {
  id: string;
  userId: string;
  name: string;
  description?: string;
  type: string;
  status: string;
  config: any;
  metadata?: any;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface CreateStrategy {
  userId: string;
  name: string;
  description?: string;
  type: string;
  status: string;
  config: any;
  metadata?: any;
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