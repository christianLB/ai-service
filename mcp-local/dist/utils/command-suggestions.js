"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CommandSuggestionEngine = void 0;
const logger_1 = require("./logger");
class CommandSuggestionEngine {
    commandPatterns = new Map();
    contextHistory = [];
    constructor() {
        this.initializePatterns();
    }
    /**
     * Get command suggestions based on current context and user intent
     */
    async getSuggestions(context) {
        const suggestions = [];
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
            logger_1.logger.debug('Generated command suggestions:', {
                count: uniqueSuggestions.length,
                context: context.userIntent
            });
            return uniqueSuggestions.slice(0, 5); // Return top 5 suggestions
        }
        catch (error) {
            logger_1.logger.error('Error getting command suggestions:', error);
            return [];
        }
    }
    /**
     * Get suggestions based on user intent keywords
     */
    getIntentBasedSuggestions(intent) {
        const suggestions = [];
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
    getStateBasedSuggestions(context) {
        const suggestions = [];
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
    getWorkflowSuggestions(context) {
        const suggestions = [];
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
    deduplicateAndSort(suggestions) {
        const seen = new Set();
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
    initializePatterns() {
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
    learnFromExecution(command, context, success) {
        if (success) {
            logger_1.logger.debug('Learning from successful command execution:', { command, context: context.userIntent });
            // Could implement machine learning here to improve suggestions over time
        }
    }
}
exports.CommandSuggestionEngine = CommandSuggestionEngine;
//# sourceMappingURL=command-suggestions.js.map