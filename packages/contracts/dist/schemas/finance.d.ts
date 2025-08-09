import { z } from 'zod';
export declare const Account: z.ZodObject<{
    id: z.ZodString;
    provider: z.ZodString;
    name: z.ZodString;
    iban: z.ZodOptional<z.ZodString>;
    currency: z.ZodString;
    createdAt: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    id: string;
    name: string;
    currency: string;
    provider: string;
    iban?: string | undefined;
    createdAt?: string | undefined;
}, {
    id: string;
    name: string;
    currency: string;
    provider: string;
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
        currency: string;
        amount: string;
    }, {
        currency: string;
        amount: string;
    }>;
    raw: z.ZodOptional<z.ZodAny>;
    categoryId: z.ZodOptional<z.ZodString>;
    meta: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
}, "strip", z.ZodTypeAny, {
    description: string;
    id: string;
    accountId: string;
    bookingDate: string;
    amount: {
        currency: string;
        amount: string;
    };
    valueDate?: string | undefined;
    raw?: any;
    categoryId?: string | undefined;
    meta?: Record<string, any> | undefined;
}, {
    description: string;
    id: string;
    accountId: string;
    bookingDate: string;
    amount: {
        currency: string;
        amount: string;
    };
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
        id: string;
        name: string;
        currency: string;
        provider: string;
        iban?: string | undefined;
        createdAt?: string | undefined;
    }, {
        id: string;
        name: string;
        currency: string;
        provider: string;
        iban?: string | undefined;
        createdAt?: string | undefined;
    }>, "many">;
    total: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    accounts: {
        id: string;
        name: string;
        currency: string;
        provider: string;
        iban?: string | undefined;
        createdAt?: string | undefined;
    }[];
    total: number;
}, {
    accounts: {
        id: string;
        name: string;
        currency: string;
        provider: string;
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
            currency: string;
            amount: string;
        }, {
            currency: string;
            amount: string;
        }>;
        raw: z.ZodOptional<z.ZodAny>;
        categoryId: z.ZodOptional<z.ZodString>;
        meta: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
    }, "strip", z.ZodTypeAny, {
        description: string;
        id: string;
        accountId: string;
        bookingDate: string;
        amount: {
            currency: string;
            amount: string;
        };
        valueDate?: string | undefined;
        raw?: any;
        categoryId?: string | undefined;
        meta?: Record<string, any> | undefined;
    }, {
        description: string;
        id: string;
        accountId: string;
        bookingDate: string;
        amount: {
            currency: string;
            amount: string;
        };
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
        description: string;
        id: string;
        accountId: string;
        bookingDate: string;
        amount: {
            currency: string;
            amount: string;
        };
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
        description: string;
        id: string;
        accountId: string;
        bookingDate: string;
        amount: {
            currency: string;
            amount: string;
        };
        valueDate?: string | undefined;
        raw?: any;
        categoryId?: string | undefined;
        meta?: Record<string, any> | undefined;
    }[];
    page: number;
    limit: number;
}>;
export type Account = z.infer<typeof Account>;
export type Transaction = z.infer<typeof Transaction>;
export declare const Attachment: z.ZodObject<{
    id: z.ZodString;
    invoiceId: z.ZodString;
    fileName: z.ZodString;
    fileType: z.ZodString;
    fileSize: z.ZodNumber;
    description: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    uploadedBy: z.ZodString;
    uploadedAt: z.ZodString;
}, "strip", z.ZodTypeAny, {
    id: string;
    invoiceId: string;
    fileName: string;
    fileType: string;
    fileSize: number;
    uploadedBy: string;
    uploadedAt: string;
    description?: string | null | undefined;
}, {
    id: string;
    invoiceId: string;
    fileName: string;
    fileType: string;
    fileSize: number;
    uploadedBy: string;
    uploadedAt: string;
    description?: string | null | undefined;
}>;
export declare const AttachmentListResponse: z.ZodObject<{
    attachments: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        invoiceId: z.ZodString;
        fileName: z.ZodString;
        fileType: z.ZodString;
        fileSize: z.ZodNumber;
        description: z.ZodNullable<z.ZodOptional<z.ZodString>>;
        uploadedBy: z.ZodString;
        uploadedAt: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        id: string;
        invoiceId: string;
        fileName: string;
        fileType: string;
        fileSize: number;
        uploadedBy: string;
        uploadedAt: string;
        description?: string | null | undefined;
    }, {
        id: string;
        invoiceId: string;
        fileName: string;
        fileType: string;
        fileSize: number;
        uploadedBy: string;
        uploadedAt: string;
        description?: string | null | undefined;
    }>, "many">;
    total: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    total: number;
    attachments: {
        id: string;
        invoiceId: string;
        fileName: string;
        fileType: string;
        fileSize: number;
        uploadedBy: string;
        uploadedAt: string;
        description?: string | null | undefined;
    }[];
}, {
    total: number;
    attachments: {
        id: string;
        invoiceId: string;
        fileName: string;
        fileType: string;
        fileSize: number;
        uploadedBy: string;
        uploadedAt: string;
        description?: string | null | undefined;
    }[];
}>;
export declare const AttachmentUploadResponse: z.ZodObject<{
    attachment: z.ZodObject<{
        id: z.ZodString;
        invoiceId: z.ZodString;
        fileName: z.ZodString;
        fileType: z.ZodString;
        fileSize: z.ZodNumber;
        description: z.ZodNullable<z.ZodOptional<z.ZodString>>;
        uploadedBy: z.ZodString;
        uploadedAt: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        id: string;
        invoiceId: string;
        fileName: string;
        fileType: string;
        fileSize: number;
        uploadedBy: string;
        uploadedAt: string;
        description?: string | null | undefined;
    }, {
        id: string;
        invoiceId: string;
        fileName: string;
        fileType: string;
        fileSize: number;
        uploadedBy: string;
        uploadedAt: string;
        description?: string | null | undefined;
    }>;
}, "strip", z.ZodTypeAny, {
    attachment: {
        id: string;
        invoiceId: string;
        fileName: string;
        fileType: string;
        fileSize: number;
        uploadedBy: string;
        uploadedAt: string;
        description?: string | null | undefined;
    };
}, {
    attachment: {
        id: string;
        invoiceId: string;
        fileName: string;
        fileType: string;
        fileSize: number;
        uploadedBy: string;
        uploadedAt: string;
        description?: string | null | undefined;
    };
}>;
export type Attachment = z.infer<typeof Attachment>;
export type AttachmentListResponse = z.infer<typeof AttachmentListResponse>;
export type AttachmentUploadResponse = z.infer<typeof AttachmentUploadResponse>;
