// Report types for frontend
export interface Report {
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

export interface CreateReport {
  name: string;
  description?: string | null;
  isActive?: boolean;
  metadata?: Record<string, any> | null;
  }

export interface UpdateReport extends Partial<CreateReport> {
  id: string;
}

export interface ReportQuery {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}