import { test, expect } from '@playwright/test';

test('manual login test', async ({ page }) => {
  // Go directly to login page
  await page.goto('http://localhost:3000/login');
  
  // Wait for the page to load
  await page.waitForLoadState('networkidle');
  
  // Fill in credentials
  await page.fill('input[type="email"]', 'admin@ai-service.local');
  await page.fill('input[type="password"]', 'admin123');
  
  // Click login button
  await page.click('button:has-text("Sign In")');
  
  // Wait for navigation or token
  await Promise.race([
    page.waitForURL('http://localhost:3000/', { timeout: 10000 }).catch(() => {}),
    page.waitForFunction(() => localStorage.getItem('auth_token') !== null, { timeout: 10000 }).catch(() => {})
  ]);
  
  // Check if we're authenticated
  const token = await page.evaluate(() => localStorage.getItem('auth_token'));
  console.log('Token received:', token ? 'YES' : 'NO');
  
  if (!token) {
    // Check for error messages
    const errorText = await page.textContent('body');
    console.log('Page content:', errorText);
  }
  
  expect(token).toBeTruthy();
});