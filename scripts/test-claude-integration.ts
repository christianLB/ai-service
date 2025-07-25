#!/usr/bin/env ts-node

/**
 * Script to test Claude AI integration
 * Usage: npx ts-node scripts/test-claude-integration.ts
 */

import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { claudeAIService } from '../src/services/ai/claude.service';
import { tradingBrainService } from '../src/services/trading/trading-brain.service';

// Load environment variables
const envLocalPath = path.join(__dirname, '../.env.local');
if (fs.existsSync(envLocalPath)) {
  dotenv.config({ path: envLocalPath });
} else {
  dotenv.config();
}

async function testClaude() {
  try {
    console.log('🧪 Testing Claude AI Integration...\n');
    
    // Initialize services
    console.log('1️⃣ Initializing Claude AI service...');
    await claudeAIService.initialize();
    
    const isReady = claudeAIService.isReady();
    console.log(`   Claude ready: ${isReady ? '✅ Yes' : '❌ No'}`);
    console.log(`   Model: ${claudeAIService.getCurrentModel()}`);
    
    if (!isReady) {
      console.log('\n❌ Claude AI is not ready. Please set the API key:');
      console.log('   make config-set TYPE=claude KEY=api_key VALUE=your-api-key GLOBAL=true');
      process.exit(1);
    }
    
    console.log('\n2️⃣ Initializing Trading Brain service...');
    await tradingBrainService.initialize();
    console.log(`   Current AI Provider: ${tradingBrainService.getCurrentAIProvider()}`);
    
    // Test a simple market analysis
    console.log('\n3️⃣ Testing market analysis...');
    const testContext = {
      symbol: 'BTC/USDT',
      exchange: 'binance',
      currentPrice: 45000,
      priceChange24h: 2.5,
      volume24h: 1000000,
      volatility: 1.5,
      technicalIndicators: {
        rsi: 65,
        trend: 'bullish',
        macd: { value: 100, signal: 90, histogram: 10 }
      },
      orderBook: {
        bidDepth: 100000,
        askDepth: 100000,
        spread: 0.1
      }
    };
    
    const decision = await claudeAIService.analyzeTradingOpportunity(testContext);
    
    if (decision) {
      console.log('\n✅ Claude AI Analysis Result:');
      console.log(`   Action: ${decision.action}`);
      console.log(`   Confidence: ${(decision.confidence * 100).toFixed(1)}%`);
      console.log(`   Reasoning: ${decision.reasoning}`);
      console.log(`   Suggested Size: ${(decision.suggestedSize * 100).toFixed(1)}% of portfolio`);
      if (decision.stopLoss) {
        console.log(`   Stop Loss: $${decision.stopLoss.toFixed(2)}`);
      }
      if (decision.takeProfit) {
        console.log(`   Take Profit: $${decision.takeProfit.toFixed(2)}`);
      }
    } else {
      console.log('\n⚠️ No decision returned from Claude AI');
    }
    
    // Test AI status endpoint
    console.log('\n4️⃣ Testing AI status endpoint...');
    console.log('   Try: curl http://localhost:3001/api/trading/ai-status');
    
    console.log('\n✅ Claude AI integration test completed!');
    
  } catch (error: any) {
    console.error('\n❌ Test failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run the test
testClaude();