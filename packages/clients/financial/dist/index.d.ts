import { initClient } from '@ts-rest/core';
import { financialContract } from '@ai-service/contracts';
export declare const createFinancialClient: (baseUrl: string, getHeaders?: () => Record<string, string>) => ReturnType<typeof initClient<typeof financialContract>>;
