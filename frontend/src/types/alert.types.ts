// Alert types for frontend
export interface Alert {
  id: string;
  userId: string;
  strategyId?: string;
  type: string;
  severity: string;
  title: string;
  message: string;
  data?: any;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface CreateAlert {
  userId: string;
  strategyId?: string;
  type: string;
  severity: string;
  title: string;
  message: string;
  data?: any;
}

export interface UpdateAlert extends Partial<CreateAlert> {
  id: string;
}

export interface AlertQuery {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  // Add model-specific query filters based on your needs
}