const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function seedExchanges() {
  console.log('🌱 Seeding exchange data...\n');
  
  const exchanges = [
    {
      name: 'binance',
      displayName: 'Binance',
      exchangeType: 'spot',
      isActive: true,
      supportedAssets: ['BTC', 'ETH', 'USDT', 'BNB', 'SOL', 'XRP', 'DOGE'],
      tradingFees: { maker: 0.001, taker: 0.001 },
      metadata: { 
        apiUrl: 'https://api.binance.com',
        websocketUrl: 'wss://stream.binance.com:9443',
        rateLimit: 1200 
      }
    },
    {
      name: 'coinbase',
      displayName: 'Coinbase Advanced Trade',
      exchangeType: 'spot',
      isActive: true,
      supportedAssets: ['BTC', 'ETH', 'USDT', 'USDC', 'SOL', 'MATIC'],
      tradingFees: { maker: 0.004, taker: 0.006 },
      metadata: {
        apiUrl: 'https://api.coinbase.com',
        websocketUrl: 'wss://ws-feed.exchange.coinbase.com',
        rateLimit: 10
      }
    },
    {
      name: 'alpaca',
      displayName: 'Alpaca Markets',
      exchangeType: 'spot',
      isActive: true,
      supportedAssets: ['BTC', 'ETH', 'USDT', 'AVAX', 'LINK'],
      tradingFees: { maker: 0.0025, taker: 0.0025 },
      metadata: {
        apiUrl: 'https://api.alpaca.markets',
        paperApiUrl: 'https://paper-api.alpaca.markets',
        dataUrl: 'https://data.alpaca.markets',
        supportsStocks: true,
        supportsCrypto: true
      }
    }
  ];
  
  const tradingPairs = [
    // Binance pairs
    { exchange: 'binance', symbol: 'BTC/USDT', base: 'BTC', quote: 'USDT', minSize: 0.00001, tickSize: 0.01, pricePrecision: 2, quantityPrecision: 5 },
    { exchange: 'binance', symbol: 'ETH/USDT', base: 'ETH', quote: 'USDT', minSize: 0.0001, tickSize: 0.01, pricePrecision: 2, quantityPrecision: 4 },
    { exchange: 'binance', symbol: 'BNB/USDT', base: 'BNB', quote: 'USDT', minSize: 0.001, tickSize: 0.01, pricePrecision: 2, quantityPrecision: 3 },
    
    // Coinbase pairs
    { exchange: 'coinbase', symbol: 'BTC/USD', base: 'BTC', quote: 'USD', minSize: 0.00001, tickSize: 0.01, pricePrecision: 2, quantityPrecision: 8 },
    { exchange: 'coinbase', symbol: 'ETH/USD', base: 'ETH', quote: 'USD', minSize: 0.001, tickSize: 0.01, pricePrecision: 2, quantityPrecision: 6 },
    { exchange: 'coinbase', symbol: 'BTC/USDT', base: 'BTC', quote: 'USDT', minSize: 0.00001, tickSize: 0.01, pricePrecision: 2, quantityPrecision: 8 },
    
    // Alpaca pairs
    { exchange: 'alpaca', symbol: 'BTC/USD', base: 'BTC', quote: 'USD', minSize: 0.0001, tickSize: 0.01, pricePrecision: 2, quantityPrecision: 8 },
    { exchange: 'alpaca', symbol: 'ETH/USD', base: 'ETH', quote: 'USD', minSize: 0.001, tickSize: 0.01, pricePrecision: 2, quantityPrecision: 6 },
  ];
  
  try {
    // Create exchanges
    for (const exchangeData of exchanges) {
      const existing = await prisma.exchange.findUnique({
        where: { name: exchangeData.name }
      });
      
      if (existing) {
        console.log(`⏭️  Exchange ${exchangeData.name} already exists`);
      } else {
        const exchange = await prisma.exchange.create({ data: exchangeData });
        console.log(`✅ Created exchange: ${exchange.displayName}`);
      }
    }
    
    // Create trading pairs
    for (const pairData of tradingPairs) {
      const exchange = await prisma.exchange.findUnique({
        where: { name: pairData.exchange }
      });
      
      if (!exchange) {
        console.log(`⚠️  Exchange ${pairData.exchange} not found, skipping pair ${pairData.symbol}`);
        continue;
      }
      
      const existing = await prisma.tradingPair.findFirst({
        where: {
          exchangeId: exchange.id,
          symbol: pairData.symbol
        }
      });
      
      if (existing) {
        console.log(`⏭️  Trading pair ${pairData.symbol} on ${pairData.exchange} already exists`);
      } else {
        await prisma.tradingPair.create({
          data: {
            exchangeId: exchange.id,
            symbol: pairData.symbol,
            baseAsset: pairData.base,
            quoteAsset: pairData.quote,
            isActive: true,
            minOrderSize: pairData.minSize,
            tickSize: pairData.tickSize,
            pricePrecision: pairData.pricePrecision,
            quantityPrecision: pairData.quantityPrecision
          }
        });
        console.log(`✅ Created trading pair: ${pairData.symbol} on ${pairData.exchange}`);
      }
    }
    
    // Summary
    const exchangeCount = await prisma.exchange.count();
    const pairCount = await prisma.tradingPair.count();
    
    console.log(`\n📊 Summary:`);
    console.log(`   Exchanges: ${exchangeCount}`);
    console.log(`   Trading Pairs: ${pairCount}`);
    console.log(`\n✅ Exchange data seeded successfully!`);
    
  } catch (error) {
    console.error('❌ Seeding failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

seedExchanges().catch(console.error);