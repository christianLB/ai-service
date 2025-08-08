
import { initClient } from '@ts-rest/core';
import { financialContract } from '@ai-service/contracts';

export const createFinancialClient = (
  baseUrl: string, 
  getHeaders?: () => Record<string, string>
): any => {
  return initClient(financialContract, { 
    baseUrl, 
    baseHeaders: getHeaders ? getHeaders() : undefined 
  });
};

export type FinancialClient = ReturnType<typeof createFinancialClient>;
