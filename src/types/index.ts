/**
 * Feature flags for gradual Prisma migration rollout
 */
export const FEATURE_FLAGS = {
  // Auth module
  USE_PRISMA_AUTH: process.env.USE_PRISMA_AUTH === 'true',
  
  // Financial module
  USE_PRISMA_DATABASE: process.env.USE_PRISMA_DATABASE === 'true',
  USE_PRISMA_REPORTING: process.env.USE_PRISMA_REPORTING === 'true',
  USE_PRISMA_GOCARDLESS: process.env.USE_PRISMA_GOCARDLESS === 'true',
  USE_PRISMA_TRANSACTION_MATCHING: process.env.USE_PRISMA_TRANSACTION_MATCHING === 'true',
  USE_PRISMA_INVOICE_NUMBERING: process.env.USE_PRISMA_INVOICE_NUMBERING === 'true',
  USE_PRISMA_INVOICE_STORAGE: process.env.USE_PRISMA_INVOICE_STORAGE === 'true',
  USE_PRISMA_AI_CATEGORIZATION: process.env.USE_PRISMA_AI_CATEGORIZATION === 'true',
};

// Re-export all types
// export * from './auth';
// export * from './financial';
export * from './trading';
// export * from './document';
// export * from './dashboard';