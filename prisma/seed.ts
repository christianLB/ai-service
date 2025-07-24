import { PrismaClient } from '@prisma/client';
import { faker } from '@faker-js/faker';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting seed...');

  // Create test user
  const testPassword = process.env.TEST_USER_PASSWORD || 'test123';
  const passwordHash = await bcrypt.hash(testPassword, 10);
  const user = await prisma.user.upsert({
    where: { email: 'test@example.com' },
    update: {},
    create: {
      email: 'test@example.com',
      passwordHash,
      name: 'Test User',
    },
  });

  console.log('✓ User created:', user.email);
  if (process.env.NODE_ENV !== 'production') {
    console.log('  Password: [REDACTED - check TEST_USER_PASSWORD env var]');
  }

  // Create test clients
  const clients = [];
  for (let i = 0; i < 5; i++) {
    const client = await prisma.client.create({
      data: {
        userId: user.id,
        name: faker.company.name(),
        email: faker.internet.email(),
        phone: faker.phone.number(),
        taxId: faker.string.alphanumeric(10).toUpperCase(),
        address: faker.location.streetAddress(),
        city: faker.location.city(),
        postalCode: faker.location.zipCode(),
        country: faker.location.countryCode(),
        defaultCurrency: faker.helpers.arrayElement(['EUR', 'USD', 'GBP']),
        paymentTerms: faker.helpers.arrayElement([15, 30, 45, 60]),
        notes: faker.lorem.sentence(),
      },
    });
    clients.push(client);
  }

  console.log(`✓ ${clients.length} clients created`);

  // Create invoice sequences
  const sequences = await Promise.all([
    prisma.invoiceSequence.create({
      data: {
        name: 'default',
        prefix: 'INV-',
        nextNumber: 1001,
        padding: 4,
      },
    }),
    prisma.invoiceSequence.create({
      data: {
        name: 'proforma',
        prefix: 'PRO-',
        nextNumber: 1,
        padding: 4,
      },
    }),
  ]);

  console.log(`✓ ${sequences.length} invoice sequences created`);

  // Create sample invoices
  const invoices = [];
  for (const client of clients.slice(0, 3)) {
    const invoice = await prisma.invoice.create({
      data: {
        userId: user.id,
        clientId: client.id,
        invoiceNumber: `INV-${faker.number.int({ min: 1000, max: 9999 })}`,
        sequenceId: sequences[0].id,
        status: faker.helpers.arrayElement(['draft', 'sent', 'paid']),
        issueDate: faker.date.recent({ days: 30 }),
        dueDate: faker.date.future({ years: 0.1 }),
        currency: client.defaultCurrency,
        subtotal: 0,
        taxAmount: 0,
        totalAmount: 0,
        notes: faker.lorem.sentence(),
        items: {
          create: [
            {
              description: faker.commerce.productName(),
              quantity: faker.number.int({ min: 1, max: 10 }),
              unitPrice: faker.number.float({ min: 10, max: 1000, fractionDigits: 2 }),
              taxRate: faker.helpers.arrayElement([0, 10, 21]),
              amount: 0,
            },
            {
              description: faker.commerce.productName(),
              quantity: faker.number.int({ min: 1, max: 5 }),
              unitPrice: faker.number.float({ min: 50, max: 500, fractionDigits: 2 }),
              taxRate: faker.helpers.arrayElement([0, 10, 21]),
              amount: 0,
            },
          ],
        },
      },
      include: {
        items: true,
      },
    });

    // Calculate totals
    let subtotal = 0;
    let taxAmount = 0;

    for (const item of invoice.items) {
      const itemAmount = Number(item.quantity) * Number(item.unitPrice);
      const itemTax = itemAmount * (Number(item.taxRate) / 100);
      
      await prisma.invoiceItem.update({
        where: { id: item.id },
        data: { amount: itemAmount },
      });

      subtotal += itemAmount;
      taxAmount += itemTax;
    }

    const totalAmount = subtotal + taxAmount;

    await prisma.invoice.update({
      where: { id: invoice.id },
      data: {
        subtotal,
        taxAmount,
        totalAmount,
      },
    });

    invoices.push(invoice);
  }

  console.log(`✓ ${invoices.length} invoices created`);

  // Create trading strategies
  const strategies = await Promise.all([
    prisma.strategy.create({
      data: {
        userId: user.id,
        name: 'Moving Average Crossover',
        type: 'trend_following',
        parameters: {
          fastPeriod: 20,
          slowPeriod: 50,
          stopLoss: 0.02,
          takeProfit: 0.05,
        },
        isActive: false,
      },
    }),
    prisma.strategy.create({
      data: {
        userId: user.id,
        name: 'RSI Mean Reversion',
        type: 'mean_reversion',
        parameters: {
          rsiPeriod: 14,
          oversoldLevel: 30,
          overboughtLevel: 70,
          positionSize: 0.1,
        },
        isActive: true,
      },
    }),
  ]);

  console.log(`✓ ${strategies.length} trading strategies created`);

  // Create sample market data
  const symbols = ['BTC/USD', 'ETH/USD', 'EUR/USD'];
  const timeframes = ['1m', '5m', '1h', '1d'];
  const marketData = [];

  for (const symbol of symbols) {
    for (const timeframe of timeframes.slice(0, 2)) {
      for (let i = 0; i < 10; i++) {
        const close = faker.number.float({ min: 1000, max: 50000, fractionDigits: 8 });
        const high = close * faker.number.float({ min: 1, max: 1.05, fractionDigits: 8 });
        const low = close * faker.number.float({ min: 0.95, max: 1, fractionDigits: 8 });
        const open = faker.number.float({ min: low, max: high, fractionDigits: 8 });

        marketData.push({
          symbol,
          timeframe,
          open,
          high,
          low,
          close,
          volume: faker.number.float({ min: 100, max: 10000, fractionDigits: 8 }),
          timestamp: new Date(Date.now() - i * 60000), // 1 minute apart
        });
      }
    }
  }

  await prisma.marketDataCache.createMany({ data: marketData });

  console.log(`✓ ${marketData.length} market data records created`);

  // Create sample trades
  const trades = [];
  for (let i = 0; i < 10; i++) {
    const trade = await prisma.trade.create({
      data: {
        userId: user.id,
        strategyId: faker.helpers.arrayElement(strategies).id,
        symbol: faker.helpers.arrayElement(symbols),
        side: faker.helpers.arrayElement(['buy', 'sell']),
        quantity: faker.number.float({ min: 0.001, max: 1, fractionDigits: 8 }),
        price: faker.number.float({ min: 1000, max: 50000, fractionDigits: 8 }),
        fees: faker.number.float({ min: 0, max: 10, fractionDigits: 8 }),
        exchange: faker.helpers.arrayElement(['binance', 'coinbase', 'kraken']),
        status: faker.helpers.arrayElement(['pending', 'filled', 'cancelled']),
        executedAt: faker.date.recent({ days: 7 }),
      },
    });
    trades.push(trade);
  }

  console.log(`✓ ${trades.length} trades created`);

  console.log('\n✨ Seed completed successfully!');
}

main()
  .catch((e) => {
    console.error('Error in seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });