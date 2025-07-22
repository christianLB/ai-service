"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ToolExecutionRequestSchema = exports.ToolSchema = void 0;
const zod_1 = require("zod");
// MCP Tool Definition
exports.ToolSchema = zod_1.z.object({
    name: zod_1.z.string(),
    description: zod_1.z.string(),
    parameters: zod_1.z.record(zod_1.z.any()).optional().default({}),
    category: zod_1.z.enum(['financial', 'documents', 'system', 'trading']),
    requiresAuth: zod_1.z.boolean().optional().default(true),
});
// Tool execution request/response
exports.ToolExecutionRequestSchema = zod_1.z.object({
    tool: zod_1.z.string(),
    arguments: zod_1.z.record(zod_1.z.any()).optional().default({}),
});
//# sourceMappingURL=index.js.map