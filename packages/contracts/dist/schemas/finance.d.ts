import { z } from 'zod';
export declare const Account: z.ZodObject<{
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
}>;
export declare const Transaction: z.ZodObject<{
    id: z.ZodString;
    accountId: z.ZodString;
    bookingDate: z.ZodString;
    valueDate: z.ZodOptional<z.ZodString>;
    description: z.ZodString;
    amount: z.ZodObject<{
        amount: z.ZodString;
        currency: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        amount: string;
        currency: string;
    }, {
        amount: string;
        currency: string;
    }>;
    raw: z.ZodOptional<z.ZodAny>;
    categoryId: z.ZodOptional<z.ZodString>;
    meta: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
}, "strip", z.ZodTypeAny, {
    amount: {
        amount: string;
        currency: string;
    };
    id: string;
    accountId: string;
    bookingDate: string;
    description: string;
    valueDate?: string | undefined;
    raw?: any;
    categoryId?: string | undefined;
    meta?: Record<string, any> | undefined;
}, {
    amount: {
        amount: string;
        currency: string;
    };
    id: string;
    accountId: string;
    bookingDate: string;
    description: string;
    valueDate?: string | undefined;
    raw?: any;
    categoryId?: string | undefined;
    meta?: Record<string, any> | undefined;
}>;
export declare const AccountsResponse: z.ZodObject<{
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
export declare const TransactionsResponse: z.ZodObject<{
    transactions: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        accountId: z.ZodString;
        bookingDate: z.ZodString;
        valueDate: z.ZodOptional<z.ZodString>;
        description: z.ZodString;
        amount: z.ZodObject<{
            amount: z.ZodString;
            currency: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            amount: string;
            currency: string;
        }, {
            amount: string;
            currency: string;
        }>;
        raw: z.ZodOptional<z.ZodAny>;
        categoryId: z.ZodOptional<z.ZodString>;
        meta: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
    }, "strip", z.ZodTypeAny, {
        amount: {
            amount: string;
            currency: string;
        };
        id: string;
        accountId: string;
        bookingDate: string;
        description: string;
        valueDate?: string | undefined;
        raw?: any;
        categoryId?: string | undefined;
        meta?: Record<string, any> | undefined;
    }, {
        amount: {
            amount: string;
            currency: string;
        };
        id: string;
        accountId: string;
        bookingDate: string;
        description: string;
        valueDate?: string | undefined;
        raw?: any;
        categoryId?: string | undefined;
        meta?: Record<string, any> | undefined;
    }>, "many">;
    total: z.ZodNumber;
    page: z.ZodNumber;
    limit: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    total: number;
    transactions: {
        amount: {
            amount: string;
            currency: string;
        };
        id: string;
        accountId: string;
        bookingDate: string;
        description: string;
        valueDate?: string | undefined;
        raw?: any;
        categoryId?: string | undefined;
        meta?: Record<string, any> | undefined;
    }[];
    page: number;
    limit: number;
}, {
    total: number;
    transactions: {
        amount: {
            amount: string;
            currency: string;
        };
        id: string;
        accountId: string;
        bookingDate: string;
        description: string;
        valueDate?: string | undefined;
        raw?: any;
        categoryId?: string | undefined;
        meta?: Record<string, any> | undefined;
    }[];
    page: number;
    limit: number;
}>;
