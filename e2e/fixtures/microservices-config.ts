// Microservices Test Configuration
export const SERVICES = {
  gateway: process.env.GATEWAY_URL || 'http://localhost:3010',
  financial: process.env.FINANCIAL_URL || 'http://localhost:3002',
  ai: process.env.AI_URL || 'http://localhost:3003',
  trading: process.env.TRADING_URL || 'http://localhost:3004',
  comm: process.env.COMM_URL || 'http://localhost:3005',
  frontend: process.env.BASE_URL || 'http://localhost:3000',
};

export const TEST_ACCOUNTS = {
  admin: {
    email: 'admin@ai-service.local',
    password: 'admin123',
  },
  user: {
    email: 'user@ai-service.local',
    password: 'user123',
  },
};

export const TIMEOUTS = {
  navigation: 30000,
  action: 10000,
  assertion: 5000,
};
