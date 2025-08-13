import { z } from 'zod';
export declare const universalTagContract: {
    getAll: {
        method: "GET";
        query: z.ZodObject<{
            page: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
            limit: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
            sortBy: z.ZodOptional<z.ZodEnum<["id", "code", "name", "description", "entityTypes", "patterns", "rules", "confidence", "embeddingModel", "path", "level", "color", "icon", "isActive", "isSystem", "metadata", "usageCount", "successRate", "lastUsed", "createdAt", "updatedAt", "parentId", "entityTags"]>>;
            sortOrder: z.ZodDefault<z.ZodOptional<z.ZodEnum<["asc", "desc"]>>>;
            search: z.ZodOptional<z.ZodString>;
            code: z.ZodOptional<z.ZodString>;
            name: z.ZodOptional<z.ZodString>;
            description: z.ZodOptional<z.ZodString>;
            entityTypes: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
            patterns: z.ZodOptional<z.ZodAny>;
            rules: z.ZodOptional<z.ZodAny>;
            confidence: z.ZodOptional<z.ZodNumber>;
            embeddingModel: z.ZodOptional<z.ZodString>;
            path: z.ZodOptional<z.ZodString>;
            level: z.ZodOptional<z.ZodNumber>;
            color: z.ZodOptional<z.ZodString>;
            icon: z.ZodOptional<z.ZodString>;
            isActive: z.ZodOptional<z.ZodBoolean>;
            isSystem: z.ZodOptional<z.ZodBoolean>;
            metadata: z.ZodOptional<z.ZodAny>;
            usageCount: z.ZodOptional<z.ZodNumber>;
            successRate: z.ZodOptional<z.ZodNumber>;
            lastUsed: z.ZodOptional<z.ZodAny>;
            createdAt: z.ZodOptional<z.ZodAny>;
            updatedAt: z.ZodOptional<z.ZodAny>;
            parentId: z.ZodOptional<z.ZodString>;
            entityTags: z.ZodOptional<z.ZodAny>;
            include: z.ZodOptional<z.ZodObject<{}, "strip", z.ZodTypeAny, {}, {}>>;
        }, "strip", z.ZodTypeAny, {
            page: number;
            limit: number;
            sortOrder: "asc" | "desc";
            code?: string | undefined;
            path?: string | undefined;
            search?: string | undefined;
            confidence?: number | undefined;
            createdAt?: any;
            updatedAt?: any;
            sortBy?: "code" | "path" | "id" | "confidence" | "createdAt" | "updatedAt" | "metadata" | "description" | "name" | "entityTypes" | "patterns" | "rules" | "embeddingModel" | "level" | "color" | "icon" | "isActive" | "isSystem" | "usageCount" | "successRate" | "lastUsed" | "parentId" | "entityTags" | undefined;
            include?: {} | undefined;
            metadata?: any;
            description?: string | undefined;
            name?: string | undefined;
            entityTypes?: string[] | undefined;
            patterns?: any;
            rules?: any;
            embeddingModel?: string | undefined;
            level?: number | undefined;
            color?: string | undefined;
            icon?: string | undefined;
            isActive?: boolean | undefined;
            isSystem?: boolean | undefined;
            usageCount?: number | undefined;
            successRate?: number | undefined;
            lastUsed?: any;
            parentId?: string | undefined;
            entityTags?: any;
        }, {
            code?: string | undefined;
            path?: string | undefined;
            page?: number | undefined;
            limit?: number | undefined;
            sortOrder?: "asc" | "desc" | undefined;
            search?: string | undefined;
            confidence?: number | undefined;
            createdAt?: any;
            updatedAt?: any;
            sortBy?: "code" | "path" | "id" | "confidence" | "createdAt" | "updatedAt" | "metadata" | "description" | "name" | "entityTypes" | "patterns" | "rules" | "embeddingModel" | "level" | "color" | "icon" | "isActive" | "isSystem" | "usageCount" | "successRate" | "lastUsed" | "parentId" | "entityTags" | undefined;
            include?: {} | undefined;
            metadata?: any;
            description?: string | undefined;
            name?: string | undefined;
            entityTypes?: string[] | undefined;
            patterns?: any;
            rules?: any;
            embeddingModel?: string | undefined;
            level?: number | undefined;
            color?: string | undefined;
            icon?: string | undefined;
            isActive?: boolean | undefined;
            isSystem?: boolean | undefined;
            usageCount?: number | undefined;
            successRate?: number | undefined;
            lastUsed?: any;
            parentId?: string | undefined;
            entityTags?: any;
        }>;
        summary: "Get all universaltags with optional filtering and pagination";
        path: "/api/tagging/universal-tags";
        responses: {
            200: z.ZodObject<{
                success: z.ZodLiteral<true>;
                data: z.ZodArray<z.ZodObject<{
                    id: z.ZodString;
                    code: z.ZodString;
                    name: z.ZodString;
                    description: z.ZodOptional<z.ZodNullable<z.ZodString>>;
                    entityTypes: z.ZodArray<z.ZodString, "many">;
                    patterns: z.ZodOptional<z.ZodAny>;
                    rules: z.ZodOptional<z.ZodAny>;
                    confidence: z.ZodNumber;
                    embeddingModel: z.ZodOptional<z.ZodString>;
                    path: z.ZodString;
                    level: z.ZodNumber;
                    color: z.ZodOptional<z.ZodNullable<z.ZodString>>;
                    icon: z.ZodOptional<z.ZodNullable<z.ZodString>>;
                    isActive: z.ZodBoolean;
                    isSystem: z.ZodBoolean;
                    metadata: z.ZodOptional<z.ZodAny>;
                    usageCount: z.ZodNumber;
                    successRate: z.ZodNumber;
                    lastUsed: z.ZodOptional<z.ZodEffects<z.ZodUnion<[z.ZodString, z.ZodDate]>, Date, string | Date>>;
                    createdAt: z.ZodEffects<z.ZodUnion<[z.ZodString, z.ZodDate]>, Date, string | Date>;
                    updatedAt: z.ZodEffects<z.ZodUnion<[z.ZodString, z.ZodDate]>, Date, string | Date>;
                    parentId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
                    entityTags: z.ZodAny;
                }, "strip", z.ZodTypeAny, {
                    code: string;
                    path: string;
                    id: string;
                    confidence: number;
                    createdAt: Date;
                    updatedAt: Date;
                    name: string;
                    entityTypes: string[];
                    level: number;
                    isActive: boolean;
                    isSystem: boolean;
                    usageCount: number;
                    successRate: number;
                    metadata?: any;
                    description?: string | null | undefined;
                    patterns?: any;
                    rules?: any;
                    embeddingModel?: string | undefined;
                    color?: string | null | undefined;
                    icon?: string | null | undefined;
                    lastUsed?: Date | undefined;
                    parentId?: string | null | undefined;
                    entityTags?: any;
                }, {
                    code: string;
                    path: string;
                    id: string;
                    confidence: number;
                    createdAt: string | Date;
                    updatedAt: string | Date;
                    name: string;
                    entityTypes: string[];
                    level: number;
                    isActive: boolean;
                    isSystem: boolean;
                    usageCount: number;
                    successRate: number;
                    metadata?: any;
                    description?: string | null | undefined;
                    patterns?: any;
                    rules?: any;
                    embeddingModel?: string | undefined;
                    color?: string | null | undefined;
                    icon?: string | null | undefined;
                    lastUsed?: string | Date | undefined;
                    parentId?: string | null | undefined;
                    entityTags?: any;
                }>, "many">;
                pagination: z.ZodObject<{
                    total: z.ZodNumber;
                    page: z.ZodNumber;
                    limit: z.ZodNumber;
                    totalPages: z.ZodNumber;
                }, "strip", z.ZodTypeAny, {
                    page: number;
                    limit: number;
                    total: number;
                    totalPages: number;
                }, {
                    page: number;
                    limit: number;
                    total: number;
                    totalPages: number;
                }>;
            }, "strip", z.ZodTypeAny, {
                success: true;
                data: {
                    code: string;
                    path: string;
                    id: string;
                    confidence: number;
                    createdAt: Date;
                    updatedAt: Date;
                    name: string;
                    entityTypes: string[];
                    level: number;
                    isActive: boolean;
                    isSystem: boolean;
                    usageCount: number;
                    successRate: number;
                    metadata?: any;
                    description?: string | null | undefined;
                    patterns?: any;
                    rules?: any;
                    embeddingModel?: string | undefined;
                    color?: string | null | undefined;
                    icon?: string | null | undefined;
                    lastUsed?: Date | undefined;
                    parentId?: string | null | undefined;
                    entityTags?: any;
                }[];
                pagination: {
                    page: number;
                    limit: number;
                    total: number;
                    totalPages: number;
                };
            }, {
                success: true;
                data: {
                    code: string;
                    path: string;
                    id: string;
                    confidence: number;
                    createdAt: string | Date;
                    updatedAt: string | Date;
                    name: string;
                    entityTypes: string[];
                    level: number;
                    isActive: boolean;
                    isSystem: boolean;
                    usageCount: number;
                    successRate: number;
                    metadata?: any;
                    description?: string | null | undefined;
                    patterns?: any;
                    rules?: any;
                    embeddingModel?: string | undefined;
                    color?: string | null | undefined;
                    icon?: string | null | undefined;
                    lastUsed?: string | Date | undefined;
                    parentId?: string | null | undefined;
                    entityTags?: any;
                }[];
                pagination: {
                    page: number;
                    limit: number;
                    total: number;
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
        method: "GET";
        pathParams: z.ZodObject<{
            id: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            id: string;
        }, {
            id: string;
        }>;
        summary: "Get a universaltag by ID";
        path: "/api/tagging/universal-tags/:id";
        responses: {
            200: z.ZodObject<{
                success: z.ZodLiteral<true>;
                data: z.ZodObject<{
                    id: z.ZodString;
                    code: z.ZodString;
                    name: z.ZodString;
                    description: z.ZodOptional<z.ZodNullable<z.ZodString>>;
                    entityTypes: z.ZodArray<z.ZodString, "many">;
                    patterns: z.ZodOptional<z.ZodAny>;
                    rules: z.ZodOptional<z.ZodAny>;
                    confidence: z.ZodNumber;
                    embeddingModel: z.ZodOptional<z.ZodString>;
                    path: z.ZodString;
                    level: z.ZodNumber;
                    color: z.ZodOptional<z.ZodNullable<z.ZodString>>;
                    icon: z.ZodOptional<z.ZodNullable<z.ZodString>>;
                    isActive: z.ZodBoolean;
                    isSystem: z.ZodBoolean;
                    metadata: z.ZodOptional<z.ZodAny>;
                    usageCount: z.ZodNumber;
                    successRate: z.ZodNumber;
                    lastUsed: z.ZodOptional<z.ZodEffects<z.ZodUnion<[z.ZodString, z.ZodDate]>, Date, string | Date>>;
                    createdAt: z.ZodEffects<z.ZodUnion<[z.ZodString, z.ZodDate]>, Date, string | Date>;
                    updatedAt: z.ZodEffects<z.ZodUnion<[z.ZodString, z.ZodDate]>, Date, string | Date>;
                    parentId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
                    entityTags: z.ZodAny;
                }, "strip", z.ZodTypeAny, {
                    code: string;
                    path: string;
                    id: string;
                    confidence: number;
                    createdAt: Date;
                    updatedAt: Date;
                    name: string;
                    entityTypes: string[];
                    level: number;
                    isActive: boolean;
                    isSystem: boolean;
                    usageCount: number;
                    successRate: number;
                    metadata?: any;
                    description?: string | null | undefined;
                    patterns?: any;
                    rules?: any;
                    embeddingModel?: string | undefined;
                    color?: string | null | undefined;
                    icon?: string | null | undefined;
                    lastUsed?: Date | undefined;
                    parentId?: string | null | undefined;
                    entityTags?: any;
                }, {
                    code: string;
                    path: string;
                    id: string;
                    confidence: number;
                    createdAt: string | Date;
                    updatedAt: string | Date;
                    name: string;
                    entityTypes: string[];
                    level: number;
                    isActive: boolean;
                    isSystem: boolean;
                    usageCount: number;
                    successRate: number;
                    metadata?: any;
                    description?: string | null | undefined;
                    patterns?: any;
                    rules?: any;
                    embeddingModel?: string | undefined;
                    color?: string | null | undefined;
                    icon?: string | null | undefined;
                    lastUsed?: string | Date | undefined;
                    parentId?: string | null | undefined;
                    entityTags?: any;
                }>;
            }, "strip", z.ZodTypeAny, {
                success: true;
                data: {
                    code: string;
                    path: string;
                    id: string;
                    confidence: number;
                    createdAt: Date;
                    updatedAt: Date;
                    name: string;
                    entityTypes: string[];
                    level: number;
                    isActive: boolean;
                    isSystem: boolean;
                    usageCount: number;
                    successRate: number;
                    metadata?: any;
                    description?: string | null | undefined;
                    patterns?: any;
                    rules?: any;
                    embeddingModel?: string | undefined;
                    color?: string | null | undefined;
                    icon?: string | null | undefined;
                    lastUsed?: Date | undefined;
                    parentId?: string | null | undefined;
                    entityTags?: any;
                };
            }, {
                success: true;
                data: {
                    code: string;
                    path: string;
                    id: string;
                    confidence: number;
                    createdAt: string | Date;
                    updatedAt: string | Date;
                    name: string;
                    entityTypes: string[];
                    level: number;
                    isActive: boolean;
                    isSystem: boolean;
                    usageCount: number;
                    successRate: number;
                    metadata?: any;
                    description?: string | null | undefined;
                    patterns?: any;
                    rules?: any;
                    embeddingModel?: string | undefined;
                    color?: string | null | undefined;
                    icon?: string | null | undefined;
                    lastUsed?: string | Date | undefined;
                    parentId?: string | null | undefined;
                    entityTags?: any;
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
        body: z.ZodObject<Omit<{
            id: z.ZodString;
            code: z.ZodString;
            name: z.ZodString;
            description: z.ZodOptional<z.ZodNullable<z.ZodString>>;
            entityTypes: z.ZodArray<z.ZodString, "many">;
            patterns: z.ZodOptional<z.ZodAny>;
            rules: z.ZodOptional<z.ZodAny>;
            confidence: z.ZodNumber;
            embeddingModel: z.ZodOptional<z.ZodString>;
            path: z.ZodString;
            level: z.ZodNumber;
            color: z.ZodOptional<z.ZodNullable<z.ZodString>>;
            icon: z.ZodOptional<z.ZodNullable<z.ZodString>>;
            isActive: z.ZodBoolean;
            isSystem: z.ZodBoolean;
            metadata: z.ZodOptional<z.ZodAny>;
            usageCount: z.ZodNumber;
            successRate: z.ZodNumber;
            lastUsed: z.ZodOptional<z.ZodEffects<z.ZodUnion<[z.ZodString, z.ZodDate]>, Date, string | Date>>;
            createdAt: z.ZodEffects<z.ZodUnion<[z.ZodString, z.ZodDate]>, Date, string | Date>;
            updatedAt: z.ZodEffects<z.ZodUnion<[z.ZodString, z.ZodDate]>, Date, string | Date>;
            parentId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
            entityTags: z.ZodAny;
        }, "id" | "confidence" | "createdAt" | "updatedAt" | "level" | "isActive" | "isSystem" | "usageCount" | "successRate">, "strip", z.ZodTypeAny, {
            code: string;
            path: string;
            name: string;
            entityTypes: string[];
            metadata?: any;
            description?: string | null | undefined;
            patterns?: any;
            rules?: any;
            embeddingModel?: string | undefined;
            color?: string | null | undefined;
            icon?: string | null | undefined;
            lastUsed?: Date | undefined;
            parentId?: string | null | undefined;
            entityTags?: any;
        }, {
            code: string;
            path: string;
            name: string;
            entityTypes: string[];
            metadata?: any;
            description?: string | null | undefined;
            patterns?: any;
            rules?: any;
            embeddingModel?: string | undefined;
            color?: string | null | undefined;
            icon?: string | null | undefined;
            lastUsed?: string | Date | undefined;
            parentId?: string | null | undefined;
            entityTags?: any;
        }>;
        method: "POST";
        summary: "Create a new universaltag";
        path: "/api/tagging/universal-tags";
        responses: {
            201: z.ZodObject<{
                success: z.ZodLiteral<true>;
                data: z.ZodObject<{
                    id: z.ZodString;
                    code: z.ZodString;
                    name: z.ZodString;
                    description: z.ZodOptional<z.ZodNullable<z.ZodString>>;
                    entityTypes: z.ZodArray<z.ZodString, "many">;
                    patterns: z.ZodOptional<z.ZodAny>;
                    rules: z.ZodOptional<z.ZodAny>;
                    confidence: z.ZodNumber;
                    embeddingModel: z.ZodOptional<z.ZodString>;
                    path: z.ZodString;
                    level: z.ZodNumber;
                    color: z.ZodOptional<z.ZodNullable<z.ZodString>>;
                    icon: z.ZodOptional<z.ZodNullable<z.ZodString>>;
                    isActive: z.ZodBoolean;
                    isSystem: z.ZodBoolean;
                    metadata: z.ZodOptional<z.ZodAny>;
                    usageCount: z.ZodNumber;
                    successRate: z.ZodNumber;
                    lastUsed: z.ZodOptional<z.ZodEffects<z.ZodUnion<[z.ZodString, z.ZodDate]>, Date, string | Date>>;
                    createdAt: z.ZodEffects<z.ZodUnion<[z.ZodString, z.ZodDate]>, Date, string | Date>;
                    updatedAt: z.ZodEffects<z.ZodUnion<[z.ZodString, z.ZodDate]>, Date, string | Date>;
                    parentId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
                    entityTags: z.ZodAny;
                }, "strip", z.ZodTypeAny, {
                    code: string;
                    path: string;
                    id: string;
                    confidence: number;
                    createdAt: Date;
                    updatedAt: Date;
                    name: string;
                    entityTypes: string[];
                    level: number;
                    isActive: boolean;
                    isSystem: boolean;
                    usageCount: number;
                    successRate: number;
                    metadata?: any;
                    description?: string | null | undefined;
                    patterns?: any;
                    rules?: any;
                    embeddingModel?: string | undefined;
                    color?: string | null | undefined;
                    icon?: string | null | undefined;
                    lastUsed?: Date | undefined;
                    parentId?: string | null | undefined;
                    entityTags?: any;
                }, {
                    code: string;
                    path: string;
                    id: string;
                    confidence: number;
                    createdAt: string | Date;
                    updatedAt: string | Date;
                    name: string;
                    entityTypes: string[];
                    level: number;
                    isActive: boolean;
                    isSystem: boolean;
                    usageCount: number;
                    successRate: number;
                    metadata?: any;
                    description?: string | null | undefined;
                    patterns?: any;
                    rules?: any;
                    embeddingModel?: string | undefined;
                    color?: string | null | undefined;
                    icon?: string | null | undefined;
                    lastUsed?: string | Date | undefined;
                    parentId?: string | null | undefined;
                    entityTags?: any;
                }>;
            }, "strip", z.ZodTypeAny, {
                success: true;
                data: {
                    code: string;
                    path: string;
                    id: string;
                    confidence: number;
                    createdAt: Date;
                    updatedAt: Date;
                    name: string;
                    entityTypes: string[];
                    level: number;
                    isActive: boolean;
                    isSystem: boolean;
                    usageCount: number;
                    successRate: number;
                    metadata?: any;
                    description?: string | null | undefined;
                    patterns?: any;
                    rules?: any;
                    embeddingModel?: string | undefined;
                    color?: string | null | undefined;
                    icon?: string | null | undefined;
                    lastUsed?: Date | undefined;
                    parentId?: string | null | undefined;
                    entityTags?: any;
                };
            }, {
                success: true;
                data: {
                    code: string;
                    path: string;
                    id: string;
                    confidence: number;
                    createdAt: string | Date;
                    updatedAt: string | Date;
                    name: string;
                    entityTypes: string[];
                    level: number;
                    isActive: boolean;
                    isSystem: boolean;
                    usageCount: number;
                    successRate: number;
                    metadata?: any;
                    description?: string | null | undefined;
                    patterns?: any;
                    rules?: any;
                    embeddingModel?: string | undefined;
                    color?: string | null | undefined;
                    icon?: string | null | undefined;
                    lastUsed?: string | Date | undefined;
                    parentId?: string | null | undefined;
                    entityTags?: any;
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
        body: z.ZodObject<{
            code: z.ZodOptional<z.ZodString>;
            path: z.ZodOptional<z.ZodString>;
            metadata: z.ZodOptional<z.ZodOptional<z.ZodAny>>;
            description: z.ZodOptional<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
            name: z.ZodOptional<z.ZodString>;
            entityTypes: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
            patterns: z.ZodOptional<z.ZodOptional<z.ZodAny>>;
            rules: z.ZodOptional<z.ZodOptional<z.ZodAny>>;
            embeddingModel: z.ZodOptional<z.ZodOptional<z.ZodString>>;
            color: z.ZodOptional<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
            icon: z.ZodOptional<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
            lastUsed: z.ZodOptional<z.ZodOptional<z.ZodEffects<z.ZodUnion<[z.ZodString, z.ZodDate]>, Date, string | Date>>>;
            parentId: z.ZodOptional<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
            entityTags: z.ZodOptional<z.ZodAny>;
        }, "strip", z.ZodTypeAny, {
            code?: string | undefined;
            path?: string | undefined;
            metadata?: any;
            description?: string | null | undefined;
            name?: string | undefined;
            entityTypes?: string[] | undefined;
            patterns?: any;
            rules?: any;
            embeddingModel?: string | undefined;
            color?: string | null | undefined;
            icon?: string | null | undefined;
            lastUsed?: Date | undefined;
            parentId?: string | null | undefined;
            entityTags?: any;
        }, {
            code?: string | undefined;
            path?: string | undefined;
            metadata?: any;
            description?: string | null | undefined;
            name?: string | undefined;
            entityTypes?: string[] | undefined;
            patterns?: any;
            rules?: any;
            embeddingModel?: string | undefined;
            color?: string | null | undefined;
            icon?: string | null | undefined;
            lastUsed?: string | Date | undefined;
            parentId?: string | null | undefined;
            entityTags?: any;
        }>;
        method: "PUT";
        pathParams: z.ZodObject<{
            id: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            id: string;
        }, {
            id: string;
        }>;
        summary: "Update a universaltag";
        path: "/api/tagging/universal-tags/:id";
        responses: {
            200: z.ZodObject<{
                success: z.ZodLiteral<true>;
                data: z.ZodObject<{
                    id: z.ZodString;
                    code: z.ZodString;
                    name: z.ZodString;
                    description: z.ZodOptional<z.ZodNullable<z.ZodString>>;
                    entityTypes: z.ZodArray<z.ZodString, "many">;
                    patterns: z.ZodOptional<z.ZodAny>;
                    rules: z.ZodOptional<z.ZodAny>;
                    confidence: z.ZodNumber;
                    embeddingModel: z.ZodOptional<z.ZodString>;
                    path: z.ZodString;
                    level: z.ZodNumber;
                    color: z.ZodOptional<z.ZodNullable<z.ZodString>>;
                    icon: z.ZodOptional<z.ZodNullable<z.ZodString>>;
                    isActive: z.ZodBoolean;
                    isSystem: z.ZodBoolean;
                    metadata: z.ZodOptional<z.ZodAny>;
                    usageCount: z.ZodNumber;
                    successRate: z.ZodNumber;
                    lastUsed: z.ZodOptional<z.ZodEffects<z.ZodUnion<[z.ZodString, z.ZodDate]>, Date, string | Date>>;
                    createdAt: z.ZodEffects<z.ZodUnion<[z.ZodString, z.ZodDate]>, Date, string | Date>;
                    updatedAt: z.ZodEffects<z.ZodUnion<[z.ZodString, z.ZodDate]>, Date, string | Date>;
                    parentId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
                    entityTags: z.ZodAny;
                }, "strip", z.ZodTypeAny, {
                    code: string;
                    path: string;
                    id: string;
                    confidence: number;
                    createdAt: Date;
                    updatedAt: Date;
                    name: string;
                    entityTypes: string[];
                    level: number;
                    isActive: boolean;
                    isSystem: boolean;
                    usageCount: number;
                    successRate: number;
                    metadata?: any;
                    description?: string | null | undefined;
                    patterns?: any;
                    rules?: any;
                    embeddingModel?: string | undefined;
                    color?: string | null | undefined;
                    icon?: string | null | undefined;
                    lastUsed?: Date | undefined;
                    parentId?: string | null | undefined;
                    entityTags?: any;
                }, {
                    code: string;
                    path: string;
                    id: string;
                    confidence: number;
                    createdAt: string | Date;
                    updatedAt: string | Date;
                    name: string;
                    entityTypes: string[];
                    level: number;
                    isActive: boolean;
                    isSystem: boolean;
                    usageCount: number;
                    successRate: number;
                    metadata?: any;
                    description?: string | null | undefined;
                    patterns?: any;
                    rules?: any;
                    embeddingModel?: string | undefined;
                    color?: string | null | undefined;
                    icon?: string | null | undefined;
                    lastUsed?: string | Date | undefined;
                    parentId?: string | null | undefined;
                    entityTags?: any;
                }>;
            }, "strip", z.ZodTypeAny, {
                success: true;
                data: {
                    code: string;
                    path: string;
                    id: string;
                    confidence: number;
                    createdAt: Date;
                    updatedAt: Date;
                    name: string;
                    entityTypes: string[];
                    level: number;
                    isActive: boolean;
                    isSystem: boolean;
                    usageCount: number;
                    successRate: number;
                    metadata?: any;
                    description?: string | null | undefined;
                    patterns?: any;
                    rules?: any;
                    embeddingModel?: string | undefined;
                    color?: string | null | undefined;
                    icon?: string | null | undefined;
                    lastUsed?: Date | undefined;
                    parentId?: string | null | undefined;
                    entityTags?: any;
                };
            }, {
                success: true;
                data: {
                    code: string;
                    path: string;
                    id: string;
                    confidence: number;
                    createdAt: string | Date;
                    updatedAt: string | Date;
                    name: string;
                    entityTypes: string[];
                    level: number;
                    isActive: boolean;
                    isSystem: boolean;
                    usageCount: number;
                    successRate: number;
                    metadata?: any;
                    description?: string | null | undefined;
                    patterns?: any;
                    rules?: any;
                    embeddingModel?: string | undefined;
                    color?: string | null | undefined;
                    icon?: string | null | undefined;
                    lastUsed?: string | Date | undefined;
                    parentId?: string | null | undefined;
                    entityTags?: any;
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
        method: "DELETE";
        pathParams: z.ZodObject<{
            id: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            id: string;
        }, {
            id: string;
        }>;
        summary: "Delete a universaltag";
        path: "/api/tagging/universal-tags/:id";
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
        body: z.ZodObject<{
            data: z.ZodArray<z.ZodObject<Omit<{
                id: z.ZodString;
                code: z.ZodString;
                name: z.ZodString;
                description: z.ZodOptional<z.ZodNullable<z.ZodString>>;
                entityTypes: z.ZodArray<z.ZodString, "many">;
                patterns: z.ZodOptional<z.ZodAny>;
                rules: z.ZodOptional<z.ZodAny>;
                confidence: z.ZodNumber;
                embeddingModel: z.ZodOptional<z.ZodString>;
                path: z.ZodString;
                level: z.ZodNumber;
                color: z.ZodOptional<z.ZodNullable<z.ZodString>>;
                icon: z.ZodOptional<z.ZodNullable<z.ZodString>>;
                isActive: z.ZodBoolean;
                isSystem: z.ZodBoolean;
                metadata: z.ZodOptional<z.ZodAny>;
                usageCount: z.ZodNumber;
                successRate: z.ZodNumber;
                lastUsed: z.ZodOptional<z.ZodEffects<z.ZodUnion<[z.ZodString, z.ZodDate]>, Date, string | Date>>;
                createdAt: z.ZodEffects<z.ZodUnion<[z.ZodString, z.ZodDate]>, Date, string | Date>;
                updatedAt: z.ZodEffects<z.ZodUnion<[z.ZodString, z.ZodDate]>, Date, string | Date>;
                parentId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
                entityTags: z.ZodAny;
            }, "id" | "confidence" | "createdAt" | "updatedAt" | "level" | "isActive" | "isSystem" | "usageCount" | "successRate">, "strip", z.ZodTypeAny, {
                code: string;
                path: string;
                name: string;
                entityTypes: string[];
                metadata?: any;
                description?: string | null | undefined;
                patterns?: any;
                rules?: any;
                embeddingModel?: string | undefined;
                color?: string | null | undefined;
                icon?: string | null | undefined;
                lastUsed?: Date | undefined;
                parentId?: string | null | undefined;
                entityTags?: any;
            }, {
                code: string;
                path: string;
                name: string;
                entityTypes: string[];
                metadata?: any;
                description?: string | null | undefined;
                patterns?: any;
                rules?: any;
                embeddingModel?: string | undefined;
                color?: string | null | undefined;
                icon?: string | null | undefined;
                lastUsed?: string | Date | undefined;
                parentId?: string | null | undefined;
                entityTags?: any;
            }>, "many">;
        }, "strip", z.ZodTypeAny, {
            data: {
                code: string;
                path: string;
                name: string;
                entityTypes: string[];
                metadata?: any;
                description?: string | null | undefined;
                patterns?: any;
                rules?: any;
                embeddingModel?: string | undefined;
                color?: string | null | undefined;
                icon?: string | null | undefined;
                lastUsed?: Date | undefined;
                parentId?: string | null | undefined;
                entityTags?: any;
            }[];
        }, {
            data: {
                code: string;
                path: string;
                name: string;
                entityTypes: string[];
                metadata?: any;
                description?: string | null | undefined;
                patterns?: any;
                rules?: any;
                embeddingModel?: string | undefined;
                color?: string | null | undefined;
                icon?: string | null | undefined;
                lastUsed?: string | Date | undefined;
                parentId?: string | null | undefined;
                entityTags?: any;
            }[];
        }>;
        method: "POST";
        summary: "Create multiple universaltags";
        path: "/api/tagging/universal-tags/bulk";
        responses: {
            201: z.ZodObject<{
                success: z.ZodLiteral<true>;
                data: z.ZodArray<z.ZodObject<{
                    id: z.ZodString;
                    code: z.ZodString;
                    name: z.ZodString;
                    description: z.ZodOptional<z.ZodNullable<z.ZodString>>;
                    entityTypes: z.ZodArray<z.ZodString, "many">;
                    patterns: z.ZodOptional<z.ZodAny>;
                    rules: z.ZodOptional<z.ZodAny>;
                    confidence: z.ZodNumber;
                    embeddingModel: z.ZodOptional<z.ZodString>;
                    path: z.ZodString;
                    level: z.ZodNumber;
                    color: z.ZodOptional<z.ZodNullable<z.ZodString>>;
                    icon: z.ZodOptional<z.ZodNullable<z.ZodString>>;
                    isActive: z.ZodBoolean;
                    isSystem: z.ZodBoolean;
                    metadata: z.ZodOptional<z.ZodAny>;
                    usageCount: z.ZodNumber;
                    successRate: z.ZodNumber;
                    lastUsed: z.ZodOptional<z.ZodEffects<z.ZodUnion<[z.ZodString, z.ZodDate]>, Date, string | Date>>;
                    createdAt: z.ZodEffects<z.ZodUnion<[z.ZodString, z.ZodDate]>, Date, string | Date>;
                    updatedAt: z.ZodEffects<z.ZodUnion<[z.ZodString, z.ZodDate]>, Date, string | Date>;
                    parentId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
                    entityTags: z.ZodAny;
                }, "strip", z.ZodTypeAny, {
                    code: string;
                    path: string;
                    id: string;
                    confidence: number;
                    createdAt: Date;
                    updatedAt: Date;
                    name: string;
                    entityTypes: string[];
                    level: number;
                    isActive: boolean;
                    isSystem: boolean;
                    usageCount: number;
                    successRate: number;
                    metadata?: any;
                    description?: string | null | undefined;
                    patterns?: any;
                    rules?: any;
                    embeddingModel?: string | undefined;
                    color?: string | null | undefined;
                    icon?: string | null | undefined;
                    lastUsed?: Date | undefined;
                    parentId?: string | null | undefined;
                    entityTags?: any;
                }, {
                    code: string;
                    path: string;
                    id: string;
                    confidence: number;
                    createdAt: string | Date;
                    updatedAt: string | Date;
                    name: string;
                    entityTypes: string[];
                    level: number;
                    isActive: boolean;
                    isSystem: boolean;
                    usageCount: number;
                    successRate: number;
                    metadata?: any;
                    description?: string | null | undefined;
                    patterns?: any;
                    rules?: any;
                    embeddingModel?: string | undefined;
                    color?: string | null | undefined;
                    icon?: string | null | undefined;
                    lastUsed?: string | Date | undefined;
                    parentId?: string | null | undefined;
                    entityTags?: any;
                }>, "many">;
                count: z.ZodNumber;
            }, "strip", z.ZodTypeAny, {
                success: true;
                data: {
                    code: string;
                    path: string;
                    id: string;
                    confidence: number;
                    createdAt: Date;
                    updatedAt: Date;
                    name: string;
                    entityTypes: string[];
                    level: number;
                    isActive: boolean;
                    isSystem: boolean;
                    usageCount: number;
                    successRate: number;
                    metadata?: any;
                    description?: string | null | undefined;
                    patterns?: any;
                    rules?: any;
                    embeddingModel?: string | undefined;
                    color?: string | null | undefined;
                    icon?: string | null | undefined;
                    lastUsed?: Date | undefined;
                    parentId?: string | null | undefined;
                    entityTags?: any;
                }[];
                count: number;
            }, {
                success: true;
                data: {
                    code: string;
                    path: string;
                    id: string;
                    confidence: number;
                    createdAt: string | Date;
                    updatedAt: string | Date;
                    name: string;
                    entityTypes: string[];
                    level: number;
                    isActive: boolean;
                    isSystem: boolean;
                    usageCount: number;
                    successRate: number;
                    metadata?: any;
                    description?: string | null | undefined;
                    patterns?: any;
                    rules?: any;
                    embeddingModel?: string | undefined;
                    color?: string | null | undefined;
                    icon?: string | null | undefined;
                    lastUsed?: string | Date | undefined;
                    parentId?: string | null | undefined;
                    entityTags?: any;
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
        body: z.ZodObject<{
            where: z.ZodObject<{
                page: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
                limit: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
                sortBy: z.ZodOptional<z.ZodEnum<["id", "code", "name", "description", "entityTypes", "patterns", "rules", "confidence", "embeddingModel", "path", "level", "color", "icon", "isActive", "isSystem", "metadata", "usageCount", "successRate", "lastUsed", "createdAt", "updatedAt", "parentId", "entityTags"]>>;
                sortOrder: z.ZodDefault<z.ZodOptional<z.ZodEnum<["asc", "desc"]>>>;
                search: z.ZodOptional<z.ZodString>;
                code: z.ZodOptional<z.ZodString>;
                name: z.ZodOptional<z.ZodString>;
                description: z.ZodOptional<z.ZodString>;
                entityTypes: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
                patterns: z.ZodOptional<z.ZodAny>;
                rules: z.ZodOptional<z.ZodAny>;
                confidence: z.ZodOptional<z.ZodNumber>;
                embeddingModel: z.ZodOptional<z.ZodString>;
                path: z.ZodOptional<z.ZodString>;
                level: z.ZodOptional<z.ZodNumber>;
                color: z.ZodOptional<z.ZodString>;
                icon: z.ZodOptional<z.ZodString>;
                isActive: z.ZodOptional<z.ZodBoolean>;
                isSystem: z.ZodOptional<z.ZodBoolean>;
                metadata: z.ZodOptional<z.ZodAny>;
                usageCount: z.ZodOptional<z.ZodNumber>;
                successRate: z.ZodOptional<z.ZodNumber>;
                lastUsed: z.ZodOptional<z.ZodAny>;
                createdAt: z.ZodOptional<z.ZodAny>;
                updatedAt: z.ZodOptional<z.ZodAny>;
                parentId: z.ZodOptional<z.ZodString>;
                entityTags: z.ZodOptional<z.ZodAny>;
                include: z.ZodOptional<z.ZodObject<{}, "strip", z.ZodTypeAny, {}, {}>>;
            }, "strip", z.ZodTypeAny, {
                page: number;
                limit: number;
                sortOrder: "asc" | "desc";
                code?: string | undefined;
                path?: string | undefined;
                search?: string | undefined;
                confidence?: number | undefined;
                createdAt?: any;
                updatedAt?: any;
                sortBy?: "code" | "path" | "id" | "confidence" | "createdAt" | "updatedAt" | "metadata" | "description" | "name" | "entityTypes" | "patterns" | "rules" | "embeddingModel" | "level" | "color" | "icon" | "isActive" | "isSystem" | "usageCount" | "successRate" | "lastUsed" | "parentId" | "entityTags" | undefined;
                include?: {} | undefined;
                metadata?: any;
                description?: string | undefined;
                name?: string | undefined;
                entityTypes?: string[] | undefined;
                patterns?: any;
                rules?: any;
                embeddingModel?: string | undefined;
                level?: number | undefined;
                color?: string | undefined;
                icon?: string | undefined;
                isActive?: boolean | undefined;
                isSystem?: boolean | undefined;
                usageCount?: number | undefined;
                successRate?: number | undefined;
                lastUsed?: any;
                parentId?: string | undefined;
                entityTags?: any;
            }, {
                code?: string | undefined;
                path?: string | undefined;
                page?: number | undefined;
                limit?: number | undefined;
                sortOrder?: "asc" | "desc" | undefined;
                search?: string | undefined;
                confidence?: number | undefined;
                createdAt?: any;
                updatedAt?: any;
                sortBy?: "code" | "path" | "id" | "confidence" | "createdAt" | "updatedAt" | "metadata" | "description" | "name" | "entityTypes" | "patterns" | "rules" | "embeddingModel" | "level" | "color" | "icon" | "isActive" | "isSystem" | "usageCount" | "successRate" | "lastUsed" | "parentId" | "entityTags" | undefined;
                include?: {} | undefined;
                metadata?: any;
                description?: string | undefined;
                name?: string | undefined;
                entityTypes?: string[] | undefined;
                patterns?: any;
                rules?: any;
                embeddingModel?: string | undefined;
                level?: number | undefined;
                color?: string | undefined;
                icon?: string | undefined;
                isActive?: boolean | undefined;
                isSystem?: boolean | undefined;
                usageCount?: number | undefined;
                successRate?: number | undefined;
                lastUsed?: any;
                parentId?: string | undefined;
                entityTags?: any;
            }>;
            data: z.ZodObject<{
                code: z.ZodOptional<z.ZodString>;
                path: z.ZodOptional<z.ZodString>;
                metadata: z.ZodOptional<z.ZodOptional<z.ZodAny>>;
                description: z.ZodOptional<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
                name: z.ZodOptional<z.ZodString>;
                entityTypes: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
                patterns: z.ZodOptional<z.ZodOptional<z.ZodAny>>;
                rules: z.ZodOptional<z.ZodOptional<z.ZodAny>>;
                embeddingModel: z.ZodOptional<z.ZodOptional<z.ZodString>>;
                color: z.ZodOptional<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
                icon: z.ZodOptional<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
                lastUsed: z.ZodOptional<z.ZodOptional<z.ZodEffects<z.ZodUnion<[z.ZodString, z.ZodDate]>, Date, string | Date>>>;
                parentId: z.ZodOptional<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
                entityTags: z.ZodOptional<z.ZodAny>;
            }, "strip", z.ZodTypeAny, {
                code?: string | undefined;
                path?: string | undefined;
                metadata?: any;
                description?: string | null | undefined;
                name?: string | undefined;
                entityTypes?: string[] | undefined;
                patterns?: any;
                rules?: any;
                embeddingModel?: string | undefined;
                color?: string | null | undefined;
                icon?: string | null | undefined;
                lastUsed?: Date | undefined;
                parentId?: string | null | undefined;
                entityTags?: any;
            }, {
                code?: string | undefined;
                path?: string | undefined;
                metadata?: any;
                description?: string | null | undefined;
                name?: string | undefined;
                entityTypes?: string[] | undefined;
                patterns?: any;
                rules?: any;
                embeddingModel?: string | undefined;
                color?: string | null | undefined;
                icon?: string | null | undefined;
                lastUsed?: string | Date | undefined;
                parentId?: string | null | undefined;
                entityTags?: any;
            }>;
        }, "strip", z.ZodTypeAny, {
            data: {
                code?: string | undefined;
                path?: string | undefined;
                metadata?: any;
                description?: string | null | undefined;
                name?: string | undefined;
                entityTypes?: string[] | undefined;
                patterns?: any;
                rules?: any;
                embeddingModel?: string | undefined;
                color?: string | null | undefined;
                icon?: string | null | undefined;
                lastUsed?: Date | undefined;
                parentId?: string | null | undefined;
                entityTags?: any;
            };
            where: {
                page: number;
                limit: number;
                sortOrder: "asc" | "desc";
                code?: string | undefined;
                path?: string | undefined;
                search?: string | undefined;
                confidence?: number | undefined;
                createdAt?: any;
                updatedAt?: any;
                sortBy?: "code" | "path" | "id" | "confidence" | "createdAt" | "updatedAt" | "metadata" | "description" | "name" | "entityTypes" | "patterns" | "rules" | "embeddingModel" | "level" | "color" | "icon" | "isActive" | "isSystem" | "usageCount" | "successRate" | "lastUsed" | "parentId" | "entityTags" | undefined;
                include?: {} | undefined;
                metadata?: any;
                description?: string | undefined;
                name?: string | undefined;
                entityTypes?: string[] | undefined;
                patterns?: any;
                rules?: any;
                embeddingModel?: string | undefined;
                level?: number | undefined;
                color?: string | undefined;
                icon?: string | undefined;
                isActive?: boolean | undefined;
                isSystem?: boolean | undefined;
                usageCount?: number | undefined;
                successRate?: number | undefined;
                lastUsed?: any;
                parentId?: string | undefined;
                entityTags?: any;
            };
        }, {
            data: {
                code?: string | undefined;
                path?: string | undefined;
                metadata?: any;
                description?: string | null | undefined;
                name?: string | undefined;
                entityTypes?: string[] | undefined;
                patterns?: any;
                rules?: any;
                embeddingModel?: string | undefined;
                color?: string | null | undefined;
                icon?: string | null | undefined;
                lastUsed?: string | Date | undefined;
                parentId?: string | null | undefined;
                entityTags?: any;
            };
            where: {
                code?: string | undefined;
                path?: string | undefined;
                page?: number | undefined;
                limit?: number | undefined;
                sortOrder?: "asc" | "desc" | undefined;
                search?: string | undefined;
                confidence?: number | undefined;
                createdAt?: any;
                updatedAt?: any;
                sortBy?: "code" | "path" | "id" | "confidence" | "createdAt" | "updatedAt" | "metadata" | "description" | "name" | "entityTypes" | "patterns" | "rules" | "embeddingModel" | "level" | "color" | "icon" | "isActive" | "isSystem" | "usageCount" | "successRate" | "lastUsed" | "parentId" | "entityTags" | undefined;
                include?: {} | undefined;
                metadata?: any;
                description?: string | undefined;
                name?: string | undefined;
                entityTypes?: string[] | undefined;
                patterns?: any;
                rules?: any;
                embeddingModel?: string | undefined;
                level?: number | undefined;
                color?: string | undefined;
                icon?: string | undefined;
                isActive?: boolean | undefined;
                isSystem?: boolean | undefined;
                usageCount?: number | undefined;
                successRate?: number | undefined;
                lastUsed?: any;
                parentId?: string | undefined;
                entityTags?: any;
            };
        }>;
        method: "PUT";
        summary: "Update multiple universaltags";
        path: "/api/tagging/universal-tags/bulk";
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
        body: z.ZodObject<{
            ids: z.ZodArray<z.ZodString, "many">;
        }, "strip", z.ZodTypeAny, {
            ids: string[];
        }, {
            ids: string[];
        }>;
        method: "DELETE";
        summary: "Delete multiple universaltags";
        path: "/api/tagging/universal-tags/bulk";
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
//# sourceMappingURL=universal-tag.d.ts.map