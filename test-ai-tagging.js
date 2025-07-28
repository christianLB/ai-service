#!/usr/bin/env node

/**
 * Test script for AI-powered tagging functionality
 */

const axios = require('axios');

const API_BASE = 'http://localhost:3001/api';
const TOKEN = process.env.AUTH_TOKEN || 'your-auth-token-here';

async function testAITagging() {
  console.log('🧪 Testing AI-powered tagging system...\n');

  try {
    // Test 1: Get AI tag suggestions
    console.log('1️⃣ Testing AI tag suggestions...');
    const suggestResponse = await axios.post(
      `${API_BASE}/tagging/suggest`,
      {
        content: 'Payment to Amazon Web Services for cloud hosting services',
        entityType: 'transaction',
        metadata: {
          amount: 250.00,
          date: '2025-01-15',
          merchantName: 'Amazon Web Services'
        },
        options: {
          provider: 'openai',
          maxTags: 5,
          confidenceThreshold: 0.7
        }
      },
      {
        headers: {
          'Authorization': `Bearer ${TOKEN}`,
          'Content-Type': 'application/json'
        }
      }
    );
    console.log('✅ AI Suggestions:', JSON.stringify(suggestResponse.data, null, 2));

    // Test 2: Auto-categorize content
    console.log('\n2️⃣ Testing auto-categorization...');
    const categorizeResponse = await axios.post(
      `${API_BASE}/tagging/categorize`,
      {
        content: 'Software development invoice for mobile app project',
        entityType: 'invoice',
        language: 'en'
      },
      {
        headers: {
          'Authorization': `Bearer ${TOKEN}`,
          'Content-Type': 'application/json'
        }
      }
    );
    console.log('✅ Auto-categorization:', JSON.stringify(categorizeResponse.data, null, 2));

    // Test 3: Batch AI processing
    console.log('\n3️⃣ Testing batch AI processing...');
    const batchResponse = await axios.post(
      `${API_BASE}/tagging/batch-ai`,
      {
        items: [
          {
            id: '1',
            content: 'Monthly subscription to Netflix entertainment',
            entityType: 'transaction',
            metadata: { amount: 15.99 }
          },
          {
            id: '2',
            content: 'Gastos de oficina - papelería y material',
            entityType: 'expense',
            metadata: { amount: 45.50 }
          },
          {
            id: '3',
            content: 'Facture pour services de consultation IT',
            entityType: 'invoice',
            metadata: { amount: 1200.00 }
          }
        ],
        options: {
          provider: 'openai',
          batchSize: 3
        }
      },
      {
        headers: {
          'Authorization': `Bearer ${TOKEN}`,
          'Content-Type': 'application/json'
        }
      }
    );
    console.log('✅ Batch processing:', JSON.stringify(batchResponse.data, null, 2));

    // Test 4: Multi-language suggestions
    console.log('\n4️⃣ Testing multi-language suggestions...');
    const multilingualResponse = await axios.post(
      `${API_BASE}/tagging/multilingual`,
      {
        content: 'Cloud computing services and infrastructure',
        entityType: 'expense',
        targetLanguages: ['en', 'es', 'fr']
      },
      {
        headers: {
          'Authorization': `Bearer ${TOKEN}`,
          'Content-Type': 'application/json'
        }
      }
    );
    console.log('✅ Multi-language:', JSON.stringify(multilingualResponse.data, null, 2));

    // Test 5: Contextual suggestions
    console.log('\n5️⃣ Testing contextual suggestions...');
    const contextualResponse = await axios.post(
      `${API_BASE}/tagging/contextual`,
      {
        content: 'Website hosting and domain renewal',
        entityType: 'expense',
        context: {
          relatedClientId: 'client-123',
          historicalTags: ['TECH', 'HOSTING', 'RECURRING'],
          userPreferences: {
            preferredCategories: ['Technology', 'Infrastructure']
          }
        }
      },
      {
        headers: {
          'Authorization': `Bearer ${TOKEN}`,
          'Content-Type': 'application/json'
        }
      }
    );
    console.log('✅ Contextual suggestions:', JSON.stringify(contextualResponse.data, null, 2));

    // Test 6: Get analytics
    console.log('\n6️⃣ Testing AI analytics...');
    const analyticsResponse = await axios.get(
      `${API_BASE}/tagging/analytics`,
      {
        headers: {
          'Authorization': `Bearer ${TOKEN}`
        }
      }
    );
    console.log('✅ AI Analytics:', JSON.stringify(analyticsResponse.data, null, 2));

    console.log('\n✨ All AI tagging tests completed successfully!');

  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
    if (error.response?.status === 401) {
      console.log('\n💡 Tip: Set AUTH_TOKEN environment variable with a valid token');
      console.log('   Example: AUTH_TOKEN=your-token-here node test-ai-tagging.js');
    }
  }
}

// Run tests
testAITagging();