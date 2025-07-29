// Accounts types for frontend
export interface Accounts {
  id: string;
  // Add your model-specific fields here
  name: string;
  description?: string | null;
  isActive: boolean;
  userId?: string;
  metadata?: Record<string, string | number | boolean> | null;
    createdAt: Date | string;
  updatedAt: Date | string;
}

export interface CreateAccounts {
  name: string;
  description?: string | null;
  isActive?: boolean;
  metadata?: Record<string, string | number | boolean> | null;
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