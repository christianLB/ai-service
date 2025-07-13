// Temporary startup script to bypass TypeScript errors
require('dotenv').config({ path: '.env.local' });

process.env.NODE_ENV = 'development';

console.log('🚀 Starting AI Service in development mode...');
console.log('📁 Environment:', process.env.NODE_ENV);

// Start the server without TypeScript compilation
require('ts-node').register({
  transpileOnly: true, // Skip type checking
  compilerOptions: {
    module: 'commonjs',
    target: 'es2017',
    allowJs: true,
    esModuleInterop: true,
    skipLibCheck: true,
    strict: false
  }
});

// Load the main application
require('./src/index.ts');