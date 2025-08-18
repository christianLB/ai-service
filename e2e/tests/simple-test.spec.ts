import { test, expect } from '@playwright/test';

test('simple page load test', async ({ page }) => {
  // Navigate to login
  await page.goto('http://localhost:3000/login', { waitUntil: 'networkidle' });
  
  // Take screenshot for debugging
  await page.screenshot({ path: 'login-page.png' });
  
  // Check page title
  const title = await page.title();
  console.log('Page title:', title);
  
  // Check for any visible text
  const bodyText = await page.textContent('body');
  console.log('Body text:', bodyText?.substring(0, 500));
  
  // Look for any inputs
  const inputs = await page.locator('input').count();
  console.log('Number of inputs found:', inputs);
  
  // Check for specific elements with various selectors
  const hasEmailByType = await page.locator('input[type="email"]').count();
  const hasEmailByName = await page.locator('input[name="email"]').count();
  const hasAnyInput = await page.locator('input').first().isVisible().catch(() => false);
  
  console.log('Email input by type:', hasEmailByType);
  console.log('Email input by name:', hasEmailByName);
  console.log('Any input visible:', hasAnyInput);
  
  // Expect at least the page to load
  expect(title).toBeTruthy();
});