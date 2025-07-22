// Workflows types for frontend
export interface Workflows {
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

export interface CreateWorkflows {
  name: string;
  description?: string | null;
  isActive?: boolean;
  metadata?: Record<string, any> | null;
  }

export interface UpdateWorkflows extends Partial<CreateWorkflows> {
  id: string;
}

export interface WorkflowsQuery {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}