// Alert types for frontend
export interface Alert {
  id: string;
  name: string;
  description?: string | null;
  isActive: boolean;
  metadata?: Record<string, any> | null;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface CreateAlert {
  name: string;
  description?: string | null;
  isActive?: boolean;
  metadata?: Record<string, any> | null;
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
}