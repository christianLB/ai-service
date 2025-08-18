/**
 * Jest setup file for CLI tests
 */

import { config } from '../src/utils/config';
import type { CLIConfig } from '../src/types';

// Mock configuration for tests
const mockConfig: CLIConfig = {
  apiUrl: 'http://localhost:3001',
  environment: 'test',
  docker: {
    composeFile: 'docker-compose.test.yml',
    services: ['postgres-test', 'redis-test'],
  },
  database: {
    url: 'postgres://test:test@localhost:5432/test_db',
    schema: 'public',
    backupDir: './test-backups',
    autoBackup: false,
  },
  logging: {
    level: 'error', // Minimal logging in tests
    format: 'json',
  },
};

// Mock console methods to avoid noise in tests
const originalConsoleLog = console.log;
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;

beforeEach(() => {
  // Mock console methods
  console.log = jest.fn();
  console.error = jest.fn();
  console.warn = jest.fn();
  
  // Mock config
  jest.spyOn(config, 'getConfig').mockReturnValue(mockConfig);
  jest.spyOn(config, 'isAuthenticated').mockResolvedValue(false);
  jest.spyOn(config, 'loadTokens').mockResolvedValue(null);
});

afterEach(() => {
  // Restore console methods
  console.log = originalConsoleLog;
  console.error = originalConsoleError;
  console.warn = originalConsoleWarn;
  
  // Clear all mocks
  jest.clearAllMocks();
});

// Global test utilities
declare global {
  namespace jest {
    interface Matchers<R> {
      toBeValidCommand(): R;
    }
  }
}

// Custom matchers
expect.extend({
  toBeValidCommand(received) {
    const isValidCommand = received && 
                          typeof received === 'object' && 
                          'name' in received && 
                          'description' in received;
    
    if (isValidCommand) {
      return {
        message: () => `Expected ${received} not to be a valid command`,
        pass: true,
      };
    } else {
      return {
        message: () => `Expected ${received} to be a valid command`,
        pass: false,
      };
    }
  },
});