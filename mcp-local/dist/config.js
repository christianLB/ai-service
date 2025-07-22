"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.config = void 0;
const dotenv_1 = require("dotenv");
const zod_1 = require("zod");
const path_1 = __importDefault(require("path"));
// Load environment variables
(0, dotenv_1.config)({ path: path_1.default.join(__dirname, '..', '.env') });
// Configuration schema
const ConfigSchema = zod_1.z.object({
    aiService: zod_1.z.object({
        url: zod_1.z.string().url().default('http://localhost:3001'),
        authToken: zod_1.z.string().optional(),
        timeout: zod_1.z.number().default(30000),
    }),
    cache: zod_1.z.object({
        enabled: zod_1.z.boolean().default(true),
        ttl: zod_1.z.number().default(300), // 5 minutes
    }),
    logging: zod_1.z.object({
        level: zod_1.z.enum(['debug', 'info', 'warn', 'error']).default('info'),
    }),
});
// Parse and validate configuration
const configData = {
    aiService: {
        url: process.env.AI_SERVICE_URL || 'http://localhost:3001',
        authToken: process.env.AI_SERVICE_AUTH_TOKEN,
        timeout: parseInt(process.env.AI_SERVICE_TIMEOUT || '30000', 10),
    },
    cache: {
        enabled: process.env.CACHE_ENABLED !== 'false',
        ttl: parseInt(process.env.CACHE_TTL || '300', 10),
    },
    logging: {
        level: process.env.LOG_LEVEL || 'info',
    },
};
exports.config = ConfigSchema.parse(configData);
//# sourceMappingURL=config.js.map