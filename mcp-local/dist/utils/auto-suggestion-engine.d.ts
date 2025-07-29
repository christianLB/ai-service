interface AutoSuggestionResult {
    directMapping?: {
        makeTarget: string;
        args?: Record<string, any>;
        confirm?: boolean;
        description: string;
        confidence: number;
        followUp?: string[];
    };
    suggestions: Array<{
        makeTarget: string;
        description: string;
        priority: 'high' | 'medium' | 'low';
        category: string;
        safetyLevel: 'safe' | 'warning' | 'dangerous';
        confidence: number;
    }>;
    contextualAdvice?: {
        category: string;
        workflow: string[];
        nextSteps: string[];
    };
    shouldExecuteDirectly: boolean;
}
export declare class AutoSuggestionEngine {
    private intentMapper;
    private suggestionEngine;
    constructor();
    /**
     * Analyze user input and provide intelligent suggestions or direct mappings
     */
    analyzeIntent(userInput: string, projectState?: any): Promise<AutoSuggestionResult>;
    /**
     * Determine if a command is safe for automatic execution
     */
    private isSafeForAutoExecution;
    /**
     * Map confidence score to priority level
     */
    private mapConfidenceToPriority;
    /**
     * Assess safety level of a make target
     */
    private assessSafetyLevel;
    /**
     * Remove duplicate suggestions and sort by confidence + priority
     */
    private deduplicateSuggestions;
    /**
     * Generate contextual advice for complex workflows
     */
    private generateContextualAdvice;
    /**
     * Learn from successful executions to improve future suggestions
     */
    learnFromExecution(userInput: string, executedCommand: string, success: boolean): void;
    /**
     * Get debug information about current mappings
     */
    getDebugInfo(): {
        mappingsCount: number;
        availableCommands: string[];
    };
}
export {};
//# sourceMappingURL=auto-suggestion-engine.d.ts.map