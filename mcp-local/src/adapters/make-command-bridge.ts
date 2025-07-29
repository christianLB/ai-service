import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs/promises';
import * as path from 'path';
import { Tool } from '../types';
import { logger } from '../utils/logger';
import { CommandSuggestionEngine } from '../utils/command-suggestions';
import { AutoSuggestionEngine } from '../utils/auto-suggestion-engine';

const execAsync = promisify(exec);

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

export class MakeCommandBridge {
  private projectRoot: string;
  private safetyRules: any;
  private targetCache: Map<string, MakeTarget[]> = new Map();
  private cacheExpiry: number = 300000; // 5 minutes
  private suggestionEngine: CommandSuggestionEngine;
  private autoSuggestionEngine: AutoSuggestionEngine;

  constructor(projectRoot: string) {
    this.projectRoot = projectRoot;
    this.suggestionEngine = new CommandSuggestionEngine();
    this.autoSuggestionEngine = new AutoSuggestionEngine();
    this.loadSafetyRules();
  }

  /**
   * Load safety rules from .clauderc
   */
  private async loadSafetyRules(): Promise<void> {
    try {
      const claudeRcPath = path.join(this.projectRoot, '.clauderc');
      const content = await fs.readFile(claudeRcPath, 'utf-8');
      const config = JSON.parse(content);
      this.safetyRules = config.safetyRules || {};
      logger.debug('Safety rules loaded from .clauderc');
    } catch (error) {
      logger.warn('Could not load safety rules from .clauderc:', error);
      this.safetyRules = {
        blockCommands: [],
        requireConfirmation: [],
        forbidden: []
      };
    }
  }

  /**
   * Get available Make command tools
   */
  async getMakeTools(): Promise<Tool[]> {
    return [
      {
        name: 'execute_make_command',
        description: 'Execute development commands like "start development", "run tests", "check status", or any Make target with safety validation',
        parameters: {
          target: { 
            type: 'string', 
            description: 'Make target to execute (e.g., dev-up, db-migrate)' 
          },
          args: { 
            type: 'object', 
            description: 'Optional arguments for the make command',
            properties: {
              NAME: { type: 'string', description: 'Name parameter for commands that require it' },
              ENV: { type: 'string', description: 'Environment parameter' }
            }
          },
          confirm: { 
            type: 'boolean', 
            description: 'Force confirmation for safety-sensitive commands',
            default: false
          }
        },
        category: 'development',
        requiresAuth: false,
      },
      {
        name: 'list_make_targets',
        description: 'List available Make targets by category',
        parameters: {
          category: { 
            type: 'string', 
            description: 'Filter by category (development, database, testing, quality, deployment)',
            enum: ['development', 'database', 'testing', 'quality', 'deployment', 'financial', 'trading', 'mcp', 'all']
          }
        },
        category: 'information',
        requiresAuth: false,
      },
      {
        name: 'make_command_help',
        description: 'Get help and description for a specific Make target',
        parameters: {
          target: { 
            type: 'string', 
            description: 'Make target to get help for' 
          }
        },
        category: 'information',
        requiresAuth: false,
      },
      {
        name: 'validate_make_prerequisites',
        description: 'Check if prerequisites are met for a Make command',
        parameters: {
          target: { 
            type: 'string', 
            description: 'Make target to validate' 
          }
        },
        category: 'validation',
        requiresAuth: false,
      },
      {
        name: 'make_command_status',
        description: 'Check status of services and operations',
        parameters: {
          service: { 
            type: 'string', 
            description: 'Service to check (dev, database, mcp, trading)',
            enum: ['dev', 'database', 'mcp', 'trading', 'all']
          }
        },
        category: 'monitoring',
        requiresAuth: false,
      },
      {
        name: 'analyze_user_intent',
        description: 'AUTOMATICALLY analyze user requests to suggest or execute appropriate development commands. Use this when users mention development tasks, system status, database work, testing, or any project-related activities.',
        parameters: {
          intent: { 
            type: 'string', 
            description: 'User intent or current task (e.g., "start development", "deploy to production")' 
          },
          currentState: {
            type: 'object',
            description: 'Current project state information',
            properties: {
              servicesRunning: { type: 'boolean', description: 'Are development services running' },
              databaseConnected: { type: 'boolean', description: 'Is database accessible' },
              testsPassings: { type: 'boolean', description: 'Are tests currently passing' }
            }
          }
        },
        category: 'intelligence',
        requiresAuth: false,
      },
      {
        name: 'get_command_suggestions',
        description: 'Get contextual command suggestions based on user intent - use for complex workflow planning',
        parameters: {
          intent: { 
            type: 'string', 
            description: 'User intent or current task (e.g., "start development", "deploy to production")' 
          },
          currentState: {
            type: 'object',
            description: 'Current project state information',
            properties: {
              servicesRunning: { type: 'boolean', description: 'Are development services running' },
              databaseConnected: { type: 'boolean', description: 'Is database accessible' },
              testsPassings: { type: 'boolean', description: 'Are tests currently passing' }
            }
          }
        },
        category: 'intelligence',
        requiresAuth: false,
      }
    ];
  }

