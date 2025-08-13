import { z } from 'zod';
export declare const entityTagContract: {
    getAll: {
        method: "GET";
        query: z.ZodObject<{
            page: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
            limit: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
            sortBy: z.ZodOptional<z.ZodEnum<["id", "entityType", "entityId", "method", "confidence", "appliedBy", "aiProvider", "aiModel", "aiResponse", "aiReasoning", "isVerified", "verifiedBy", "verifiedAt", "feedback", "isCorrect", "sourceEntityType", "sourceEntityId", "relationshipType", "createdAt", "updatedAt", "tagId"]>>;
            sortOrder: z.ZodDefault<z.ZodOptional<z.ZodEnum<["asc", "desc"]>>>;
            search: z.ZodOptional<z.ZodString>;
            entityType: z.ZodOptional<z.ZodString>;
            entityId: z.ZodOptional<z.ZodString>;
            method: z.ZodOptional<z.ZodString>;
            confidence: z.ZodOptional<z.ZodNumber>;
            appliedBy: z.ZodOptional<z.ZodString>;
            aiProvider: z.ZodOptional<z.ZodString>;
            aiModel: z.ZodOptional<z.ZodString>;
            aiResponse: z.ZodOptional<z.ZodAny>;
            aiReasoning: z.ZodOptional<z.ZodString>;
            isVerified: z.ZodOptional<z.ZodBoolean>;
            verifiedBy: z.ZodOptional<z.ZodString>;
            verifiedAt: z.ZodOptional<z.ZodAny>;
            feedback: z.ZodOptional<z.ZodString>;
            isCorrect: z.ZodOptional<z.ZodBoolean>;
            sourceEntityType: z.ZodOptional<z.ZodString>;
            sourceEntityId: z.ZodOptional<z.ZodString>;
            relationshipType: z.ZodOptional<z.ZodString>;
            createdAt: z.ZodOptional<z.ZodAny>;
            updatedAt: z.ZodOptional<z.ZodAny>;
            tagId: z.ZodOptional<z.ZodString>;
            include: z.ZodOptional<z.ZodObject<{}, "strip", z.ZodTypeAny, {}, {}>>;
        }, "strip", z.ZodTypeAny, {
            page: number;
            limit: number;
            sortOrder: "asc" | "desc";
            search?: string | undefined;
            method?: string | undefined;
            entityType?: string | undefined;
            entityId?: string | undefined;
            confidence?: number | undefined;
            appliedBy?: string | undefined;
            aiProvider?: string | undefined;
            aiModel?: string | undefined;
            aiResponse?: any;
            aiReasoning?: string | undefined;
            isVerified?: boolean | undefined;
            verifiedBy?: string | undefined;
            verifiedAt?: any;
            feedback?: string | undefined;
            isCorrect?: boolean | undefined;
            sourceEntityType?: string | undefined;
            sourceEntityId?: string | undefined;
            relationshipType?: string | undefined;
            createdAt?: any;
            updatedAt?: any;
            tagId?: string | undefined;
            sortBy?: "method" | "id" | "entityType" | "entityId" | "confidence" | "appliedBy" | "aiProvider" | "aiModel" | "aiResponse" | "aiReasoning" | "isVerified" | "verifiedBy" | "verifiedAt" | "feedback" | "isCorrect" | "sourceEntityType" | "sourceEntityId" | "relationshipType" | "createdAt" | "updatedAt" | "tagId" | undefined;
            include?: {} | undefined;
        }, {
            page?: number | undefined;
            limit?: number | undefined;
            sortOrder?: "asc" | "desc" | undefined;
            search?: string | undefined;
            method?: string | undefined;
            entityType?: string | undefined;
            entityId?: string | undefined;
            confidence?: number | undefined;
            appliedBy?: string | undefined;
            aiProvider?: string | undefined;
            aiModel?: string | undefined;
            aiResponse?: any;
            aiReasoning?: string | undefined;
            isVerified?: boolean | undefined;
            verifiedBy?: string | undefined;
            verifiedAt?: any;
            feedback?: string | undefined;
            isCorrect?: boolean | undefined;
            sourceEntityType?: string | undefined;
            sourceEntityId?: string | undefined;
            relationshipType?: string | undefined;
            createdAt?: any;
            updatedAt?: any;
            tagId?: string | undefined;
            sortBy?: "method" | "id" | "entityType" | "entityId" | "confidence" | "appliedBy" | "aiProvider" | "aiModel" | "aiResponse" | "aiReasoning" | "isVerified" | "verifiedBy" | "verifiedAt" | "feedback" | "isCorrect" | "sourceEntityType" | "sourceEntityId" | "relationshipType" | "createdAt" | "updatedAt" | "tagId" | undefined;
            include?: {} | undefined;
        }>;
        summary: "Get all entitytags with optional filtering and pagination";
        path: "/api/tagging/entity-tags";
        responses: {
            200: z.ZodObject<{
                success: z.ZodLiteral<true>;
                data: z.ZodArray<z.ZodObject<{
                    id: z.ZodString;
                    entityType: z.ZodString;
                    entityId: z.ZodString;
                    method: z.ZodString;
                    confidence: z.ZodNumber;
                    appliedBy: z.ZodOptional<z.ZodString>;
                    aiProvider: z.ZodOptional<z.ZodString>;
                    aiModel: z.ZodOptional<z.ZodString>;
                    aiResponse: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
                    aiReasoning: z.ZodOptional<z.ZodString>;
                    isVerified: z.ZodBoolean;
                    verifiedBy: z.ZodOptional<z.ZodString>;
                    verifiedAt: z.ZodOptional<z.ZodEffects<z.ZodUnion<[z.ZodString, z.ZodDate]>, Date, string | Date>>;
                    feedback: z.ZodOptional<z.ZodString>;
                    isCorrect: z.ZodOptional<z.ZodBoolean>;
                    sourceEntityType: z.ZodOptional<z.ZodString>;
                    sourceEntityId: z.ZodOptional<z.ZodString>;
                    relationshipType: z.ZodOptional<z.ZodString>;
                    createdAt: z.ZodEffects<z.ZodUnion<[z.ZodString, z.ZodDate]>, Date, string | Date>;
                    updatedAt: z.ZodEffects<z.ZodUnion<[z.ZodString, z.ZodDate]>, Date, string | Date>;
                    tagId: z.ZodString;
                }, "strip", z.ZodTypeAny, {
                    method: string;
                    id: string;
                    entityType: string;
                    entityId: string;
                    confidence: number;
                    isVerified: boolean;
                    createdAt: Date;
                    updatedAt: Date;
                    tagId: string;
                    appliedBy?: string | undefined;
                    aiProvider?: string | undefined;
                    aiModel?: string | undefined;
                    aiResponse?: Record<string, any> | undefined;
                    aiReasoning?: string | undefined;
                    verifiedBy?: string | undefined;
                    verifiedAt?: Date | undefined;
                    feedback?: string | undefined;
                    isCorrect?: boolean | undefined;
                    sourceEntityType?: string | undefined;
                    sourceEntityId?: string | undefined;
                    relationshipType?: string | undefined;
                }, {
                    method: string;
                    id: string;
                    entityType: string;
                    entityId: string;
                    confidence: number;
                    isVerified: boolean;
                    createdAt: string | Date;
                    updatedAt: string | Date;
                    tagId: string;
                    appliedBy?: string | undefined;
                    aiProvider?: string | undefined;
                    aiModel?: string | undefined;
                    aiResponse?: Record<string, any> | undefined;
                    aiReasoning?: string | undefined;
                    verifiedBy?: string | undefined;
                    verifiedAt?: string | Date | undefined;
                    feedback?: string | undefined;
                    isCorrect?: boolean | undefined;
                    sourceEntityType?: string | undefined;
                    sourceEntityId?: string | undefined;
                    relationshipType?: string | undefined;
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
                    method: string;
                    id: string;
                    entityType: string;
                    entityId: string;
                    confidence: number;
                    isVerified: boolean;
                    createdAt: Date;
                    updatedAt: Date;
                    tagId: string;
                    appliedBy?: string | undefined;
                    aiProvider?: string | undefined;
                    aiModel?: string | undefined;
                    aiResponse?: Record<string, any> | undefined;
                    aiReasoning?: string | undefined;
                    verifiedBy?: string | undefined;
                    verifiedAt?: Date | undefined;
                    feedback?: string | undefined;
                    isCorrect?: boolean | undefined;
                    sourceEntityType?: string | undefined;
                    sourceEntityId?: string | undefined;
                    relationshipType?: string | undefined;
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
                    method: string;
                    id: string;
                    entityType: string;
                    entityId: string;
                    confidence: number;
                    isVerified: boolean;
                    createdAt: string | Date;
                    updatedAt: string | Date;
                    tagId: string;
                    appliedBy?: string | undefined;
                    aiProvider?: string | undefined;
                    aiModel?: string | undefined;
                    aiResponse?: Record<string, any> | undefined;
                    aiReasoning?: string | undefined;
                    verifiedBy?: string | undefined;
                    verifiedAt?: string | Date | undefined;
                    feedback?: string | undefined;
                    isCorrect?: boolean | undefined;
                    sourceEntityType?: string | undefined;
                    sourceEntityId?: string | undefined;
                    relationshipType?: string | undefined;
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
        summary: "Get a entitytag by ID";
        path: "/api/tagging/entity-tags/:id";
        responses: {
            200: z.ZodObject<{
                success: z.ZodLiteral<true>;
                data: z.ZodObject<{
                    id: z.ZodString;
                    entityType: z.ZodString;
                    entityId: z.ZodString;
                    method: z.ZodString;
                    confidence: z.ZodNumber;
                    appliedBy: z.ZodOptional<z.ZodString>;
                    aiProvider: z.ZodOptional<z.ZodString>;
                    aiModel: z.ZodOptional<z.ZodString>;
                    aiResponse: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
                    aiReasoning: z.ZodOptional<z.ZodString>;
                    isVerified: z.ZodBoolean;
                    verifiedBy: z.ZodOptional<z.ZodString>;
                    verifiedAt: z.ZodOptional<z.ZodEffects<z.ZodUnion<[z.ZodString, z.ZodDate]>, Date, string | Date>>;
                    feedback: z.ZodOptional<z.ZodString>;
                    isCorrect: z.ZodOptional<z.ZodBoolean>;
                    sourceEntityType: z.ZodOptional<z.ZodString>;
                    sourceEntityId: z.ZodOptional<z.ZodString>;
                    relationshipType: z.ZodOptional<z.ZodString>;
                    createdAt: z.ZodEffects<z.ZodUnion<[z.ZodString, z.ZodDate]>, Date, string | Date>;
                    updatedAt: z.ZodEffects<z.ZodUnion<[z.ZodString, z.ZodDate]>, Date, string | Date>;
                    tagId: z.ZodString;
                }, "strip", z.ZodTypeAny, {
                    method: string;
                    id: string;
                    entityType: string;
                    entityId: string;
                    confidence: number;
                    isVerified: boolean;
                    createdAt: Date;
                    updatedAt: Date;
                    tagId: string;
                    appliedBy?: string | undefined;
                    aiProvider?: string | undefined;
                    aiModel?: string | undefined;
                    aiResponse?: Record<string, any> | undefined;
                    aiReasoning?: string | undefined;
                    verifiedBy?: string | undefined;
                    verifiedAt?: Date | undefined;
                    feedback?: string | undefined;
                    isCorrect?: boolean | undefined;
                    sourceEntityType?: string | undefined;
                    sourceEntityId?: string | undefined;
                    relationshipType?: string | undefined;
                }, {
                    method: string;
                    id: string;
                    entityType: string;
                    entityId: string;
                    confidence: number;
                    isVerified: boolean;
                    createdAt: string | Date;
                    updatedAt: string | Date;
                    tagId: string;
                    appliedBy?: string | undefined;
                    aiProvider?: string | undefined;
                    aiModel?: string | undefined;
                    aiResponse?: Record<string, any> | undefined;
                    aiReasoning?: string | undefined;
                    verifiedBy?: string | undefined;
                    verifiedAt?: string | Date | undefined;
                    feedback?: string | undefined;
                    isCorrect?: boolean | undefined;
                    sourceEntityType?: string | undefined;
                    sourceEntityId?: string | undefined;
                    relationshipType?: string | undefined;
                }>;
            }, "strip", z.ZodTypeAny, {
                success: true;
                data: {
                    method: string;
                    id: string;
                    entityType: string;
                    entityId: string;
                    confidence: number;
                    isVerified: boolean;
                    createdAt: Date;
                    updatedAt: Date;
                    tagId: string;
                    appliedBy?: string | undefined;
                    aiProvider?: string | undefined;
                    aiModel?: string | undefined;
                    aiResponse?: Record<string, any> | undefined;
                    aiReasoning?: string | undefined;
                    verifiedBy?: string | undefined;
                    verifiedAt?: Date | undefined;
                    feedback?: string | undefined;
                    isCorrect?: boolean | undefined;
                    sourceEntityType?: string | undefined;
                    sourceEntityId?: string | undefined;
                    relationshipType?: string | undefined;
                };
            }, {
                success: true;
                data: {
                    method: string;
                    id: string;
                    entityType: string;
                    entityId: string;
                    confidence: number;
                    isVerified: boolean;
                    createdAt: string | Date;
                    updatedAt: string | Date;
                    tagId: string;
                    appliedBy?: string | undefined;
                    aiProvider?: string | undefined;
                    aiModel?: string | undefined;
                    aiResponse?: Record<string, any> | undefined;
                    aiReasoning?: string | undefined;
                    verifiedBy?: string | undefined;
                    verifiedAt?: string | Date | undefined;
                    feedback?: string | undefined;
                    isCorrect?: boolean | undefined;
                    sourceEntityType?: string | undefined;
                    sourceEntityId?: string | undefined;
                    relationshipType?: string | undefined;
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
            entityType: z.ZodString;
            entityId: z.ZodString;
            method: z.ZodString;
            confidence: z.ZodNumber;
            appliedBy: z.ZodOptional<z.ZodString>;
            aiProvider: z.ZodOptional<z.ZodString>;
            aiModel: z.ZodOptional<z.ZodString>;
            aiResponse: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
            aiReasoning: z.ZodOptional<z.ZodString>;
            isVerified: z.ZodBoolean;
            verifiedBy: z.ZodOptional<z.ZodString>;
            verifiedAt: z.ZodOptional<z.ZodEffects<z.ZodUnion<[z.ZodString, z.ZodDate]>, Date, string | Date>>;
            feedback: z.ZodOptional<z.ZodString>;
            isCorrect: z.ZodOptional<z.ZodBoolean>;
            sourceEntityType: z.ZodOptional<z.ZodString>;
            sourceEntityId: z.ZodOptional<z.ZodString>;
            relationshipType: z.ZodOptional<z.ZodString>;
            createdAt: z.ZodEffects<z.ZodUnion<[z.ZodString, z.ZodDate]>, Date, string | Date>;
            updatedAt: z.ZodEffects<z.ZodUnion<[z.ZodString, z.ZodDate]>, Date, string | Date>;
            tagId: z.ZodString;
        }, "id" | "confidence" | "isVerified" | "createdAt" | "updatedAt">, "strip", z.ZodTypeAny, {
            method: string;
            entityType: string;
            entityId: string;
            tagId: string;
            appliedBy?: string | undefined;
            aiProvider?: string | undefined;
            aiModel?: string | undefined;
            aiResponse?: Record<string, any> | undefined;
            aiReasoning?: string | undefined;
            verifiedBy?: string | undefined;
            verifiedAt?: Date | undefined;
            feedback?: string | undefined;
            isCorrect?: boolean | undefined;
            sourceEntityType?: string | undefined;
            sourceEntityId?: string | undefined;
            relationshipType?: string | undefined;
        }, {
            method: string;
            entityType: string;
            entityId: string;
            tagId: string;
            appliedBy?: string | undefined;
            aiProvider?: string | undefined;
            aiModel?: string | undefined;
            aiResponse?: Record<string, any> | undefined;
            aiReasoning?: string | undefined;
            verifiedBy?: string | undefined;
            verifiedAt?: string | Date | undefined;
            feedback?: string | undefined;
            isCorrect?: boolean | undefined;
            sourceEntityType?: string | undefined;
            sourceEntityId?: string | undefined;
            relationshipType?: string | undefined;
        }>;
        method: "POST";
        summary: "Create a new entitytag";
        path: "/api/tagging/entity-tags";
        responses: {
            201: z.ZodObject<{
                success: z.ZodLiteral<true>;
                data: z.ZodObject<{
                    id: z.ZodString;
                    entityType: z.ZodString;
                    entityId: z.ZodString;
                    method: z.ZodString;
                    confidence: z.ZodNumber;
                    appliedBy: z.ZodOptional<z.ZodString>;
                    aiProvider: z.ZodOptional<z.ZodString>;
                    aiModel: z.ZodOptional<z.ZodString>;
                    aiResponse: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
                    aiReasoning: z.ZodOptional<z.ZodString>;
                    isVerified: z.ZodBoolean;
                    verifiedBy: z.ZodOptional<z.ZodString>;
                    verifiedAt: z.ZodOptional<z.ZodEffects<z.ZodUnion<[z.ZodString, z.ZodDate]>, Date, string | Date>>;
                    feedback: z.ZodOptional<z.ZodString>;
                    isCorrect: z.ZodOptional<z.ZodBoolean>;
                    sourceEntityType: z.ZodOptional<z.ZodString>;
                    sourceEntityId: z.ZodOptional<z.ZodString>;
                    relationshipType: z.ZodOptional<z.ZodString>;
                    createdAt: z.ZodEffects<z.ZodUnion<[z.ZodString, z.ZodDate]>, Date, string | Date>;
                    updatedAt: z.ZodEffects<z.ZodUnion<[z.ZodString, z.ZodDate]>, Date, string | Date>;
                    tagId: z.ZodString;
                }, "strip", z.ZodTypeAny, {
                    method: string;
                    id: string;
                    entityType: string;
                    entityId: string;
                    confidence: number;
                    isVerified: boolean;
                    createdAt: Date;
                    updatedAt: Date;
                    tagId: string;
                    appliedBy?: string | undefined;
                    aiProvider?: string | undefined;
                    aiModel?: string | undefined;
                    aiResponse?: Record<string, any> | undefined;
                    aiReasoning?: string | undefined;
                    verifiedBy?: string | undefined;
                    verifiedAt?: Date | undefined;
                    feedback?: string | undefined;
                    isCorrect?: boolean | undefined;
                    sourceEntityType?: string | undefined;
                    sourceEntityId?: string | undefined;
                    relationshipType?: string | undefined;
                }, {
                    method: string;
                    id: string;
                    entityType: string;
                    entityId: string;
                    confidence: number;
                    isVerified: boolean;
                    createdAt: string | Date;
                    updatedAt: string | Date;
                    tagId: string;
                    appliedBy?: string | undefined;
                    aiProvider?: string | undefined;
                    aiModel?: string | undefined;
                    aiResponse?: Record<string, any> | undefined;
                    aiReasoning?: string | undefined;
                    verifiedBy?: string | undefined;
                    verifiedAt?: string | Date | undefined;
                    feedback?: string | undefined;
                    isCorrect?: boolean | undefined;
                    sourceEntityType?: string | undefined;
                    sourceEntityId?: string | undefined;
                    relationshipType?: string | undefined;
                }>;
            }, "strip", z.ZodTypeAny, {
                success: true;
                data: {
                    method: string;
                    id: string;
                    entityType: string;
                    entityId: string;
                    confidence: number;
                    isVerified: boolean;
                    createdAt: Date;
                    updatedAt: Date;
                    tagId: string;
                    appliedBy?: string | undefined;
                    aiProvider?: string | undefined;
                    aiModel?: string | undefined;
                    aiResponse?: Record<string, any> | undefined;
                    aiReasoning?: string | undefined;
                    verifiedBy?: string | undefined;
                    verifiedAt?: Date | undefined;
                    feedback?: string | undefined;
                    isCorrect?: boolean | undefined;
                    sourceEntityType?: string | undefined;
                    sourceEntityId?: string | undefined;
                    relationshipType?: string | undefined;
                };
            }, {
                success: true;
                data: {
                    method: string;
                    id: string;
                    entityType: string;
                    entityId: string;
                    confidence: number;
                    isVerified: boolean;
                    createdAt: string | Date;
                    updatedAt: string | Date;
                    tagId: string;
                    appliedBy?: string | undefined;
                    aiProvider?: string | undefined;
                    aiModel?: string | undefined;
                    aiResponse?: Record<string, any> | undefined;
                    aiReasoning?: string | undefined;
                    verifiedBy?: string | undefined;
                    verifiedAt?: string | Date | undefined;
                    feedback?: string | undefined;
                    isCorrect?: boolean | undefined;
                    sourceEntityType?: string | undefined;
                    sourceEntityId?: string | undefined;
                    relationshipType?: string | undefined;
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
            method: z.ZodOptional<z.ZodString>;
            entityType: z.ZodOptional<z.ZodString>;
            entityId: z.ZodOptional<z.ZodString>;
            appliedBy: z.ZodOptional<z.ZodOptional<z.ZodString>>;
            aiProvider: z.ZodOptional<z.ZodOptional<z.ZodString>>;
            aiModel: z.ZodOptional<z.ZodOptional<z.ZodString>>;
            aiResponse: z.ZodOptional<z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>>;
            aiReasoning: z.ZodOptional<z.ZodOptional<z.ZodString>>;
            verifiedBy: z.ZodOptional<z.ZodOptional<z.ZodString>>;
            verifiedAt: z.ZodOptional<z.ZodOptional<z.ZodEffects<z.ZodUnion<[z.ZodString, z.ZodDate]>, Date, string | Date>>>;
            feedback: z.ZodOptional<z.ZodOptional<z.ZodString>>;
            isCorrect: z.ZodOptional<z.ZodOptional<z.ZodBoolean>>;
            sourceEntityType: z.ZodOptional<z.ZodOptional<z.ZodString>>;
            sourceEntityId: z.ZodOptional<z.ZodOptional<z.ZodString>>;
            relationshipType: z.ZodOptional<z.ZodOptional<z.ZodString>>;
            tagId: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            method?: string | undefined;
            entityType?: string | undefined;
            entityId?: string | undefined;
            appliedBy?: string | undefined;
            aiProvider?: string | undefined;
            aiModel?: string | undefined;
            aiResponse?: Record<string, any> | undefined;
            aiReasoning?: string | undefined;
            verifiedBy?: string | undefined;
            verifiedAt?: Date | undefined;
            feedback?: string | undefined;
            isCorrect?: boolean | undefined;
            sourceEntityType?: string | undefined;
            sourceEntityId?: string | undefined;
            relationshipType?: string | undefined;
            tagId?: string | undefined;
        }, {
            method?: string | undefined;
            entityType?: string | undefined;
            entityId?: string | undefined;
            appliedBy?: string | undefined;
            aiProvider?: string | undefined;
            aiModel?: string | undefined;
            aiResponse?: Record<string, any> | undefined;
            aiReasoning?: string | undefined;
            verifiedBy?: string | undefined;
            verifiedAt?: string | Date | undefined;
            feedback?: string | undefined;
            isCorrect?: boolean | undefined;
            sourceEntityType?: string | undefined;
            sourceEntityId?: string | undefined;
            relationshipType?: string | undefined;
            tagId?: string | undefined;
        }>;
        method: "PUT";
        pathParams: z.ZodObject<{
            id: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            id: string;
        }, {
            id: string;
        }>;
        summary: "Update a entitytag";
        path: "/api/tagging/entity-tags/:id";
        responses: {
            200: z.ZodObject<{
                success: z.ZodLiteral<true>;
                data: z.ZodObject<{
                    id: z.ZodString;
                    entityType: z.ZodString;
                    entityId: z.ZodString;
                    method: z.ZodString;
                    confidence: z.ZodNumber;
                    appliedBy: z.ZodOptional<z.ZodString>;
                    aiProvider: z.ZodOptional<z.ZodString>;
                    aiModel: z.ZodOptional<z.ZodString>;
                    aiResponse: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
                    aiReasoning: z.ZodOptional<z.ZodString>;
                    isVerified: z.ZodBoolean;
                    verifiedBy: z.ZodOptional<z.ZodString>;
                    verifiedAt: z.ZodOptional<z.ZodEffects<z.ZodUnion<[z.ZodString, z.ZodDate]>, Date, string | Date>>;
                    feedback: z.ZodOptional<z.ZodString>;
                    isCorrect: z.ZodOptional<z.ZodBoolean>;
                    sourceEntityType: z.ZodOptional<z.ZodString>;
                    sourceEntityId: z.ZodOptional<z.ZodString>;
                    relationshipType: z.ZodOptional<z.ZodString>;
                    createdAt: z.ZodEffects<z.ZodUnion<[z.ZodString, z.ZodDate]>, Date, string | Date>;
                    updatedAt: z.ZodEffects<z.ZodUnion<[z.ZodString, z.ZodDate]>, Date, string | Date>;
                    tagId: z.ZodString;
                }, "strip", z.ZodTypeAny, {
                    method: string;
                    id: string;
                    entityType: string;
                    entityId: string;
                    confidence: number;
                    isVerified: boolean;
                    createdAt: Date;
                    updatedAt: Date;
                    tagId: string;
                    appliedBy?: string | undefined;
                    aiProvider?: string | undefined;
                    aiModel?: string | undefined;
                    aiResponse?: Record<string, any> | undefined;
                    aiReasoning?: string | undefined;
                    verifiedBy?: string | undefined;
                    verifiedAt?: Date | undefined;
                    feedback?: string | undefined;
                    isCorrect?: boolean | undefined;
                    sourceEntityType?: string | undefined;
                    sourceEntityId?: string | undefined;
                    relationshipType?: string | undefined;
                }, {
                    method: string;
                    id: string;
                    entityType: string;
                    entityId: string;
                    confidence: number;
                    isVerified: boolean;
                    createdAt: string | Date;
                    updatedAt: string | Date;
                    tagId: string;
                    appliedBy?: string | undefined;
                    aiProvider?: string | undefined;
                    aiModel?: string | undefined;
                    aiResponse?: Record<string, any> | undefined;
                    aiReasoning?: string | undefined;
                    verifiedBy?: string | undefined;
                    verifiedAt?: string | Date | undefined;
                    feedback?: string | undefined;
                    isCorrect?: boolean | undefined;
                    sourceEntityType?: string | undefined;
                    sourceEntityId?: string | undefined;
                    relationshipType?: string | undefined;
                }>;
            }, "strip", z.ZodTypeAny, {
                success: true;
                data: {
                    method: string;
                    id: string;
                    entityType: string;
                    entityId: string;
                    confidence: number;
                    isVerified: boolean;
                    createdAt: Date;
                    updatedAt: Date;
                    tagId: string;
                    appliedBy?: string | undefined;
                    aiProvider?: string | undefined;
                    aiModel?: string | undefined;
                    aiResponse?: Record<string, any> | undefined;
                    aiReasoning?: string | undefined;
                    verifiedBy?: string | undefined;
                    verifiedAt?: Date | undefined;
                    feedback?: string | undefined;
                    isCorrect?: boolean | undefined;
                    sourceEntityType?: string | undefined;
                    sourceEntityId?: string | undefined;
                    relationshipType?: string | undefined;
                };
            }, {
                success: true;
                data: {
                    method: string;
                    id: string;
                    entityType: string;
                    entityId: string;
                    confidence: number;
                    isVerified: boolean;
                    createdAt: string | Date;
                    updatedAt: string | Date;
                    tagId: string;
                    appliedBy?: string | undefined;
                    aiProvider?: string | undefined;
                    aiModel?: string | undefined;
                    aiResponse?: Record<string, any> | undefined;
                    aiReasoning?: string | undefined;
                    verifiedBy?: string | undefined;
                    verifiedAt?: string | Date | undefined;
                    feedback?: string | undefined;
                    isCorrect?: boolean | undefined;
                    sourceEntityType?: string | undefined;
                    sourceEntityId?: string | undefined;
                    relationshipType?: string | undefined;
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
        summary: "Delete a entitytag";
        path: "/api/tagging/entity-tags/:id";
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
                entityType: z.ZodString;
                entityId: z.ZodString;
                method: z.ZodString;
                confidence: z.ZodNumber;
                appliedBy: z.ZodOptional<z.ZodString>;
                aiProvider: z.ZodOptional<z.ZodString>;
                aiModel: z.ZodOptional<z.ZodString>;
                aiResponse: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
                aiReasoning: z.ZodOptional<z.ZodString>;
                isVerified: z.ZodBoolean;
                verifiedBy: z.ZodOptional<z.ZodString>;
                verifiedAt: z.ZodOptional<z.ZodEffects<z.ZodUnion<[z.ZodString, z.ZodDate]>, Date, string | Date>>;
                feedback: z.ZodOptional<z.ZodString>;
                isCorrect: z.ZodOptional<z.ZodBoolean>;
                sourceEntityType: z.ZodOptional<z.ZodString>;
                sourceEntityId: z.ZodOptional<z.ZodString>;
                relationshipType: z.ZodOptional<z.ZodString>;
                createdAt: z.ZodEffects<z.ZodUnion<[z.ZodString, z.ZodDate]>, Date, string | Date>;
                updatedAt: z.ZodEffects<z.ZodUnion<[z.ZodString, z.ZodDate]>, Date, string | Date>;
                tagId: z.ZodString;
            }, "id" | "confidence" | "isVerified" | "createdAt" | "updatedAt">, "strip", z.ZodTypeAny, {
                method: string;
                entityType: string;
                entityId: string;
                tagId: string;
                appliedBy?: string | undefined;
                aiProvider?: string | undefined;
                aiModel?: string | undefined;
                aiResponse?: Record<string, any> | undefined;
                aiReasoning?: string | undefined;
                verifiedBy?: string | undefined;
                verifiedAt?: Date | undefined;
                feedback?: string | undefined;
                isCorrect?: boolean | undefined;
                sourceEntityType?: string | undefined;
                sourceEntityId?: string | undefined;
                relationshipType?: string | undefined;
            }, {
                method: string;
                entityType: string;
                entityId: string;
                tagId: string;
                appliedBy?: string | undefined;
                aiProvider?: string | undefined;
                aiModel?: string | undefined;
                aiResponse?: Record<string, any> | undefined;
                aiReasoning?: string | undefined;
                verifiedBy?: string | undefined;
                verifiedAt?: string | Date | undefined;
                feedback?: string | undefined;
                isCorrect?: boolean | undefined;
                sourceEntityType?: string | undefined;
                sourceEntityId?: string | undefined;
                relationshipType?: string | undefined;
            }>, "many">;
        }, "strip", z.ZodTypeAny, {
            data: {
                method: string;
                entityType: string;
                entityId: string;
                tagId: string;
                appliedBy?: string | undefined;
                aiProvider?: string | undefined;
                aiModel?: string | undefined;
                aiResponse?: Record<string, any> | undefined;
                aiReasoning?: string | undefined;
                verifiedBy?: string | undefined;
                verifiedAt?: Date | undefined;
                feedback?: string | undefined;
                isCorrect?: boolean | undefined;
                sourceEntityType?: string | undefined;
                sourceEntityId?: string | undefined;
                relationshipType?: string | undefined;
            }[];
        }, {
            data: {
                method: string;
                entityType: string;
                entityId: string;
                tagId: string;
                appliedBy?: string | undefined;
                aiProvider?: string | undefined;
                aiModel?: string | undefined;
                aiResponse?: Record<string, any> | undefined;
                aiReasoning?: string | undefined;
                verifiedBy?: string | undefined;
                verifiedAt?: string | Date | undefined;
                feedback?: string | undefined;
                isCorrect?: boolean | undefined;
                sourceEntityType?: string | undefined;
                sourceEntityId?: string | undefined;
                relationshipType?: string | undefined;
            }[];
        }>;
        method: "POST";
        summary: "Create multiple entitytags";
        path: "/api/tagging/entity-tags/bulk";
        responses: {
            201: z.ZodObject<{
                success: z.ZodLiteral<true>;
                data: z.ZodArray<z.ZodObject<{
                    id: z.ZodString;
                    entityType: z.ZodString;
                    entityId: z.ZodString;
                    method: z.ZodString;
                    confidence: z.ZodNumber;
                    appliedBy: z.ZodOptional<z.ZodString>;
                    aiProvider: z.ZodOptional<z.ZodString>;
                    aiModel: z.ZodOptional<z.ZodString>;
                    aiResponse: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
                    aiReasoning: z.ZodOptional<z.ZodString>;
                    isVerified: z.ZodBoolean;
                    verifiedBy: z.ZodOptional<z.ZodString>;
                    verifiedAt: z.ZodOptional<z.ZodEffects<z.ZodUnion<[z.ZodString, z.ZodDate]>, Date, string | Date>>;
                    feedback: z.ZodOptional<z.ZodString>;
                    isCorrect: z.ZodOptional<z.ZodBoolean>;
                    sourceEntityType: z.ZodOptional<z.ZodString>;
                    sourceEntityId: z.ZodOptional<z.ZodString>;
                    relationshipType: z.ZodOptional<z.ZodString>;
                    createdAt: z.ZodEffects<z.ZodUnion<[z.ZodString, z.ZodDate]>, Date, string | Date>;
                    updatedAt: z.ZodEffects<z.ZodUnion<[z.ZodString, z.ZodDate]>, Date, string | Date>;
                    tagId: z.ZodString;
                }, "strip", z.ZodTypeAny, {
                    method: string;
                    id: string;
                    entityType: string;
                    entityId: string;
                    confidence: number;
                    isVerified: boolean;
                    createdAt: Date;
                    updatedAt: Date;
                    tagId: string;
                    appliedBy?: string | undefined;
                    aiProvider?: string | undefined;
                    aiModel?: string | undefined;
                    aiResponse?: Record<string, any> | undefined;
                    aiReasoning?: string | undefined;
                    verifiedBy?: string | undefined;
                    verifiedAt?: Date | undefined;
                    feedback?: string | undefined;
                    isCorrect?: boolean | undefined;
                    sourceEntityType?: string | undefined;
                    sourceEntityId?: string | undefined;
                    relationshipType?: string | undefined;
                }, {
                    method: string;
                    id: string;
                    entityType: string;
                    entityId: string;
                    confidence: number;
                    isVerified: boolean;
                    createdAt: string | Date;
                    updatedAt: string | Date;
                    tagId: string;
                    appliedBy?: string | undefined;
                    aiProvider?: string | undefined;
                    aiModel?: string | undefined;
                    aiResponse?: Record<string, any> | undefined;
                    aiReasoning?: string | undefined;
                    verifiedBy?: string | undefined;
                    verifiedAt?: string | Date | undefined;
                    feedback?: string | undefined;
                    isCorrect?: boolean | undefined;
                    sourceEntityType?: string | undefined;
                    sourceEntityId?: string | undefined;
                    relationshipType?: string | undefined;
                }>, "many">;
                count: z.ZodNumber;
            }, "strip", z.ZodTypeAny, {
                success: true;
                data: {
                    method: string;
                    id: string;
                    entityType: string;
                    entityId: string;
                    confidence: number;
                    isVerified: boolean;
                    createdAt: Date;
                    updatedAt: Date;
                    tagId: string;
                    appliedBy?: string | undefined;
                    aiProvider?: string | undefined;
                    aiModel?: string | undefined;
                    aiResponse?: Record<string, any> | undefined;
                    aiReasoning?: string | undefined;
                    verifiedBy?: string | undefined;
                    verifiedAt?: Date | undefined;
                    feedback?: string | undefined;
                    isCorrect?: boolean | undefined;
                    sourceEntityType?: string | undefined;
                    sourceEntityId?: string | undefined;
                    relationshipType?: string | undefined;
                }[];
                count: number;
            }, {
                success: true;
                data: {
                    method: string;
                    id: string;
                    entityType: string;
                    entityId: string;
                    confidence: number;
                    isVerified: boolean;
                    createdAt: string | Date;
                    updatedAt: string | Date;
                    tagId: string;
                    appliedBy?: string | undefined;
                    aiProvider?: string | undefined;
                    aiModel?: string | undefined;
                    aiResponse?: Record<string, any> | undefined;
                    aiReasoning?: string | undefined;
                    verifiedBy?: string | undefined;
                    verifiedAt?: string | Date | undefined;
                    feedback?: string | undefined;
                    isCorrect?: boolean | undefined;
                    sourceEntityType?: string | undefined;
                    sourceEntityId?: string | undefined;
                    relationshipType?: string | undefined;
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
                sortBy: z.ZodOptional<z.ZodEnum<["id", "entityType", "entityId", "method", "confidence", "appliedBy", "aiProvider", "aiModel", "aiResponse", "aiReasoning", "isVerified", "verifiedBy", "verifiedAt", "feedback", "isCorrect", "sourceEntityType", "sourceEntityId", "relationshipType", "createdAt", "updatedAt", "tagId"]>>;
                sortOrder: z.ZodDefault<z.ZodOptional<z.ZodEnum<["asc", "desc"]>>>;
                search: z.ZodOptional<z.ZodString>;
                entityType: z.ZodOptional<z.ZodString>;
                entityId: z.ZodOptional<z.ZodString>;
                method: z.ZodOptional<z.ZodString>;
                confidence: z.ZodOptional<z.ZodNumber>;
                appliedBy: z.ZodOptional<z.ZodString>;
                aiProvider: z.ZodOptional<z.ZodString>;
                aiModel: z.ZodOptional<z.ZodString>;
                aiResponse: z.ZodOptional<z.ZodAny>;
                aiReasoning: z.ZodOptional<z.ZodString>;
                isVerified: z.ZodOptional<z.ZodBoolean>;
                verifiedBy: z.ZodOptional<z.ZodString>;
                verifiedAt: z.ZodOptional<z.ZodAny>;
                feedback: z.ZodOptional<z.ZodString>;
                isCorrect: z.ZodOptional<z.ZodBoolean>;
                sourceEntityType: z.ZodOptional<z.ZodString>;
                sourceEntityId: z.ZodOptional<z.ZodString>;
                relationshipType: z.ZodOptional<z.ZodString>;
                createdAt: z.ZodOptional<z.ZodAny>;
                updatedAt: z.ZodOptional<z.ZodAny>;
                tagId: z.ZodOptional<z.ZodString>;
                include: z.ZodOptional<z.ZodObject<{}, "strip", z.ZodTypeAny, {}, {}>>;
            }, "strip", z.ZodTypeAny, {
                page: number;
                limit: number;
                sortOrder: "asc" | "desc";
                search?: string | undefined;
                method?: string | undefined;
                entityType?: string | undefined;
                entityId?: string | undefined;
                confidence?: number | undefined;
                appliedBy?: string | undefined;
                aiProvider?: string | undefined;
                aiModel?: string | undefined;
                aiResponse?: any;
                aiReasoning?: string | undefined;
                isVerified?: boolean | undefined;
                verifiedBy?: string | undefined;
                verifiedAt?: any;
                feedback?: string | undefined;
                isCorrect?: boolean | undefined;
                sourceEntityType?: string | undefined;
                sourceEntityId?: string | undefined;
                relationshipType?: string | undefined;
                createdAt?: any;
                updatedAt?: any;
                tagId?: string | undefined;
                sortBy?: "method" | "id" | "entityType" | "entityId" | "confidence" | "appliedBy" | "aiProvider" | "aiModel" | "aiResponse" | "aiReasoning" | "isVerified" | "verifiedBy" | "verifiedAt" | "feedback" | "isCorrect" | "sourceEntityType" | "sourceEntityId" | "relationshipType" | "createdAt" | "updatedAt" | "tagId" | undefined;
                include?: {} | undefined;
            }, {
                page?: number | undefined;
                limit?: number | undefined;
                sortOrder?: "asc" | "desc" | undefined;
                search?: string | undefined;
                method?: string | undefined;
                entityType?: string | undefined;
                entityId?: string | undefined;
                confidence?: number | undefined;
                appliedBy?: string | undefined;
                aiProvider?: string | undefined;
                aiModel?: string | undefined;
                aiResponse?: any;
                aiReasoning?: string | undefined;
                isVerified?: boolean | undefined;
                verifiedBy?: string | undefined;
                verifiedAt?: any;
                feedback?: string | undefined;
                isCorrect?: boolean | undefined;
                sourceEntityType?: string | undefined;
                sourceEntityId?: string | undefined;
                relationshipType?: string | undefined;
                createdAt?: any;
                updatedAt?: any;
                tagId?: string | undefined;
                sortBy?: "method" | "id" | "entityType" | "entityId" | "confidence" | "appliedBy" | "aiProvider" | "aiModel" | "aiResponse" | "aiReasoning" | "isVerified" | "verifiedBy" | "verifiedAt" | "feedback" | "isCorrect" | "sourceEntityType" | "sourceEntityId" | "relationshipType" | "createdAt" | "updatedAt" | "tagId" | undefined;
                include?: {} | undefined;
            }>;
            data: z.ZodObject<{
                method: z.ZodOptional<z.ZodString>;
                entityType: z.ZodOptional<z.ZodString>;
                entityId: z.ZodOptional<z.ZodString>;
                appliedBy: z.ZodOptional<z.ZodOptional<z.ZodString>>;
                aiProvider: z.ZodOptional<z.ZodOptional<z.ZodString>>;
                aiModel: z.ZodOptional<z.ZodOptional<z.ZodString>>;
                aiResponse: z.ZodOptional<z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>>;
                aiReasoning: z.ZodOptional<z.ZodOptional<z.ZodString>>;
                verifiedBy: z.ZodOptional<z.ZodOptional<z.ZodString>>;
                verifiedAt: z.ZodOptional<z.ZodOptional<z.ZodEffects<z.ZodUnion<[z.ZodString, z.ZodDate]>, Date, string | Date>>>;
                feedback: z.ZodOptional<z.ZodOptional<z.ZodString>>;
                isCorrect: z.ZodOptional<z.ZodOptional<z.ZodBoolean>>;
                sourceEntityType: z.ZodOptional<z.ZodOptional<z.ZodString>>;
                sourceEntityId: z.ZodOptional<z.ZodOptional<z.ZodString>>;
                relationshipType: z.ZodOptional<z.ZodOptional<z.ZodString>>;
                tagId: z.ZodOptional<z.ZodString>;
            }, "strip", z.ZodTypeAny, {
                method?: string | undefined;
                entityType?: string | undefined;
                entityId?: string | undefined;
                appliedBy?: string | undefined;
                aiProvider?: string | undefined;
                aiModel?: string | undefined;
                aiResponse?: Record<string, any> | undefined;
                aiReasoning?: string | undefined;
                verifiedBy?: string | undefined;
                verifiedAt?: Date | undefined;
                feedback?: string | undefined;
                isCorrect?: boolean | undefined;
                sourceEntityType?: string | undefined;
                sourceEntityId?: string | undefined;
                relationshipType?: string | undefined;
                tagId?: string | undefined;
            }, {
                method?: string | undefined;
                entityType?: string | undefined;
                entityId?: string | undefined;
                appliedBy?: string | undefined;
                aiProvider?: string | undefined;
                aiModel?: string | undefined;
                aiResponse?: Record<string, any> | undefined;
                aiReasoning?: string | undefined;
                verifiedBy?: string | undefined;
                verifiedAt?: string | Date | undefined;
                feedback?: string | undefined;
                isCorrect?: boolean | undefined;
                sourceEntityType?: string | undefined;
                sourceEntityId?: string | undefined;
                relationshipType?: string | undefined;
                tagId?: string | undefined;
            }>;
        }, "strip", z.ZodTypeAny, {
            data: {
                method?: string | undefined;
                entityType?: string | undefined;
                entityId?: string | undefined;
                appliedBy?: string | undefined;
                aiProvider?: string | undefined;
                aiModel?: string | undefined;
                aiResponse?: Record<string, any> | undefined;
                aiReasoning?: string | undefined;
                verifiedBy?: string | undefined;
                verifiedAt?: Date | undefined;
                feedback?: string | undefined;
                isCorrect?: boolean | undefined;
                sourceEntityType?: string | undefined;
                sourceEntityId?: string | undefined;
                relationshipType?: string | undefined;
                tagId?: string | undefined;
            };
            where: {
                page: number;
                limit: number;
                sortOrder: "asc" | "desc";
                search?: string | undefined;
                method?: string | undefined;
                entityType?: string | undefined;
                entityId?: string | undefined;
                confidence?: number | undefined;
                appliedBy?: string | undefined;
                aiProvider?: string | undefined;
                aiModel?: string | undefined;
                aiResponse?: any;
                aiReasoning?: string | undefined;
                isVerified?: boolean | undefined;
                verifiedBy?: string | undefined;
                verifiedAt?: any;
                feedback?: string | undefined;
                isCorrect?: boolean | undefined;
                sourceEntityType?: string | undefined;
                sourceEntityId?: string | undefined;
                relationshipType?: string | undefined;
                createdAt?: any;
                updatedAt?: any;
                tagId?: string | undefined;
                sortBy?: "method" | "id" | "entityType" | "entityId" | "confidence" | "appliedBy" | "aiProvider" | "aiModel" | "aiResponse" | "aiReasoning" | "isVerified" | "verifiedBy" | "verifiedAt" | "feedback" | "isCorrect" | "sourceEntityType" | "sourceEntityId" | "relationshipType" | "createdAt" | "updatedAt" | "tagId" | undefined;
                include?: {} | undefined;
            };
        }, {
            data: {
                method?: string | undefined;
                entityType?: string | undefined;
                entityId?: string | undefined;
                appliedBy?: string | undefined;
                aiProvider?: string | undefined;
                aiModel?: string | undefined;
                aiResponse?: Record<string, any> | undefined;
                aiReasoning?: string | undefined;
                verifiedBy?: string | undefined;
                verifiedAt?: string | Date | undefined;
                feedback?: string | undefined;
                isCorrect?: boolean | undefined;
                sourceEntityType?: string | undefined;
                sourceEntityId?: string | undefined;
                relationshipType?: string | undefined;
                tagId?: string | undefined;
            };
            where: {
                page?: number | undefined;
                limit?: number | undefined;
                sortOrder?: "asc" | "desc" | undefined;
                search?: string | undefined;
                method?: string | undefined;
                entityType?: string | undefined;
                entityId?: string | undefined;
                confidence?: number | undefined;
                appliedBy?: string | undefined;
                aiProvider?: string | undefined;
                aiModel?: string | undefined;
                aiResponse?: any;
                aiReasoning?: string | undefined;
                isVerified?: boolean | undefined;
                verifiedBy?: string | undefined;
                verifiedAt?: any;
                feedback?: string | undefined;
                isCorrect?: boolean | undefined;
                sourceEntityType?: string | undefined;
                sourceEntityId?: string | undefined;
                relationshipType?: string | undefined;
                createdAt?: any;
                updatedAt?: any;
                tagId?: string | undefined;
                sortBy?: "method" | "id" | "entityType" | "entityId" | "confidence" | "appliedBy" | "aiProvider" | "aiModel" | "aiResponse" | "aiReasoning" | "isVerified" | "verifiedBy" | "verifiedAt" | "feedback" | "isCorrect" | "sourceEntityType" | "sourceEntityId" | "relationshipType" | "createdAt" | "updatedAt" | "tagId" | undefined;
                include?: {} | undefined;
            };
        }>;
        method: "PUT";
        summary: "Update multiple entitytags";
        path: "/api/tagging/entity-tags/bulk";
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
        summary: "Delete multiple entitytags";
        path: "/api/tagging/entity-tags/bulk";
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
//# sourceMappingURL=entity-tag.d.ts.map