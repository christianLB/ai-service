// Jest setup file
import { config } from 'dotenv';
import path from 'path';

// Load test environment from .env.test
config({ path: path.resolve(__dirname, '../.env.test') });

jest.setTimeout(30000);

// Override with test-specific values if .env.test doesn't exist
process.env.NODE_ENV = 'test';
process.env.POSTGRES_HOST = process.env.POSTGRES_HOST || 'localhost';
process.env.POSTGRES_PORT = process.env.POSTGRES_PORT || '5434';
process.env.POSTGRES_DB = process.env.POSTGRES_DB || 'ai_service_test';
process.env.POSTGRES_USER = process.env.POSTGRES_USER || 'postgres';
process.env.POSTGRES_PASSWORD = process.env.POSTGRES_PASSWORD || 'postgres';
process.env.OPENAI_API_KEY = process.env.OPENAI_API_KEY || 'test-key';
process.env.N8N_API_URL = process.env.N8N_API_URL || 'http://localhost:5678';
process.env.N8N_API_KEY = process.env.N8N_API_KEY || 'test-n8n-key';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret-for-testing-only';
process.env.USE_MOCK_SERVICES = 'true';

// Global test utilities
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};