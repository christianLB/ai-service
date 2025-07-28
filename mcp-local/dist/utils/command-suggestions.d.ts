interface Context {
    currentDirectory?: string;
    recentCommands?: string[];
    fileTypes?: string[];
    projectState?: {
        servicesRunning?: boolean;
        databaseConnected?: boolean;
        migrationsApplied?: boolean;
        testsPassings?: boolean;
    };
    userIntent?: string;
}
interface Suggestion {
    command: string;
    reason: string;
    priority: 'high' | 'medium' | 'low';
    category: string;
    prerequisites?: string[];
    safetyLevel: 'safe' | 'warning' | 'dangerous';
}
export declare class CommandSuggestionEngine {
    private commandPatterns;
    private contextHistory;
    constructor();
    /**
     * Get command suggestions based on current context and user intent
     */
    getSuggestions(context: Context): Promise<Suggestion[]>;
    /**
     * Get suggestions based on user intent keywords
     */
    private getIntentBasedSuggestions;
    /**
     * Get suggestions based on current project state
     */
    private getStateBasedSuggestions;
    /**
     * Get workflow-based suggestions based on recent command patterns
     */
    private getWorkflowSuggestions;
    /**
     * Remove duplicates and sort by priority
     */
    private deduplicateAndSort;
    /**
     * Initialize command patterns for learning
     */
    private initializePatterns;
    /**
     * Learn from successful command executions
     */
    learnFromExecution(command: string, context: Context, success: boolean): void;
}
export {};
//# sourceMappingURL=command-suggestions.d.ts.map