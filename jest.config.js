module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  maxWorkers: 2,
  roots: ['<rootDir>/src', '<rootDir>/tests'],
  testMatch: ['**/__tests__/**/*.(ts|js|mjs)', '**/?(*.)+(spec|test).(ts|js|mjs)'],
  transform: {
    '^.+\\.ts$': 'ts-jest',
    '^.+\\.mjs$': 'babel-jest',
  },
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
  globals: {
    'ts-jest': {
      isolatedModules: true,
      tsconfig: {
        esModuleInterop: true,
        allowJs: true
      }
    }
  }
};