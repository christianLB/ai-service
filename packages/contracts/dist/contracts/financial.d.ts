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
        };
    };
    listAttachments: {
        pathParams: z.ZodObject<{
            invoiceId: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            invoiceId: string;
        }, {
            invoiceId: string;
        }>;
        query: z.ZodObject<{
            userId: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            userId?: string | undefined;
        }, {
            userId?: string | undefined;
        }>;
        summary: "List attachments for an invoice";
        method: "GET";
        path: "/api/financial/:invoiceId/attachments";
        responses: {
            200: z.ZodObject<{
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
            500: z.ZodObject<{
                error: z.ZodString;
            }, "strip", z.ZodTypeAny, {
                error: string;
            }, {
                error: string;
            }>;
        };
    };
    uploadAttachment: {
        pathParams: z.ZodObject<{
            invoiceId: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            invoiceId: string;
        }, {
            invoiceId: string;
        }>;
        summary: "Upload attachment for an invoice";
        method: "POST";
        contentType: "multipart/form-data";
        body: z.ZodObject<{
            file: z.ZodAny;
            description: z.ZodOptional<z.ZodString>;
            checksum: z.ZodOptional<z.ZodString>;
            userId: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            description?: string | undefined;
            userId?: string | undefined;
            file?: any;
            checksum?: string | undefined;
        }, {
            description?: string | undefined;
            userId?: string | undefined;
            file?: any;
            checksum?: string | undefined;
        }>;
        path: "/api/financial/:invoiceId/attachments";
        responses: {
            201: z.ZodObject<{
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
            400: z.ZodObject<{
                error: z.ZodString;
            }, "strip", z.ZodTypeAny, {
                error: string;
            }, {
                error: string;
            }>;
            500: z.ZodObject<{
                error: z.ZodString;
            }, "strip", z.ZodTypeAny, {
                error: string;
            }, {
                error: string;
            }>;
        };
    };
    downloadAttachment: {
        pathParams: z.ZodObject<{
            id: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            id: string;
        }, {
            id: string;
        }>;
        query: z.ZodObject<{
            userId: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            userId?: string | undefined;
        }, {
            userId?: string | undefined;
        }>;
        summary: "Download attachment by id";
        method: "GET";
        path: "/api/financial/attachment/:id/download";
        responses: {
            200: z.ZodAny;
            404: z.ZodObject<{
                error: z.ZodString;
            }, "strip", z.ZodTypeAny, {
                error: string;
            }, {
                error: string;
            }>;
            500: z.ZodObject<{
                error: z.ZodString;
            }, "strip", z.ZodTypeAny, {
                error: string;
            }, {
                error: string;
            }>;
        };
    };
    health: {
        summary: "Check health status of financial services";
        method: "GET";
        path: "/api/financial/health";
        responses: {
            200: z.ZodObject<{
                success: z.ZodBoolean;
                status: z.ZodEnum<["healthy", "unhealthy", "degraded"]>;
                services: z.ZodObject<{
                    database: z.ZodEnum<["healthy", "degraded", "error", "unknown"]>;
                    gocardless: z.ZodEnum<["healthy", "degraded", "error", "unknown"]>;
                    scheduler: z.ZodEnum<["healthy", "degraded", "error", "unknown"]>;
                }, "strip", z.ZodTypeAny, {
                    database: "unknown" | "healthy" | "degraded" | "error";
                    gocardless: "unknown" | "healthy" | "degraded" | "error";
                    scheduler: "unknown" | "healthy" | "degraded" | "error";
                }, {
                    database: "unknown" | "healthy" | "degraded" | "error";
                    gocardless: "unknown" | "healthy" | "degraded" | "error";
                    scheduler: "unknown" | "healthy" | "degraded" | "error";
                }>;
                timestamp: z.ZodString;
            }, "strip", z.ZodTypeAny, {
                status: "healthy" | "unhealthy" | "degraded";
                success: boolean;
                services: {
                    database: "unknown" | "healthy" | "degraded" | "error";
                    gocardless: "unknown" | "healthy" | "degraded" | "error";
                    scheduler: "unknown" | "healthy" | "degraded" | "error";
                };
                timestamp: string;
            }, {
                status: "healthy" | "unhealthy" | "degraded";
                success: boolean;
                services: {
                    database: "unknown" | "healthy" | "degraded" | "error";
                    gocardless: "unknown" | "healthy" | "degraded" | "error";
                    scheduler: "unknown" | "healthy" | "degraded" | "error";
                };
                timestamp: string;
            }>;
            500: z.ZodObject<{
                error: z.ZodString;
            }, "strip", z.ZodTypeAny, {
                error: string;
            }, {
                error: string;
            }>;
        };
    };
};
