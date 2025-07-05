export interface Client {
  id: string;
  // Basic Information
  name: string;
  businessName?: string; // Razón social
  taxId: string; // RFC, CIF, NIT, etc.
  taxIdType: 'RFC' | 'CIF' | 'NIT' | 'VAT' | 'OTHER';
  
  // Contact Information
  email: string;
  phone?: string;
  address?: ClientAddress;
  
  // Business Information
  clientType: 'individual' | 'business';
  currency: string; // EUR, USD, MXN, etc.
  language: string; // es, en, etc.
  timezone?: string;
  
  // Payment & Billing
  paymentTerms: number; // Days (30, 60, 90)
  paymentMethod?: 'transfer' | 'cash' | 'card' | 'crypto' | 'other';
  bankAccount?: string; // For recurring payments
  creditLimit?: number;
  
  // Status & Metrics
  status: 'active' | 'inactive' | 'suspended' | 'prospect';
  totalRevenue: number;
  totalInvoices: number;
  outstandingBalance: number;
  lastInvoiceDate?: Date;
  averageInvoiceAmount?: number;
  
  // Custom Fields
  customFields?: Record<string, any>;
  tags?: string[];
  notes?: string;
  
  // Metadata
  createdAt: Date;
  updatedAt: Date;
  createdBy?: string; // userId
  lastContactDate?: Date;
}

export interface ClientAddress {
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
  lastPaymentDate?: Date;
  riskScore: 'low' | 'medium' | 'high'; // Based on payment history
}

export interface ClientTransaction {
  clientId: string;
  transactionId: string;
  invoiceId?: string;
  amount: number;
  type: 'invoice' | 'payment' | 'refund' | 'credit';
  status: 'completed' | 'pending' | 'failed';
  date: Date;
  description?: string;
}

export class ClientModel implements Client {
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
  creditLimit?: number;
  status: 'active' | 'inactive' | 'suspended' | 'prospect';
  totalRevenue: number;
  totalInvoices: number;
  outstandingBalance: number;
  lastInvoiceDate?: Date;
  averageInvoiceAmount?: number;
  customFields?: Record<string, any>;
  tags?: string[];
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
  createdBy?: string;
  lastContactDate?: Date;

  constructor(data: Partial<Client>) {
    this.id = data.id || this.generateId();
    this.name = data.name || '';
    this.businessName = data.businessName;
    this.taxId = data.taxId || '';
    this.taxIdType = data.taxIdType || 'OTHER';
    this.email = data.email || '';
    this.phone = data.phone;
    this.address = data.address;
    this.clientType = data.clientType || 'individual';
    this.currency = data.currency || 'EUR';
    this.language = data.language || 'es';
    this.timezone = data.timezone;
    this.paymentTerms = data.paymentTerms || 30;
    this.paymentMethod = data.paymentMethod;
    this.bankAccount = data.bankAccount;
    this.creditLimit = data.creditLimit || 0;
    this.status = data.status || 'active';
    this.totalRevenue = data.totalRevenue || 0;
    this.totalInvoices = data.totalInvoices || 0;
    this.outstandingBalance = data.outstandingBalance || 0;
    this.lastInvoiceDate = data.lastInvoiceDate;
    this.averageInvoiceAmount = data.averageInvoiceAmount;
    this.customFields = data.customFields || {};
    this.tags = data.tags || [];
    this.notes = data.notes;
    this.createdAt = data.createdAt || new Date();
    this.updatedAt = data.updatedAt || new Date();
    this.createdBy = data.createdBy;
    this.lastContactDate = data.lastContactDate;
  }

  private generateId(): string {
    return `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  updateStats(invoice: { amount: number; status: string }): void {
    if (invoice.status === 'paid') {
      this.totalRevenue += invoice.amount;
      this.totalInvoices++;
      this.lastInvoiceDate = new Date();
      this.averageInvoiceAmount = this.totalRevenue / this.totalInvoices;
    }
    this.updatedAt = new Date();
  }

  toJSON(): Client {
    return {
      id: this.id,
      name: this.name,
      businessName: this.businessName,
      taxId: this.taxId,
      taxIdType: this.taxIdType,
      email: this.email,
      phone: this.phone,
      address: this.address,
      clientType: this.clientType,
      currency: this.currency,
      language: this.language,
      timezone: this.timezone,
      paymentTerms: this.paymentTerms,
      paymentMethod: this.paymentMethod,
      bankAccount: this.bankAccount,
      creditLimit: this.creditLimit,
      status: this.status,
      totalRevenue: this.totalRevenue,
      totalInvoices: this.totalInvoices,
      outstandingBalance: this.outstandingBalance,
      lastInvoiceDate: this.lastInvoiceDate,
      averageInvoiceAmount: this.averageInvoiceAmount,
      customFields: this.customFields,
      tags: this.tags,
      notes: this.notes,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      createdBy: this.createdBy,
      lastContactDate: this.lastContactDate
    };
  }
}