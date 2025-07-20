/**
 * Custom ESLint configuration for AI Service frontend
 * Enforces proper API service patterns
 */

module.exports = {
  rules: {
    // Custom rule to enforce api usage in services
    'no-direct-fetch': 'error',
  },
  overrides: [
    {
      // Apply custom rules only to service files
      files: ['src/services/**/*Service.ts'],
      rules: {
        // Prevent direct fetch usage
        'no-restricted-globals': [
          'error',
          {
            name: 'fetch',
            message: 'Use the api instance from "./api" instead of fetch().',
          },
        ],
        // Prevent XMLHttpRequest usage
        'no-restricted-syntax': [
          'error',
          {
            selector: 'NewExpression[callee.name="XMLHttpRequest"]',
            message: 'Use the api instance from "./api" instead of XMLHttpRequest.',
          },
        ],
      },
    },
  ],
};