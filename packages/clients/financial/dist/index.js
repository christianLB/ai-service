"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createFinancialClient = void 0;
const core_1 = require("@ts-rest/core");
const contracts_1 = require("@ai-service/contracts");
const createFinancialClient = (baseUrl, getHeaders) => {
    return (0, core_1.initClient)(contracts_1.financialContract, {
        baseUrl,
        baseHeaders: getHeaders ? getHeaders() : undefined
    });
};
exports.createFinancialClient = createFinancialClient;
