// Accounts types for frontend
export interface Accounts {
  id: string;
  // Add your model-specific fields here
  name: string;
  description?: string | null;
  isActive: boolean;
  userId?: string;
  metadata?: Record<string, any> | null;
    createdAt: Date | string;
  updatedAt: Date | string;
}

export interface CreateAccounts {
  name: string;
  description?: string | null;
  isActive?: boolean;
  metadata?: Record<string, any> | null;
  }

export interface UpdateAccounts extends Partial<CreateAccounts> {
  id: string;
}

export interface AccountsQuery {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}