"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.apiContract = exports.dashboardContract = exports.financialContract = exports.DashboardSchemas = exports.FinanceSchemas = exports.CommonSchemas = void 0;
// Schema exports
exports.CommonSchemas = __importStar(require("./schemas/common"));
exports.FinanceSchemas = __importStar(require("./schemas/finance"));
exports.DashboardSchemas = __importStar(require("./schemas/dashboard"));
// Contract exports
var financial_1 = require("./contracts/financial");
Object.defineProperty(exports, "financialContract", { enumerable: true, get: function () { return financial_1.financialContract; } });
var dashboard_1 = require("./contracts/dashboard");
Object.defineProperty(exports, "dashboardContract", { enumerable: true, get: function () { return dashboard_1.dashboardContract; } });
// Combined contract for server implementation
const core_1 = require("@ts-rest/core");
const financial_2 = require("./contracts/financial");
const dashboard_2 = require("./contracts/dashboard");
const c = (0, core_1.initContract)();
exports.apiContract = c.router({
    financial: financial_2.financialContract,
    dashboard: dashboard_2.dashboardContract,
});
