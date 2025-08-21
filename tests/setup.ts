// Jest setup file
import { config } from 'dotenv';
import path from 'path';
import { PrismaClient } from '@prisma/client';

// Load test environment from .env.test
config({ path: path.resolve(__dirname, '../.env.test') });

jest.setTimeout(30000);

// Override with test-specific values if .env.test doesn't exist
process.env.NODE_ENV = 'test';
process.env.POSTGRES_HOST = process.env.POSTGRES_HOST || 'localhost';
// Use port 5432 in CI environment, 5434 for local development
process.env.POSTGRES_PORT = process.env.POSTGRES_PORT || (process.env.CI ? '5432' : '5434');
process.env.POSTGRES_DB = process.env.POSTGRES_DB || 'ai_service_test';
process.env.POSTGRES_USER = process.env.POSTGRES_USER || 'postgres';
process.env.POSTGRES_PASSWORD = process.env.POSTGRES_PASSWORD || 'postgres';
process.env.OPENAI_API_KEY = process.env.OPENAI_API_KEY || 'test-key';
process.env.N8N_API_URL = process.env.N8N_API_URL || 'http://localhost:5678';
process.env.N8N_API_KEY = process.env.N8N_API_KEY || 'test-n8n-key';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret-for-testing-only';
process.env.USE_MOCK_SERVICES = 'true';

// Set DATABASE_URL based on individual components
const dbHost = process.env.POSTGRES_HOST || 'localhost';
const dbPort = process.env.POSTGRES_PORT || (process.env.CI ? '5432' : '5434');
const dbName = process.env.POSTGRES_DB || 'ai_service_test';
const dbUser = process.env.POSTGRES_USER || 'postgres';
const dbPass = process.env.POSTGRES_PASSWORD || 'postgres';
process.env.DATABASE_URL = process.env.DATABASE_URL || `postgresql://${dbUser}:${dbPass}@${dbHost}:${dbPort}/${dbName}?schema=public`;

// Global error handlers
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

// Cleanup function registry for database connections
let cleanupFunctions: Array<() => Promise<void>> = [];

export const registerCleanup = (cleanup: () => Promise<void>) => {
  cleanupFunctions.push(cleanup);
};

// Global teardown
afterAll(async () => {
  // Execute all registered cleanup functions
  for (const cleanup of cleanupFunctions) {
    try {
      await cleanup();
    } catch (error) {
      console.error('Cleanup error:', error);
    }
  }
  
  // Clear the cleanup functions
  cleanupFunctions = [];
  
  // Give connections time to close
  await new Promise(resolve => setTimeout(resolve, 100));
});

// Global test utilities - only suppress logs if not explicitly showing them
if (process.env.SHOW_TEST_LOGS !== 'true') {
  global.console = {
    ...console,
    log: jest.fn(),
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    // Keep error for debugging
    error: console.error,
  };
}

// Initialize Prisma client for tests
declare global {
  var testPrisma: PrismaClient | undefined;
}

global.testPrisma = global.testPrisma || new PrismaClient({
  log: process.env.DEBUG ? ['query', 'error', 'warn'] : ['error'],
});

// Register Prisma cleanup
registerCleanup(async () => {
  if (global.testPrisma) {
    await global.testPrisma.$disconnect();
  }
});