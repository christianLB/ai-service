// Financial System Types - Crypto-Ready
// Unified types for fiat (GoCardless) + crypto transactions

export interface Currency {
  id: string;
  code: string; // EUR, USD, BTC, ETH, etc.
  name: string;
  type: 'fiat' | 'crypto';
  decimals: number; // 2 for fiat, 8+ for crypto
  symbol?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Customer {
  id: string;
  name: string;
  email?: string;
  taxId?: string;
  address?: Record<string, any>;
  type: 'individual' | 'company';
  metadata: Record<string, any>;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export type AccountType =
  | 'bank_account'      // Traditional banking (GoCardless)
  | 'crypto_wallet'     // Crypto wallets
  | 'exchange_account'  // Crypto exchange accounts
  | 'payment_processor'; // PayPal, Stripe, etc.

export interface Account {
  id: string;
  name: string;
  type: AccountType;
  currencyId: string;

  // Traditional banking (GoCardless)
  accountId?: string;      // GoCardless account_id
  institutionId?: string;  // Bank identifier
  requisitionId?: string;  // GoCardless requisition
  iban?: string;

  // Crypto specific
  walletAddress?: string;  // Crypto wallet address
  chainId?: number;        // Blockchain network ID
  exchangeName?: string;   // Binance, Coinbase, etc.

  // Common fields
  balance: string;         // High precision decimal as string
  isActive: boolean;
  metadata: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export type TransactionType =
  | 'bank_transfer'    // Traditional bank transfers
  | 'crypto_send'      // Crypto outgoing
  | 'crypto_receive'   // Crypto incoming
  | 'exchange_trade'   // Crypto trading
  | 'payment'          // Payment processing
  | 'fee'             // Transaction fees
  | 'conversion';     // Currency conversion

export type TransactionStatus =
  | 'pending'
  | 'confirmed'
  | 'failed'
  | 'cancelled';

export interface Transaction {
  id: string;
  transactionId: string;   // Unique transaction identifier (required in DB)
  accountId: string;
  type: TransactionType;
  status: TransactionStatus;

  // Amount and currency
  amount: string;          // High precision decimal as string
  currencyId: string;

  // Transaction details
  description?: string;
  reference?: string;      // External reference (GoCardless, txHash, etc.)
  date: Date;

  // Fiat specific (GoCardless)
  gocardlessData?: Record<string, any>;

  // Crypto specific
  transactionHash?: string; // Blockchain tx hash
  blockNumber?: number;     // Block number
  gasUsed?: string;        // Gas consumed
  gasPrice?: string;       // Gas price
  fromAddress?: string;    // Sender address
  toAddress?: string;      // Recipient address

  // Counterparty
  counterpartyName?: string;
  counterpartyAccount?: string;

  // Fees
  feeAmount?: string;
  feeCurrencyId?: string;

  // Metadata and audit
  metadata: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export type InvoiceStatus =
  | 'draft'
  | 'sent'
  | 'paid'
  | 'partial_paid'
  | 'overdue'
  | 'cancelled';

export interface Invoice {
  id: string;
  customerId: string;

  // Invoice details
  invoiceNumber: string;
  title?: string;
  description?: string;

  // Amounts
  subtotal: string;
  taxAmount: string;
  totalAmount: string;
  currencyId: string;

  // Dates
  issueDate: Date;
  dueDate: Date;
  paidDate?: Date;

  // Status
  status: InvoiceStatus;

  // Payment tracking
  amountPaid: string;

  // Metadata
  metadata: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface InvoiceItem {
  id: string;
  invoiceId: string;
  description: string;
  quantity: string;
  unitPrice: string;
  totalPrice: string;
  metadata: Record<string, any>;
  createdAt: Date;
}

export interface TransactionInvoiceLink {
  id: string;
  transactionId: string;
  invoiceId: string;
  amountAllocated: string;
  currencyId: string;
  exchangeRate?: string;
  notes?: string;
  createdAt: Date;
}

export interface ExchangeRate {
  id: string;
  fromCurrencyId: string;
  toCurrencyId: string;
  rate: string;
  date: Date;
  source: string; // API source
  createdAt: Date;
}

// GoCardless specific types
export interface GoCardlessAccount {
  id: string;
  institution_id: string;
  iban: string;
  account_selection: boolean;
  status: string;
}

export interface GoCardlessTransaction {
  transactionId: string;
  mandateId?: string;
  bookingDate: string;
  valueDate: string;
  transactionAmount: {
    amount: string;
    currency: string;
  };
  creditorName?: string;
  creditorAccount?: {
    iban?: string;
  };
  debtorName?: string;
  debtorAccount?: {
    iban?: string;
  };
  remittanceInformationUnstructured?: string;
  bankTransactionCode?: string;
  additionalInformation?: string;
  internalTransactionId: string;
}

export interface GoCardlessRequisition {
  id: string;
  institution_id: string;
  status: string;
  redirect: string;
  accounts: string[];
  reference: string;
  agreement?: string;
  user_language?: string;
  link: string;
  ssn?: string;
  account_selection: boolean;
}

// API Response types
export interface FinancialApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  metadata?: Record<string, any>;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  hasNext: boolean;
  hasPrev: boolean;
}

// Service configuration types
export interface FinancialServiceConfig {
  database: {
    host: string;
    port: number;
    database: string;
    username: string;
    password: string;
  };
  crypto: {
    enabledChains: number[];
    defaultGasPrice: string;
    apiKeys: Record<string, string>;
  };
}

// ============================================================================
// CATEGORIZATION & REPORTING TYPES
// ============================================================================

export type CategoryType = 'income' | 'expense' | 'transfer';

export interface Category {
  id: string;
  name: string;
  description?: string;
  color?: string;          // Hex color for UI
  icon?: string;           // Icon identifier
  type: CategoryType;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Subcategory {
  id: string;
  categoryId: string;
  name: string;
  description?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface AITag {
  id: string;
  name: string;
  description?: string;

  // AI matching patterns
  keywords: string[];              // Array of keywords to match
  merchantPatterns: string[];      // Regex patterns for merchant names
  amountPatterns?: Record<string, any>; // Min/max amounts, recurring patterns

  // Association strength
  categoryId?: string;
  subcategoryId?: string;
  confidenceScore: number;         // 0.0 to 1.0

  // Learning metadata
  matchCount: number;
  successRate: number;
  lastUsed?: Date;

  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export type CategorizationMethod = 'manual' | 'ai_auto' | 'ai_suggested' | 'rule_based';

export interface TransactionCategorization {
  id: string;
  transactionId: string;
  categoryId?: string;
  subcategoryId?: string;

  // Categorization metadata
  method: CategorizationMethod;
  confidenceScore?: number;        // AI confidence (0.0 to 1.0)
  aiTagId?: string;               // Which AI tag triggered this

  // User feedback for learning
  userConfirmed?: boolean;         // null=no feedback, true=correct, false=incorrect
  userCorrectedCategoryId?: string;
  userCorrectedSubcategoryId?: string;

  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CustomTag {
  id: string;
  name: string;
  color?: string;                  // Hex color
  description?: string;
  isActive: boolean;
  createdAt: Date;
}

export interface TransactionCustomTag {
  transactionId: string;
  customTagId: string;
  createdAt: Date;
}

// ============================================================================
// REPORTING & ANALYTICS TYPES
// ============================================================================

export interface CategorizedTransaction {
  id: string;
  accountId: string;
  accountName: string;
  type: TransactionType;
  amount: string;
  currencyId: string;
  currencyCode: string;
  description?: string;
  counterpartyName?: string;
  date: Date;

  // Categorization
  categoryId?: string;
  categoryName?: string;
  categoryType?: CategoryType;
  categoryColor?: string;
  categoryIcon?: string;

  subcategoryId?: string;
  subcategoryName?: string;

  categorizationMethod?: CategorizationMethod;
  confidenceScore?: number;
  userConfirmed?: boolean;

  createdAt: Date;
}

export interface CategorySummary {
  month: Date;
  categoryId: string;
  categoryName: string;
  categoryType: CategoryType;
  currencyCode: string;
  transactionCount: number;
  totalAmount: string;
  avgAmount: string;
  minAmount: string;
  maxAmount: string;
}

export interface AccountInsights {
  id: string;
  name: string;
  balance: string;
  currencyCode: string;

  // Last 30 days activity
  transactions30d: number;
  income30d?: string;
  expenses30d?: string;
}

export interface FinancialReport {
  period: {
    start: Date;
    end: Date;
    type: 'month' | 'quarter' | 'year' | 'custom';
  };

  summary: {
    totalIncome: string;
    totalExpenses: string;
    netAmount: string;
    transactionCount: number;
  };

  byCategory: {
    income: CategoryReportItem[];
    expenses: CategoryReportItem[];
    transfers: CategoryReportItem[];
  };

  trends: {
    monthlyIncome: MonthlyTrend[];
    monthlyExpenses: MonthlyTrend[];
    topCategories: TopCategoryItem[];
  };

  currency: string;
  generatedAt: Date;
}

export interface CategoryReportItem {
  categoryId: string;
  categoryName: string;
  amount: string;
  percentage: number;
  transactionCount: number;
  subcategories?: SubcategoryReportItem[];
}

export interface SubcategoryReportItem {
  subcategoryId: string;
  subcategoryName: string;
  amount: string;
  percentage: number;
  transactionCount: number;
}

export interface MonthlyTrend {
  month: Date;
  amount: string;
  transactionCount: number;
}

export interface TopCategoryItem {
  categoryId: string;
  categoryName: string;
  amount: string;
  trend: 'up' | 'down' | 'stable';
  trendPercentage: number;
}

export interface RealtimeMetrics {
  currentMonth: {
    income: string;
    expenses: string;
    balance: string;
    transactionCount: number;
  };

  previousMonth: {
    income: string;
    expenses: string;
    balance: string;
    transactionCount: number;
  };

  trends: {
    incomeChange: number;      // Percentage change
    expenseChange: number;     // Percentage change
    balanceChange: number;     // Percentage change
  };

  topExpenseCategories: TopCategoryItem[];
  recentTransactions: CategorizedTransaction[];

  alerts: FinancialAlert[];
  updatedAt: Date;
}

export interface FinancialAlert {
  id: string;
  type: 'budget_exceeded' | 'unusual_expense' | 'recurring_payment' | 'low_balance';
  severity: 'info' | 'warning' | 'critical';
  title: string;
  message: string;
  amount?: string;
  categoryId?: string;
  transactionId?: string;
  createdAt: Date;
}

// Query parameters for reports and analytics
export interface ReportQueryParams {
  startDate?: Date;
  endDate?: Date;
  categoryId?: string;
  subcategoryId?: string;
  accountId?: string;
  currency?: string;
  groupBy?: 'day' | 'week' | 'month' | 'quarter' | 'year';
  limit?: number;
  offset?: number;
}

export interface MetricsQueryParams {
  period?: 'week' | 'month' | 'quarter' | 'year';
  currency?: string;
  includeProjections?: boolean;
  includeTrends?: boolean;
}