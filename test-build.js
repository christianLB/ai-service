const { execSync } = require('child_process');

console.log('Testing TypeScript compilation...');

try {
  execSync('npx tsc --noEmit', { stdio: 'inherit' });
  console.log('✅ TypeScript compilation successful!');
} catch (error) {
  console.error('❌ TypeScript compilation failed');
  process.exit(1);
}