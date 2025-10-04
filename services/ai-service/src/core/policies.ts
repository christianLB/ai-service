import { readFile } from 'fs/promises';
import { load } from 'js-yaml';
import { join } from 'path';
import type { PolicyConfig, RoutingTarget } from '../types';

let cachedPolicies: PolicyConfig | null = null;
let lastLoadTime = 0;
const CACHE_DURATION = 60000; // 1 minute

export async function loadPolicies(force = false): Promise<PolicyConfig> {
  const now = Date.now();
  
  if (!force && cachedPolicies && (now - lastLoadTime) < CACHE_DURATION) {
    return cachedPolicies;
  }

  const policiesDir = process.env.AI_POLICIES_DIR || join(process.cwd(), 'src', 'policies');
  const policyPath = join(policiesDir, 'routing.yaml');
  
  try {
    const content = await readFile(policyPath, 'utf-8');
    const config = load(content) as PolicyConfig;
    
    // Resolve environment variables
    config.providers = config.providers.map(provider => ({
      ...provider,
      apiKey: resolveEnvVar(provider.apiKey),
      baseUrl: resolveEnvVar(provider.baseUrl)
    }));
    
    cachedPolicies = config;
    lastLoadTime = now;
    
    return config;
  } catch (error) {
    console.error('Failed to load policies:', error);
    
    // Return default config if file not found
    if (!cachedPolicies) {
      return getDefaultPolicies();
    }
    
    return cachedPolicies;
  }
}

function resolveEnvVar(value?: string): string | undefined {
  if (!value) return undefined;
  
  if (value.startsWith('env:')) {
    const envKey = value.substring(4);
    return process.env[envKey];
  }
  
  return value;
}

export function parseTarget(target: string): { provider: string; model: string } {
  const [provider, model] = target.split(':');
  return { provider, model };
}

export async function getRoutingTarget(
  task: string,
  service?: string
): Promise<RoutingTarget> {
  const policies = await loadPolicies();
  
  // Check for task-specific routing
  const taskTarget = policies.routing.tasks[task];
  if (taskTarget) {
    return taskTarget;
  }
  
  // Check for service default routing
  if (service && policies.routing.tasks[`${service}.default`]) {
    return policies.routing.tasks[`${service}.default`];
  }
  
  // Fall back to global default
  return policies.routing.default;
}

export async function checkBudget(
  service: string,
  costEur: number
): Promise<{ allowed: boolean; remaining: number }> {
  const policies = await loadPolicies();
  const budget = policies.budgets[service] || policies.budgets.default;
  
  if (!budget) {
    return { allowed: true, remaining: Infinity };
  }
  
  // TODO: Implement actual budget tracking with Redis
  const currentSpend = await getCurrentMonthlySpend(service);
  const newTotal = currentSpend + costEur;
  
  if (budget.hardStop && newTotal > budget.monthlyEur) {
    return { allowed: false, remaining: Math.max(0, budget.monthlyEur - currentSpend) };
  }
  
  return { allowed: true, remaining: budget.monthlyEur - newTotal };
}

async function getCurrentMonthlySpend(_service: string): Promise<number> {
  // TODO: Implement with Redis
  return 0;
}

function getDefaultPolicies(): PolicyConfig {
  const providers = [];
  let defaultTarget = 'openai:gpt-4o-mini';

  // Add Gemini if available
  if (process.env.GEMINI_API_KEY) {
    providers.push({
      type: 'gemini',
      name: 'gemini',
      apiKey: process.env.GEMINI_API_KEY,
      models: ['gemini-2.5-flash', 'gemini-2.5-pro']
    });
    defaultTarget = 'gemini:gemini-2.5-flash';
  }

  // Add OpenAI if available
  if (process.env.OPENAI_API_KEY) {
    providers.push({
      type: 'openai',
      name: 'openai',
      apiKey: process.env.OPENAI_API_KEY,
      models: ['gpt-4o-mini', 'gpt-4o']
    });
    // If no Gemini, use OpenAI as default
    if (!process.env.GEMINI_API_KEY) {
      defaultTarget = 'openai:gpt-4o-mini';
    }
  }

  // Add Anthropic if available
  if (process.env.ANTHROPIC_API_KEY) {
    providers.push({
      type: 'anthropic',
      name: 'anthropic',
      apiKey: process.env.ANTHROPIC_API_KEY,
      models: ['claude-3-haiku', 'claude-3-sonnet']
    });
  }

  return {
    providers,
    routing: {
      default: {
        target: defaultTarget,
        fallback: providers.length > 1 ? 'openai:gpt-4o-mini' : undefined
      },
      tasks: {}
    },
    budgets: {
      default: {
        monthlyEur: 10,
        hardStop: true
      }
    },
    thresholds: {
      extractConfidence: 0.9,
      classifyConfidence: 0.8
    }
  };
}