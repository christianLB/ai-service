import { test, expect } from '@playwright/test';

test.describe('Integration Settings Simple', () => {
  test('should login and navigate to integrations', async ({ page }) => {
    // Go to login page
    await page.goto('http://localhost:3000/login');
    
    // Wait for the login form to be visible
    await page.waitForSelector('input[placeholder="Email"]', { state: 'visible' });
    
    // Fill in login credentials
    await page.fill('input[placeholder="Email"]', 'admin@ai-service.local');
    await page.fill('input[placeholder="Password"]', 'admin123');
    
    // Click login button
    await page.click('button:has-text("Sign In")');
    
    // Wait for authentication to complete - check for token
    await page.waitForFunction(
      () => localStorage.getItem('auth_token') !== null,
      { timeout: 15000 }
    );
    
    // Now navigate to integrations
    await page.goto('http://localhost:3000/integrations');
    
    // Wait for the page to load
    await page.waitForLoadState('networkidle');
    
    // Check that we're on the integrations page and it has content
    const pageTitle = await page.textContent('h2');
    expect(pageTitle).toContain('Configuración de Integraciones');
    
    // Check that tabs are visible
    const tabs = await page.locator('.ant-tabs').isVisible();
    expect(tabs).toBeTruthy();
    
    // Check for GoCardless tab
    const goCardlessTab = await page.locator('.ant-tabs-tab:has-text("GoCardless")').isVisible();
    expect(goCardlessTab).toBeTruthy();
  });
});