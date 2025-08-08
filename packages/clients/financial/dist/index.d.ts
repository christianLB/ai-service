export declare const createFinancialClient: (baseUrl: string, getHeaders?: () => Record<string, string>) => any;
export type FinancialClient = ReturnType<typeof createFinancialClient>;
