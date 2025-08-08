const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function verifyTradingTables() {
  console.log('🔍 Verifying Trading Schema Tables...\n');
  
  const tables = [
    { name: 'strategies', model: 'strategy', check: () => prisma.strategy.count() },
    { name: 'trades', model: 'trade', check: () => prisma.trade.count() },
    { name: 'positions', model: 'position', check: () => prisma.position.count() },
    { name: 'alerts', model: 'alert', check: () => prisma.alert.count() },
    { name: 'exchanges', model: 'exchange', check: () => prisma.exchange.count() },
    { name: 'trading_pairs', model: 'tradingPair', check: () => prisma.tradingPair.count() },
    { name: 'orders', model: 'order', check: () => prisma.order.count() },
    { name: 'market_data', model: 'marketData', check: () => prisma.marketData.count() },
    { name: 'backtest_results', model: 'backtestResult', check: () => prisma.backtestResult.count() },
    { name: 'strategy_trading_pairs', model: 'strategyTradingPair', check: () => prisma.strategyTradingPair.count() },
    { name: 'strategy_marketplace', model: 'strategyMarketplace', check: () => prisma.strategyMarketplace.count() },
    { name: 'strategy_subscriptions', model: 'strategySubscription', check: () => prisma.strategySubscription.count() },
    { name: 'strategy_performance', model: 'strategyPerformance', check: () => prisma.strategyPerformance.count() },
    { name: 'strategy_reviews', model: 'strategyReview', check: () => prisma.strategyReview.count() },
    { name: 'payments', model: 'payment', check: () => prisma.payment.count() },
  ];
  
  let allTablesExist = true;
  
  for (const table of tables) {
    try {
      const count = await table.check();
      console.log(`✅ ${table.name}: ${count} records`);
    } catch (error) {
      console.log(`❌ ${table.name}: ${error.message}`);
      allTablesExist = false;
    }
  }
  
  console.log('\n📊 Summary:');
  if (allTablesExist) {
    console.log('✅ All trading tables exist and are accessible!');
    console.log('🚀 Database is ready for trading operations.');
  } else {
    console.log('❌ Some tables are missing. Please check the migration.');
  }
  
  // Also check integration_configs for API key storage
  try {
    const configCount = await prisma.$queryRaw`
      SELECT COUNT(*) as count 
      FROM financial.integration_configs 
      WHERE integration_type LIKE 'trading_%'
    `;
    console.log(`\n🔐 Trading API Configs: ${configCount[0].count} configured`);
  } catch (error) {
    console.log('\n🔐 Trading API Configs: Unable to check');
  }
  
  await prisma.$disconnect();
}

verifyTradingTables().catch(console.error);