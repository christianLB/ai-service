// Notification types for frontend
export interface Notification {
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

export interface CreateNotification {
  name: string;
  description?: string | null;
  isActive?: boolean;
  metadata?: Record<string, any> | null;
  }

export interface UpdateNotification extends Partial<CreateNotification> {
  id: string;
}

export interface NotificationQuery {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}