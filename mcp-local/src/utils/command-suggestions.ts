import { logger } from './logger';

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

export class CommandSuggestionEngine {
  private commandPatterns: Map<string, string[]> = new Map();
  private contextHistory: Context[] = [];

  constructor() {
    this.initializePatterns();
  }

  /**
   * Get command suggestions based on current context and user intent
   */
  async getSuggestions(context: Context): Promise<Suggestion[]> {
    const suggestions: Suggestion[] = [];
    
    try {
      // Store context for learning
      this.contextHistory.push(context);
      if (this.contextHistory.length > 10) {
        this.contextHistory.shift();
      }

      // Intent-based suggestions
      if (context.userIntent) {
        suggestions.push(...this.getIntentBasedSuggestions(context.userIntent));
      }

      // State-based suggestions
      suggestions.push(...this.getStateBasedSuggestions(context));

      // Workflow-based suggestions
      suggestions.push(...this.getWorkflowSuggestions(context));

      // Sort by priority and remove duplicates
      const uniqueSuggestions = this.deduplicateAndSort(suggestions);
      
      logger.debug('Generated command suggestions:', {
        count: uniqueSuggestions.length,
        context: context.userIntent
      });

      return uniqueSuggestions.slice(0, 5); // Return top 5 suggestions

    } catch (error) {
      logger.error('Error getting command suggestions:', error);
      return [];
    }
  }

  /**
   * Get suggestions based on user intent keywords
   */
  private getIntentBasedSuggestions(intent: string): Suggestion[] {
    const suggestions: Suggestion[] = [];
    const lowerIntent = intent.toLowerCase();

    // Development workflow patterns
    if (lowerIntent.includes('start') || lowerIntent.includes('begin') || lowerIntent.includes('develop')) {
      suggestions.push({
        command: 'dev-up',
        reason: 'Start development environment',
        priority: 'high',
        category: 'development',
        safetyLevel: 'safe'
      });
      suggestions.push({
        command: 'dev-status',
        reason: 'Check if services are running',
        priority: 'medium',
        category: 'development',
        safetyLevel: 'safe'
      });
    }

    // Database operations
    if (lowerIntent.includes('database') || lowerIntent.includes('migration') || lowerIntent.includes('schema')) {
      suggestions.push({
        command: 'db-migrate-status',
        reason: 'Check current migration status',
        priority: 'high',
        category: 'database',
        safetyLevel: 'safe'
      });
      suggestions.push({
        command: 'db-backup',
        reason: 'Create backup before changes',
        priority: 'high',
        category: 'database',
        prerequisites: ['AI Service running'],
        safetyLevel: 'warning'
      });
    }

    // Testing and quality
    if (lowerIntent.includes('test') || lowerIntent.includes('quality') || lowerIntent.includes('check')) {
      suggestions.push({
        command: 'test',
        reason: 'Run test suite',
        priority: 'high',
        category: 'quality',
        safetyLevel: 'safe'
      });
      suggestions.push({
        command: 'typecheck',
        reason: 'Validate TypeScript types',
        priority: 'medium',
        category: 'quality',
        safetyLevel: 'safe'
      });
    }

    // Financial operations
    if (lowerIntent.includes('financial') || lowerIntent.includes('invoice') || lowerIntent.includes('client')) {
      suggestions.push({
        command: 'financial-validate',
        reason: 'Validate financial data integrity',
        priority: 'high',
        category: 'financial',
        safetyLevel: 'safe'
      });
      suggestions.push({
        command: 'financial-sync',
        reason: 'Sync financial data from production',
        priority: 'medium',
        category: 'financial',
        prerequisites: ['Database backup', 'Production access'],
        safetyLevel: 'warning'
      });
    }

    // Trading operations
    if (lowerIntent.includes('trading') || lowerIntent.includes('market') || lowerIntent.includes('crypto')) {
      suggestions.push({
        command: 'trading-status',
        reason: 'Check trading services status',
        priority: 'high',
        category: 'trading',
        safetyLevel: 'safe'
      });
      suggestions.push({
        command: 'trading-up',
        reason: 'Start trading services',
        priority: 'medium',
        category: 'trading',
        prerequisites: ['API keys configured'],
        safetyLevel: 'warning'
      });
    }

    // Deployment operations
    if (lowerIntent.includes('deploy') || lowerIntent.includes('production') || lowerIntent.includes('release')) {
      suggestions.push({
        command: 'health',
        reason: 'Validate system health before deployment',
        priority: 'high',
        category: 'deployment',
        safetyLevel: 'safe'
      });
      suggestions.push({
        command: 'deploy-safe',
        reason: 'Safe deployment with validations',
        priority: 'medium',
        category: 'deployment',
        prerequisites: ['Tests passing', 'Build successful', 'Health checks pass'],
        safetyLevel: 'dangerous'
      });
    }

    return suggestions;
  }

