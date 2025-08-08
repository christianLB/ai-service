"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UUID = exports.ISODate = exports.Money = exports.Currency = void 0;
const zod_1 = require("zod");
exports.Currency = zod_1.z.string().min(3).max(3);
exports.Money = zod_1.z.object({
    amount: zod_1.z.string().regex(/^\-?\d+(\.\d{1,8})?$/),
    currency: exports.Currency,
});
exports.ISODate = zod_1.z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
exports.UUID = zod_1.z.string().uuid();
