import { z } from 'zod';
export declare const invoiceAttachmentContract: {
    getAll: {
        query: z.ZodObject<{
            page: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
            limit: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
            sortBy: z.ZodOptional<z.ZodEnum<["id", "invoiceId", "fileName", "filePath", "fileSize", "fileType", "description", "uploadedBy", "uploadedAt", "isDeleted", "deletedAt", "deletedBy"]>>;
            sortOrder: z.ZodDefault<z.ZodOptional<z.ZodEnum<["asc", "desc"]>>>;
            search: z.ZodOptional<z.ZodString>;
            invoiceId: z.ZodOptional<z.ZodString>;
            fileName: z.ZodOptional<z.ZodString>;
            filePath: z.ZodOptional<z.ZodString>;
            fileSize: z.ZodOptional<z.ZodAny>;
            fileType: z.ZodOptional<z.ZodString>;
            description: z.ZodOptional<z.ZodString>;
            uploadedBy: z.ZodOptional<z.ZodString>;
            uploadedAt: z.ZodOptional<z.ZodAny>;
            isDeleted: z.ZodOptional<z.ZodBoolean>;
            deletedAt: z.ZodOptional<z.ZodAny>;
            deletedBy: z.ZodOptional<z.ZodString>;
            include: z.ZodOptional<z.ZodObject<{}, "strip", z.ZodTypeAny, {}, {}>>;
        }, "strip", z.ZodTypeAny, {
            page: number;
            limit: number;
            sortOrder: "asc" | "desc";
            description?: string | undefined;
            search?: string | undefined;
            sortBy?: "description" | "id" | "invoiceId" | "fileName" | "filePath" | "fileSize" | "fileType" | "uploadedBy" | "uploadedAt" | "isDeleted" | "deletedAt" | "deletedBy" | undefined;
            include?: {} | undefined;
            invoiceId?: string | undefined;
            fileName?: string | undefined;
            filePath?: string | undefined;
            fileSize?: any;
            fileType?: string | undefined;
            uploadedBy?: string | undefined;
            uploadedAt?: any;
            isDeleted?: boolean | undefined;
            deletedAt?: any;
            deletedBy?: string | undefined;
        }, {
            description?: string | undefined;
            search?: string | undefined;
            page?: number | undefined;
            limit?: number | undefined;
            sortBy?: "description" | "id" | "invoiceId" | "fileName" | "filePath" | "fileSize" | "fileType" | "uploadedBy" | "uploadedAt" | "isDeleted" | "deletedAt" | "deletedBy" | undefined;
            sortOrder?: "asc" | "desc" | undefined;
            include?: {} | undefined;
            invoiceId?: string | undefined;
            fileName?: string | undefined;
            filePath?: string | undefined;
            fileSize?: any;
            fileType?: string | undefined;
            uploadedBy?: string | undefined;
            uploadedAt?: any;
            isDeleted?: boolean | undefined;
            deletedAt?: any;
            deletedBy?: string | undefined;
        }>;
        summary: "Get all invoiceattachments with optional filtering and pagination";
        method: "GET";
        path: "/api/financial/invoice-attachments";
        responses: {
            200: z.ZodObject<{
                success: z.ZodLiteral<true>;
                data: z.ZodArray<z.ZodObject<{
                    id: z.ZodString;
                    invoiceId: z.ZodString;
                    fileName: z.ZodString;
                    filePath: z.ZodString;
                    fileSize: z.ZodString;
                    fileType: z.ZodString;
                    description: z.ZodOptional<z.ZodString>;
                    uploadedBy: z.ZodString;
                    uploadedAt: z.ZodEffects<z.ZodUnion<[z.ZodString, z.ZodDate]>, Date, string | Date>;
                    isDeleted: z.ZodBoolean;
                    deletedAt: z.ZodOptional<z.ZodEffects<z.ZodUnion<[z.ZodString, z.ZodDate]>, Date, string | Date>>;
                    deletedBy: z.ZodOptional<z.ZodString>;
                }, "strip", z.ZodTypeAny, {
                    id: string;
                    invoiceId: string;
                    fileName: string;
                    filePath: string;
                    fileSize: string;
                    fileType: string;
                    uploadedBy: string;
                    uploadedAt: Date;
                    isDeleted: boolean;
                    description?: string | undefined;
                    deletedAt?: Date | undefined;
                    deletedBy?: string | undefined;
                }, {
                    id: string;
                    invoiceId: string;
                    fileName: string;
                    filePath: string;
                    fileSize: string;
                    fileType: string;
                    uploadedBy: string;
                    uploadedAt: string | Date;
                    isDeleted: boolean;
                    description?: string | undefined;
                    deletedAt?: string | Date | undefined;
                    deletedBy?: string | undefined;
                }>, "many">;
                pagination: z.ZodObject<{
                    total: z.ZodNumber;
                    page: z.ZodNumber;
                    limit: z.ZodNumber;
                    totalPages: z.ZodNumber;
                }, "strip", z.ZodTypeAny, {
                    total: number;
                    page: number;
                    limit: number;
                    totalPages: number;
                }, {
                    total: number;
                    page: number;
                    limit: number;
                    totalPages: number;
                }>;
            }, "strip", z.ZodTypeAny, {
                success: true;
                data: {
                    id: string;
                    invoiceId: string;
                    fileName: string;
                    filePath: string;
                    fileSize: string;
                    fileType: string;
                    uploadedBy: string;
                    uploadedAt: Date;
                    isDeleted: boolean;
                    description?: string | undefined;
                    deletedAt?: Date | undefined;
                    deletedBy?: string | undefined;
                }[];
                pagination: {
                    total: number;
                    page: number;
                    limit: number;
                    totalPages: number;
                };
            }, {
                success: true;
                data: {
                    id: string;
                    invoiceId: string;
                    fileName: string;
                    filePath: string;
                    fileSize: string;
                    fileType: string;
                    uploadedBy: string;
                    uploadedAt: string | Date;
                    isDeleted: boolean;
                    description?: string | undefined;
                    deletedAt?: string | Date | undefined;
                    deletedBy?: string | undefined;
                }[];
                pagination: {
                    total: number;
                    page: number;
                    limit: number;
                    totalPages: number;
                };
            }>;
            400: z.ZodObject<{
                success: z.ZodLiteral<false>;
                error: z.ZodString;
                details: z.ZodOptional<z.ZodAny>;
            }, "strip", z.ZodTypeAny, {
                success: false;
                error: string;
                details?: any;
            }, {
                success: false;
                error: string;
                details?: any;
            }>;
            500: z.ZodObject<{
                success: z.ZodLiteral<false>;
                error: z.ZodString;
                details: z.ZodOptional<z.ZodAny>;
            }, "strip", z.ZodTypeAny, {
                success: false;
                error: string;
                details?: any;
            }, {
                success: false;
                error: string;
                details?: any;
            }>;
        };
    };
    getById: {
        pathParams: z.ZodObject<{
            id: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            id: string;
        }, {
            id: string;
        }>;
        summary: "Get a invoiceattachment by ID";
        method: "GET";
        path: "/api/financial/invoice-attachments/:id";
        responses: {
            200: z.ZodObject<{
                success: z.ZodLiteral<true>;
                data: z.ZodObject<{
                    id: z.ZodString;
                    invoiceId: z.ZodString;
                    fileName: z.ZodString;
                    filePath: z.ZodString;
                    fileSize: z.ZodString;
                    fileType: z.ZodString;
                    description: z.ZodOptional<z.ZodString>;
                    uploadedBy: z.ZodString;
                    uploadedAt: z.ZodEffects<z.ZodUnion<[z.ZodString, z.ZodDate]>, Date, string | Date>;
                    isDeleted: z.ZodBoolean;
                    deletedAt: z.ZodOptional<z.ZodEffects<z.ZodUnion<[z.ZodString, z.ZodDate]>, Date, string | Date>>;
                    deletedBy: z.ZodOptional<z.ZodString>;
                }, "strip", z.ZodTypeAny, {
                    id: string;
                    invoiceId: string;
                    fileName: string;
                    filePath: string;
                    fileSize: string;
                    fileType: string;
                    uploadedBy: string;
                    uploadedAt: Date;
                    isDeleted: boolean;
                    description?: string | undefined;
                    deletedAt?: Date | undefined;
                    deletedBy?: string | undefined;
                }, {
                    id: string;
                    invoiceId: string;
                    fileName: string;
                    filePath: string;
                    fileSize: string;
                    fileType: string;
                    uploadedBy: string;
                    uploadedAt: string | Date;
                    isDeleted: boolean;
                    description?: string | undefined;
                    deletedAt?: string | Date | undefined;
                    deletedBy?: string | undefined;
                }>;
            }, "strip", z.ZodTypeAny, {
                success: true;
                data: {
                    id: string;
                    invoiceId: string;
                    fileName: string;
                    filePath: string;
                    fileSize: string;
                    fileType: string;
                    uploadedBy: string;
                    uploadedAt: Date;
                    isDeleted: boolean;
                    description?: string | undefined;
                    deletedAt?: Date | undefined;
                    deletedBy?: string | undefined;
                };
            }, {
                success: true;
                data: {
                    id: string;
                    invoiceId: string;
                    fileName: string;
                    filePath: string;
                    fileSize: string;
                    fileType: string;
                    uploadedBy: string;
                    uploadedAt: string | Date;
                    isDeleted: boolean;
                    description?: string | undefined;
                    deletedAt?: string | Date | undefined;
                    deletedBy?: string | undefined;
                };
            }>;
            404: z.ZodObject<{
                success: z.ZodLiteral<false>;
                error: z.ZodString;
                details: z.ZodOptional<z.ZodAny>;
            }, "strip", z.ZodTypeAny, {
                success: false;
                error: string;
                details?: any;
            }, {
                success: false;
                error: string;
                details?: any;
            }>;
            500: z.ZodObject<{
                success: z.ZodLiteral<false>;
                error: z.ZodString;
                details: z.ZodOptional<z.ZodAny>;
            }, "strip", z.ZodTypeAny, {
                success: false;
                error: string;
                details?: any;
            }, {
                success: false;
                error: string;
                details?: any;
            }>;
        };
    };
    create: {
        summary: "Create a new invoiceattachment";
        method: "POST";
        body: z.ZodObject<Omit<{
            id: z.ZodString;
            invoiceId: z.ZodString;
            fileName: z.ZodString;
            filePath: z.ZodString;
            fileSize: z.ZodString;
            fileType: z.ZodString;
            description: z.ZodOptional<z.ZodString>;
            uploadedBy: z.ZodString;
            uploadedAt: z.ZodEffects<z.ZodUnion<[z.ZodString, z.ZodDate]>, Date, string | Date>;
            isDeleted: z.ZodBoolean;
            deletedAt: z.ZodOptional<z.ZodEffects<z.ZodUnion<[z.ZodString, z.ZodDate]>, Date, string | Date>>;
            deletedBy: z.ZodOptional<z.ZodString>;
        }, "id" | "uploadedAt" | "isDeleted">, "strip", z.ZodTypeAny, {
            invoiceId: string;
            fileName: string;
            filePath: string;
            fileSize: string;
            fileType: string;
            uploadedBy: string;
            description?: string | undefined;
            deletedAt?: Date | undefined;
            deletedBy?: string | undefined;
        }, {
            invoiceId: string;
            fileName: string;
            filePath: string;
            fileSize: string;
            fileType: string;
            uploadedBy: string;
            description?: string | undefined;
            deletedAt?: string | Date | undefined;
            deletedBy?: string | undefined;
        }>;
        path: "/api/financial/invoice-attachments";
        responses: {
            201: z.ZodObject<{
                success: z.ZodLiteral<true>;
                data: z.ZodObject<{
                    id: z.ZodString;
                    invoiceId: z.ZodString;
                    fileName: z.ZodString;
                    filePath: z.ZodString;
                    fileSize: z.ZodString;
                    fileType: z.ZodString;
                    description: z.ZodOptional<z.ZodString>;
                    uploadedBy: z.ZodString;
                    uploadedAt: z.ZodEffects<z.ZodUnion<[z.ZodString, z.ZodDate]>, Date, string | Date>;
                    isDeleted: z.ZodBoolean;
                    deletedAt: z.ZodOptional<z.ZodEffects<z.ZodUnion<[z.ZodString, z.ZodDate]>, Date, string | Date>>;
                    deletedBy: z.ZodOptional<z.ZodString>;
                }, "strip", z.ZodTypeAny, {
                    id: string;
                    invoiceId: string;
                    fileName: string;
                    filePath: string;
                    fileSize: string;
                    fileType: string;
                    uploadedBy: string;
                    uploadedAt: Date;
                    isDeleted: boolean;
                    description?: string | undefined;
                    deletedAt?: Date | undefined;
                    deletedBy?: string | undefined;
                }, {
                    id: string;
                    invoiceId: string;
                    fileName: string;
                    filePath: string;
                    fileSize: string;
                    fileType: string;
                    uploadedBy: string;
                    uploadedAt: string | Date;
                    isDeleted: boolean;
                    description?: string | undefined;
                    deletedAt?: string | Date | undefined;
                    deletedBy?: string | undefined;
                }>;
            }, "strip", z.ZodTypeAny, {
                success: true;
                data: {
                    id: string;
                    invoiceId: string;
                    fileName: string;
                    filePath: string;
                    fileSize: string;
                    fileType: string;
                    uploadedBy: string;
                    uploadedAt: Date;
                    isDeleted: boolean;
                    description?: string | undefined;
                    deletedAt?: Date | undefined;
                    deletedBy?: string | undefined;
                };
            }, {
                success: true;
                data: {
                    id: string;
                    invoiceId: string;
                    fileName: string;
                    filePath: string;
                    fileSize: string;
                    fileType: string;
                    uploadedBy: string;
                    uploadedAt: string | Date;
                    isDeleted: boolean;
                    description?: string | undefined;
                    deletedAt?: string | Date | undefined;
                    deletedBy?: string | undefined;
                };
            }>;
            400: z.ZodObject<{
                success: z.ZodLiteral<false>;
                error: z.ZodString;
                details: z.ZodOptional<z.ZodAny>;
            }, "strip", z.ZodTypeAny, {
                success: false;
                error: string;
                details?: any;
            }, {
                success: false;
                error: string;
                details?: any;
            }>;
            500: z.ZodObject<{
                success: z.ZodLiteral<false>;
                error: z.ZodString;
                details: z.ZodOptional<z.ZodAny>;
            }, "strip", z.ZodTypeAny, {
                success: false;
                error: string;
                details?: any;
            }, {
                success: false;
                error: string;
                details?: any;
            }>;
        };
    };
    update: {
        pathParams: z.ZodObject<{
            id: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            id: string;
        }, {
            id: string;
        }>;
        summary: "Update a invoiceattachment";
        method: "PUT";
        body: z.ZodObject<{
            description: z.ZodOptional<z.ZodOptional<z.ZodString>>;
            invoiceId: z.ZodOptional<z.ZodString>;
            fileName: z.ZodOptional<z.ZodString>;
            filePath: z.ZodOptional<z.ZodString>;
            fileSize: z.ZodOptional<z.ZodString>;
            fileType: z.ZodOptional<z.ZodString>;
            uploadedBy: z.ZodOptional<z.ZodString>;
            deletedAt: z.ZodOptional<z.ZodOptional<z.ZodEffects<z.ZodUnion<[z.ZodString, z.ZodDate]>, Date, string | Date>>>;
            deletedBy: z.ZodOptional<z.ZodOptional<z.ZodString>>;
        }, "strip", z.ZodTypeAny, {
            description?: string | undefined;
            invoiceId?: string | undefined;
            fileName?: string | undefined;
            filePath?: string | undefined;
            fileSize?: string | undefined;
            fileType?: string | undefined;
            uploadedBy?: string | undefined;
            deletedAt?: Date | undefined;
            deletedBy?: string | undefined;
        }, {
            description?: string | undefined;
            invoiceId?: string | undefined;
            fileName?: string | undefined;
            filePath?: string | undefined;
            fileSize?: string | undefined;
            fileType?: string | undefined;
            uploadedBy?: string | undefined;
            deletedAt?: string | Date | undefined;
            deletedBy?: string | undefined;
        }>;
        path: "/api/financial/invoice-attachments/:id";
        responses: {
            200: z.ZodObject<{
                success: z.ZodLiteral<true>;
                data: z.ZodObject<{
                    id: z.ZodString;
                    invoiceId: z.ZodString;
                    fileName: z.ZodString;
                    filePath: z.ZodString;
                    fileSize: z.ZodString;
                    fileType: z.ZodString;
                    description: z.ZodOptional<z.ZodString>;
                    uploadedBy: z.ZodString;
                    uploadedAt: z.ZodEffects<z.ZodUnion<[z.ZodString, z.ZodDate]>, Date, string | Date>;
                    isDeleted: z.ZodBoolean;
                    deletedAt: z.ZodOptional<z.ZodEffects<z.ZodUnion<[z.ZodString, z.ZodDate]>, Date, string | Date>>;
                    deletedBy: z.ZodOptional<z.ZodString>;
                }, "strip", z.ZodTypeAny, {
                    id: string;
                    invoiceId: string;
                    fileName: string;
                    filePath: string;
                    fileSize: string;
                    fileType: string;
                    uploadedBy: string;
                    uploadedAt: Date;
                    isDeleted: boolean;
                    description?: string | undefined;
                    deletedAt?: Date | undefined;
                    deletedBy?: string | undefined;
                }, {
                    id: string;
                    invoiceId: string;
                    fileName: string;
                    filePath: string;
                    fileSize: string;
                    fileType: string;
                    uploadedBy: string;
                    uploadedAt: string | Date;
                    isDeleted: boolean;
                    description?: string | undefined;
                    deletedAt?: string | Date | undefined;
                    deletedBy?: string | undefined;
                }>;
            }, "strip", z.ZodTypeAny, {
                success: true;
                data: {
                    id: string;
                    invoiceId: string;
                    fileName: string;
                    filePath: string;
                    fileSize: string;
                    fileType: string;
                    uploadedBy: string;
                    uploadedAt: Date;
                    isDeleted: boolean;
                    description?: string | undefined;
                    deletedAt?: Date | undefined;
                    deletedBy?: string | undefined;
                };
            }, {
                success: true;
                data: {
                    id: string;
                    invoiceId: string;
                    fileName: string;
                    filePath: string;
                    fileSize: string;
                    fileType: string;
                    uploadedBy: string;
                    uploadedAt: string | Date;
                    isDeleted: boolean;
                    description?: string | undefined;
                    deletedAt?: string | Date | undefined;
                    deletedBy?: string | undefined;
                };
            }>;
            404: z.ZodObject<{
                success: z.ZodLiteral<false>;
                error: z.ZodString;
                details: z.ZodOptional<z.ZodAny>;
            }, "strip", z.ZodTypeAny, {
                success: false;
                error: string;
                details?: any;
            }, {
                success: false;
                error: string;
                details?: any;
            }>;
            400: z.ZodObject<{
                success: z.ZodLiteral<false>;
                error: z.ZodString;
                details: z.ZodOptional<z.ZodAny>;
            }, "strip", z.ZodTypeAny, {
                success: false;
                error: string;
                details?: any;
            }, {
                success: false;
                error: string;
                details?: any;
            }>;
            500: z.ZodObject<{
                success: z.ZodLiteral<false>;
                error: z.ZodString;
                details: z.ZodOptional<z.ZodAny>;
            }, "strip", z.ZodTypeAny, {
                success: false;
                error: string;
                details?: any;
            }, {
                success: false;
                error: string;
                details?: any;
            }>;
        };
    };
    delete: {
        pathParams: z.ZodObject<{
            id: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            id: string;
        }, {
            id: string;
        }>;
        summary: "Delete a invoiceattachment";
        method: "DELETE";
        path: "/api/financial/invoice-attachments/:id";
        responses: {
            200: z.ZodObject<{
                success: z.ZodLiteral<true>;
                message: z.ZodOptional<z.ZodString>;
            }, "strip", z.ZodTypeAny, {
                success: true;
                message?: string | undefined;
            }, {
                success: true;
                message?: string | undefined;
            }>;
            404: z.ZodObject<{
                success: z.ZodLiteral<false>;
                error: z.ZodString;
                details: z.ZodOptional<z.ZodAny>;
            }, "strip", z.ZodTypeAny, {
                success: false;
                error: string;
                details?: any;
            }, {
                success: false;
                error: string;
                details?: any;
            }>;
            500: z.ZodObject<{
                success: z.ZodLiteral<false>;
                error: z.ZodString;
                details: z.ZodOptional<z.ZodAny>;
            }, "strip", z.ZodTypeAny, {
                success: false;
                error: string;
                details?: any;
            }, {
                success: false;
                error: string;
                details?: any;
            }>;
        };
    };
    bulkCreate: {
        summary: "Create multiple invoiceattachments";
        method: "POST";
        body: z.ZodObject<{
            data: z.ZodArray<z.ZodObject<Omit<{
                id: z.ZodString;
                invoiceId: z.ZodString;
                fileName: z.ZodString;
                filePath: z.ZodString;
                fileSize: z.ZodString;
                fileType: z.ZodString;
                description: z.ZodOptional<z.ZodString>;
                uploadedBy: z.ZodString;
                uploadedAt: z.ZodEffects<z.ZodUnion<[z.ZodString, z.ZodDate]>, Date, string | Date>;
                isDeleted: z.ZodBoolean;
                deletedAt: z.ZodOptional<z.ZodEffects<z.ZodUnion<[z.ZodString, z.ZodDate]>, Date, string | Date>>;
                deletedBy: z.ZodOptional<z.ZodString>;
            }, "id" | "uploadedAt" | "isDeleted">, "strip", z.ZodTypeAny, {
                invoiceId: string;
                fileName: string;
                filePath: string;
                fileSize: string;
                fileType: string;
                uploadedBy: string;
                description?: string | undefined;
                deletedAt?: Date | undefined;
                deletedBy?: string | undefined;
            }, {
                invoiceId: string;
                fileName: string;
                filePath: string;
                fileSize: string;
                fileType: string;
                uploadedBy: string;
                description?: string | undefined;
                deletedAt?: string | Date | undefined;
                deletedBy?: string | undefined;
            }>, "many">;
        }, "strip", z.ZodTypeAny, {
            data: {
                invoiceId: string;
                fileName: string;
                filePath: string;
                fileSize: string;
                fileType: string;
                uploadedBy: string;
                description?: string | undefined;
                deletedAt?: Date | undefined;
                deletedBy?: string | undefined;
            }[];
        }, {
            data: {
                invoiceId: string;
                fileName: string;
                filePath: string;
                fileSize: string;
                fileType: string;
                uploadedBy: string;
                description?: string | undefined;
                deletedAt?: string | Date | undefined;
                deletedBy?: string | undefined;
            }[];
        }>;
        path: "/api/financial/invoice-attachments/bulk";
        responses: {
            201: z.ZodObject<{
                success: z.ZodLiteral<true>;
                data: z.ZodArray<z.ZodObject<{
                    id: z.ZodString;
                    invoiceId: z.ZodString;
                    fileName: z.ZodString;
                    filePath: z.ZodString;
                    fileSize: z.ZodString;
                    fileType: z.ZodString;
                    description: z.ZodOptional<z.ZodString>;
                    uploadedBy: z.ZodString;
                    uploadedAt: z.ZodEffects<z.ZodUnion<[z.ZodString, z.ZodDate]>, Date, string | Date>;
                    isDeleted: z.ZodBoolean;
                    deletedAt: z.ZodOptional<z.ZodEffects<z.ZodUnion<[z.ZodString, z.ZodDate]>, Date, string | Date>>;
                    deletedBy: z.ZodOptional<z.ZodString>;
                }, "strip", z.ZodTypeAny, {
                    id: string;
                    invoiceId: string;
                    fileName: string;
                    filePath: string;
                    fileSize: string;
                    fileType: string;
                    uploadedBy: string;
                    uploadedAt: Date;
                    isDeleted: boolean;
                    description?: string | undefined;
                    deletedAt?: Date | undefined;
                    deletedBy?: string | undefined;
                }, {
                    id: string;
                    invoiceId: string;
                    fileName: string;
                    filePath: string;
                    fileSize: string;
                    fileType: string;
                    uploadedBy: string;
                    uploadedAt: string | Date;
                    isDeleted: boolean;
                    description?: string | undefined;
                    deletedAt?: string | Date | undefined;
                    deletedBy?: string | undefined;
                }>, "many">;
                count: z.ZodNumber;
            }, "strip", z.ZodTypeAny, {
                success: true;
                data: {
                    id: string;
                    invoiceId: string;
                    fileName: string;
                    filePath: string;
                    fileSize: string;
                    fileType: string;
                    uploadedBy: string;
                    uploadedAt: Date;
                    isDeleted: boolean;
                    description?: string | undefined;
                    deletedAt?: Date | undefined;
                    deletedBy?: string | undefined;
                }[];
                count: number;
            }, {
                success: true;
                data: {
                    id: string;
                    invoiceId: string;
                    fileName: string;
                    filePath: string;
                    fileSize: string;
                    fileType: string;
                    uploadedBy: string;
                    uploadedAt: string | Date;
                    isDeleted: boolean;
                    description?: string | undefined;
                    deletedAt?: string | Date | undefined;
                    deletedBy?: string | undefined;
                }[];
                count: number;
            }>;
            400: z.ZodObject<{
                success: z.ZodLiteral<false>;
                error: z.ZodString;
                details: z.ZodOptional<z.ZodAny>;
            }, "strip", z.ZodTypeAny, {
                success: false;
                error: string;
                details?: any;
            }, {
                success: false;
                error: string;
                details?: any;
            }>;
            500: z.ZodObject<{
                success: z.ZodLiteral<false>;
                error: z.ZodString;
                details: z.ZodOptional<z.ZodAny>;
            }, "strip", z.ZodTypeAny, {
                success: false;
                error: string;
                details?: any;
            }, {
                success: false;
                error: string;
                details?: any;
            }>;
        };
    };
    bulkUpdate: {
        summary: "Update multiple invoiceattachments";
        method: "PUT";
        body: z.ZodObject<{
            where: z.ZodObject<{
                page: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
                limit: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
                sortBy: z.ZodOptional<z.ZodEnum<["id", "invoiceId", "fileName", "filePath", "fileSize", "fileType", "description", "uploadedBy", "uploadedAt", "isDeleted", "deletedAt", "deletedBy"]>>;
                sortOrder: z.ZodDefault<z.ZodOptional<z.ZodEnum<["asc", "desc"]>>>;
                search: z.ZodOptional<z.ZodString>;
                invoiceId: z.ZodOptional<z.ZodString>;
                fileName: z.ZodOptional<z.ZodString>;
                filePath: z.ZodOptional<z.ZodString>;
                fileSize: z.ZodOptional<z.ZodAny>;
                fileType: z.ZodOptional<z.ZodString>;
                description: z.ZodOptional<z.ZodString>;
                uploadedBy: z.ZodOptional<z.ZodString>;
                uploadedAt: z.ZodOptional<z.ZodAny>;
                isDeleted: z.ZodOptional<z.ZodBoolean>;
                deletedAt: z.ZodOptional<z.ZodAny>;
                deletedBy: z.ZodOptional<z.ZodString>;
                include: z.ZodOptional<z.ZodObject<{}, "strip", z.ZodTypeAny, {}, {}>>;
            }, "strip", z.ZodTypeAny, {
                page: number;
                limit: number;
                sortOrder: "asc" | "desc";
                description?: string | undefined;
                search?: string | undefined;
                sortBy?: "description" | "id" | "invoiceId" | "fileName" | "filePath" | "fileSize" | "fileType" | "uploadedBy" | "uploadedAt" | "isDeleted" | "deletedAt" | "deletedBy" | undefined;
                include?: {} | undefined;
                invoiceId?: string | undefined;
                fileName?: string | undefined;
                filePath?: string | undefined;
                fileSize?: any;
                fileType?: string | undefined;
                uploadedBy?: string | undefined;
                uploadedAt?: any;
                isDeleted?: boolean | undefined;
                deletedAt?: any;
                deletedBy?: string | undefined;
            }, {
                description?: string | undefined;
                search?: string | undefined;
                page?: number | undefined;
                limit?: number | undefined;
                sortBy?: "description" | "id" | "invoiceId" | "fileName" | "filePath" | "fileSize" | "fileType" | "uploadedBy" | "uploadedAt" | "isDeleted" | "deletedAt" | "deletedBy" | undefined;
                sortOrder?: "asc" | "desc" | undefined;
                include?: {} | undefined;
                invoiceId?: string | undefined;
                fileName?: string | undefined;
                filePath?: string | undefined;
                fileSize?: any;
                fileType?: string | undefined;
                uploadedBy?: string | undefined;
                uploadedAt?: any;
                isDeleted?: boolean | undefined;
                deletedAt?: any;
                deletedBy?: string | undefined;
            }>;
            data: z.ZodObject<{
                description: z.ZodOptional<z.ZodOptional<z.ZodString>>;
                invoiceId: z.ZodOptional<z.ZodString>;
                fileName: z.ZodOptional<z.ZodString>;
                filePath: z.ZodOptional<z.ZodString>;
                fileSize: z.ZodOptional<z.ZodString>;
                fileType: z.ZodOptional<z.ZodString>;
                uploadedBy: z.ZodOptional<z.ZodString>;
                deletedAt: z.ZodOptional<z.ZodOptional<z.ZodEffects<z.ZodUnion<[z.ZodString, z.ZodDate]>, Date, string | Date>>>;
                deletedBy: z.ZodOptional<z.ZodOptional<z.ZodString>>;
            }, "strip", z.ZodTypeAny, {
                description?: string | undefined;
                invoiceId?: string | undefined;
                fileName?: string | undefined;
                filePath?: string | undefined;
                fileSize?: string | undefined;
                fileType?: string | undefined;
                uploadedBy?: string | undefined;
                deletedAt?: Date | undefined;
                deletedBy?: string | undefined;
            }, {
                description?: string | undefined;
                invoiceId?: string | undefined;
                fileName?: string | undefined;
                filePath?: string | undefined;
                fileSize?: string | undefined;
                fileType?: string | undefined;
                uploadedBy?: string | undefined;
                deletedAt?: string | Date | undefined;
                deletedBy?: string | undefined;
            }>;
        }, "strip", z.ZodTypeAny, {
            data: {
                description?: string | undefined;
                invoiceId?: string | undefined;
                fileName?: string | undefined;
                filePath?: string | undefined;
                fileSize?: string | undefined;
                fileType?: string | undefined;
                uploadedBy?: string | undefined;
                deletedAt?: Date | undefined;
                deletedBy?: string | undefined;
            };
            where: {
                page: number;
                limit: number;
                sortOrder: "asc" | "desc";
                description?: string | undefined;
                search?: string | undefined;
                sortBy?: "description" | "id" | "invoiceId" | "fileName" | "filePath" | "fileSize" | "fileType" | "uploadedBy" | "uploadedAt" | "isDeleted" | "deletedAt" | "deletedBy" | undefined;
                include?: {} | undefined;
                invoiceId?: string | undefined;
                fileName?: string | undefined;
                filePath?: string | undefined;
                fileSize?: any;
                fileType?: string | undefined;
                uploadedBy?: string | undefined;
                uploadedAt?: any;
                isDeleted?: boolean | undefined;
                deletedAt?: any;
                deletedBy?: string | undefined;
            };
        }, {
            data: {
                description?: string | undefined;
                invoiceId?: string | undefined;
                fileName?: string | undefined;
                filePath?: string | undefined;
                fileSize?: string | undefined;
                fileType?: string | undefined;
                uploadedBy?: string | undefined;
                deletedAt?: string | Date | undefined;
                deletedBy?: string | undefined;
            };
            where: {
                description?: string | undefined;
                search?: string | undefined;
                page?: number | undefined;
                limit?: number | undefined;
                sortBy?: "description" | "id" | "invoiceId" | "fileName" | "filePath" | "fileSize" | "fileType" | "uploadedBy" | "uploadedAt" | "isDeleted" | "deletedAt" | "deletedBy" | undefined;
                sortOrder?: "asc" | "desc" | undefined;
                include?: {} | undefined;
                invoiceId?: string | undefined;
                fileName?: string | undefined;
                filePath?: string | undefined;
                fileSize?: any;
                fileType?: string | undefined;
                uploadedBy?: string | undefined;
                uploadedAt?: any;
                isDeleted?: boolean | undefined;
                deletedAt?: any;
                deletedBy?: string | undefined;
            };
        }>;
        path: "/api/financial/invoice-attachments/bulk";
        responses: {
            200: z.ZodObject<{
                success: z.ZodLiteral<true>;
                count: z.ZodNumber;
            }, "strip", z.ZodTypeAny, {
                success: true;
                count: number;
            }, {
                success: true;
                count: number;
            }>;
            400: z.ZodObject<{
                success: z.ZodLiteral<false>;
                error: z.ZodString;
                details: z.ZodOptional<z.ZodAny>;
            }, "strip", z.ZodTypeAny, {
                success: false;
                error: string;
                details?: any;
            }, {
                success: false;
                error: string;
                details?: any;
            }>;
            500: z.ZodObject<{
                success: z.ZodLiteral<false>;
                error: z.ZodString;
                details: z.ZodOptional<z.ZodAny>;
            }, "strip", z.ZodTypeAny, {
                success: false;
                error: string;
                details?: any;
            }, {
                success: false;
                error: string;
                details?: any;
            }>;
        };
    };
    bulkDelete: {
        summary: "Delete multiple invoiceattachments";
        method: "DELETE";
        body: z.ZodObject<{
            ids: z.ZodArray<z.ZodString, "many">;
        }, "strip", z.ZodTypeAny, {
            ids: string[];
        }, {
            ids: string[];
        }>;
        path: "/api/financial/invoice-attachments/bulk";
        responses: {
            200: z.ZodObject<{
                success: z.ZodLiteral<true>;
                count: z.ZodNumber;
            }, "strip", z.ZodTypeAny, {
                success: true;
                count: number;
            }, {
                success: true;
                count: number;
            }>;
            400: z.ZodObject<{
                success: z.ZodLiteral<false>;
                error: z.ZodString;
                details: z.ZodOptional<z.ZodAny>;
            }, "strip", z.ZodTypeAny, {
                success: false;
                error: string;
                details?: any;
            }, {
                success: false;
                error: string;
                details?: any;
            }>;
            500: z.ZodObject<{
                success: z.ZodLiteral<false>;
                error: z.ZodString;
                details: z.ZodOptional<z.ZodAny>;
            }, "strip", z.ZodTypeAny, {
                success: false;
                error: string;
                details?: any;
            }, {
                success: false;
                error: string;
                details?: any;
            }>;
        };
    };
};
//# sourceMappingURL=invoice-attachment.d.ts.map