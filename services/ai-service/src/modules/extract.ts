import { z } from 'zod';
import type { ExtractRequest, ExtractResponse } from '../types';
import { route, executeChat } from '../core/router';
import { cached, createCacheKey } from '../core/cache';
import { loadPolicies } from '../core/policies';

const EXTRACT_PROMPT = `You are a precise data extractor. Extract structured data from the given text according to the provided schema.

Rules:
1. Extract ONLY information that is explicitly present in the text
2. Return null/undefined for missing fields unless they have defaults
3. Ensure all data types match the schema exactly
4. Include a confidence score (0-1) indicating extraction reliability
5. Return response as JSON matching the schema with added "_confidence" field`;

export async function extract(
  request: ExtractRequest,
  service?: string
): Promise<ExtractResponse> {
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
  
  // Determine extraction type from schema
  const extractType = inferExtractionType(request.schema);
  
  // Create cache key
  const cacheKey = createCacheKey('extract', {
    text,
    schema: request.schema,
    examples: request.examples
  });
  
  // Try cache
  const result = await cached(
    cacheKey,
    3600, // 1 hour TTL
    async () => {
      const policies = await loadPolicies();
      const confidenceThreshold = policies.thresholds.extractConfidence;
      
      let attempts = 0;
      const maxAttempts = 3;
      
      while (attempts < maxAttempts) {
        attempts++;
        
        // Route to appropriate provider
        const decision = await route(`extract.${extractType}`, ['chat', 'json'], service);
        
        // Build prompt
        let userPrompt = `Extract data from the following text according to this schema:\n\n`;
        userPrompt += `Schema: ${JSON.stringify(request.schema, null, 2)}\n\n`;
        
        if (request.examples && request.examples.length > 0) {
          userPrompt += `Examples:\n`;
          request.examples.forEach((example, i) => {
            userPrompt += `Example ${i + 1}: ${JSON.stringify(example, null, 2)}\n`;
          });
          userPrompt += '\n';
        }
        
        userPrompt += `Text to extract from:\n"${text}"`;
        
        // Execute
        const response = await executeChat(decision, {
          messages: [
            { role: 'system', content: EXTRACT_PROMPT },
            { role: 'user', content: userPrompt }
          ],
          temperature: 0,
          maxTokens: 1000,
          json: true
        });
        
        // Parse and validate response
        let extracted;
        try {
          extracted = JSON.parse(response.output);
        } catch (error) {
          console.error('Failed to parse extraction response:', response.output);
          if (attempts === maxAttempts) {
            throw new Error('Invalid extraction response after all attempts');
          }
          continue;
        }
        
        // Extract confidence
        const confidence = extracted._confidence || 0.5;
        delete extracted._confidence;
        
        // Validate against schema if Zod schema provided
        if (request.schema.type === 'zod') {
          try {
            const zodSchema = buildZodSchema(request.schema.schema);
            extracted = zodSchema.parse(extracted);
          } catch (error) {
            console.error('Schema validation failed:', error);
            if (attempts === maxAttempts) {
              throw new Error('Extracted data does not match schema');
            }
            continue;
          }
        }
        
        // Check confidence threshold
        if (confidence < confidenceThreshold) {
          console.warn(`Extraction confidence ${confidence} below threshold ${confidenceThreshold}`);
          
          if (attempts < maxAttempts) {
            console.log(`Retrying extraction (attempt ${attempts + 1}/${maxAttempts})`);
            continue;
          }
        }
        
        return {
          data: extracted,
          confidence,
          provider: decision.provider,
          model: decision.model
        };
      }
      
      throw new Error('Failed to extract data with sufficient confidence');
    }
  );
  
  return result;
}

function inferExtractionType(schema: any): string {
  if (schema.invoice || schema.properties?.invoice) {
    return 'invoice';
  }
  if (schema.receipt || schema.properties?.receipt) {
    return 'receipt';
  }
  if (schema.contract || schema.properties?.contract) {
    return 'contract';
  }
  return 'default';
}

function buildZodSchema(schemaDefinition: any): z.ZodSchema {
  // Simple Zod schema builder - extend as needed
  if (schemaDefinition.type === 'object') {
    const shape: Record<string, z.ZodSchema> = {};
    
    for (const [key, value] of Object.entries(schemaDefinition.properties || {})) {
      const prop = value as any;
      
      switch (prop.type) {
        case 'string':
          shape[key] = prop.optional ? z.string().optional() : z.string();
          break;
        case 'number':
          shape[key] = prop.optional ? z.number().optional() : z.number();
          break;
        case 'boolean':
          shape[key] = prop.optional ? z.boolean().optional() : z.boolean();
          break;
        case 'array':
          shape[key] = z.array(z.any());
          break;
        default:
          shape[key] = z.any();
      }
    }
    
    return z.object(shape);
  }
  
  return z.any();
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