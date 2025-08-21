"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.QuickStats = exports.AccountStatus = exports.SyncStatus = exports.CashFlowProjections = exports.InvoiceStatistics = exports.RevenueMetrics = exports.ClientMetrics = void 0;
const zod_1 = require("zod");
// Minimal schema stubs to satisfy imports. Keep flexible to avoid tight coupling.
// If stricter typing is needed later, replace these with concrete field definitions.
exports.ClientMetrics = zod_1.z.any();
exports.RevenueMetrics = zod_1.z.any();
exports.InvoiceStatistics = zod_1.z.any();
exports.CashFlowProjections = zod_1.z.any();
exports.SyncStatus = zod_1.z.any();
exports.AccountStatus = zod_1.z.any();
exports.QuickStats = zod_1.z.any();