  /**
   * Get suggestions based on current project state
   */
  private getStateBasedSuggestions(context: Context): Suggestion[] {
    const suggestions: Suggestion[] = [];

    // If services are not running
    if (context.projectState?.servicesRunning === false) {
      suggestions.push({
        command: 'dev-up',
        reason: 'Services appear to be down',
        priority: 'high',
        category: 'development',
        safetyLevel: 'safe'
      });
    }

    // If database is not connected
    if (context.projectState?.databaseConnected === false) {
      suggestions.push({
        command: 'check-db',
        reason: 'Database connectivity issues detected',
        priority: 'high',
        category: 'database',
        safetyLevel: 'safe'
      });
    }

    // If migrations are pending
    if (context.projectState?.migrationsApplied === false) {
      suggestions.push({
        command: 'db-migrate-status',
        reason: 'Check for pending migrations',
        priority: 'high',
        category: 'database',
        safetyLevel: 'safe'
      });
      suggestions.push({
        command: 'db-migrate',
        reason: 'Apply pending migrations',
        priority: 'medium',
        category: 'database',
        prerequisites: ['Database backup'],
        safetyLevel: 'warning'
      });
    }

    // If tests are failing
    if (context.projectState?.testsPassings === false) {
      suggestions.push({
        command: 'test',
        reason: 'Fix failing tests',
        priority: 'high',
        category: 'quality',
        safetyLevel: 'safe'
      });
      suggestions.push({
        command: 'typecheck',
        reason: 'Check for type errors',
        priority: 'medium',
        category: 'quality',
        safetyLevel: 'safe'
      });
    }

    return suggestions;
  }

  /**
   * Get workflow-based suggestions based on recent command patterns
   */
  private getWorkflowSuggestions(context: Context): Suggestion[] {
    const suggestions: Suggestion[] = [];
    const recentCommands = context.recentCommands || [];

    // After dev-up, suggest status check
    if (recentCommands.includes('dev-up')) {
      suggestions.push({
        command: 'dev-status',
        reason: 'Verify services started correctly',
        priority: 'medium',
        category: 'development',
        safetyLevel: 'safe'
      });
    }

    // After migration creation, suggest applying it
    if (recentCommands.some(cmd => cmd.includes('db-migrate-create'))) {
      suggestions.push({
        command: 'db-migrate',
        reason: 'Apply the newly created migration',
        priority: 'high',
        category: 'database',
        prerequisites: ['Database backup'],
        safetyLevel: 'warning'
      });
    }

    // After code changes, suggest testing
    if (recentCommands.some(cmd => cmd.includes('edit') || cmd.includes('create'))) {
      suggestions.push({
        command: 'test',
        reason: 'Validate changes with tests',
        priority: 'medium',
        category: 'quality',
        safetyLevel: 'safe'
      });
    }

    // Before deployment, suggest quality checks
    if (recentCommands.some(cmd => cmd.includes('deploy'))) {
      suggestions.push({
        command: 'health',
        reason: 'Final health check before deployment',
        priority: 'high',
        category: 'deployment',
        safetyLevel: 'safe'
      });
    }

    return suggestions;
  }

  /**
   * Remove duplicates and sort by priority
   */
  private deduplicateAndSort(suggestions: Suggestion[]): Suggestion[] {
    const seen = new Set<string>();
    const unique = suggestions.filter(suggestion => {
      if (seen.has(suggestion.command)) {
        return false;
      }
      seen.add(suggestion.command);
      return true;
    });

    return unique.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });
  }

  /**
   * Initialize command patterns for learning
   */
  private initializePatterns(): void {
    this.commandPatterns.set('development', ['dev-up', 'dev-down', 'dev-refresh', 'dev-status']);
    this.commandPatterns.set('database', ['db-migrate', 'db-backup', 'db-migrate-status', 'check-db']);
    this.commandPatterns.set('testing', ['test', 'typecheck', 'lint', 'health']);
    this.commandPatterns.set('financial', ['financial-sync', 'financial-validate', 'financial-backup']);
    this.commandPatterns.set('trading', ['trading-up', 'trading-status', 'trading-positions']);
    this.commandPatterns.set('deployment', ['deploy-safe', 'health', 'production-status']);
  }

  /**
   * Learn from successful command executions
   */
  learnFromExecution(command: string, context: Context, success: boolean): void {
    if (success) {
      logger.debug('Learning from successful command execution:', { command, context: context.userIntent });
      // Could implement machine learning here to improve suggestions over time
    }
  }
}