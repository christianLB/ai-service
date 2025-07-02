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
  transaction_id: string;
  booking_date: string;
  value_date: string;
  transaction_amount: {
    amount: string;
    currency: string;
  };
  creditor_name?: string;
  creditor_account?: {
    iban?: string;
  };
  debtor_name?: string;
  debtor_account?: {
    iban?: string;
  };
  remittance_information_unstructured?: string;
  bank_transaction_code?: string;
  additional_information?: string;
  internal_transaction_id: string;
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
export interface GoCardlessConfig {
  secretId: string;
  secretKey: string;
  baseUrl: string;
  redirectUri: string;
}

export interface FinancialServiceConfig {
  gocardless: GoCardlessConfig;
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