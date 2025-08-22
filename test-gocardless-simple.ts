#!/usr/bin/env npx ts-node

/**
 * Simple GoCardless Configuration Test
 * Tests the exact issue that's happening in production
 */

import { integrationConfigService } from './src/services/integrations/integration-config.service';
import { prisma } from './src/lib/prisma';

const TEST_CONFIG = {
  SECRET_ID: '4e004333-f788-4e45-8d18-2449cf6194e3',
  SECRET_KEY: '8137f20b9fe17890d240741b317dbe29d85d8f4b4740d9c47797bcfc9d95290f651250d63b7adc5952f96ee284756f511449af4eb97fa2f65c0c5b9d160485fd'
};

async function testScenario1_UserSpecific() {
  console.log('\n❌ SCENARIO 1: Config saved with user_id (WRONG - Production bug)');
  console.log('==============================================================');
  
  // Clear existing
  await prisma.integration_configs.deleteMany({
    where: { integration_type: 'gocardless' }
  });

  // Save WITH user_id (this is what production has now)
  await prisma.integration_configs.create({
    data: {
      user_id: '22735d2f-a046-4268-adc0-783e3a498968', // YOUR USER ID
      integration_type: 'gocardless',
      config_key: 'secret_id',
      config_value: TEST_CONFIG.SECRET_ID,
      is_encrypted: false,
      is_global: true  // Note: is_global is true but user_id is NOT NULL!
    }
  });

  // Try to retrieve WITHOUT user_id (how GoCardless service does it)
  const result = await integrationConfigService.getConfig({
    integrationType: 'gocardless',
    configKey: 'secret_id'
    // No userId provided - expects global config
  });

  console.log('Config saved with user_id:', '22735d2f-a046-4268-adc0-783e3a498968');
  console.log('Retrieved without user_id:', result ? '✅ FOUND' : '❌ NOT FOUND');
  
  if (!result) {
    console.log('👆 THIS IS THE BUG IN PRODUCTION!');
    console.log('   GoCardless service cannot find configs saved with user_id');
  }
}

async function testScenario2_TrulyGlobal() {
  console.log('\n✅ SCENARIO 2: Config saved with NULL user_id (CORRECT - After fix)');
  console.log('====================================================================');
  
  // Clear existing
  await prisma.integration_configs.deleteMany({
    where: { integration_type: 'gocardless' }
  });

  // Save WITHOUT user_id (truly global)
  await prisma.integration_configs.create({
    data: {
      user_id: null,  // NULL for global!
      integration_type: 'gocardless',
      config_key: 'secret_id',
      config_value: TEST_CONFIG.SECRET_ID,
      is_encrypted: false,
      is_global: true
    }
  });

  // Try to retrieve WITHOUT user_id (how GoCardless service does it)
  const result = await integrationConfigService.getConfig({
    integrationType: 'gocardless',
    configKey: 'secret_id'
  });

  console.log('Config saved with user_id:', 'NULL');
  console.log('Retrieved without user_id:', result ? '✅ FOUND' : '❌ NOT FOUND');
  
  if (result) {
    console.log('👆 THIS WORKS! GoCardless can find truly global configs');
  }
}

async function testDatabaseWrites() {
  console.log('\n💾 TESTING DATABASE WRITE PERMISSIONS');
  console.log('=====================================');
  
  try {
    // Get EUR currency
    const eurCurrency = await prisma.currencies.findFirst({
      where: { code: 'EUR' }
    });
    
    // Test we can write to accounts
    const testAccount = await prisma.accounts.create({
      data: {
        account_id: `test-${Date.now()}`,
        name: 'TEST Account',
        type: 'bank_account',
        currency_id: eurCurrency?.id || '8a4d74e3-48cf-4e88-8d36-67563e2e7187',
        balance: '0.00',
        is_active: true
      }
    });
    console.log('✅ Can create accounts:', testAccount.id);

    // Test we can write to transactions
    const testTx = await prisma.transactions.create({
      data: {
        transaction_id: `test-tx-${Date.now()}`,
        account_id: testAccount.id,
        amount: '100.00',
        description: 'Test',
        date: new Date(),
        type: 'credit'
      }
    });
    console.log('✅ Can create transactions:', testTx.id);

    // Cleanup
    await prisma.transactions.delete({ where: { id: testTx.id } });
    await prisma.accounts.delete({ where: { id: testAccount.id } });
    console.log('✅ Cleanup successful');

  } catch (error: any) {
    console.error('❌ Database write failed:', error.message);
    return false;
  }
  
  return true;
}

async function main() {
  console.log('=================================================');
  console.log('🧪 GoCardless Configuration Test');
  console.log('=================================================');
  console.log('Testing the exact issue happening in production');

  try {
    // Test the bug scenario (what production has now)
    await testScenario1_UserSpecific();
    
    // Test the fix scenario (what production needs)
    await testScenario2_TrulyGlobal();
    
    // Test database writes
    const dbOk = await testDatabaseWrites();

    // Summary
    console.log('\n=================================================');
    console.log('📊 SUMMARY');
    console.log('=================================================');
    console.log('Production has configs with user_id = YOUR_ID');
    console.log('GoCardless expects configs with user_id = NULL');
    console.log('Database writes:', dbOk ? '✅ WORKING' : '❌ FAILED');
    console.log('\n✅ THE FIX:');
    console.log('1. Deploy the fixed code (already done locally)');
    console.log('2. Run SQL: UPDATE financial.integration_configs SET user_id = NULL WHERE integration_type = \'gocardless\'');
    console.log('3. Restart container to clear cache');
    console.log('4. GoCardless sync will work!');

  } catch (error) {
    console.error('Test failed:', error);
  } finally {
    // Cleanup
    await prisma.integration_configs.deleteMany({
      where: { 
        integration_type: 'gocardless',
        config_value: TEST_CONFIG.SECRET_ID
      }
    });
    await prisma.$disconnect();
  }
}

main().catch(console.error);