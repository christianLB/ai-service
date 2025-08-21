export interface ClientTransactionLink {
  id: string;
  transactionId: string; // UUID from financial.transactions
  clientId: string; // UUID from clients table

  // Matching information
  matchType: 'automatic' | 'manual' | 'pattern' | 'fuzzy';
  matchConfidence: number; // 0.0 to 1.0
  matchedBy?: string; // userId for manual matches
  matchedAt: Date;

  // Match criteria used
  matchCriteria?: {
    amount?: boolean;
    date?: boolean;
    reference?: boolean;
    description?: boolean;
    clientName?: boolean;
    pattern?: string;
  };

  // Override information
  isManualOverride: boolean;
  previousLinkId?: string; // If this overrides a previous match
  overrideReason?: string;

  // Metadata
  createdAt: Date;
  updatedAt: Date;
  notes?: string;
}

export interface TransactionMatchingPattern {
  id: string;
  clientId: string;
  patternType: 'reference' | 'description' | 'amount_range' | 'recurring';
  pattern: string; // Regex or specific pattern
  confidence: number; // Default confidence when pattern matches
  isActive: boolean;

  // Pattern specifics
  amountMin?: number;
  amountMax?: number;
  dayOfMonth?: number; // For recurring payments
  frequency?: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly';

  // Stats
  matchCount: number;
  lastMatchedAt?: Date;

  createdAt: Date;
  updatedAt: Date;
}

export interface UnlinkedTransaction {
  id: string;
  transactionId: string;
  accountId: string;
  amount: number;
  currency: string;
  description?: string;
  reference?: string;
  counterpartyName?: string;
  date: Date;
  type: string;

  // Matching hints
  potentialMatches?: Array<{
    clientId: string;
    clientName: string;
    confidence: number;
    matchType: string;
    reason: string;
  }>;
}

export interface ClientTransactionSummary {
  clientId: string;
  clientName: string;
  totalTransactions: number;
  totalAmount: number;
  currency: string;
  firstTransactionDate: Date;
  lastTransactionDate: Date;
  averageAmount: number;

  // Breakdown by type
  manualMatches: number;
  automaticMatches: number;
  patternMatches: number;
  fuzzyMatches: number;

  // Confidence metrics
  averageConfidence: number;
  lowConfidenceMatches: number; // < 0.7
  highConfidenceMatches: number; // >= 0.9
}

export class ClientTransactionLinkModel implements ClientTransactionLink {
  id: string;
  transactionId: string;
  clientId: string;
  matchType: 'automatic' | 'manual' | 'pattern' | 'fuzzy';
  matchConfidence: number;
  matchedBy?: string;
  matchedAt: Date;
  matchCriteria?: {
    amount?: boolean;
    date?: boolean;
    reference?: boolean;
    description?: boolean;
    clientName?: boolean;
    pattern?: string;
  };
  isManualOverride: boolean;
  previousLinkId?: string;
  overrideReason?: string;
  createdAt: Date;
  updatedAt: Date;
  notes?: string;

  constructor(data: Partial<ClientTransactionLink>) {
    this.id = data.id || this.generateId();
    this.transactionId = data.transactionId || '';
    this.clientId = data.clientId || '';
    this.matchType = data.matchType || 'manual';
    this.matchConfidence = data.matchConfidence || 1.0;
    this.matchedBy = data.matchedBy;
    this.matchedAt = data.matchedAt || new Date();
    this.matchCriteria = data.matchCriteria;
    this.isManualOverride = data.isManualOverride || false;
    this.previousLinkId = data.previousLinkId;
    this.overrideReason = data.overrideReason;
    this.createdAt = data.createdAt || new Date();
    this.updatedAt = data.updatedAt || new Date();
    this.notes = data.notes;
  }

  private generateId(): string {
    return `link_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  toJSON(): ClientTransactionLink {
    return {
      id: this.id,
      transactionId: this.transactionId,
      clientId: this.clientId,
      matchType: this.matchType,
      matchConfidence: this.matchConfidence,
      matchedBy: this.matchedBy,
      matchedAt: this.matchedAt,
      matchCriteria: this.matchCriteria,
      isManualOverride: this.isManualOverride,
      previousLinkId: this.previousLinkId,
      overrideReason: this.overrideReason,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      notes: this.notes,
    };
  }
}