  /**
   * Execute a Make command with safety validation
   */
  async executeMakeCommand(target: string, args: Record<string, any> = {}, confirm: boolean = false): Promise<MakeCommandResult> {
    const startTime = Date.now();
    
    try {
      // Validate safety first
      const safetyCheck = await this.validateSafety(target, confirm);
      if (!safetyCheck.safe) {
        return {
          success: false,
          output: '',
          error: safetyCheck.reason,
          duration: Date.now() - startTime,
          command: `make ${target}`
        };
      }

      // Build command with arguments
      let command = `make ${target}`;
      
      // Add arguments
      Object.entries(args).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          command += ` ${key}="${value}"`;
        }
      });

      logger.info(`Executing Make command: ${command}`);

      // Execute command in project root
      const { stdout, stderr } = await execAsync(command, {
        cwd: this.projectRoot,
        timeout: 300000, // 5 minute timeout
        env: { ...process.env }
      });

      const result: MakeCommandResult = {
        success: true,
        output: stdout + (stderr ? `\nSTDERR:\n${stderr}` : ''),
        duration: Date.now() - startTime,
        command
      };

      logger.info(`Make command completed in ${result.duration}ms`);
      // Learn from successful execution
      this.suggestionEngine.learnFromExecution(target, { userIntent: target }, true);
      
      return result;

    } catch (error: any) {
      const result: MakeCommandResult = {
        success: false,
        output: error.stdout || '',
        error: error.message || 'Command execution failed',
        duration: Date.now() - startTime,
        command: `make ${target}`
      };

      // Learn from failed execution
      this.suggestionEngine.learnFromExecution(target, { userIntent: target }, false);
      
      logger.error(`Make command failed:`, error);
      return result;
    }
  }

  /**
   * List available Make targets
   */
  async listMakeTargets(category?: string): Promise<MakeTarget[]> {
    const cacheKey = `targets_${category || 'all'}`;
    const cached = this.targetCache.get(cacheKey);
    
    if (cached) {
      return cached;
    }

    try {
      // Get all Make targets
      const { stdout } = await execAsync('grep -E "^[a-zA-Z0-9_-]+:" Makefile* | grep -E "##.*" | head -100', {
        cwd: this.projectRoot
      });

      const targets: MakeTarget[] = [];
      const lines = stdout.trim().split('\n');

      for (const line of lines) {
        const match = line.match(/^[^:]*:([^:]+):\s*##\s*(.+)$/);
        if (match) {
          const [, targetName, description] = match;
          const target: MakeTarget = {
            name: targetName.trim(),
            description: description.trim(),
            category: this.categorizeTarget(targetName.trim()),
            safety: this.assessTargetSafety(targetName.trim())
          };
          targets.push(target);
        }
      }

      // Filter by category if specified
      const filteredTargets = category && category !== 'all' 
        ? targets.filter(t => t.category === category)
        : targets;

      // Cache the results
      this.targetCache.set(cacheKey, filteredTargets);
      setTimeout(() => this.targetCache.delete(cacheKey), this.cacheExpiry);

      return filteredTargets;

    } catch (error: any) {
      logger.error('Failed to list Make targets:', error);
      return [];
    }
  }

  /**
   * Get help for a specific Make target
   */
  async getMakeCommandHelp(target: string): Promise<{ target: string; description: string; usage: string; safety: string; prerequisites?: string[] }> {
    const targets = await this.listMakeTargets();
    const targetInfo = targets.find(t => t.name === target);

    if (!targetInfo) {
      return {
        target,
        description: 'Target not found or no description available',
        usage: `make ${target}`,
        safety: 'unknown'
      };
    }

    return {
      target: targetInfo.name,
      description: targetInfo.description,
      usage: `make ${targetInfo.name}`,
      safety: targetInfo.safety,
      prerequisites: targetInfo.prerequisites
    };
  }

  /**
   * Validate prerequisites for a Make command
   */
  async validateMakePrerequisites(target: string): Promise<{ valid: boolean; missing: string[]; warnings: string[] }> {
    const missing: string[] = [];
    const warnings: string[] = [];

    try {
      // Check common prerequisites based on target category
      if (target.includes('dev-') || target.includes('db-')) {
        // Check if AI Service is running
        try {
          await execAsync('curl -s http://localhost:3001/api/health', { timeout: 5000 });
        } catch {
          if (target !== 'dev-up') {
            missing.push('AI Service not running (try: make dev-up)');
          }
        }
      }

      if (target.includes('db-')) {
        // Check database connectivity
        try {
          await execAsync('make check-db', { cwd: this.projectRoot, timeout: 10000 });
        } catch {
          warnings.push('Database connectivity check failed');
        }
      }

      if (target.includes('trading-')) {
        // Check trading service prerequisites
        const envFile = path.join(this.projectRoot, '.env.local');
        try {
          const content = await fs.readFile(envFile, 'utf-8');
          if (!content.includes('BINANCE_API_KEY') && !content.includes('ALPACA_API_KEY')) {
            warnings.push('Trading API keys not configured in .env.local');
          }
        } catch {
          missing.push('.env.local file not found');
        }
      }

      return {
        valid: missing.length === 0,
        missing,
        warnings
      };

    } catch (error: any) {
      logger.error('Error validating prerequisites:', error);
      return {
        valid: false,
        missing: ['Failed to validate prerequisites'],
        warnings: []
      };
    }
  }

  /**
   * Check status of services and operations
   */
  async getMakeCommandStatus(service?: string): Promise<{ service: string; status: string; details: any }[]> {
    const statuses: { service: string; status: string; details: any }[] = [];

    try {
      if (!service || service === 'all' || service === 'dev') {
        // Check development environment
        try {
          const { stdout } = await execAsync('make dev-status', { cwd: this.projectRoot, timeout: 15000 });
          statuses.push({
            service: 'development',
            status: 'running',
            details: { output: stdout.trim() }
          });
        } catch (error: any) {
          statuses.push({
            service: 'development',
            status: 'error',
            details: { error: error.message }
          });
        }
      }

      if (!service || service === 'all' || service === 'database') {
        // Check database
        try {
          const { stdout } = await execAsync('make check-db', { cwd: this.projectRoot, timeout: 10000 });
          statuses.push({
            service: 'database',
            status: 'healthy',
            details: { output: stdout.trim() }
          });
        } catch (error: any) {
          statuses.push({
            service: 'database',
            status: 'error',
            details: { error: error.message }
          });
        }
      }

      if (!service || service === 'all' || service === 'mcp') {
        // Check MCP status
        try {
          const { stdout } = await execAsync('make mcp-status', { cwd: this.projectRoot, timeout: 10000 });
          statuses.push({
            service: 'mcp',
            status: 'running',
            details: { output: stdout.trim() }
          });
        } catch (error: any) {
          statuses.push({
            service: 'mcp',
            status: 'stopped',
            details: { error: error.message }
          });
        }
      }

      return statuses;

    } catch (error: any) {
      logger.error('Error checking service status:', error);
      return [{
        service: service || 'unknown',
        status: 'error',
        details: { error: error.message }
      }];
    }
  }

  /**
   * Analyze user intent and provide intelligent command suggestions or direct execution
   */
  async analyzeUserIntent(intent?: string, currentState?: any): Promise<any> {
    try {
      if (!intent) {
        return {
          error: 'No intent provided',
          suggestions: []
        };
      }

      const analysis = await this.autoSuggestionEngine.analyzeIntent(intent, currentState);
      
      return {
        intent: intent,
        analysis: {
          directMapping: analysis.directMapping,
          shouldExecuteDirectly: analysis.shouldExecuteDirectly,
          suggestions: analysis.suggestions.map(s => ({
            command: s.makeTarget,
            description: s.description,
            priority: s.priority,
            category: s.category,
            safetyLevel: s.safetyLevel,
            confidence: s.confidence,
            usage: `make ${s.makeTarget}`
          })),
          contextualAdvice: analysis.contextualAdvice
        },
        timestamp: new Date().toISOString(),
        
        // If there's a high-confidence direct mapping, include execution suggestion
        ...(analysis.directMapping && {
          recommendedAction: {
            type: analysis.shouldExecuteDirectly ? 'auto_execute' : 'suggest_execute',
            command: analysis.directMapping.makeTarget,
            description: analysis.directMapping.description,
            confidence: analysis.directMapping.confidence,
            args: analysis.directMapping.args,
            requiresConfirmation: analysis.directMapping.confirm || false
          }
        })
      };

    } catch (error: any) {
      logger.error('Error analyzing user intent:', error);
      return {
        intent: intent || 'unknown',
        error: error.message,
        suggestions: []
      };
    }
  }

  /**
   * Get intelligent command suggestions based on context
   */
  async getCommandSuggestions(intent?: string, currentState?: any): Promise<any> {
    try {
      const context = {
        userIntent: intent,
        projectState: currentState,
        currentDirectory: this.projectRoot
      };

      const suggestions = await this.suggestionEngine.getSuggestions(context);
      
      return {
        intent: intent || 'general',
        suggestions: suggestions.map(s => ({
          command: s.command,
          description: s.reason,
          category: s.category,
          priority: s.priority,
          safetyLevel: s.safetyLevel,
          prerequisites: s.prerequisites || [],
          usage: `make ${s.command}`
        })),
        contextInfo: {
          projectRoot: this.projectRoot,
          timestamp: new Date().toISOString()
        }
      };

    } catch (error: any) {
      logger.error('Error getting command suggestions:', error);
      return {
        intent: intent || 'general',
        suggestions: [],
        error: error.message
      };
    }
  }

  /**
   * Validate safety of a Make command
   */
  private async validateSafety(target: string, forceConfirm: boolean = false): Promise<{ safe: boolean; reason?: string }> {
    // Check blocked commands
    const blockedCommands = this.safetyRules.blockCommands || [];
    if (blockedCommands.some((blocked: string) => target.includes(blocked.replace('make ', '')))) {
      return {
        safe: false,
        reason: `Command '${target}' is blocked by safety rules`
      };
    }

    // Check dangerous targets
    const dangerousTargets = [
      'db-reset', 'db-drop', 'docker-down-v', 'production-deploy'
    ];
    
    if (dangerousTargets.includes(target)) {
      if (!forceConfirm) {
        return {
          safe: false,
          reason: `Command '${target}' requires explicit confirmation (set confirm: true)`
        };
      }
    }

    // Check if confirmation is required
    const requireConfirmation = this.safetyRules.requireConfirmation || [];
    if (requireConfirmation.some((cmd: string) => target.includes(cmd)) && !forceConfirm) {
      return {
        safe: false,
        reason: `Command '${target}' requires confirmation (set confirm: true)`
      };
    }

    return { safe: true };
  }

  /**
   * Categorize a Make target
   */
  private categorizeTarget(target: string): string {
    if (target.includes('dev-') || target.includes('build') || target.includes('install')) {
      return 'development';
    }
    if (target.includes('db-') || target.includes('migrate') || target.includes('schema')) {
      return 'database';
    }
    if (target.includes('test') || target.includes('lint') || target.includes('typecheck')) {
      return 'quality';
    }
    if (target.includes('deploy') || target.includes('production') || target.includes('docker')) {
      return 'deployment';
    }
    if (target.includes('financial') || target.includes('invoice') || target.includes('client')) {
      return 'financial';
    }
    if (target.includes('trading') || target.includes('market')) {
      return 'trading';
    }
    if (target.includes('mcp-')) {
      return 'mcp';
    }
    return 'utility';
  }

  /**
   * Assess safety level of a target
   */
  private assessTargetSafety(target: string): 'safe' | 'warning' | 'dangerous' {
    const dangerousPatterns = ['reset', 'drop', 'delete', 'destroy', 'prune', 'force'];
    const warningPatterns = ['deploy', 'production', 'migrate', 'backup'];

    if (dangerousPatterns.some(pattern => target.includes(pattern))) {
      return 'dangerous';
    }
    if (warningPatterns.some(pattern => target.includes(pattern))) {
      return 'warning';
    }
    return 'safe';
  }
}