import type { SummarizeRequest, SummarizeResponse } from '../types';
import { route, executeChat } from '../core/router';
import { cached, createCacheKey } from '../core/cache';
import { loadPolicies } from '../core/policies';

const PROMPTS = {
  short: {
    system: 'You are a concise summarizer. Create brief summaries that capture key points.',
    template: 'Summarize the following text in 2-3 sentences:\n\n{text}'
  },
  medium: {
    system: 'You are a balanced summarizer. Create comprehensive yet readable summaries.',
    template: 'Summarize the following text in 1-2 paragraphs:\n\n{text}'
  },
  long: {
    system: 'You are a detailed summarizer. Create thorough summaries preserving important details.',
    template: 'Create a detailed summary of the following text, preserving key information and context:\n\n{text}'
  }
};

const STYLE_MODIFIERS = {
  technical: 'Use technical language and preserve domain-specific terminology.',
  executive: 'Focus on business impact, key decisions, and actionable insights.',
  casual: 'Use simple, accessible language suitable for a general audience.'
};

export async function summarize(
  request: SummarizeRequest,
  service?: string
): Promise<SummarizeResponse> {
  const size = request.size || 'medium';
  const style = request.style;
  
  // Get input text
  let text: string;
  if (typeof request.input === 'string') {
    text = request.input;
  } else if (request.input.text) {
    text = request.input.text;
  } else if (request.input.docId) {
    // TODO: Fetch from content-service
    text = await fetchDocumentText(request.input.docId);
  } else {
    throw new Error('No input text provided');
  }
  
  // Validate text length
  const policies = await loadPolicies();
  const minLength = policies.thresholds.summarizeMinLength || 50;
  const maxLength = policies.thresholds.summarizeMaxLength || 50000;
  
  if (text.length < minLength) {
    throw new Error(`Text too short for summarization (min: ${minLength} chars)`);
  }
  
  if (text.length > maxLength) {
    text = text.substring(0, maxLength);
  }
  
  // Create cache key
  const cacheKey = createCacheKey('summarize', { text, size, style });
  
  // Try cache
  const result = await cached(
    cacheKey,
    3600, // 1 hour TTL
    async () => {
      // Route to appropriate provider
      const decision = await route(`summarize.${size}`, ['chat'], service);
      
      // Build prompt
      const prompt = PROMPTS[size];
      let systemPrompt = prompt.system;
      
      if (style && STYLE_MODIFIERS[style]) {
        systemPrompt += ` ${STYLE_MODIFIERS[style]}`;
      }
      
      const userPrompt = prompt.template.replace('{text}', text);
      
      // Execute
      const response = await executeChat(decision, {
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.3,
        maxTokens: getMaxTokens(size)
      });
      
      return {
        summary: response.output,
        tokens: response.tokens.total,
        provider: decision.provider,
        model: decision.model
      };
    }
  );
  
  return result;
}

function getMaxTokens(size: 'short' | 'medium' | 'long'): number {
  switch (size) {
    case 'short':
      return 150;
    case 'medium':
      return 500;
    case 'long':
      return 1500;
    default:
      return 500;
  }
}

async function fetchDocumentText(docId: string): Promise<string> {
  // TODO: Implement content-service integration
  const contentUrl = process.env.CONTENT_BASE_URL || 'http://content-service:3000';
  const apiKey = process.env.CONTENT_API_KEY;
  
  const response = await fetch(`${contentUrl}/v1/documents/${docId}`, {
    headers: {
      'X-API-Key': apiKey || ''
    }
  });
  
  if (!response.ok) {
    throw new Error(`Failed to fetch document ${docId}: ${response.statusText}`);
  }
  
  const data = await response.json() as any;
  return data.content || data.text || '';
}