import type { Provider, RoutingDecision, Capability } from '../types';
import { OpenAIProvider } from '../providers/openai';
import { AnthropicProvider } from '../providers/anthropic';
import { OllamaProvider } from '../providers/ollama';
import { GeminiProvider } from '../providers/gemini';
import { loadPolicies, parseTarget, getRoutingTarget } from './policies';

const providers = new Map<string, Provider>();

export async function initializeProviders(): Promise<void> {
  const policies = await loadPolicies();
  
  for (const config of policies.providers) {
    let provider: Provider;
    
    switch (config.type) {
      case 'openai':
        if (!config.apiKey) {
          console.warn('OpenAI API key not configured');
          continue;
        }
        provider = new OpenAIProvider(config.apiKey);
        break;
        
      case 'anthropic':
        if (!config.apiKey) {
          console.warn('Anthropic API key not configured');
          continue;
        }
        provider = new AnthropicProvider(config.apiKey);
        break;
        
      case 'ollama':
        provider = new OllamaProvider(config.baseUrl || 'http://localhost:11434');
        break;

      case 'gemini':
        if (!config.apiKey) {
          console.warn('Gemini API key not configured');
          continue;
        }
        provider = new GeminiProvider(config.apiKey);
        break;

      default:
        console.warn(`Unknown provider type: ${config.type}`);
        continue;
    }
    
    providers.set(config.name, provider);
  }
  
  console.log(`Initialized ${providers.size} providers:`, Array.from(providers.keys()));
}

export async function route(
  task: string,
  requiredCapabilities: Capability[],
  service?: string
): Promise<RoutingDecision> {
  const target = await getRoutingTarget(task, service);
  const { provider: providerName, model } = parseTarget(target.target);
  
  const provider = providers.get(providerName);
  if (!provider) {
    // Try fallback
    if (target.fallback) {
      const fallback = parseTarget(target.fallback);
      const fallbackProvider = providers.get(fallback.provider);
      
      if (fallbackProvider && hasCapabilities(fallbackProvider, requiredCapabilities)) {
        return {
          provider: fallback.provider,
          model: fallback.model,
          reason: `Primary provider ${providerName} not available, using fallback`
        };
      }
    }
    
    throw new Error(`Provider ${providerName} not found and no fallback available`);
  }
  
  // Verify provider has required capabilities
  if (!hasCapabilities(provider, requiredCapabilities)) {
    // Try fallback
    if (target.fallback) {
      const fallback = parseTarget(target.fallback);
      const fallbackProvider = providers.get(fallback.provider);
      
      if (fallbackProvider && hasCapabilities(fallbackProvider, requiredCapabilities)) {
        return {
          provider: fallback.provider,
          model: fallback.model,
          reason: `Primary provider lacks required capabilities, using fallback`
        };
      }
    }
    
    throw new Error(
      `Provider ${providerName} lacks required capabilities: ${requiredCapabilities.join(', ')}`
    );
  }
  
  // Verify model exists and has capabilities
  const models = await provider.models();
  const modelInfo = models.find(m => m.id === model);
  
  if (!modelInfo) {
    throw new Error(`Model ${model} not found in provider ${providerName}`);
  }
  
  const missingCaps = requiredCapabilities.filter(
    cap => !modelInfo.capabilities.includes(cap)
  );
  
  if (missingCaps.length > 0) {
    // Try fallback
    if (target.fallback) {
      const fallback = parseTarget(target.fallback);
      return {
        provider: fallback.provider,
        model: fallback.model,
        reason: `Model ${model} lacks capabilities: ${missingCaps.join(', ')}`
      };
    }
    
    throw new Error(
      `Model ${model} lacks required capabilities: ${missingCaps.join(', ')}`
    );
  }
  
  return {
    provider: providerName,
    model
  };
}

export function getProvider(name: string): Provider | undefined {
  return providers.get(name);
}

export function hasCapabilities(
  provider: Provider,
  requiredCapabilities: Capability[]
): boolean {
  return requiredCapabilities.every(cap => provider.capabilities.includes(cap));
}

export async function executeChat(
  decision: RoutingDecision,
  request: any
): Promise<any> {
  const provider = providers.get(decision.provider);
  if (!provider) {
    throw new Error(`Provider ${decision.provider} not found`);
  }
  
  return provider.chat(request, decision.model);
}

export async function executeEmbed(
  decision: RoutingDecision,
  request: any
): Promise<any> {
  const provider = providers.get(decision.provider);
  if (!provider) {
    throw new Error(`Provider ${decision.provider} not found`);
  }
  
  return provider.embed(request, decision.model);
}