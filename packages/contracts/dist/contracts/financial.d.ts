import { z } from 'zod';
export declare const financialContract: {
    listAccounts: {
        query: z.ZodObject<{
            provider: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            provider?: string | undefined;
        }, {
            provider?: string | undefined;
        }>;
        summary: "List accounts";
        method: "GET";
        path: "/api/financial/accounts";
        responses: {
            200: z.ZodObject<{
                accounts: z.ZodArray<z.ZodObject<{
                    id: z.ZodString;
                    provider: z.ZodString;
                    name: z.ZodString;
                    iban: z.ZodOptional<z.ZodString>;
                    currency: z.ZodString;
                    createdAt: z.ZodOptional<z.ZodString>;
                }, "strip", z.ZodTypeAny, {
                    currency: string;
                    id: string;
                    provider: string;
                    name: string;
                    iban?: string | undefined;
                    createdAt?: string | undefined;
                }, {
                    currency: string;
                    id: string;
                    provider: string;
                    name: string;
                    iban?: string | undefined;
                    createdAt?: string | undefined;
                }>, "many">;
                total: z.ZodNumber;
            }, "strip", z.ZodTypeAny, {
                accounts: {
                    currency: string;
                    id: string;
                    provider: string;
                    name: string;
                    iban?: string | undefined;
                    createdAt?: string | undefined;
                }[];
                total: number;
            }, {
                accounts: {
                    currency: string;
                    id: string;
                    provider: string;
                    name: string;
                    iban?: string | undefined;
                    createdAt?: string | undefined;
                }[];
                total: number;
            }>;
        };
    };
};
