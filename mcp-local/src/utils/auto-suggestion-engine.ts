import { IntentMapper } from './intent-mapper';
import { CommandSuggestionEngine } from './command-suggestions';
import { logger } from './logger';

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

export class AutoSuggestionEngine {
  private intentMapper: IntentMapper;
  private suggestionEngine: CommandSuggestionEngine;

  constructor() {
    this.intentMapper = new IntentMapper();
    this.suggestionEngine = new CommandSuggestionEngine();
  }

  /**
   * Analyze user input and provide intelligent suggestions or direct mappings
   */
  async analyzeIntent(userInput: string, projectState?: any): Promise<AutoSuggestionResult> {
    logger.info('Analyzing user intent:', { input: userInput });

    const result: AutoSuggestionResult = {
      suggestions: [],
      shouldExecuteDirectly: false
    };

    try {
      // First, try direct intent mapping
      const directMapping = this.intentMapper.mapIntent(userInput);
      if (directMapping && directMapping.confidence > 0.8) {
        result.directMapping = {
          makeTarget: directMapping.makeTarget,
          args: directMapping.args,
          confirm: directMapping.confirm,
          description: directMapping.description,
          confidence: directMapping.confidence,
          followUp: directMapping.followUp
        };

        // Auto-execute if confidence is very high and command is safe
        result.shouldExecuteDirectly = (
          directMapping.confidence > 0.9 && 
          !directMapping.confirm &&
          this.isSafeForAutoExecution(directMapping.makeTarget)
        );
      }

      // Get contextual suggestions from intent mapper
      const intentSuggestions = this.intentMapper.getSuggestions(userInput);
      for (const suggestion of intentSuggestions) {
        result.suggestions.push({
          makeTarget: suggestion.makeTarget,
          description: suggestion.description,
          priority: this.mapConfidenceToPriority(suggestion.confidence),
          category: suggestion.category,
          safetyLevel: this.assessSafetyLevel(suggestion.makeTarget),
          confidence: suggestion.confidence
        });
      }

      // Get contextual suggestions from suggestion engine
      const context = {
        userIntent: userInput,
        projectState: projectState,
        currentDirectory: process.cwd()
      };

      const engineSuggestions = await this.suggestionEngine.getSuggestions(context);
      for (const suggestion of engineSuggestions) {
        result.suggestions.push({
          makeTarget: suggestion.command,
          description: suggestion.reason,
          priority: suggestion.priority,
          category: suggestion.category,
          safetyLevel: suggestion.safetyLevel,
          confidence: 0.7 // Default confidence for engine suggestions
        });
      }

      // Remove duplicates and sort by confidence
      result.suggestions = this.deduplicateSuggestions(result.suggestions);

      // Add contextual advice for complex workflows
      result.contextualAdvice = this.generateContextualAdvice(userInput, result.suggestions);

      logger.info('Intent analysis complete:', {
        directMapping: !!result.directMapping,
        suggestionsCount: result.suggestions.length,
        shouldExecuteDirectly: result.shouldExecuteDirectly
      });

      return result;

    } catch (error) {
      logger.error('Error analyzing intent:', error);
      return {
        suggestions: [],
        shouldExecuteDirectly: false
      };
    }
  }

  /**
   * Determine if a command is safe for automatic execution
   */
  private isSafeForAutoExecution(makeTarget: string): boolean {
    const safeCommands = [
      'dev-status', 'db-migrate-status', 'check-db', 'health',
      'trading-status', 'mcp-status', 'auth-token'
    ];
    
    return safeCommands.includes(makeTarget);
  }

  /**
   * Map confidence score to priority level
   */
  private mapConfidenceToPriority(confidence: number): 'high' | 'medium' | 'low' {
    if (confidence > 0.8) return 'high';
    if (confidence > 0.6) return 'medium';
    return 'low';
  }

  /**
   * Assess safety level of a make target
   */
  private assessSafetyLevel(makeTarget: string): 'safe' | 'warning' | 'dangerous' {
    const dangerousCommands = ['db-reset', 'dev-down', 'production-deploy'];
    const warningCommands = ['db-migrate', 'financial-sync', 'trading-up', 'dev-refresh'];
    
    if (dangerousCommands.some(cmd => makeTarget.includes(cmd))) {
      return 'dangerous';
    }
    if (warningCommands.some(cmd => makeTarget.includes(cmd))) {
      return 'warning';
    }
    return 'safe';
  }

  /**
   * Remove duplicate suggestions and sort by confidence + priority
   */
  private deduplicateSuggestions(suggestions: AutoSuggestionResult['suggestions']): AutoSuggestionResult['suggestions'] {
    const seen = new Set<string>();
    const unique = suggestions.filter(suggestion => {
      if (seen.has(suggestion.makeTarget)) {
        return false;
      }
      seen.add(suggestion.makeTarget);
      return true;
    });

    return unique.sort((a, b) => {
      // Sort by confidence first, then priority
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      const confidenceDiff = b.confidence - a.confidence;
      if (Math.abs(confidenceDiff) > 0.1) {
        return confidenceDiff;
      }
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    }).slice(0, 5); // Top 5 suggestions
  }

  /**
   * Generate contextual advice for complex workflows
   */
  private generateContextualAdvice(userInput: string, suggestions: AutoSuggestionResult['suggestions']): AutoSuggestionResult['contextualAdvice'] | undefined {
    const input = userInput.toLowerCase();

    // Database workflow
    if (input.includes('database') || input.includes('migration') || input.includes('db')) {
      return {
        category: 'database',
        workflow: [
          'Check development environment status',
          'Verify database connectivity',
          'Check migration status',
          'Create backup before changes',
          'Apply migrations if needed'
        ],
        nextSteps: ['dev-status', 'check-db', 'db-migrate-status']
      };
    }

    // Trading workflow
    if (input.includes('trading') || input.includes('crypto') || input.includes('market')) {
      return {
        category: 'trading',
        workflow: [
          'Verify API keys are configured',
          'Check development environment',
          'Start trading services',
          'Monitor trading status'
        ],
        nextSteps: ['dev-status', 'trading-status', 'trading-up']
      };
    }

    // Quality workflow
    if (input.includes('quality') || input.includes('test') || input.includes('validate')) {
      return {
        category: 'quality',
        workflow: [
          'Run test suite',
          'Validate TypeScript types',
          'Check code style',
          'Comprehensive health check'
        ],
        nextSteps: ['test', 'typecheck', 'lint', 'health']
      };
    }

    // Deployment workflow
    if (input.includes('deploy') || input.includes('production') || input.includes('release')) {
      return {
        category: 'deployment',
        workflow: [
          'Run comprehensive quality checks',
          'Validate system health',
          'Create backups',
          'Execute deployment'
        ],
        nextSteps: ['test', 'health', 'db-backup']
      };
    }

    return undefined;
  }

  /**
   * Learn from successful executions to improve future suggestions
   */
  learnFromExecution(userInput: string, executedCommand: string, success: boolean): void {
    if (success) {
      logger.info('Learning from successful execution:', {
        input: userInput,
        command: executedCommand
      });
      
      // Could implement machine learning here to improve mappings
      // For now, just log for future analysis
    }
  }

  /**
   * Get debug information about current mappings
   */
  getDebugInfo(): { mappingsCount: number; availableCommands: string[] } {
    const mappings = this.intentMapper.getAllMappings();
    return {
      mappingsCount: mappings.length,
      availableCommands: [...new Set(mappings.map(m => m.makeTarget))]
    };
  }
}