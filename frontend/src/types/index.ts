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
  customFields?: Record<string, string | number | boolean>;
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
  clientAddress?: string | ClientAddress;
  type: 'invoice' | 'credit_note' | 'proforma' | 'receipt';
  status: 'draft' | 'sent' | 'viewed' | 'paid' | 'overdue' | 'cancelled' | 'refunded';
  issueDate: string;
  dueDate: string;
  paidDate?: string;
  sentDate?: string;
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
  customFields?: Record<string, string | number | boolean>;
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
  templateId?: string;
}

export interface InvoiceItem {
  id?: string;
  description: string;
  quantity: number;
  unitPrice: number;
  unit?: string;
  amount: number;
  taxRate: number;
  taxAmount: number;
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
  invoiceId: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  filePath?: string;
  description?: string;
  uploadedAt: string;
  uploadedBy: string;
  originalFileName?: string;
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
  alerts: Array<{
    id: string;
    type: string;
    severity: 'info' | 'warning' | 'error';
    message: string;
    timestamp: string;
  }>;
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
  // Address fields for form handling
  street?: string;
  city?: string;
  state?: string;
  country?: string;
  postalCode?: string;
  clientType: 'individual' | 'business';
  currency: string;
  language: string;
  paymentTerms: number;
  paymentMethod?: 'transfer' | 'cash' | 'card' | 'crypto' | 'other';
  bankAccount?: string;
  creditLimit: number;
  customFields?: Record<string, string | number | boolean>;
  tags?: string[];
  notes?: string;
}

export interface InvoiceFormData {
  invoiceNumber?: string;
  clientId: string;
  clientName: string;
  clientTaxId: string;
  clientAddress?: string;
  type: 'invoice' | 'credit_note' | 'proforma' | 'receipt';
  issueDate: string;
  dueDate: string;
  serviceStartDate?: string;
  serviceEndDate?: string;
  currency: string;
  items: Omit<InvoiceItem, 'id'>[];
  subtotal: number;
  taxAmount: number;
  taxRate: number;
  taxType: 'IVA' | 'VAT' | 'GST' | 'NONE';
  total: number;
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
  templateId?: string;
}

// ============================================================================
// ENHANCED DASHBOARD TYPES
// ============================================================================

export interface RevenueMetrics {
  period: {
    type: string;
    current: { start: string; end: string };
    previous: { start: string; end: string };
  };
  currentPeriod: {
    totalRevenue: string;
    paidRevenue: string;
    pendingRevenue: string;
    overdueRevenue: string;
    totalInvoices: number;
    paidInvoices: number;
    averageInvoiceAmount: string;
    uniqueClients: number;
  };
  previousPeriod: {
    totalRevenue: string;
    paidRevenue: string;
    pendingRevenue: string;
    overdueRevenue: string;
    totalInvoices: number;
    paidInvoices: number;
    averageInvoiceAmount: string;
    uniqueClients: number;
  };
  growth: {
    revenueGrowth: number;
    invoiceGrowth: number;
  };
  trends: {
    monthlyRevenue: Array<{
      month: string;
      revenue: string;
      invoices: number;
    }>;
  };
  topClients: Array<{
    id: string;
    name: string;
    businessName: string;
    totalRevenue: string;
    totalInvoices: number;
    avgInvoiceAmount: string;
  }>;
  currency: string;
  generatedAt: string;
}

export interface InvoiceStatistics {
  overview: {
    totalInvoices: number;
    draftInvoices: number;
    sentInvoices: number;
    viewedInvoices: number;
    paidInvoices: number;
    overdueInvoices: number;
    cancelledInvoices: number;
    totalAmount: string;
    paidAmount: string;
    pendingAmount: string;
    overdueAmount: string;
    averageInvoiceAmount: string;
    averagePaymentDays: string;
  };
  paymentBehavior: Array<{
    category: string;
    count: number;
    amount: string;
  }>;
  agingAnalysis: Array<{
    bucket: string;
    count: number;
    amount: string;
  }> | null;
  trends: {
    monthlyCreation: Array<{
      month: string;
      invoicesCreated: number;
      totalAmount: string;
    }>;
  };
  topOverdueInvoices: Array<{
    id: string;
    invoiceNumber: string;
    clientName: string;
    total: string;
    dueDate: string;
    daysOverdue: number;
  }>;
  currency: string;
  generatedAt: string;
}

export interface ClientMetrics {
  summary: {
    totalClients: number;
    activeClients: number;
    inactiveClients: number;
    suspendedClients: number;
    prospectClients: number;
    avgClientRevenue: string;
    avgOutstandingBalance: string;
    totalClientRevenue: string;
    totalOutstandingBalance: string;
  };
  clients: Array<{
    id: string;
    name: string;
    businessName: string;
    email: string;
    status: string;
    totalRevenue: string;
    totalInvoices: number;
    outstandingBalance: string;
    lastInvoiceDate: string;
    averageInvoiceAmount: string;
    paymentTerms: number;
    paidInvoices: number;
    pendingInvoices: number;
    overdueInvoices: number;
    averagePaymentDays: string;
    lastPaymentDate: string;
    riskScore: string;
  }>;
  riskDistribution: Array<{
    riskScore: string;
    count: number;
    totalRevenue: string;
    totalOutstanding: string;
  }>;
  paymentBehavior: Array<{
    category: string;
    clientCount: number;
    avgRevenue: string;
  }>;
  topRevenueClients: Array<{
    id: string;
    name: string;
    businessName: string;
    totalRevenue: string;
    totalInvoices: number;
    status: string;
    revenuePercentage: string;
  }>;
  currency: string;
  generatedAt: string;
}

export interface CashFlowProjections {
  currentPosition: {
    currentCashBalance: string;
    totalOutstanding: string;
    expectedCollections: string;
    collectionRate: string;
  };
  projectionPeriod: {
    daysAhead: number;
    startDate: string;
    endDate: string;
  };
  weeklyProjections: Array<{
    weekStart: string;
    weekEnd: string;
    expectedReceipts: string;
    projectedBalance: string;
    invoicesCount: number;
  }>;
  outstandingInvoices: Array<{
    id: string;
    invoiceNumber: string;
    clientName: string;
    total: string;
    dueDate: string;
    status: string;
    estimatedPaymentDate: string;
    paymentProbability: string;
    riskScore: string;
  }>;
  riskAnalysis: {
    highRisk: { count: number; amount: string };
    mediumRisk: { count: number; amount: string };
    lowRisk: { count: number; amount: string };
  };
  recentTransactions: Array<{
    amount: string;
    date: string;
    description: string;
    counterpartyName: string;
    type: string;
  }>;
  currency: string;
  generatedAt: string;
}

export interface DashboardHealth {
  status: string;
  services: {
    database: string;
    endpoints: string[];
  };
  timestamp: string;
}