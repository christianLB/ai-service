import type { ClassifyRequest, ClassifyResponse } from '../types';
import { route, executeChat } from '../core/router';
import { cached, createCacheKey } from '../core/cache';
import { loadPolicies } from '../core/policies';

const CLASSIFY_PROMPT = `You are a precise classifier. Analyze the given text and assign appropriate labels.

Rules:
1. Only use labels from the provided list if given
2. Return confidence score between 0 and 1
3. Be conservative - only assign labels you're confident about
4. Return response as JSON: { "labels": [...], "confidence": 0.X }`;

export async function classify(
  request: ClassifyRequest,
  service?: string
): Promise<ClassifyResponse> {
  // Get input text
  let text: string;
  if (typeof request.input === 'string') {
    text = request.input;
  } else if (request.input.text) {
    text = request.input.text;
  } else if (request.input.docId) {
    text = await fetchDocumentText(request.input.docId);
  } else {
    throw new Error('No input text provided');
  }
  
  // Determine task type
  const taskType = request.taxonomyId ? 'document' : 'transaction';
  
  // Create cache key
  const cacheKey = createCacheKey('classify', {
    text,
    labels: request.labels,
    taxonomyId: request.taxonomyId
  });
  
  // Try cache
  const result = await cached(
    cacheKey,
    3600, // 1 hour TTL
    async () => {
      // Route to appropriate provider
      const decision = await route(`classify.${taskType}`, ['chat', 'json'], service);
      
      // Build prompt
      let userPrompt = `Text to classify: "${text}"`;
      
      if (request.labels && request.labels.length > 0) {
        userPrompt += `\n\nAvailable labels: ${request.labels.join(', ')}`;
      } else if (request.taxonomyId) {
        const taxonomy = await fetchTaxonomy(request.taxonomyId);
        userPrompt += `\n\nTaxonomy: ${taxonomy.name}\nAvailable labels: ${taxonomy.labels.join(', ')}`;
      }
      
      // Execute
      const response = await executeChat(decision, {
        messages: [
          { role: 'system', content: CLASSIFY_PROMPT },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.1,
        maxTokens: 200,
        json: true
      });
      
      // Parse response
      let parsed;
      try {
        parsed = JSON.parse(response.output);
      } catch (error) {
        console.error('Failed to parse classification response:', response.output);
        throw new Error('Invalid classification response');
      }
      
      // Validate confidence threshold
      const policies = await loadPolicies();
      const threshold = request.threshold || policies.thresholds.classifyConfidence;
      
      if (parsed.confidence < threshold) {
        console.warn(`Classification confidence ${parsed.confidence} below threshold ${threshold}`);
      }
      
      // Auto-tag if requested
      let tagIds: string[] | undefined;
      if (request.autoTag && parsed.labels.length > 0) {
        tagIds = await createAndApplyTags(parsed.labels, text, service);
      }
      
      return {
        labels: parsed.labels || [],
        confidence: parsed.confidence || 0,
        tagIds,
        provider: decision.provider,
        model: decision.model
      };
    }
  );
  
  return result;
}

async function fetchDocumentText(docId: string): Promise<string> {
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

async function fetchTaxonomy(taxonomyId: string): Promise<{ name: string; labels: string[] }> {
  // TODO: Fetch from content-service
  const taxonomies: Record<string, { name: string; labels: string[] }> = {
    'expenses.v1': {
      name: 'Expense Categories',
      labels: ['food', 'transport', 'utilities', 'entertainment', 'health', 'shopping', 'other']
    },
    'documents.v1': {
      name: 'Document Types',
      labels: ['invoice', 'receipt', 'contract', 'report', 'email', 'letter', 'other']
    }
  };
  
  return taxonomies[taxonomyId] || { name: 'Unknown', labels: [] };
}

async function createAndApplyTags(
  labels: string[],
  _text: string,
  _service?: string
): Promise<string[]> {
  const contentUrl = process.env.CONTENT_BASE_URL || 'http://content-service:3000';
  const apiKey = process.env.CONTENT_API_KEY;
  
  // Bulk upsert tags
  const response = await fetch(`${contentUrl}/v1/tags/bulk-upsert`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': apiKey || ''
    },
    body: JSON.stringify({
      tags: labels.map(label => ({
        name: label,
        type: 'ai-generated'
      }))
    })
  });
  
  if (!response.ok) {
    console.error('Failed to create tags:', response.statusText);
    return [];
  }
  
  const data = await response.json() as any;
  return data.tagIds || [];
}