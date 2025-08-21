import { test, expect } from '@playwright/test';

test('debug login process', async ({ page }) => {
  // Enable console logging
  page.on('console', msg => console.log('Browser console:', msg.text()));
  
  // Navigate to login
  await page.goto('http://localhost:3000/login', { waitUntil: 'networkidle' });
  
  // Fill credentials
  await page.fill('input[placeholder="Email"]', 'admin@ai-service.local');
  await page.fill('input[placeholder="Password"]', 'admin123');
  
  // Take screenshot before clicking
  await page.screenshot({ path: 'before-login.png' });
  
  // Click login and wait for response
  const [response] = await Promise.all([
    page.waitForResponse(resp => resp.url().includes('/auth/login'), { timeout: 30000 }),
    page.click('button:has-text("Sign In")')
  ]);
  
  console.log('Login response status:', response.status());
  const responseBody = await response.json().catch(() => null);
  console.log('Login response body:', responseBody);
  
  // Wait a bit for any redirects
  await page.waitForTimeout(2000);
  
  // Check current URL
  console.log('Current URL after login:', page.url());
  
  // Check localStorage
  const token = await page.evaluate(() => localStorage.getItem('auth_token'));
  console.log('Token in localStorage:', token ? 'Present' : 'Missing');
  
  // Take screenshot after login
  await page.screenshot({ path: 'after-login.png' });
  
  // If we have a token, try navigating to integrations
  if (token) {
    await page.goto('http://localhost:3000/integrations');
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: 'integrations-page.png' });
    console.log('Integrations page URL:', page.url());
  }
});