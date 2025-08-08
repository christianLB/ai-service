
import { generateOpenApi } from '@ts-rest/open-api';
import { writeFileSync, mkdirSync } from 'fs';
import { financialContract } from '../packages/contracts/src/contracts/financial';
import { zodToJsonSchema } from 'zod-to-openapi';

const doc = generateOpenApi(financialContract, {
  openapi: '3.1.0',
  info: { title: 'AI-Service – Financial API', version: '1.0.0' },
  servers: [{ url: 'http://localhost:3000' }],
}, { setOperationId: true, jsonQuery: false, jsonSchema: { zodToJsonSchema } });

mkdirSync('openapi', { recursive: true });
writeFileSync('openapi/ai-service.json', JSON.stringify(doc, null, 2), 'utf-8');
console.log('OpenAPI written to openapi/ai-service.json');
