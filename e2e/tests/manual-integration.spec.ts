import { test, expect } from '@playwright/test';

test.use({
  // Override base URL to use the running dev server
  baseURL: 'http://localhost:3000'
});

test.describe('Manual Integration Test', () => {
  test('integration page loads with authentication', async ({ page }) => {
    // Manual login process
    await page.goto('/login');
    
    // Wait for login form
    await page.waitForSelector('input[placeholder="Email"]', { state: 'visible', timeout: 5000 });
    
    // Fill credentials
    await page.fill('input[placeholder="Email"]', 'admin@ai-service.local');
    await page.fill('input[placeholder="Password"]', 'admin123');
    
    // Submit form
    await page.click('button:has-text("Sign In")');
    
    // Wait for API response
    const response = await page.waitForResponse(
      resp => resp.url().includes('/auth/login'),
      { timeout: 10000 }
    );
    
    console.log('Login response status:', response.status());
    
    if (response.status() === 200) {
      // Wait a moment for token to be stored
      await page.waitForTimeout(1000);
      
      // Check token exists
      const hasToken = await page.evaluate(() => {
        return localStorage.getItem('auth_token') !== null;
      });
      
      console.log('Token stored:', hasToken);
      
      // Navigate to integrations
      await page.goto('/integrations');
      await page.waitForLoadState('networkidle');
      
      // Take screenshot for debugging
      await page.screenshot({ path: 'integration-page-loaded.png' });
      
      // Verify page elements
      const hasTitle = await page.locator('h2:has-text("Configuración de Integraciones")').isVisible()
        .catch(() => false);
      const hasTabs = await page.locator('.ant-tabs').isVisible()
        .catch(() => false);
      
      console.log('Has title:', hasTitle);
      console.log('Has tabs:', hasTabs);
      
      expect(hasTitle || hasTabs).toBeTruthy();
    } else {
      throw new Error(`Login failed with status ${response.status()}`);
    }
  });
});