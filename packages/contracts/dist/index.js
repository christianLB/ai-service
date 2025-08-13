"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createAiServiceClient = exports.createClient = void 0;
const openapi_fetch_1 = __importDefault(require("openapi-fetch"));
exports.createClient = openapi_fetch_1.default;
const createAiServiceClient = (baseUrl) => (0, openapi_fetch_1.default)({ baseUrl });
exports.createAiServiceClient = createAiServiceClient;
