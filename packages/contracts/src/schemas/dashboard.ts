import { z } from 'zod';

// Minimal schema stubs to satisfy imports. Keep flexible to avoid tight coupling.
// If stricter typing is needed later, replace these with concrete field definitions.

export const ClientMetrics = z.any();
export const RevenueMetrics = z.any();
export const InvoiceStatistics = z.any();
export const CashFlowProjections = z.any();
export const SyncStatus = z.any();
export const AccountStatus = z.any();
export const QuickStats = z.any();
