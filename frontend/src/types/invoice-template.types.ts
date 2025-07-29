// InvoiceTemplate types for frontend
export interface InvoiceTemplate {
  id: string;
  userId: string;
  name: string;
  description?: string | null;
  isDefault: boolean;
  templateType: string;
  htmlContent: string;
  variables: TemplateVariable[];
  metadata?: Record<string, string | number | boolean> | null;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface CreateInvoiceTemplate {
  userId: string;
  name: string;
  description?: string | null;
  isDefault?: boolean;
  templateType?: string;
  htmlContent: string;
  variables?: TemplateVariable[];
  metadata?: Record<string, string | number | boolean> | null;
}

export interface UpdateInvoiceTemplate extends Partial<CreateInvoiceTemplate> {
  id: string;
}

export interface InvoiceTemplateQuery {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

// Types for template variables
export interface TemplateVariable {
  key: string;
  label: string;
  type: 'text' | 'number' | 'date' | 'boolean';
  required?: boolean;
  defaultValue?: string | number | boolean | null;
}

// Response types
export interface InvoiceTemplateResponse {
  items: InvoiceTemplate[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}