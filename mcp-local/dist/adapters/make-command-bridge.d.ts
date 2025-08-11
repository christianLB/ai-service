import { Tool } from '../types';
interface MakeTarget {
    name: string;
    description: string;
    category: string;
    safety: 'safe' | 'warning' | 'dangerous';
    prerequisites?: string[];
}
interface MakeCommandResult {
    success: boolean;
    output: string;
    error?: string;
    duration: number;
    command: string;
}
export declare class MakeCommandBridge {
    private projectRoot;
    private safetyRules;
    private targetCache;
    private cacheExpiry;
    private suggestionEngine;
    private autoSuggestionEngine;
    constructor(projectRoot: string);
    /**
     * Load safety rules from .clauderc
     */
    private loadSafetyRules;
    /**
     * Get available Make command tools
     */
    getMakeTools(): Promise<Tool[]>;
    /**
     * Execute a Make command with safety validation
     */
    executeMakeCommand(target: string, args?: Record<string, any>, confirm?: boolean): Promise<MakeCommandResult>;
    /**
     * List available Make targets
     */
    listMakeTargets(category?: string): Promise<MakeTarget[]>;
    /**
     * Get help for a specific Make target
     */
    getMakeCommandHelp(target: string): Promise<{
        target: string;
        description: string;
        usage: string;
        safety: string;
        prerequisites?: string[];
    }>;
    /**
     * Validate prerequisites for a Make command
     */
    validateMakePrerequisites(target: string): Promise<{
        valid: boolean;
        missing: string[];
        warnings: string[];
    }>;
    /**
     * Check status of services and operations
     */
    getMakeCommandStatus(service?: string): Promise<{
        service: string;
        status: string;
        details: any;
    }[]>;
    /**
     * Primary entry point for Make command detection and execution
     * This should be called FIRST for any development-related request
     */
    checkMakeCommandsFirst(userRequest: string, autoExecute?: boolean): Promise<any>;
    /**
     * Analyze user intent and provide intelligent command suggestions or direct execution
     */
    analyzeUserIntent(intent?: string, currentState?: any): Promise<any>;
    /**
     * Get intelligent command suggestions based on context
     */
    getCommandSuggestions(intent?: string, currentState?: any): Promise<any>;
    /**
     * Validate safety of a Make command
     */
    private validateSafety;
    /**
     * Categorize a Make target
     */
    private categorizeTarget;
    /**
     * Assess safety level of a target
     */
    private assessTargetSafety;
}
export {};
//# sourceMappingURL=make-command-bridge.d.ts.map