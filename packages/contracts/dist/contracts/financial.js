"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.financialContract = void 0;
const core_1 = require("@ts-rest/core");
const zod_1 = require("zod");
const finance_1 = require("../schemas/finance");
const c = (0, core_1.initContract)();
exports.financialContract = c.router({
    listAccounts: {
        method: 'GET',
        path: `/api/financial/accounts`,
        responses: { 200: finance_1.AccountsResponse },
        query: zod_1.z.object({ provider: zod_1.z.string().optional() }),
        summary: 'List accounts',
    },
});
