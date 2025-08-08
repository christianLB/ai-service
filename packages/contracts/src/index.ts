
// Schema exports
export * as CommonSchemas from './schemas/common';
export * as FinanceSchemas from './schemas/finance';
export * as DashboardSchemas from './schemas/dashboard';

// Contract exports
export { financialContract } from './contracts/financial';
export { dashboardContract } from './contracts/dashboard';

// Combined contract for server implementation
import { initContract } from '@ts-rest/core';
import { financialContract } from './contracts/financial';
import { dashboardContract } from './contracts/dashboard';

const c = initContract();

export const apiContract = c.router({
  financial: financialContract,
  dashboard: dashboardContract,
});

// Type exports for convenience
export type ApiContract = typeof apiContract;
