import { test, expect } from '@playwright/test';
import { SERVICES, TEST_ACCOUNTS } from '../fixtures/microservices-config';

test.describe('Authentication Flow - Fixed', () => {
  test('should successfully login', async ({ page }) => {
    await page.goto(SERVICES.frontend);
    
    // Wait for login form
    await page.waitForSelector('input[type="email"]', { timeout: 30000 });
    
    // Fill credentials
    await page.fill('input[type="email"]', TEST_ACCOUNTS.admin.email);
    await page.fill('input[type="password"]', TEST_ACCOUNTS.admin.password);
    
    // Submit form
    await page.click('button[type="submit"]');
    
    // Wait for dashboard
    await page.waitForURL('**/dashboard', { timeout: 30000 });
    
    // Verify logged in
    expect(page.url()).toContain('/dashboard');
  });
  
  test('should handle logout', async ({ page }) => {
    // First login
    await page.goto(SERVICES.frontend);
    await page.fill('input[type="email"]', TEST_ACCOUNTS.admin.email);
    await page.fill('input[type="password"]', TEST_ACCOUNTS.admin.password);
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard');
    
    // Then logout
    await page.click('button[aria-label="Logout"]');
    await page.waitForURL('**/login');
    
    // Verify logged out
    expect(page.url()).toContain('/login');
  });
});
