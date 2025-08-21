import { PrismaClient } from '@prisma/client';
import { faker } from '@faker-js/faker';

/**
 * Test Data Manager for E2E tests
 * Handles creation and cleanup of test data
 */
export class TestDataManager {
  private prisma: PrismaClient;
  private createdIds: {
    clients: string[];
    invoices: string[];
    transactions: string[];
    users: string[];
  };

  constructor() {
    this.prisma = new PrismaClient({
      datasources: {
        db: {
          url: process.env.TEST_DATABASE_URL || process.env.DATABASE_URL,
        },
      },
    });
    
    this.createdIds = {
      clients: [],
      invoices: [],
      transactions: [],
      users: [],
    };
  }

  async setup(): Promise<void> {
    await this.prisma.$connect();
  }

  async cleanup(): Promise<void> {
    // Clean up test data in reverse order of dependencies
    try {
      if (this.createdIds.invoices.length > 0) {
        await this.prisma.invoice.deleteMany({
          where: { id: { in: this.createdIds.invoices } },
        });
      }

      if (this.createdIds.transactions.length > 0) {
        await this.prisma.transaction.deleteMany({
          where: { id: { in: this.createdIds.transactions } },
        });
      }

      if (this.createdIds.clients.length > 0) {
        await this.prisma.client.deleteMany({
          where: { id: { in: this.createdIds.clients } },
        });
      }

      if (this.createdIds.users.length > 0) {
        await this.prisma.user.deleteMany({
          where: { id: { in: this.createdIds.users } },
        });
      }
    } catch (error) {
      console.error('Error cleaning up test data:', error);
    } finally {
      await this.prisma.$disconnect();
    }
  }

  async createTestUser(overrides?: Partial<any>): Promise<any> {
    const user = await this.prisma.user.create({
      data: {
        email: faker.internet.email(),
        password: '$2a$10$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW', // secret123
        name: faker.person.fullName(),
        ...overrides,
      },
    });
    
    this.createdIds.users.push(user.id);
    return user;
  }

  async createTestClient(overrides?: Partial<any>): Promise<any> {
    const client = await this.prisma.client.create({
      data: {
        name: faker.company.name(),
        email: faker.internet.email(),
        phone: faker.phone.number(),
        address: faker.location.streetAddress(),
        city: faker.location.city(),
        country: faker.location.country(),
        postalCode: faker.location.zipCode(),
        taxId: faker.string.alphanumeric(10).toUpperCase(),
        ...overrides,
      },
    });
    
    this.createdIds.clients.push(client.id);
    return client;
  }

  async createTestInvoice(clientId: string, overrides?: Partial<any>): Promise<any> {
    const invoice = await this.prisma.invoice.create({
      data: {
        invoiceNumber: `INV-${faker.number.int({ min: 1000, max: 9999 })}`,
        clientId,
        amount: faker.number.float({ min: 100, max: 10000, fractionDigits: 2 }),
        currency: 'EUR',
        status: 'PENDING',
        dueDate: faker.date.future(),
        items: {
          create: [
            {
              description: faker.commerce.productName(),
              quantity: faker.number.int({ min: 1, max: 10 }),
              unitPrice: faker.number.float({ min: 10, max: 1000, fractionDigits: 2 }),
            },
          ],
        },
        ...overrides,
      },
    });
    
    this.createdIds.invoices.push(invoice.id);
    return invoice;
  }

  async createTestTransaction(overrides?: Partial<any>): Promise<any> {
    const transaction = await this.prisma.transaction.create({
      data: {
        amount: faker.number.float({ min: -5000, max: 5000, fractionDigits: 2 }),
        description: faker.finance.transactionDescription(),
        date: faker.date.recent(),
        category: faker.helpers.arrayElement(['INCOME', 'EXPENSE', 'TRANSFER']),
        accountId: faker.string.uuid(),
        ...overrides,
      },
    });
    
    this.createdIds.transactions.push(transaction.id);
    return transaction;
  }

  async seedDatabase(): Promise<void> {
    // Create test user
    const user = await this.createTestUser({
      email: 'test@example.com',
      name: 'Test User',
    });

    // Create test clients
    const clients = await Promise.all([
      this.createTestClient({ name: 'Acme Corporation' }),
      this.createTestClient({ name: 'Global Industries' }),
      this.createTestClient({ name: 'Tech Solutions' }),
    ]);

    // Create test invoices
    for (const client of clients) {
      await this.createTestInvoice(client.id);
      await this.createTestInvoice(client.id, { status: 'PAID' });
    }

    // Create test transactions
    await Promise.all([
      this.createTestTransaction({ category: 'INCOME' }),
      this.createTestTransaction({ category: 'EXPENSE' }),
      this.createTestTransaction({ category: 'TRANSFER' }),
    ]);
  }

  getCreatedIds(): typeof this.createdIds {
    return this.createdIds;
  }
}