import { z } from 'zod';
export declare const strategyContract: {
    getAll: {
        method: "GET";
        query: z.ZodObject<{
            page: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
            limit: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
            sortBy: z.ZodOptional<z.ZodEnum<["id", "userId", "name", "type", "status", "parameters"]>>;
            sortOrder: z.ZodDefault<z.ZodOptional<z.ZodEnum<["asc", "desc"]>>>;
            search: z.ZodOptional<z.ZodString>;
            userId: z.ZodOptional<z.ZodString>;
            name: z.ZodOptional<z.ZodString>;
            type: z.ZodOptional<z.ZodString>;
            status: z.ZodOptional<z.ZodString>;
            parameters: z.ZodOptional<z.ZodAny>;
        }, "strip", z.ZodTypeAny, {
            page: number;
            limit: number;
            sortOrder: "asc" | "desc";
            type?: string | undefined;
            status?: string | undefined;
            search?: string | undefined;
            sortBy?: "type" | "status" | "id" | "userId" | "name" | "parameters" | undefined;
            userId?: string | undefined;
            name?: string | undefined;
            parameters?: any;
        }, {
            type?: string | undefined;
            status?: string | undefined;
            page?: number | undefined;
            limit?: number | undefined;
            sortOrder?: "asc" | "desc" | undefined;
            search?: string | undefined;
            sortBy?: "type" | "status" | "id" | "userId" | "name" | "parameters" | undefined;
            userId?: string | undefined;
            name?: string | undefined;
            parameters?: any;
        }>;
        summary: "Get all strategys with optional filtering and pagination";
        path: "/api/public/strategys";
        responses: {
            200: z.ZodObject<{
                success: z.ZodLiteral<true>;
                data: z.ZodArray<z.ZodObject<{
                    id: z.ZodString;
                    userId: z.ZodOptional<z.ZodString>;
                    name: z.ZodString;
                    type: z.ZodString;
                    status: z.ZodString;
                    parameters: z.ZodRecord<z.ZodString, z.ZodAny>;
                }, "strip", z.ZodTypeAny, {
                    type: string;
                    status: string;
                    id: string;
                    name: string;
                    parameters: Record<string, any>;
                    userId?: string | undefined;
                }, {
                    type: string;
                    status: string;
                    id: string;
                    name: string;
                    parameters: Record<string, any>;
                    userId?: string | undefined;
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
                    type: string;
                    status: string;
                    id: string;
                    name: string;
                    parameters: Record<string, any>;
                    userId?: string | undefined;
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
                    type: string;
                    status: string;
                    id: string;
                    name: string;
                    parameters: Record<string, any>;
                    userId?: string | undefined;
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
        summary: "Get a strategy by ID";
        path: "/api/public/strategys/:id";
        responses: {
            200: z.ZodObject<{
                success: z.ZodLiteral<true>;
                data: z.ZodObject<{
                    id: z.ZodString;
                    userId: z.ZodOptional<z.ZodString>;
                    name: z.ZodString;
                    type: z.ZodString;
                    status: z.ZodString;
                    parameters: z.ZodRecord<z.ZodString, z.ZodAny>;
                }, "strip", z.ZodTypeAny, {
                    type: string;
                    status: string;
                    id: string;
                    name: string;
                    parameters: Record<string, any>;
                    userId?: string | undefined;
                }, {
                    type: string;
                    status: string;
                    id: string;
                    name: string;
                    parameters: Record<string, any>;
                    userId?: string | undefined;
                }>;
            }, "strip", z.ZodTypeAny, {
                success: true;
                data: {
                    type: string;
                    status: string;
                    id: string;
                    name: string;
                    parameters: Record<string, any>;
                    userId?: string | undefined;
                };
            }, {
                success: true;
                data: {
                    type: string;
                    status: string;
                    id: string;
                    name: string;
                    parameters: Record<string, any>;
                    userId?: string | undefined;
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
            userId: z.ZodOptional<z.ZodString>;
            name: z.ZodString;
            type: z.ZodString;
            status: z.ZodString;
            parameters: z.ZodRecord<z.ZodString, z.ZodAny>;
        }, "status" | "id" | "parameters">, "strip", z.ZodTypeAny, {
            type: string;
            name: string;
            userId?: string | undefined;
        }, {
            type: string;
            name: string;
            userId?: string | undefined;
        }>;
        method: "POST";
        summary: "Create a new strategy";
        path: "/api/public/strategys";
        responses: {
            201: z.ZodObject<{
                success: z.ZodLiteral<true>;
                data: z.ZodObject<{
                    id: z.ZodString;
                    userId: z.ZodOptional<z.ZodString>;
                    name: z.ZodString;
                    type: z.ZodString;
                    status: z.ZodString;
                    parameters: z.ZodRecord<z.ZodString, z.ZodAny>;
                }, "strip", z.ZodTypeAny, {
                    type: string;
                    status: string;
                    id: string;
                    name: string;
                    parameters: Record<string, any>;
                    userId?: string | undefined;
                }, {
                    type: string;
                    status: string;
                    id: string;
                    name: string;
                    parameters: Record<string, any>;
                    userId?: string | undefined;
                }>;
            }, "strip", z.ZodTypeAny, {
                success: true;
                data: {
                    type: string;
                    status: string;
                    id: string;
                    name: string;
                    parameters: Record<string, any>;
                    userId?: string | undefined;
                };
            }, {
                success: true;
                data: {
                    type: string;
                    status: string;
                    id: string;
                    name: string;
                    parameters: Record<string, any>;
                    userId?: string | undefined;
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
            type: z.ZodOptional<z.ZodString>;
            userId: z.ZodOptional<z.ZodOptional<z.ZodString>>;
            name: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            type?: string | undefined;
            userId?: string | undefined;
            name?: string | undefined;
        }, {
            type?: string | undefined;
            userId?: string | undefined;
            name?: string | undefined;
        }>;
        method: "PUT";
        pathParams: z.ZodObject<{
            id: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            id: string;
        }, {
            id: string;
        }>;
        summary: "Update a strategy";
        path: "/api/public/strategys/:id";
        responses: {
            200: z.ZodObject<{
                success: z.ZodLiteral<true>;
                data: z.ZodObject<{
                    id: z.ZodString;
                    userId: z.ZodOptional<z.ZodString>;
                    name: z.ZodString;
                    type: z.ZodString;
                    status: z.ZodString;
                    parameters: z.ZodRecord<z.ZodString, z.ZodAny>;
                }, "strip", z.ZodTypeAny, {
                    type: string;
                    status: string;
                    id: string;
                    name: string;
                    parameters: Record<string, any>;
                    userId?: string | undefined;
                }, {
                    type: string;
                    status: string;
                    id: string;
                    name: string;
                    parameters: Record<string, any>;
                    userId?: string | undefined;
                }>;
            }, "strip", z.ZodTypeAny, {
                success: true;
                data: {
                    type: string;
                    status: string;
                    id: string;
                    name: string;
                    parameters: Record<string, any>;
                    userId?: string | undefined;
                };
            }, {
                success: true;
                data: {
                    type: string;
                    status: string;
                    id: string;
                    name: string;
                    parameters: Record<string, any>;
                    userId?: string | undefined;
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
        summary: "Delete a strategy";
        path: "/api/public/strategys/:id";
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
                userId: z.ZodOptional<z.ZodString>;
                name: z.ZodString;
                type: z.ZodString;
                status: z.ZodString;
                parameters: z.ZodRecord<z.ZodString, z.ZodAny>;
            }, "status" | "id" | "parameters">, "strip", z.ZodTypeAny, {
                type: string;
                name: string;
                userId?: string | undefined;
            }, {
                type: string;
                name: string;
                userId?: string | undefined;
            }>, "many">;
        }, "strip", z.ZodTypeAny, {
            data: {
                type: string;
                name: string;
                userId?: string | undefined;
            }[];
        }, {
            data: {
                type: string;
                name: string;
                userId?: string | undefined;
            }[];
        }>;
        method: "POST";
        summary: "Create multiple strategys";
        path: "/api/public/strategys/bulk";
        responses: {
            201: z.ZodObject<{
                success: z.ZodLiteral<true>;
                data: z.ZodArray<z.ZodObject<{
                    id: z.ZodString;
                    userId: z.ZodOptional<z.ZodString>;
                    name: z.ZodString;
                    type: z.ZodString;
                    status: z.ZodString;
                    parameters: z.ZodRecord<z.ZodString, z.ZodAny>;
                }, "strip", z.ZodTypeAny, {
                    type: string;
                    status: string;
                    id: string;
                    name: string;
                    parameters: Record<string, any>;
                    userId?: string | undefined;
                }, {
                    type: string;
                    status: string;
                    id: string;
                    name: string;
                    parameters: Record<string, any>;
                    userId?: string | undefined;
                }>, "many">;
                count: z.ZodNumber;
            }, "strip", z.ZodTypeAny, {
                success: true;
                data: {
                    type: string;
                    status: string;
                    id: string;
                    name: string;
                    parameters: Record<string, any>;
                    userId?: string | undefined;
                }[];
                count: number;
            }, {
                success: true;
                data: {
                    type: string;
                    status: string;
                    id: string;
                    name: string;
                    parameters: Record<string, any>;
                    userId?: string | undefined;
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
                sortBy: z.ZodOptional<z.ZodEnum<["id", "userId", "name", "type", "status", "parameters"]>>;
                sortOrder: z.ZodDefault<z.ZodOptional<z.ZodEnum<["asc", "desc"]>>>;
                search: z.ZodOptional<z.ZodString>;
                userId: z.ZodOptional<z.ZodString>;
                name: z.ZodOptional<z.ZodString>;
                type: z.ZodOptional<z.ZodString>;
                status: z.ZodOptional<z.ZodString>;
                parameters: z.ZodOptional<z.ZodAny>;
            }, "strip", z.ZodTypeAny, {
                page: number;
                limit: number;
                sortOrder: "asc" | "desc";
                type?: string | undefined;
                status?: string | undefined;
                search?: string | undefined;
                sortBy?: "type" | "status" | "id" | "userId" | "name" | "parameters" | undefined;
                userId?: string | undefined;
                name?: string | undefined;
                parameters?: any;
            }, {
                type?: string | undefined;
                status?: string | undefined;
                page?: number | undefined;
                limit?: number | undefined;
                sortOrder?: "asc" | "desc" | undefined;
                search?: string | undefined;
                sortBy?: "type" | "status" | "id" | "userId" | "name" | "parameters" | undefined;
                userId?: string | undefined;
                name?: string | undefined;
                parameters?: any;
            }>;
            data: z.ZodObject<{
                type: z.ZodOptional<z.ZodString>;
                userId: z.ZodOptional<z.ZodOptional<z.ZodString>>;
                name: z.ZodOptional<z.ZodString>;
            }, "strip", z.ZodTypeAny, {
                type?: string | undefined;
                userId?: string | undefined;
                name?: string | undefined;
            }, {
                type?: string | undefined;
                userId?: string | undefined;
                name?: string | undefined;
            }>;
        }, "strip", z.ZodTypeAny, {
            data: {
                type?: string | undefined;
                userId?: string | undefined;
                name?: string | undefined;
            };
            where: {
                page: number;
                limit: number;
                sortOrder: "asc" | "desc";
                type?: string | undefined;
                status?: string | undefined;
                search?: string | undefined;
                sortBy?: "type" | "status" | "id" | "userId" | "name" | "parameters" | undefined;
                userId?: string | undefined;
                name?: string | undefined;
                parameters?: any;
            };
        }, {
            data: {
                type?: string | undefined;
                userId?: string | undefined;
                name?: string | undefined;
            };
            where: {
                type?: string | undefined;
                status?: string | undefined;
                page?: number | undefined;
                limit?: number | undefined;
                sortOrder?: "asc" | "desc" | undefined;
                search?: string | undefined;
                sortBy?: "type" | "status" | "id" | "userId" | "name" | "parameters" | undefined;
                userId?: string | undefined;
                name?: string | undefined;
                parameters?: any;
            };
        }>;
        method: "PUT";
        summary: "Update multiple strategys";
        path: "/api/public/strategys/bulk";
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
        summary: "Delete multiple strategys";
        path: "/api/public/strategys/bulk";
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
//# sourceMappingURL=strategy.d.ts.map