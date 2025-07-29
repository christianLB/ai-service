import { logger } from './logger';

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

export class IntentMapper {
  private mappings: IntentMapping[] = [];

  constructor() {
    this.initializeMappings();
  }

  /**
   * Map natural language intent to Make command
   */
  mapIntent(userInput: string): MappingResult | null {
    const input = userInput.toLowerCase();
    let bestMatch: IntentMapping | null = null;
    let highestConfidence = 0;

    for (const mapping of this.mappings) {
      const confidence = this.calculateConfidence(input, mapping.patterns);
      if (confidence > highestConfidence && confidence > 0.6) {
        highestConfidence = confidence;
        bestMatch = mapping;
      }
    }

    if (bestMatch) {
      logger.info('Intent mapped successfully:', {
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
  getSuggestions(userInput: string): MappingResult[] {
    const input = userInput.toLowerCase();
    const suggestions: (MappingResult & { confidence: number })[] = [];

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
   * Calculate confidence score for pattern matching
   */
  private calculateConfidence(input: string, patterns: string[]): number {
    let totalScore = 0;
    let matchedPatterns = 0;

    for (const pattern of patterns) {
      const patternWords = pattern.toLowerCase().split(' ');
      let patternScore = 0;

      for (const word of patternWords) {
        if (input.includes(word)) {
          patternScore += 1;
        }
      }

      const wordMatchRatio = patternScore / patternWords.length;
      if (wordMatchRatio > 0) {
        totalScore += wordMatchRatio;
        matchedPatterns++;
      }
    }

    return matchedPatterns > 0 ? totalScore / patterns.length : 0;
  }

  /**
   * Initialize semantic mappings
   */
  private initializeMappings(): void {
    this.mappings = [
      // Development Environment
      {
        patterns: [
          'start development', 'start dev', 'begin development', 'start working',
          'launch development', 'boot up dev', 'fire up development',
          'get development running', 'start dev environment', 'bring up dev'
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

    logger.info(`Initialized ${this.mappings.length} intent mappings`);
  }

  /**
   * Add custom mapping (for learning/adaptation)
   */
  addMapping(mapping: IntentMapping): void {
    this.mappings.push(mapping);
    logger.info('Added custom intent mapping:', { target: mapping.makeTarget });
  }

  /**
   * Get all available mappings for debugging
   */
  getAllMappings(): IntentMapping[] {
    return this.mappings;
  }
}