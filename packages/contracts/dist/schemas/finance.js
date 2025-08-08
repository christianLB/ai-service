"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TransactionsResponse = exports.AccountsResponse = exports.Transaction = exports.Account = void 0;
const zod_1 = require("zod");
const common_1 = require("./common");
exports.Account = zod_1.z.object({
    id: common_1.UUID,
    provider: zod_1.z.string(),
    name: zod_1.z.string(),
    iban: zod_1.z.string().optional(),
    currency: common_1.Currency,
    createdAt: zod_1.z.string().datetime().optional(),
});
exports.Transaction = zod_1.z.object({
    id: common_1.UUID,
    accountId: common_1.UUID,
    bookingDate: common_1.ISODate,
    valueDate: common_1.ISODate.optional(),
    description: zod_1.z.string(),
    amount: common_1.Money,
    raw: zod_1.z.any().optional(),
    categoryId: common_1.UUID.optional(),
    meta: zod_1.z.record(zod_1.z.any()).optional(),
});
exports.AccountsResponse = zod_1.z.object({
    accounts: zod_1.z.array(exports.Account),
    total: zod_1.z.number(),
});
exports.TransactionsResponse = zod_1.z.object({
    transactions: zod_1.z.array(exports.Transaction),
    total: zod_1.z.number(),
    page: zod_1.z.number(),
    limit: zod_1.z.number(),
});
