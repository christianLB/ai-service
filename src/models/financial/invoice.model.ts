export interface Invoice {
  id: string;
  invoiceNumber: string; // AUTO-001, AUTO-002, etc.
  
  // Client Information
  clientId: string;
  clientName: string; // Denormalized for quick access
  clientTaxId: string;
  clientAddress?: InvoiceAddress;
  
  // Invoice Details
  type: 'invoice' | 'credit_note' | 'proforma' | 'receipt';
  status: 'draft' | 'sent' | 'viewed' | 'paid' | 'overdue' | 'cancelled' | 'refunded';
  
  // Dates
  issueDate: Date;
  dueDate: Date;
  paidDate?: Date;
  serviceStartDate?: Date;
  serviceEndDate?: Date;
  
  // Financial Information
  currency: string;
  exchangeRate?: number; // If different from base currency
  
  // Line Items
  items: InvoiceItem[];
  
  // Totals
  subtotal: number;
  taxAmount: number;
  taxRate: number; // 21, 16, etc.
  taxType: 'IVA' | 'VAT' | 'GST' | 'NONE';
  discount?: number;
  discountType?: 'percentage' | 'fixed';
  total: number;
  
  // Payment Information
  paymentMethod?: 'transfer' | 'cash' | 'card' | 'crypto' | 'other';
  paymentTerms: number; // Days
  bankAccount?: string;
  paymentReference?: string;
  
  // Related Documents
  relatedDocuments?: RelatedDocument[];
  relatedTransactionIds?: string[]; // Bank transactions
  
  // Custom Fields
  notes?: string;
  termsAndConditions?: string;
  customFields?: Record<string, any>;
  tags?: string[];
  
  // Metadata
  createdAt: Date;
  updatedAt: Date;
  sentAt?: Date;
  viewedAt?: Date;
  createdBy?: string; // userId
  
  // Attachments
  attachments?: InvoiceAttachment[];
  pdfUrl?: string;
  
  // Tax Deductible Info
  isDeductible?: boolean;
  deductibleCategory?: string;
  deductiblePercentage?: number;
}

export interface InvoiceAddress {
  name?: string;
  street: string;
  number?: string;
  unit?: string;
  city: string;
  state?: string;
  country: string;
  postalCode: string;
}

export interface InvoiceItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  unit?: string; // hours, units, etc.
  amount: number;
  taxRate?: number;
  taxAmount?: number;
  discount?: number;
  total: number;
  category?: string; // For accounting
  isDeductible?: boolean;
}

export interface RelatedDocument {
  id: string;
  type: 'fiscal_invoice' | 'receipt' | 'contract' | 'delivery_note' | 'other';
  documentId: string; // Reference to document in document system
  fileName?: string;
  description?: string;
  uploadedAt: Date;
}

export interface InvoiceAttachment {
  id: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  url: string;
  uploadedAt: Date;
}

export interface InvoiceNumberSequence {
  prefix: string; // 'INV', 'FAC', etc.
  currentNumber: number;
  year?: number; // For yearly reset
  format: string; // 'PREFIX-YYYY-0000'
}

export class InvoiceModel implements Invoice {
  id: string;
  invoiceNumber: string;
  clientId: string;
  clientName: string;
  clientTaxId: string;
  clientAddress?: InvoiceAddress;
  type: 'invoice' | 'credit_note' | 'proforma' | 'receipt';
  status: 'draft' | 'sent' | 'viewed' | 'paid' | 'overdue' | 'cancelled' | 'refunded';
  issueDate: Date;
  dueDate: Date;
  paidDate?: Date;
  serviceStartDate?: Date;
  serviceEndDate?: Date;
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
  createdAt: Date;
  updatedAt: Date;
  sentAt?: Date;
  viewedAt?: Date;
  createdBy?: string;
  attachments?: InvoiceAttachment[];
  pdfUrl?: string;
  isDeductible?: boolean;
  deductibleCategory?: string;
  deductiblePercentage?: number;

