const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testTradingPrisma() {
  console.log('🧪 Testing Trading Services with Prisma...\n');
  
  try {
    // Test 1: Create a test exchange
    console.log('1️⃣ Creating test exchange...');
    const exchange = await prisma.exchange.create({
      data: {
        name: 'test-exchange',
        displayName: 'Test Exchange',
        exchangeType: 'spot',
        isActive: true,
        supportedAssets: ['BTC', 'ETH', 'USDT'],
        tradingFees: {
          maker: 0.001,
          taker: 0.001
        }
      }
    });
    console.log('✅ Exchange created:', exchange.id);
    
    // Test 2: Create a trading pair
    console.log('\n2️⃣ Creating trading pair...');
    const tradingPair = await prisma.tradingPair.create({
      data: {
        exchangeId: exchange.id,
        symbol: 'BTC/USDT',
        baseAsset: 'BTC',
        quoteAsset: 'USDT',
        isActive: true,
        minOrderSize: 0.00001,
        tickSize: 0.01,
        pricePrecision: 2,
        quantityPrecision: 5
      }
    });
    console.log('✅ Trading pair created:', tradingPair.symbol);
    
    // Test 3: Create a test strategy
    console.log('\n3️⃣ Creating test strategy...');
    const strategy = await prisma.strategy.create({
      data: {
        name: 'Test Arbitrage Strategy',
        type: 'arbitrage',
        status: 'active',
        parameters: {
          minProfitThreshold: 0.5,
          maxPositionSize: 1000
        },
        isActive: true
      }
    });
    console.log('✅ Strategy created:', strategy.id);
    
    // Test 4: Link strategy to trading pair
    console.log('\n4️⃣ Linking strategy to trading pair...');
    const strategyPair = await prisma.strategyTradingPair.create({
      data: {
        strategyId: strategy.id,
        tradingPairId: tradingPair.id,
        isActive: true,
        allocation: 1.0
      }
    });
    console.log('✅ Strategy-TradingPair link created');
    
    // Test 5: Query relationships
    console.log('\n5️⃣ Testing relationships...');
    const fullStrategy = await prisma.strategy.findUnique({
      where: { id: strategy.id },
      include: {
        strategyTradingPairs: {
          include: {
            tradingPair: {
              include: {
                exchange: true
              }
            }
          }
        }
      }
    });
    
    console.log('✅ Relationships working:', {
      strategy: fullStrategy.name,
      tradingPairs: fullStrategy.strategyTradingPairs.map(stp => ({
        symbol: stp.tradingPair.symbol,
        exchange: stp.tradingPair.exchange.displayName
      }))
    });
    
    // Cleanup
    console.log('\n🧹 Cleaning up test data...');
    await prisma.strategyTradingPair.delete({ where: { id: strategyPair.id } });
    await prisma.strategy.delete({ where: { id: strategy.id } });
    await prisma.tradingPair.delete({ where: { id: tradingPair.id } });
    await prisma.exchange.delete({ where: { id: exchange.id } });
    console.log('✅ Test data cleaned up');
    
    console.log('\n🎉 All tests passed! Trading services are working with Prisma.');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testTradingPrisma().catch(console.error);