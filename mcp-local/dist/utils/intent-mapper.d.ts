interface IntentMapping {
    patterns: string[];
    makeTarget: string;
    args?: Record<string, any>;
    confirm?: boolean;
    description: string;
    category: string;
    prerequisites?: string[];
    followUp?: string[];
}
interface MappingResult {
    confidence: number;
    makeTarget: string;
    args?: Record<string, any>;
    confirm?: boolean;
    description: string;
    category: string;
    prerequisites?: string[];
    followUp?: string[];
}
export declare class IntentMapper {
    private mappings;
    constructor();
    /**
     * Map natural language intent to Make command
     */
    mapIntent(userInput: string): MappingResult | null;
    /**
     * Get contextual suggestions based on user intent
     */
    getSuggestions(userInput: string): MappingResult[];
    /**
     * Calculate confidence score for pattern matching with enhanced logic
     */
    private calculateConfidence;
    /**
     * Initialize semantic mappings
     */
    private initializeMappings;
    /**
     * Add custom mapping (for learning/adaptation)
     */
    addMapping(mapping: IntentMapping): void;
    /**
     * Get all available mappings for debugging
     */
    getAllMappings(): IntentMapping[];
}
export {};
//# sourceMappingURL=intent-mapper.d.ts.map