  constructor(data: Partial<Invoice>) {
    this.id = data.id || this.generateId();
    this.invoiceNumber = data.invoiceNumber || '';
    this.clientId = data.clientId || '';
    this.clientName = data.clientName || '';
    this.clientTaxId = data.clientTaxId || '';
    this.clientAddress = data.clientAddress;
    this.type = data.type || 'invoice';
    this.status = data.status || 'draft';
    this.issueDate = data.issueDate || new Date();
    this.dueDate = data.dueDate || this.calculateDueDate(data.paymentTerms || 30);
    this.paidDate = data.paidDate;
    this.serviceStartDate = data.serviceStartDate;
    this.serviceEndDate = data.serviceEndDate;
    this.currency = data.currency || 'EUR';
    this.exchangeRate = data.exchangeRate;
    this.items = data.items || [];
    this.subtotal = data.subtotal || 0;
    this.taxAmount = data.taxAmount || 0;
    this.taxRate = data.taxRate || 21; // Default IVA
    this.taxType = data.taxType || 'IVA';
    this.discount = data.discount;
    this.discountType = data.discountType;
    this.total = data.total || 0;
    this.paymentMethod = data.paymentMethod;
    this.paymentTerms = data.paymentTerms || 30;
    this.bankAccount = data.bankAccount;
    this.paymentReference = data.paymentReference;
    this.relatedDocuments = data.relatedDocuments || [];
    this.relatedTransactionIds = data.relatedTransactionIds || [];
    this.notes = data.notes;
    this.termsAndConditions = data.termsAndConditions;
    this.customFields = data.customFields || {};
    this.tags = data.tags || [];
    this.createdAt = data.createdAt || new Date();
    this.updatedAt = data.updatedAt || new Date();
    this.sentAt = data.sentAt;
    this.viewedAt = data.viewedAt;
    this.createdBy = data.createdBy;
    this.attachments = data.attachments || [];
    this.pdfUrl = data.pdfUrl;
    this.isDeductible = data.isDeductible;
    this.deductibleCategory = data.deductibleCategory;
    this.deductiblePercentage = data.deductiblePercentage;
    
    // Calculate totals if not provided
    if (!data.subtotal || !data.total) {
      this.calculateTotals();
    }
  }

  private generateId(): string {
    return `inv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private calculateDueDate(paymentTerms: number): Date {
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + paymentTerms);
    return dueDate;
  }

  calculateTotals(): void {
    // Calculate subtotal from items
    this.subtotal = this.items.reduce((sum, item) => sum + item.amount, 0);
    
    // Apply discount
    let discountAmount = 0;
    if (this.discount) {
      if (this.discountType === 'percentage') {
        discountAmount = this.subtotal * (this.discount / 100);
      } else {
        discountAmount = this.discount;
      }
    }
    
    // Calculate tax
    const taxableAmount = this.subtotal - discountAmount;
    this.taxAmount = taxableAmount * (this.taxRate / 100);
    
    // Calculate total
    this.total = taxableAmount + this.taxAmount;
  }

  addItem(item: Omit<InvoiceItem, 'id' | 'total'>): void {
    const newItem: InvoiceItem = {
      id: `item_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      ...item,
      amount: item.quantity * item.unitPrice,
      taxAmount: item.taxRate ? (item.quantity * item.unitPrice * item.taxRate / 100) : 0,
      total: 0
    };
    
    // Calculate item total
    newItem.total = newItem.amount + (newItem.taxAmount || 0) - (newItem.discount || 0);
    
    this.items.push(newItem);
    this.calculateTotals();
    this.updatedAt = new Date();
  }

  markAsPaid(paymentReference?: string): void {
    this.status = 'paid';
    this.paidDate = new Date();
    this.paymentReference = paymentReference;
    this.updatedAt = new Date();
  }

  attachDocument(document: Omit<RelatedDocument, 'uploadedAt'>): void {
    this.relatedDocuments = this.relatedDocuments || [];
    this.relatedDocuments.push({
      ...document,
      uploadedAt: new Date()
    });
    this.updatedAt = new Date();
  }

  linkTransaction(transactionId: string): void {
    this.relatedTransactionIds = this.relatedTransactionIds || [];
    if (!this.relatedTransactionIds.includes(transactionId)) {
      this.relatedTransactionIds.push(transactionId);
      this.updatedAt = new Date();
    }
  }

  toJSON(): Invoice {
    return {
      id: this.id,
      invoiceNumber: this.invoiceNumber,
      clientId: this.clientId,
      clientName: this.clientName,
      clientTaxId: this.clientTaxId,
      clientAddress: this.clientAddress,
      type: this.type,
      status: this.status,
      issueDate: this.issueDate,
      dueDate: this.dueDate,
      paidDate: this.paidDate,
      serviceStartDate: this.serviceStartDate,
      serviceEndDate: this.serviceEndDate,
      currency: this.currency,
      exchangeRate: this.exchangeRate,
      items: this.items,
      subtotal: this.subtotal,
      taxAmount: this.taxAmount,
      taxRate: this.taxRate,
      taxType: this.taxType,
      discount: this.discount,
      discountType: this.discountType,
      total: this.total,
      paymentMethod: this.paymentMethod,
      paymentTerms: this.paymentTerms,
      bankAccount: this.bankAccount,
      paymentReference: this.paymentReference,
      relatedDocuments: this.relatedDocuments,
      relatedTransactionIds: this.relatedTransactionIds,
      notes: this.notes,
      termsAndConditions: this.termsAndConditions,
      customFields: this.customFields,
      tags: this.tags,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      sentAt: this.sentAt,
      viewedAt: this.viewedAt,
      createdBy: this.createdBy,
      attachments: this.attachments,
      pdfUrl: this.pdfUrl,
      isDeductible: this.isDeductible,
      deductibleCategory: this.deductibleCategory,
      deductiblePercentage: this.deductiblePercentage
    };
  }
}