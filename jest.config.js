module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  maxWorkers: 1,
  roots: ['<rootDir>/src', '<rootDir>/tests'],
  testMatch: ['**/__tests__/**/*.(ts|js|mjs)', '**/?(*.)+(spec|test).(ts|js|mjs)'],
  transformIgnorePatterns: [
    'node_modules/(?!(node-plop)/)',
  ],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node', 'mjs'],
  collectCoverageFrom: [
    'src/**/*.ts',
    'scripts/**/*.mjs',
    '!src/**/*.d.ts',
    '!src/index.ts'
  ],
  coverageDirectory: 'coverage',
  coverageReporters: [
    'text',
    'lcov',
    'html'
  ],
  setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],
  testTimeout: 30000,
  transform: {
    '^.+\\.ts$': ['ts-jest', {
      isolatedModules: false,
      tsconfig: {
        esModuleInterop: true,
        allowJs: true,
        allowSyntheticDefaultImports: true,
        moduleResolution: 'node'
      }
    }],
    '^.+\\.mjs$': 'babel-jest',
  },
  testPathIgnorePatterns: [
    '/node_modules/',
    '/dist/',
    '/build/',
    '/coverage/',
    'mcp-local'
  ]
};