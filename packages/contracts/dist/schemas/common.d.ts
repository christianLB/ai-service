import { z } from 'zod';
export declare const Currency: z.ZodString;
export declare const Money: z.ZodObject<{
    amount: z.ZodString;
    currency: z.ZodString;
}, "strip", z.ZodTypeAny, {
    amount: string;
    currency: string;
}, {
    amount: string;
    currency: string;
}>;
export declare const ISODate: z.ZodString;
export declare const UUID: z.ZodString;
