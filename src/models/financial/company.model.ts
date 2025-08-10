export interface CompanyInfo {
  // Basic Information
  name: string;
  legalName: string; // Razón social
  taxId: string; // CIF/NIF
  taxIdType: 'CIF' | 'NIF' | 'VAT' | 'OTHER';

  // Contact Information
  email: string;
  phone: string;
  website?: string;

  // Address
  address: {
    street: string;
    number?: string;
    unit?: string;
    city: string;
    state?: string;
    country: string;
    postalCode: string;
  };

  // Banking Information
  bankAccounts?: BankAccount[];
  defaultBankAccount?: string; // ID of default account

  // Invoice Settings
  invoiceSettings: {
    numberPrefix: string; // 'FAC', 'INV', etc.
    numberFormat: string; // 'PREFIX-YYYY-0000'
    startingNumber: number;
    yearlyReset: boolean;
    defaultPaymentTerms: number; // days
    defaultCurrency: string;
    defaultTaxRate: number;
    defaultTaxType: 'IVA' | 'VAT' | 'GST' | 'NONE';
    defaultLanguage: 'es' | 'en';
  };

  // Legal Requirements
  legalInfo: {
    registrationNumber?: string; // Registro Mercantil
    registrationLocation?: string;
    capitalStock?: string; // Capital social
    legalForm?: string; // S.L., S.A., etc.
  };

  // Branding
  branding: {
    logoUrl?: string;
    primaryColor?: string;
    secondaryColor?: string;
    fontFamily?: string;
  };

  // Email Settings
  emailSettings?: {
    fromName: string;
    fromEmail: string;
    replyTo?: string;
    bccEmail?: string; // For keeping copies
  };

  // Terms and Conditions
  defaultTerms?: {
    es?: string;
    en?: string;
  };

  // Footer Text
  invoiceFooter?: {
    es?: string;
    en?: string;
  };
}

export interface BankAccount {
  id: string;
  bankName: string;
  accountHolder: string;
  iban?: string;
  swiftBic?: string;
  accountNumber?: string;
  currency: string;
  isDefault: boolean;
  notes?: string;
}

// Default company configuration - this should be loaded from environment or database
export const DEFAULT_COMPANY_CONFIG: CompanyInfo = {
  name: process.env.COMPANY_NAME || 'AI Service Company',
  legalName: process.env.COMPANY_LEGAL_NAME || 'AI Service Company S.L.',
  taxId: process.env.COMPANY_TAX_ID || '',
  taxIdType: 'CIF',
  email: process.env.COMPANY_EMAIL || 'info@aiservice.com',
  phone: process.env.COMPANY_PHONE || '+34 900 000 000',
  website: process.env.COMPANY_WEBSITE || 'https://aiservice.com',
  address: {
    street: process.env.COMPANY_STREET || 'Calle Principal',
    number: process.env.COMPANY_NUMBER || '123',
    city: process.env.COMPANY_CITY || 'Madrid',
    state: process.env.COMPANY_STATE || 'Madrid',
    country: process.env.COMPANY_COUNTRY || 'España',
    postalCode: process.env.COMPANY_POSTAL_CODE || '28001'
  },
  bankAccounts: [],
  invoiceSettings: {
    numberPrefix: process.env.INVOICE_PREFIX || 'FAC',
    numberFormat: 'PREFIX-YYYY-0000',
    startingNumber: 1,
    yearlyReset: true,
    defaultPaymentTerms: 30,
    defaultCurrency: 'EUR',
    defaultTaxRate: 21,
    defaultTaxType: 'IVA',
    defaultLanguage: 'es'
  },
  legalInfo: {
    registrationNumber: process.env.COMPANY_REGISTRATION || '',
    registrationLocation: process.env.COMPANY_REG_LOCATION || 'Madrid',
    capitalStock: process.env.COMPANY_CAPITAL || '3.000 €',
    legalForm: process.env.COMPANY_LEGAL_FORM || 'S.L.'
  },
  branding: {
    primaryColor: '#1a73e8',
    secondaryColor: '#34a853',
    fontFamily: 'Arial, sans-serif'
  },
  emailSettings: {
    fromName: process.env.EMAIL_FROM_NAME || 'AI Service',
    fromEmail: process.env.EMAIL_FROM || 'invoices@aiservice.com',
    replyTo: process.env.EMAIL_REPLY_TO || 'support@aiservice.com'
  }
};