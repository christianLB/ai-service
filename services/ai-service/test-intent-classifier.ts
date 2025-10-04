#!/usr/bin/env tsx
/**
 * Test script for IntentClassifier
 * Usage: npx tsx test-intent-classifier.ts
 */

import { IntentClassifier, IncomingMessage } from './src/classification/intent-classifier';
import 'dotenv/config';

async function testClassifier() {
  console.log('🧪 Testing IntentClassifier...\n');

  const geminiApiKey = process.env.GEMINI_API_KEY;
  const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

  if (!geminiApiKey) {
    console.error('❌ GEMINI_API_KEY not found in environment');
    process.exit(1);
  }

  const classifier = new IntentClassifier(geminiApiKey, redisUrl);

  // Test cases
  const testCases: IncomingMessage[] = [
    {
      correlationId: 'test-1',
      text: 'Hola',
      attachments: undefined
    },
    {
      correlationId: 'test-2',
      text: 'Busca documentos sobre Bitcoin',
      attachments: undefined
    },
    {
      correlationId: 'test-3',
      text: 'Genera un reporte de ventas del último mes',
      attachments: undefined
    },
    {
      correlationId: 'test-4',
      text: '/help',
      attachments: undefined
    },
    {
      correlationId: 'test-5',
      text: 'Analiza esta foto',
      attachments: [{
        contentServiceId: 'test-file-123',
        mime: 'image/jpeg',
        filename: 'receipt.jpg'
      }]
    },
    {
      correlationId: 'test-6',
      text: '',
      attachments: [{
        contentServiceId: 'test-file-456',
        mime: 'application/pdf',
        filename: 'invoice.pdf'
      }]
    }
  ];

  for (const testCase of testCases) {
    console.log(`\n📝 Test: "${testCase.text || '[FILE]'}" (${testCase.correlationId})`);
    const startTime = Date.now();

    try {
      const intent = await classifier.classify(testCase);
      const duration = Date.now() - startTime;

      console.log(`  ✅ Type: ${intent.type}`);
      console.log(`  ✅ Confidence: ${intent.confidence}`);
      console.log(`  ✅ Method: ${intent.method}`);
      if (intent.subtype) {
        console.log(`  ✅ Subtype: ${intent.subtype}`);
      }
      if (intent.parameters) {
        console.log(`  ✅ Parameters:`, intent.parameters);
      }
      console.log(`  ⏱️  Duration: ${duration}ms`);
    } catch (error: any) {
      console.error(`  ❌ Error:`, error.message);
    }
  }

  console.log('\n\n📊 Classifier Stats:');
  const stats = await classifier.getStats();
  console.log(stats);

  console.log('\n✅ All tests completed!');
  process.exit(0);
}

testClassifier().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
