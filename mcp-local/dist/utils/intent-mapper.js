"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.IntentMapper = void 0;
const logger_1 = require("./logger");
class IntentMapper {
    mappings = [];
    constructor() {
        this.initializeMappings();
    }
    /**
     * Map natural language intent to Make command
     */
    mapIntent(userInput) {
        const input = userInput.toLowerCase();
        let bestMatch = null;
        let highestConfidence = 0;
        for (const mapping of this.mappings) {
            const confidence = this.calculateConfidence(input, mapping.patterns);
            if (confidence > highestConfidence && confidence > 0.6) {
                highestConfidence = confidence;
                bestMatch = mapping;
            }
        }
        if (bestMatch) {
            logger_1.logger.info('Intent mapped successfully:', {
                input: userInput,
                target: bestMatch.makeTarget,
                confidence: highestConfidence
            });
            return {
                confidence: highestConfidence,
                makeTarget: bestMatch.makeTarget,
                args: bestMatch.args,
                confirm: bestMatch.confirm,
                description: bestMatch.description,
                category: bestMatch.category,
                prerequisites: bestMatch.prerequisites,
                followUp: bestMatch.followUp
            };
        }
        return null;
    }
    /**
     * Get contextual suggestions based on user intent
     */
    getSuggestions(userInput) {
        const input = userInput.toLowerCase();
        const suggestions = [];
        for (const mapping of this.mappings) {
            const confidence = this.calculateConfidence(input, mapping.patterns);
            if (confidence > 0.3) {
                suggestions.push({
                    confidence,
                    makeTarget: mapping.makeTarget,
                    args: mapping.args,
                    confirm: mapping.confirm,
                    description: mapping.description,
                    category: mapping.category,
                    prerequisites: mapping.prerequisites,
                    followUp: mapping.followUp
                });
            }
        }
        return suggestions
            .sort((a, b) => b.confidence - a.confidence)
            .slice(0, 5);
    }
    /**
     * Calculate confidence score for pattern matching with enhanced logic
     */
    calculateConfidence(input, patterns) {
        let bestScore = 0;
        const inputWords = input.toLowerCase().split(' ').filter(w => w.length > 0);
        for (const pattern of patterns) {
            const patternWords = pattern.toLowerCase().split(' ').filter(w => w.length > 0);
            let score = 0;
            // Check for exact match first (highest confidence)
            if (input === pattern.toLowerCase()) {
                return 1.0;
            }
            // Check if the entire pattern is contained in the input
            if (input.includes(pattern.toLowerCase())) {
                score = 0.95;
            }
            else {
                // Calculate word-level matching
                let matchedWords = 0;
                let totalImportance = 0;
                for (let i = 0; i < patternWords.length; i++) {
                    const word = patternWords[i];
                    const importance = i === 0 ? 2 : 1; // First word is more important
                    totalImportance += importance;
                    // Check for exact word match
                    if (inputWords.includes(word)) {
                        matchedWords += importance;
                    }
                    // Check for partial match (word is part of an input word)
                    else if (inputWords.some(iw => iw.includes(word) || word.includes(iw))) {
                        matchedWords += importance * 0.7;
                    }
                }
                // Calculate weighted score
                score = matchedWords / totalImportance;
                // Boost score if key action words match
                const actionWords = ['start', 'stop', 'run', 'build', 'test', 'deploy', 'migrate', 'check', 'status'];
                const hasActionMatch = actionWords.some(action => input.includes(action) && pattern.includes(action));
                if (hasActionMatch) {
                    score = Math.min(1.0, score * 1.2);
                }
                // Penalize if input has many extra words not in pattern
                const extraWords = inputWords.filter(w => !patternWords.some(pw => w.includes(pw) || pw.includes(w))).length;
                if (extraWords > 3) {
                    score *= 0.8;
                }
            }
            bestScore = Math.max(bestScore, score);
        }
        return Math.min(1.0, bestScore);
    }
    /**
     * Initialize semantic mappings
     */
    initializeMappings() {
        this.mappings = [
            // Development Environment
            {
                patterns: [
                    'start development', 'start dev', 'begin development', 'start working',
                    'launch development', 'boot up dev', 'fire up development',
                    'get development running', 'start dev environment', 'bring up dev',
                    'start', 'begin', 'launch', 'boot', 'start the project', 'get started',
                    'spin up', 'fire up', 'turn on', 'activate development', 'initialize',
                    'start coding', 'start the app', 'start the application', 'run the project'
                ],
                makeTarget: 'dev-up',
                description: 'Start the development environment with all services',
                category: 'development',
                followUp: ['dev-status']
            },
            {
                patterns: [
                    'check status', 'status check', 'is everything running', 'dev status',
                    'check services', 'service status', 'system status', 'health check',
                    'are services up', 'development status', 'check if running'
                ],
                makeTarget: 'dev-status',
                description: 'Check the status of all development services',
                category: 'development'
            },
            {
                patterns: [
                    'restart dev', 'refresh dev', 'reload development', 'refresh environment',
                    'reset dev environment', 'restart development', 'refresh services'
                ],
                makeTarget: 'dev-refresh',
                description: 'Refresh the development environment',
                category: 'development',
                prerequisites: ['This will restart all services']
            },
            {
                patterns: [
                    'stop development', 'stop dev', 'shut down dev', 'stop services',
                    'bring down dev', 'stop dev environment', 'shutdown development'
                ],
                makeTarget: 'dev-down',
                description: 'Stop the development environment',
                category: 'development'
            },
            // Database Operations
            {
                patterns: [
                    'run migrations', 'apply migrations', 'migrate database', 'db migrate',
                    'update database', 'run db migrations', 'apply db changes'
                ],
                makeTarget: 'db-migrate',
                description: 'Apply pending database migrations with automatic backup',
                category: 'database',
                prerequisites: ['Database backup will be created automatically']
            },
            {
                patterns: [
                    'backup database', 'create db backup', 'backup db', 'save database',
                    'database backup', 'backup data', 'create backup'
                ],
                makeTarget: 'db-backup',
                description: 'Create a database backup',
                category: 'database'
            },
            {
                patterns: [
                    'check migrations', 'migration status', 'db migration status',
                    'pending migrations', 'database migration status', 'check db migrations'
                ],
                makeTarget: 'db-migrate-status',
                description: 'Check the status of database migrations',
                category: 'database'
            },
            {
                patterns: [
                    'check database', 'test db', 'verify database', 'db health',
                    'database connectivity', 'check db connection', 'test database connection'
                ],
                makeTarget: 'check-db',
                description: 'Verify database connectivity and health',
                category: 'database'
            },
            // Testing and Quality
            {
                patterns: [
                    'run tests', 'execute tests', 'test code', 'run test suite',
                    'validate code', 'check tests', 'testing', 'run unit tests'
                ],
                makeTarget: 'test',
                description: 'Run the complete test suite',
                category: 'testing'
            },
            {
                patterns: [
                    'check types', 'typecheck', 'validate types', 'typescript check',
                    'type validation', 'check typescript', 'ts check'
                ],
                makeTarget: 'typecheck',
                description: 'Validate TypeScript types across the project',
                category: 'testing'
            },
            {
                patterns: [
                    'lint code', 'run linter', 'check code style', 'validate code style',
                    'code quality check', 'style check', 'lint'
                ],
                makeTarget: 'lint',
                description: 'Check code style and quality with linter',
                category: 'testing'
            },
            {
                patterns: [
                    'health check', 'system health', 'check health', 'validate system',
                    'comprehensive check', 'full health check', 'system validation'
                ],
                makeTarget: 'health',
                description: 'Comprehensive system health check',
                category: 'testing'
            },
            // Financial Operations
            {
                patterns: [
                    'sync financial data', 'update financial', 'financial sync',
                    'sync from production', 'update financial database', 'financial data sync'
                ],
                makeTarget: 'financial-sync',
                description: 'Synchronize financial data from production',
                category: 'financial',
                prerequisites: ['Database backup will be created'],
                confirm: true
            },
            {
                patterns: [
                    'validate financial data', 'check financial integrity', 'financial validation',
                    'verify financial data', 'financial data check', 'audit financial data'
                ],
                makeTarget: 'financial-validate',
                description: 'Validate financial data integrity',
                category: 'financial'
            },
            // Trading Operations
            {
                patterns: [
                    'start trading', 'launch trading', 'trading up', 'start trading services',
                    'enable trading', 'boot trading', 'trading start'
                ],
                makeTarget: 'trading-up',
                description: 'Start trading services',
                category: 'trading',
                prerequisites: ['API keys must be configured']
            },
            {
                patterns: [
                    'trading status', 'check trading', 'trading health', 'trading services status',
                    'trading system status', 'check trading services'
                ],
                makeTarget: 'trading-status',
                description: 'Check trading services status',
                category: 'trading'
            },
            {
                patterns: [
                    'stop trading', 'trading down', 'disable trading', 'shutdown trading',
                    'stop trading services', 'trading stop'
                ],
                makeTarget: 'trading-down',
                description: 'Stop trading services',
                category: 'trading'
            },
            // Common Development Tasks
            {
                patterns: [
                    'build', 'compile', 'build project', 'compile code', 'create build',
                    'make build', 'build the app', 'compile application', 'generate build'
                ],
                makeTarget: 'build',
                description: 'Build the project',
                category: 'development'
            },
            {
                patterns: [
                    'clean', 'cleanup', 'clean build', 'remove build', 'clean project',
                    'clear cache', 'reset build', 'clean everything', 'fresh start'
                ],
                makeTarget: 'clean',
                description: 'Clean build artifacts and temporary files',
                category: 'development'
            },
            {
                patterns: [
                    'install', 'install dependencies', 'npm install', 'install packages',
                    'setup dependencies', 'get dependencies', 'install requirements'
                ],
                makeTarget: 'install',
                description: 'Install project dependencies',
                category: 'development'
            },
            {
                patterns: [
                    'generate', 'create crud', 'generate crud', 'create model', 'scaffold',
                    'generate code', 'create component', 'generate service', 'make crud'
                ],
                makeTarget: 'generate:crud:auto',
                description: 'Generate CRUD operations for a model',
                category: 'development',
                prerequisites: ['Model must exist in Prisma schema']
            },
            {
                patterns: [
                    'logs', 'show logs', 'view logs', 'check logs', 'see logs',
                    'dev logs', 'development logs', 'container logs', 'service logs'
                ],
                makeTarget: 'dev-logs',
                description: 'View development service logs',
                category: 'development'
            },
            {
                patterns: [
                    'problems', 'issues', 'errors', 'what\'s wrong', 'debug', 'troubleshoot',
                    'not working', 'broken', 'fix', 'help', 'something wrong'
                ],
                makeTarget: 'dev-status',
                description: 'Check status to identify problems',
                category: 'development',
                followUp: ['dev-logs', 'health']
            },
            // Database Advanced
            {
                patterns: [
                    'create migration', 'new migration', 'add migration', 'make migration',
                    'database change', 'schema change', 'alter database', 'modify schema'
                ],
                makeTarget: 'db-migrate-create',
                description: 'Create a new database migration',
                category: 'database',
                prerequisites: ['NAME parameter required']
            },
            {
                patterns: [
                    'prisma studio', 'database ui', 'db studio', 'visual database',
                    'database browser', 'explore database', 'db ui', 'database viewer'
                ],
                makeTarget: 'db-studio',
                description: 'Open Prisma Studio for visual database exploration',
                category: 'database'
            },
            // Deployment and Production
            {
                patterns: [
                    'deploy', 'deploy to production', 'production deploy', 'release',
                    'push to production', 'go live', 'ship it', 'deploy app'
                ],
                makeTarget: 'deploy',
                description: 'Deploy to production',
                category: 'deployment',
                confirm: true,
                prerequisites: ['Tests must pass', 'Build must succeed']
            },
            // MCP Operations
            {
                patterns: [
                    'deploy mcp', 'mcp deploy', 'start mcp bridge', 'deploy mcp bridge',
                    'launch mcp', 'mcp up', 'start mcp server'
                ],
                makeTarget: 'mcp-deploy',
                description: 'Deploy MCP bridge server',
                category: 'mcp'
            },
            {
                patterns: [
                    'mcp status', 'check mcp', 'mcp health', 'mcp server status',
                    'bridge status', 'mcp bridge status'
                ],
                makeTarget: 'mcp-status',
                description: 'Check MCP bridge server status',
                category: 'mcp'
            },
            // Build and Deployment
            {
                patterns: [
                    'build project', 'compile code', 'build application', 'create build',
                    'run build', 'build frontend', 'compile frontend'
                ],
                makeTarget: 'build-frontend',
                description: 'Build the frontend application',
                category: 'build'
            },
            // Authentication
            {
                patterns: [
                    'get auth token', 'generate token', 'authentication token', 'auth token',
                    'get token', 'create auth token', 'login token'
                ],
                makeTarget: 'auth-token',
                description: 'Generate authentication token for API access',
                category: 'authentication'
            },
            // Complex Workflows
            {
                patterns: [
                    'work on database', 'database development', 'db work', 'database features',
                    'database changes', 'work with database', 'database development'
                ],
                makeTarget: 'dev-status',
                description: 'Check development status before database work',
                category: 'development',
                followUp: ['db-migrate-status', 'check-db']
            },
            {
                patterns: [
                    'work on trading', 'trading development', 'trading features', 'crypto work',
                    'trading system', 'work with trading', 'develop trading features'
                ],
                makeTarget: 'trading-status',
                description: 'Check trading system status',
                category: 'trading',
                followUp: ['dev-status']
            },
            {
                patterns: [
                    'work on frontend', 'ui development', 'frontend work', 'user interface',
                    'frontend features', 'ui work', 'frontend development'
                ],
                makeTarget: 'dev-status',
                description: 'Check development status for frontend work',
                category: 'development',
                followUp: ['build-frontend']
            },
            // Quality Assurance Workflows
            {
                patterns: [
                    'quality check', 'code quality', 'full validation', 'comprehensive check',
                    'validate everything', 'quality assurance', 'qa check', 'complete validation'
                ],
                makeTarget: 'test',
                description: 'Run comprehensive quality validation',
                category: 'testing',
                followUp: ['typecheck', 'lint', 'health']
            },
            // Deployment Preparation
            {
                patterns: [
                    'prepare for deployment', 'deployment prep', 'pre deployment', 'deploy prep',
                    'ready for deployment', 'deployment check', 'validate for deployment'
                ],
                makeTarget: 'health',
                description: 'Comprehensive pre-deployment validation',
                category: 'deployment',
                followUp: ['test', 'typecheck', 'lint']
            }
        ];
        logger_1.logger.info(`Initialized ${this.mappings.length} intent mappings`);
    }
    /**
     * Add custom mapping (for learning/adaptation)
     */
    addMapping(mapping) {
        this.mappings.push(mapping);
        logger_1.logger.info('Added custom intent mapping:', { target: mapping.makeTarget });
    }
    /**
     * Get all available mappings for debugging
     */
    getAllMappings() {
        return this.mappings;
    }
}
exports.IntentMapper = IntentMapper;
//# sourceMappingURL=intent-mapper.js.map