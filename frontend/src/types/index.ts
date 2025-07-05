// Client Types
export interface Client {
  id: string;
  name: string;
  businessName?: string;
  taxId: string;
  taxIdType: 'RFC' | 'CIF' | 'NIT' | 'VAT' | 'OTHER';
  email: string;
  phone?: string;
  address?: ClientAddress;
  clientType: 'individual' | 'business';
  currency: string;
  language: string;
  timezone?: string;
  paymentTerms: number;
  paymentMethod?: 'transfer' | 'cash' | 'card' | 'crypto' | 'other';
  bankAccount?: string;
  creditLimit: number;
  status: 'active' | 'inactive' | 'suspended' | 'prospect';
  totalRevenue: number;
  totalInvoices: number;
  outstandingBalance: number;
  lastInvoiceDate?: string;
  averageInvoiceAmount?: number;
  customFields?: Record<string, any>;
  tags?: string[];
  notes?: string;
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
  lastContactDate?: string;
}

export interface ClientAddress {
  name?: string;
  street: string;
  number?: string;
  unit?: string;
  city: string;
  state?: string;
  country: string;
  postalCode: string;
}

export interface ClientStats {
  clientId: string;
  totalRevenue: number;
  totalInvoices: number;
  paidInvoices: number;
  pendingInvoices: number;
  overdueInvoices: number;
  averagePaymentDays: number;
  lastPaymentDate?: string;
  riskScore: 'low' | 'medium' | 'high';
}

// Invoice Types
export interface Invoice {
  id: string;
  invoiceNumber: string;
  clientId: string;
  clientName: string;
  clientTaxId: string;
  clientAddress?: ClientAddress;
  type: 'invoice' | 'credit_note' | 'proforma' | 'receipt';
  status: 'draft' | 'sent' | 'viewed' | 'paid' | 'overdue' | 'cancelled' | 'refunded';
  issueDate: string;
  dueDate: string;
  paidDate?: string;
  serviceStartDate?: string;
  serviceEndDate?: string;
  currency: string;
  exchangeRate?: number;
  items: InvoiceItem[];
  subtotal: number;
  taxAmount: number;
  taxRate: number;
  taxType: 'IVA' | 'VAT' | 'GST' | 'NONE';
  discount?: number;
  discountType?: 'percentage' | 'fixed';
  total: number;
  paymentMethod?: 'transfer' | 'cash' | 'card' | 'crypto' | 'other';
  paymentTerms: number;
  bankAccount?: string;
  paymentReference?: string;
  relatedDocuments?: RelatedDocument[];
  relatedTransactionIds?: string[];
  notes?: string;
  termsAndConditions?: string;
  customFields?: Record<string, any>;
  tags?: string[];
  createdAt: string;
  updatedAt: string;
  sentAt?: string;
  viewedAt?: string;
  createdBy?: string;
  attachments?: InvoiceAttachment[];
  pdfUrl?: string;
  isDeductible?: boolean;
  deductibleCategory?: string;
  deductiblePercentage?: number;
}

export interface InvoiceItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  unit?: string;
  amount: number;
  taxRate?: number;
  taxAmount?: number;
  discount?: number;
  total: number;
  category?: string;
  isDeductible?: boolean;
}

export interface RelatedDocument {
  id: string;
  type: 'fiscal_invoice' | 'receipt' | 'contract' | 'delivery_note' | 'other';
  documentId: string;
  fileName?: string;
  description?: string;
  uploadedAt: string;
}

export interface InvoiceAttachment {
  id: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  url: string;
  uploadedAt: string;
}

// Dashboard Types
export interface DashboardMetrics {
  currentMonth: {
    income: string;
    expenses: string;
    balance: string;
    transactionCount: number;
  };
  trends: {
    incomeChange: number;
    expenseChange: number;
    balanceChange: number;
  };
  topExpenseCategories: Array<{
    categoryName: string;
    amount: string;
  }>;
  accounts: {
    total: number;
    totalBalance: string;
  };
  recentTransactions: Array<{
    id: string;
    counterpartyName: string;
    description: string;
    amount: string;
    date: string;
    categoryName?: string;
  }>;
  alerts: any[];
  lastUpdated: string;
}

export interface HealthStatus {
  success: boolean;
  status: 'healthy' | 'unhealthy';
  services: {
    database: string;
    gocardless: string;
    scheduler: string;
  };
  timestamp: string;
}

// API Response Types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data?: {
    clients?: T[];
    invoices?: T[];
    pagination: {
      total: number;
      limit: number;
      offset: number;
      hasMore: boolean;
    };
  };
}

// Form Types
export interface ClientFormData {
  name: string;
  businessName?: string;
  taxId: string;
  taxIdType: 'RFC' | 'CIF' | 'NIT' | 'VAT' | 'OTHER';
  email: string;
  phone?: string;
  address?: ClientAddress;
  clientType: 'individual' | 'business';
  currency: string;
  language: string;
  paymentTerms: number;
  paymentMethod?: 'transfer' | 'cash' | 'card' | 'crypto' | 'other';
  bankAccount?: string;
  creditLimit: number;
  customFields?: Record<string, any>;
  tags?: string[];
  notes?: string;
}

export interface InvoiceFormData {
  clientId: string;
  type: 'invoice' | 'credit_note' | 'proforma' | 'receipt';
  dueDate: string;
  serviceStartDate?: string;
  serviceEndDate?: string;
  currency: string;
  items: Omit<InvoiceItem, 'id' | 'amount' | 'total'>[];
  taxRate: number;
  taxType: 'IVA' | 'VAT' | 'GST' | 'NONE';
  discount?: number;
  discountType?: 'percentage' | 'fixed';
  paymentMethod?: 'transfer' | 'cash' | 'card' | 'crypto' | 'other';
  paymentTerms: number;
  bankAccount?: string;
  notes?: string;
  termsAndConditions?: string;
  tags?: string[];
  isDeductible?: boolean;
  deductibleCategory?: string;
  deductiblePercentage?: number;
}