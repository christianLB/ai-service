import { z } from 'zod';
export declare const marketDataContract: {
    getAll: {
        query: z.ZodObject<{
            page: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
            limit: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
            sortBy: z.ZodOptional<z.ZodEnum<["id", "exchangeId", "tradingPairId", "timestamp", "open", "high", "low", "close", "volume", "quoteVolume", "trades", "timeframe", "metadata"]>>;
            sortOrder: z.ZodDefault<z.ZodOptional<z.ZodEnum<["asc", "desc"]>>>;
            search: z.ZodOptional<z.ZodString>;
            exchangeId: z.ZodOptional<z.ZodString>;
            tradingPairId: z.ZodOptional<z.ZodString>;
            timestamp: z.ZodOptional<z.ZodAny>;
            open: z.ZodOptional<z.ZodAny>;
            high: z.ZodOptional<z.ZodAny>;
            low: z.ZodOptional<z.ZodAny>;
            close: z.ZodOptional<z.ZodAny>;
            volume: z.ZodOptional<z.ZodAny>;
            quoteVolume: z.ZodOptional<z.ZodAny>;
            trades: z.ZodOptional<z.ZodNumber>;
            timeframe: z.ZodOptional<z.ZodString>;
            metadata: z.ZodOptional<z.ZodAny>;
        }, "strip", z.ZodTypeAny, {
            page: number;
            limit: number;
            sortOrder: "asc" | "desc";
            metadata?: any;
            search?: string | undefined;
            sortBy?: "metadata" | "id" | "exchangeId" | "tradingPairId" | "timestamp" | "open" | "high" | "low" | "close" | "volume" | "quoteVolume" | "trades" | "timeframe" | undefined;
            exchangeId?: string | undefined;
            tradingPairId?: string | undefined;
            timestamp?: any;
            open?: any;
            high?: any;
            low?: any;
            close?: any;
            volume?: any;
            quoteVolume?: any;
            trades?: number | undefined;
            timeframe?: string | undefined;
        }, {
            metadata?: any;
            search?: string | undefined;
            page?: number | undefined;
            limit?: number | undefined;
            sortBy?: "metadata" | "id" | "exchangeId" | "tradingPairId" | "timestamp" | "open" | "high" | "low" | "close" | "volume" | "quoteVolume" | "trades" | "timeframe" | undefined;
            sortOrder?: "asc" | "desc" | undefined;
            exchangeId?: string | undefined;
            tradingPairId?: string | undefined;
            timestamp?: any;
            open?: any;
            high?: any;
            low?: any;
            close?: any;
            volume?: any;
            quoteVolume?: any;
            trades?: number | undefined;
            timeframe?: string | undefined;
        }>;
        summary: "Get all marketdatas with optional filtering and pagination";
        method: "GET";
        path: "/api/public/market-datas";
        responses: {
            200: z.ZodObject<{
                success: z.ZodLiteral<true>;
                data: z.ZodArray<z.ZodObject<{
                    id: z.ZodString;
                    exchangeId: z.ZodString;
                    tradingPairId: z.ZodString;
                    timestamp: z.ZodEffects<z.ZodUnion<[z.ZodString, z.ZodDate]>, Date, string | Date>;
                    open: z.ZodEffects<z.ZodUnion<[z.ZodNumber, z.ZodString]>, number, string | number>;
                    high: z.ZodEffects<z.ZodUnion<[z.ZodNumber, z.ZodString]>, number, string | number>;
                    low: z.ZodEffects<z.ZodUnion<[z.ZodNumber, z.ZodString]>, number, string | number>;
                    close: z.ZodEffects<z.ZodUnion<[z.ZodNumber, z.ZodString]>, number, string | number>;
                    volume: z.ZodEffects<z.ZodUnion<[z.ZodNumber, z.ZodString]>, number, string | number>;
                    quoteVolume: z.ZodOptional<z.ZodEffects<z.ZodUnion<[z.ZodNumber, z.ZodString]>, number, string | number>>;
                    trades: z.ZodOptional<z.ZodNumber>;
                    timeframe: z.ZodString;
                    metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
                }, "strip", z.ZodTypeAny, {
                    id: string;
                    exchangeId: string;
                    tradingPairId: string;
                    timestamp: Date;
                    open: number;
                    high: number;
                    low: number;
                    close: number;
                    volume: number;
                    timeframe: string;
                    metadata?: Record<string, any> | undefined;
                    quoteVolume?: number | undefined;
                    trades?: number | undefined;
                }, {
                    id: string;
                    exchangeId: string;
                    tradingPairId: string;
                    timestamp: string | Date;
                    open: string | number;
                    high: string | number;
                    low: string | number;
                    close: string | number;
                    volume: string | number;
                    timeframe: string;
                    metadata?: Record<string, any> | undefined;
                    quoteVolume?: string | number | undefined;
                    trades?: number | undefined;
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
                    exchangeId: string;
                    tradingPairId: string;
                    timestamp: Date;
                    open: number;
                    high: number;
                    low: number;
                    close: number;
                    volume: number;
                    timeframe: string;
                    metadata?: Record<string, any> | undefined;
                    quoteVolume?: number | undefined;
                    trades?: number | undefined;
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
                    exchangeId: string;
                    tradingPairId: string;
                    timestamp: string | Date;
                    open: string | number;
                    high: string | number;
                    low: string | number;
                    close: string | number;
                    volume: string | number;
                    timeframe: string;
                    metadata?: Record<string, any> | undefined;
                    quoteVolume?: string | number | undefined;
                    trades?: number | undefined;
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
        summary: "Get a marketdata by ID";
        method: "GET";
        path: "/api/public/market-datas/:id";
        responses: {
            200: z.ZodObject<{
                success: z.ZodLiteral<true>;
                data: z.ZodObject<{
                    id: z.ZodString;
                    exchangeId: z.ZodString;
                    tradingPairId: z.ZodString;
                    timestamp: z.ZodEffects<z.ZodUnion<[z.ZodString, z.ZodDate]>, Date, string | Date>;
                    open: z.ZodEffects<z.ZodUnion<[z.ZodNumber, z.ZodString]>, number, string | number>;
                    high: z.ZodEffects<z.ZodUnion<[z.ZodNumber, z.ZodString]>, number, string | number>;
                    low: z.ZodEffects<z.ZodUnion<[z.ZodNumber, z.ZodString]>, number, string | number>;
                    close: z.ZodEffects<z.ZodUnion<[z.ZodNumber, z.ZodString]>, number, string | number>;
                    volume: z.ZodEffects<z.ZodUnion<[z.ZodNumber, z.ZodString]>, number, string | number>;
                    quoteVolume: z.ZodOptional<z.ZodEffects<z.ZodUnion<[z.ZodNumber, z.ZodString]>, number, string | number>>;
                    trades: z.ZodOptional<z.ZodNumber>;
                    timeframe: z.ZodString;
                    metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
                }, "strip", z.ZodTypeAny, {
                    id: string;
                    exchangeId: string;
                    tradingPairId: string;
                    timestamp: Date;
                    open: number;
                    high: number;
                    low: number;
                    close: number;
                    volume: number;
                    timeframe: string;
                    metadata?: Record<string, any> | undefined;
                    quoteVolume?: number | undefined;
                    trades?: number | undefined;
                }, {
                    id: string;
                    exchangeId: string;
                    tradingPairId: string;
                    timestamp: string | Date;
                    open: string | number;
                    high: string | number;
                    low: string | number;
                    close: string | number;
                    volume: string | number;
                    timeframe: string;
                    metadata?: Record<string, any> | undefined;
                    quoteVolume?: string | number | undefined;
                    trades?: number | undefined;
                }>;
            }, "strip", z.ZodTypeAny, {
                success: true;
                data: {
                    id: string;
                    exchangeId: string;
                    tradingPairId: string;
                    timestamp: Date;
                    open: number;
                    high: number;
                    low: number;
                    close: number;
                    volume: number;
                    timeframe: string;
                    metadata?: Record<string, any> | undefined;
                    quoteVolume?: number | undefined;
                    trades?: number | undefined;
                };
            }, {
                success: true;
                data: {
                    id: string;
                    exchangeId: string;
                    tradingPairId: string;
                    timestamp: string | Date;
                    open: string | number;
                    high: string | number;
                    low: string | number;
                    close: string | number;
                    volume: string | number;
                    timeframe: string;
                    metadata?: Record<string, any> | undefined;
                    quoteVolume?: string | number | undefined;
                    trades?: number | undefined;
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
        summary: "Create a new marketdata";
        method: "POST";
        body: z.ZodObject<Omit<{
            id: z.ZodString;
            exchangeId: z.ZodString;
            tradingPairId: z.ZodString;
            timestamp: z.ZodEffects<z.ZodUnion<[z.ZodString, z.ZodDate]>, Date, string | Date>;
            open: z.ZodEffects<z.ZodUnion<[z.ZodNumber, z.ZodString]>, number, string | number>;
            high: z.ZodEffects<z.ZodUnion<[z.ZodNumber, z.ZodString]>, number, string | number>;
            low: z.ZodEffects<z.ZodUnion<[z.ZodNumber, z.ZodString]>, number, string | number>;
            close: z.ZodEffects<z.ZodUnion<[z.ZodNumber, z.ZodString]>, number, string | number>;
            volume: z.ZodEffects<z.ZodUnion<[z.ZodNumber, z.ZodString]>, number, string | number>;
            quoteVolume: z.ZodOptional<z.ZodEffects<z.ZodUnion<[z.ZodNumber, z.ZodString]>, number, string | number>>;
            trades: z.ZodOptional<z.ZodNumber>;
            timeframe: z.ZodString;
            metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
        }, "metadata" | "id">, "strip", z.ZodTypeAny, {
            exchangeId: string;
            tradingPairId: string;
            timestamp: Date;
            open: number;
            high: number;
            low: number;
            close: number;
            volume: number;
            timeframe: string;
            quoteVolume?: number | undefined;
            trades?: number | undefined;
        }, {
            exchangeId: string;
            tradingPairId: string;
            timestamp: string | Date;
            open: string | number;
            high: string | number;
            low: string | number;
            close: string | number;
            volume: string | number;
            timeframe: string;
            quoteVolume?: string | number | undefined;
            trades?: number | undefined;
        }>;
        path: "/api/public/market-datas";
        responses: {
            201: z.ZodObject<{
                success: z.ZodLiteral<true>;
                data: z.ZodObject<{
                    id: z.ZodString;
                    exchangeId: z.ZodString;
                    tradingPairId: z.ZodString;
                    timestamp: z.ZodEffects<z.ZodUnion<[z.ZodString, z.ZodDate]>, Date, string | Date>;
                    open: z.ZodEffects<z.ZodUnion<[z.ZodNumber, z.ZodString]>, number, string | number>;
                    high: z.ZodEffects<z.ZodUnion<[z.ZodNumber, z.ZodString]>, number, string | number>;
                    low: z.ZodEffects<z.ZodUnion<[z.ZodNumber, z.ZodString]>, number, string | number>;
                    close: z.ZodEffects<z.ZodUnion<[z.ZodNumber, z.ZodString]>, number, string | number>;
                    volume: z.ZodEffects<z.ZodUnion<[z.ZodNumber, z.ZodString]>, number, string | number>;
                    quoteVolume: z.ZodOptional<z.ZodEffects<z.ZodUnion<[z.ZodNumber, z.ZodString]>, number, string | number>>;
                    trades: z.ZodOptional<z.ZodNumber>;
                    timeframe: z.ZodString;
                    metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
                }, "strip", z.ZodTypeAny, {
                    id: string;
                    exchangeId: string;
                    tradingPairId: string;
                    timestamp: Date;
                    open: number;
                    high: number;
                    low: number;
                    close: number;
                    volume: number;
                    timeframe: string;
                    metadata?: Record<string, any> | undefined;
                    quoteVolume?: number | undefined;
                    trades?: number | undefined;
                }, {
                    id: string;
                    exchangeId: string;
                    tradingPairId: string;
                    timestamp: string | Date;
                    open: string | number;
                    high: string | number;
                    low: string | number;
                    close: string | number;
                    volume: string | number;
                    timeframe: string;
                    metadata?: Record<string, any> | undefined;
                    quoteVolume?: string | number | undefined;
                    trades?: number | undefined;
                }>;
            }, "strip", z.ZodTypeAny, {
                success: true;
                data: {
                    id: string;
                    exchangeId: string;
                    tradingPairId: string;
                    timestamp: Date;
                    open: number;
                    high: number;
                    low: number;
                    close: number;
                    volume: number;
                    timeframe: string;
                    metadata?: Record<string, any> | undefined;
                    quoteVolume?: number | undefined;
                    trades?: number | undefined;
                };
            }, {
                success: true;
                data: {
                    id: string;
                    exchangeId: string;
                    tradingPairId: string;
                    timestamp: string | Date;
                    open: string | number;
                    high: string | number;
                    low: string | number;
                    close: string | number;
                    volume: string | number;
                    timeframe: string;
                    metadata?: Record<string, any> | undefined;
                    quoteVolume?: string | number | undefined;
                    trades?: number | undefined;
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
        summary: "Update a marketdata";
        method: "PUT";
        body: z.ZodObject<{
            exchangeId: z.ZodOptional<z.ZodString>;
            tradingPairId: z.ZodOptional<z.ZodString>;
            timestamp: z.ZodOptional<z.ZodEffects<z.ZodUnion<[z.ZodString, z.ZodDate]>, Date, string | Date>>;
            open: z.ZodOptional<z.ZodEffects<z.ZodUnion<[z.ZodNumber, z.ZodString]>, number, string | number>>;
            high: z.ZodOptional<z.ZodEffects<z.ZodUnion<[z.ZodNumber, z.ZodString]>, number, string | number>>;
            low: z.ZodOptional<z.ZodEffects<z.ZodUnion<[z.ZodNumber, z.ZodString]>, number, string | number>>;
            close: z.ZodOptional<z.ZodEffects<z.ZodUnion<[z.ZodNumber, z.ZodString]>, number, string | number>>;
            volume: z.ZodOptional<z.ZodEffects<z.ZodUnion<[z.ZodNumber, z.ZodString]>, number, string | number>>;
            quoteVolume: z.ZodOptional<z.ZodOptional<z.ZodEffects<z.ZodUnion<[z.ZodNumber, z.ZodString]>, number, string | number>>>;
            trades: z.ZodOptional<z.ZodOptional<z.ZodNumber>>;
            timeframe: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            exchangeId?: string | undefined;
            tradingPairId?: string | undefined;
            timestamp?: Date | undefined;
            open?: number | undefined;
            high?: number | undefined;
            low?: number | undefined;
            close?: number | undefined;
            volume?: number | undefined;
            quoteVolume?: number | undefined;
            trades?: number | undefined;
            timeframe?: string | undefined;
        }, {
            exchangeId?: string | undefined;
            tradingPairId?: string | undefined;
            timestamp?: string | Date | undefined;
            open?: string | number | undefined;
            high?: string | number | undefined;
            low?: string | number | undefined;
            close?: string | number | undefined;
            volume?: string | number | undefined;
            quoteVolume?: string | number | undefined;
            trades?: number | undefined;
            timeframe?: string | undefined;
        }>;
        path: "/api/public/market-datas/:id";
        responses: {
            200: z.ZodObject<{
                success: z.ZodLiteral<true>;
                data: z.ZodObject<{
                    id: z.ZodString;
                    exchangeId: z.ZodString;
                    tradingPairId: z.ZodString;
                    timestamp: z.ZodEffects<z.ZodUnion<[z.ZodString, z.ZodDate]>, Date, string | Date>;
                    open: z.ZodEffects<z.ZodUnion<[z.ZodNumber, z.ZodString]>, number, string | number>;
                    high: z.ZodEffects<z.ZodUnion<[z.ZodNumber, z.ZodString]>, number, string | number>;
                    low: z.ZodEffects<z.ZodUnion<[z.ZodNumber, z.ZodString]>, number, string | number>;
                    close: z.ZodEffects<z.ZodUnion<[z.ZodNumber, z.ZodString]>, number, string | number>;
                    volume: z.ZodEffects<z.ZodUnion<[z.ZodNumber, z.ZodString]>, number, string | number>;
                    quoteVolume: z.ZodOptional<z.ZodEffects<z.ZodUnion<[z.ZodNumber, z.ZodString]>, number, string | number>>;
                    trades: z.ZodOptional<z.ZodNumber>;
                    timeframe: z.ZodString;
                    metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
                }, "strip", z.ZodTypeAny, {
                    id: string;
                    exchangeId: string;
                    tradingPairId: string;
                    timestamp: Date;
                    open: number;
                    high: number;
                    low: number;
                    close: number;
                    volume: number;
                    timeframe: string;
                    metadata?: Record<string, any> | undefined;
                    quoteVolume?: number | undefined;
                    trades?: number | undefined;
                }, {
                    id: string;
                    exchangeId: string;
                    tradingPairId: string;
                    timestamp: string | Date;
                    open: string | number;
                    high: string | number;
                    low: string | number;
                    close: string | number;
                    volume: string | number;
                    timeframe: string;
                    metadata?: Record<string, any> | undefined;
                    quoteVolume?: string | number | undefined;
                    trades?: number | undefined;
                }>;
            }, "strip", z.ZodTypeAny, {
                success: true;
                data: {
                    id: string;
                    exchangeId: string;
                    tradingPairId: string;
                    timestamp: Date;
                    open: number;
                    high: number;
                    low: number;
                    close: number;
                    volume: number;
                    timeframe: string;
                    metadata?: Record<string, any> | undefined;
                    quoteVolume?: number | undefined;
                    trades?: number | undefined;
                };
            }, {
                success: true;
                data: {
                    id: string;
                    exchangeId: string;
                    tradingPairId: string;
                    timestamp: string | Date;
                    open: string | number;
                    high: string | number;
                    low: string | number;
                    close: string | number;
                    volume: string | number;
                    timeframe: string;
                    metadata?: Record<string, any> | undefined;
                    quoteVolume?: string | number | undefined;
                    trades?: number | undefined;
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
        summary: "Delete a marketdata";
        method: "DELETE";
        path: "/api/public/market-datas/:id";
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
        summary: "Create multiple marketdatas";
        method: "POST";
        body: z.ZodObject<{
            data: z.ZodArray<z.ZodObject<Omit<{
                id: z.ZodString;
                exchangeId: z.ZodString;
                tradingPairId: z.ZodString;
                timestamp: z.ZodEffects<z.ZodUnion<[z.ZodString, z.ZodDate]>, Date, string | Date>;
                open: z.ZodEffects<z.ZodUnion<[z.ZodNumber, z.ZodString]>, number, string | number>;
                high: z.ZodEffects<z.ZodUnion<[z.ZodNumber, z.ZodString]>, number, string | number>;
                low: z.ZodEffects<z.ZodUnion<[z.ZodNumber, z.ZodString]>, number, string | number>;
                close: z.ZodEffects<z.ZodUnion<[z.ZodNumber, z.ZodString]>, number, string | number>;
                volume: z.ZodEffects<z.ZodUnion<[z.ZodNumber, z.ZodString]>, number, string | number>;
                quoteVolume: z.ZodOptional<z.ZodEffects<z.ZodUnion<[z.ZodNumber, z.ZodString]>, number, string | number>>;
                trades: z.ZodOptional<z.ZodNumber>;
                timeframe: z.ZodString;
                metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
            }, "metadata" | "id">, "strip", z.ZodTypeAny, {
                exchangeId: string;
                tradingPairId: string;
                timestamp: Date;
                open: number;
                high: number;
                low: number;
                close: number;
                volume: number;
                timeframe: string;
                quoteVolume?: number | undefined;
                trades?: number | undefined;
            }, {
                exchangeId: string;
                tradingPairId: string;
                timestamp: string | Date;
                open: string | number;
                high: string | number;
                low: string | number;
                close: string | number;
                volume: string | number;
                timeframe: string;
                quoteVolume?: string | number | undefined;
                trades?: number | undefined;
            }>, "many">;
        }, "strip", z.ZodTypeAny, {
            data: {
                exchangeId: string;
                tradingPairId: string;
                timestamp: Date;
                open: number;
                high: number;
                low: number;
                close: number;
                volume: number;
                timeframe: string;
                quoteVolume?: number | undefined;
                trades?: number | undefined;
            }[];
        }, {
            data: {
                exchangeId: string;
                tradingPairId: string;
                timestamp: string | Date;
                open: string | number;
                high: string | number;
                low: string | number;
                close: string | number;
                volume: string | number;
                timeframe: string;
                quoteVolume?: string | number | undefined;
                trades?: number | undefined;
            }[];
        }>;
        path: "/api/public/market-datas/bulk";
        responses: {
            201: z.ZodObject<{
                success: z.ZodLiteral<true>;
                data: z.ZodArray<z.ZodObject<{
                    id: z.ZodString;
                    exchangeId: z.ZodString;
                    tradingPairId: z.ZodString;
                    timestamp: z.ZodEffects<z.ZodUnion<[z.ZodString, z.ZodDate]>, Date, string | Date>;
                    open: z.ZodEffects<z.ZodUnion<[z.ZodNumber, z.ZodString]>, number, string | number>;
                    high: z.ZodEffects<z.ZodUnion<[z.ZodNumber, z.ZodString]>, number, string | number>;
                    low: z.ZodEffects<z.ZodUnion<[z.ZodNumber, z.ZodString]>, number, string | number>;
                    close: z.ZodEffects<z.ZodUnion<[z.ZodNumber, z.ZodString]>, number, string | number>;
                    volume: z.ZodEffects<z.ZodUnion<[z.ZodNumber, z.ZodString]>, number, string | number>;
                    quoteVolume: z.ZodOptional<z.ZodEffects<z.ZodUnion<[z.ZodNumber, z.ZodString]>, number, string | number>>;
                    trades: z.ZodOptional<z.ZodNumber>;
                    timeframe: z.ZodString;
                    metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
                }, "strip", z.ZodTypeAny, {
                    id: string;
                    exchangeId: string;
                    tradingPairId: string;
                    timestamp: Date;
                    open: number;
                    high: number;
                    low: number;
                    close: number;
                    volume: number;
                    timeframe: string;
                    metadata?: Record<string, any> | undefined;
                    quoteVolume?: number | undefined;
                    trades?: number | undefined;
                }, {
                    id: string;
                    exchangeId: string;
                    tradingPairId: string;
                    timestamp: string | Date;
                    open: string | number;
                    high: string | number;
                    low: string | number;
                    close: string | number;
                    volume: string | number;
                    timeframe: string;
                    metadata?: Record<string, any> | undefined;
                    quoteVolume?: string | number | undefined;
                    trades?: number | undefined;
                }>, "many">;
                count: z.ZodNumber;
            }, "strip", z.ZodTypeAny, {
                success: true;
                data: {
                    id: string;
                    exchangeId: string;
                    tradingPairId: string;
                    timestamp: Date;
                    open: number;
                    high: number;
                    low: number;
                    close: number;
                    volume: number;
                    timeframe: string;
                    metadata?: Record<string, any> | undefined;
                    quoteVolume?: number | undefined;
                    trades?: number | undefined;
                }[];
                count: number;
            }, {
                success: true;
                data: {
                    id: string;
                    exchangeId: string;
                    tradingPairId: string;
                    timestamp: string | Date;
                    open: string | number;
                    high: string | number;
                    low: string | number;
                    close: string | number;
                    volume: string | number;
                    timeframe: string;
                    metadata?: Record<string, any> | undefined;
                    quoteVolume?: string | number | undefined;
                    trades?: number | undefined;
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
        summary: "Update multiple marketdatas";
        method: "PUT";
        body: z.ZodObject<{
            where: z.ZodObject<{
                page: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
                limit: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
                sortBy: z.ZodOptional<z.ZodEnum<["id", "exchangeId", "tradingPairId", "timestamp", "open", "high", "low", "close", "volume", "quoteVolume", "trades", "timeframe", "metadata"]>>;
                sortOrder: z.ZodDefault<z.ZodOptional<z.ZodEnum<["asc", "desc"]>>>;
                search: z.ZodOptional<z.ZodString>;
                exchangeId: z.ZodOptional<z.ZodString>;
                tradingPairId: z.ZodOptional<z.ZodString>;
                timestamp: z.ZodOptional<z.ZodAny>;
                open: z.ZodOptional<z.ZodAny>;
                high: z.ZodOptional<z.ZodAny>;
                low: z.ZodOptional<z.ZodAny>;
                close: z.ZodOptional<z.ZodAny>;
                volume: z.ZodOptional<z.ZodAny>;
                quoteVolume: z.ZodOptional<z.ZodAny>;
                trades: z.ZodOptional<z.ZodNumber>;
                timeframe: z.ZodOptional<z.ZodString>;
                metadata: z.ZodOptional<z.ZodAny>;
            }, "strip", z.ZodTypeAny, {
                page: number;
                limit: number;
                sortOrder: "asc" | "desc";
                metadata?: any;
                search?: string | undefined;
                sortBy?: "metadata" | "id" | "exchangeId" | "tradingPairId" | "timestamp" | "open" | "high" | "low" | "close" | "volume" | "quoteVolume" | "trades" | "timeframe" | undefined;
                exchangeId?: string | undefined;
                tradingPairId?: string | undefined;
                timestamp?: any;
                open?: any;
                high?: any;
                low?: any;
                close?: any;
                volume?: any;
                quoteVolume?: any;
                trades?: number | undefined;
                timeframe?: string | undefined;
            }, {
                metadata?: any;
                search?: string | undefined;
                page?: number | undefined;
                limit?: number | undefined;
                sortBy?: "metadata" | "id" | "exchangeId" | "tradingPairId" | "timestamp" | "open" | "high" | "low" | "close" | "volume" | "quoteVolume" | "trades" | "timeframe" | undefined;
                sortOrder?: "asc" | "desc" | undefined;
                exchangeId?: string | undefined;
                tradingPairId?: string | undefined;
                timestamp?: any;
                open?: any;
                high?: any;
                low?: any;
                close?: any;
                volume?: any;
                quoteVolume?: any;
                trades?: number | undefined;
                timeframe?: string | undefined;
            }>;
            data: z.ZodObject<{
                exchangeId: z.ZodOptional<z.ZodString>;
                tradingPairId: z.ZodOptional<z.ZodString>;
                timestamp: z.ZodOptional<z.ZodEffects<z.ZodUnion<[z.ZodString, z.ZodDate]>, Date, string | Date>>;
                open: z.ZodOptional<z.ZodEffects<z.ZodUnion<[z.ZodNumber, z.ZodString]>, number, string | number>>;
                high: z.ZodOptional<z.ZodEffects<z.ZodUnion<[z.ZodNumber, z.ZodString]>, number, string | number>>;
                low: z.ZodOptional<z.ZodEffects<z.ZodUnion<[z.ZodNumber, z.ZodString]>, number, string | number>>;
                close: z.ZodOptional<z.ZodEffects<z.ZodUnion<[z.ZodNumber, z.ZodString]>, number, string | number>>;
                volume: z.ZodOptional<z.ZodEffects<z.ZodUnion<[z.ZodNumber, z.ZodString]>, number, string | number>>;
                quoteVolume: z.ZodOptional<z.ZodOptional<z.ZodEffects<z.ZodUnion<[z.ZodNumber, z.ZodString]>, number, string | number>>>;
                trades: z.ZodOptional<z.ZodOptional<z.ZodNumber>>;
                timeframe: z.ZodOptional<z.ZodString>;
            }, "strip", z.ZodTypeAny, {
                exchangeId?: string | undefined;
                tradingPairId?: string | undefined;
                timestamp?: Date | undefined;
                open?: number | undefined;
                high?: number | undefined;
                low?: number | undefined;
                close?: number | undefined;
                volume?: number | undefined;
                quoteVolume?: number | undefined;
                trades?: number | undefined;
                timeframe?: string | undefined;
            }, {
                exchangeId?: string | undefined;
                tradingPairId?: string | undefined;
                timestamp?: string | Date | undefined;
                open?: string | number | undefined;
                high?: string | number | undefined;
                low?: string | number | undefined;
                close?: string | number | undefined;
                volume?: string | number | undefined;
                quoteVolume?: string | number | undefined;
                trades?: number | undefined;
                timeframe?: string | undefined;
            }>;
        }, "strip", z.ZodTypeAny, {
            data: {
                exchangeId?: string | undefined;
                tradingPairId?: string | undefined;
                timestamp?: Date | undefined;
                open?: number | undefined;
                high?: number | undefined;
                low?: number | undefined;
                close?: number | undefined;
                volume?: number | undefined;
                quoteVolume?: number | undefined;
                trades?: number | undefined;
                timeframe?: string | undefined;
            };
            where: {
                page: number;
                limit: number;
                sortOrder: "asc" | "desc";
                metadata?: any;
                search?: string | undefined;
                sortBy?: "metadata" | "id" | "exchangeId" | "tradingPairId" | "timestamp" | "open" | "high" | "low" | "close" | "volume" | "quoteVolume" | "trades" | "timeframe" | undefined;
                exchangeId?: string | undefined;
                tradingPairId?: string | undefined;
                timestamp?: any;
                open?: any;
                high?: any;
                low?: any;
                close?: any;
                volume?: any;
                quoteVolume?: any;
                trades?: number | undefined;
                timeframe?: string | undefined;
            };
        }, {
            data: {
                exchangeId?: string | undefined;
                tradingPairId?: string | undefined;
                timestamp?: string | Date | undefined;
                open?: string | number | undefined;
                high?: string | number | undefined;
                low?: string | number | undefined;
                close?: string | number | undefined;
                volume?: string | number | undefined;
                quoteVolume?: string | number | undefined;
                trades?: number | undefined;
                timeframe?: string | undefined;
            };
            where: {
                metadata?: any;
                search?: string | undefined;
                page?: number | undefined;
                limit?: number | undefined;
                sortBy?: "metadata" | "id" | "exchangeId" | "tradingPairId" | "timestamp" | "open" | "high" | "low" | "close" | "volume" | "quoteVolume" | "trades" | "timeframe" | undefined;
                sortOrder?: "asc" | "desc" | undefined;
                exchangeId?: string | undefined;
                tradingPairId?: string | undefined;
                timestamp?: any;
                open?: any;
                high?: any;
                low?: any;
                close?: any;
                volume?: any;
                quoteVolume?: any;
                trades?: number | undefined;
                timeframe?: string | undefined;
            };
        }>;
        path: "/api/public/market-datas/bulk";
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
        summary: "Delete multiple marketdatas";
        method: "DELETE";
        body: z.ZodObject<{
            ids: z.ZodArray<z.ZodString, "many">;
        }, "strip", z.ZodTypeAny, {
            ids: string[];
        }, {
            ids: string[];
        }>;
        path: "/api/public/market-datas/bulk";
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
//# sourceMappingURL=market-data.d.ts.map