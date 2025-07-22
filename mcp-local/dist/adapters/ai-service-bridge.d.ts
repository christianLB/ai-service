import { Tool } from '../types';
export declare class AIServiceBridge {
    private client;
    private cache;
    private cacheTTL;
    constructor(config: {
        url: string;
        authToken?: string;
        timeout?: number;
    });
    /**
     * Get available tools from AI Service
     */
    listTools(): Promise<Tool[]>;
    /**
     * Execute a tool through AI Service
     */
    executeTool(toolName: string, args: Record<string, any>): Promise<any>;
    /**
     * Execute tool using direct API endpoints (fallback)
     */
    private executeToolFallback;
    /**
     * Get fallback tool definitions
     */
    private getFallbackTools;
    /**
     * Cache management
     */
    private getFromCache;
    private setCache;
}
//# sourceMappingURL=ai-service-bridge.d.ts.map