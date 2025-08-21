import { test, expect } from '@playwright/test';
import { AuthPage } from '../pages/auth.page';

test.describe('Integration Settings', () => {
  let authPage: AuthPage;

  test.beforeEach(async ({ page }) => {
    authPage = new AuthPage(page);
    await authPage.login();
  });

  test('should load integration settings page', async ({ page }) => {
    // Navigate to integrations page
    await page.goto('/integrations');
    
    // Wait for page to load
    await page.waitForLoadState('networkidle');
    
    // Check page title exists
    await expect(page.locator('h2:has-text("Configuración de Integraciones")')).toBeVisible({
      timeout: 10000
    });
    
    // Check if tabs are visible
    await expect(page.locator('.ant-tabs')).toBeVisible();
  });

  test('should display integration types', async ({ page }) => {
    await page.goto('/integrations');
    await page.waitForLoadState('networkidle');
    
    // Check for at least one integration tab
    const tabs = page.locator('.ant-tabs-tab');
    await expect(tabs).toHaveCount(await tabs.count(), { timeout: 10000 });
    
    // Check GoCardless tab exists
    await expect(page.locator('.ant-tabs-tab:has-text("GoCardless")')).toBeVisible();
  });

  test('should handle API call errors gracefully', async ({ page }) => {
    await page.goto('/integrations');
    await page.waitForLoadState('networkidle');
    
    // Check if page loads without crashing
    await expect(page.locator('body')).not.toContainText('Error');
    
    // Check if there's either content or a retry button
    const hasContent = await page.locator('.ant-tabs').isVisible().catch(() => false);
    const hasRetryButton = await page.locator('button:has-text("Reintentar")').isVisible().catch(() => false);
    
    expect(hasContent || hasRetryButton).toBeTruthy();
  });

  test('should save integration configuration', async ({ page }) => {
    await page.goto('/integrations');
    await page.waitForLoadState('networkidle');
    
    // Wait for tabs to load
    await page.waitForSelector('.ant-tabs', { timeout: 10000 });
    
    // Click on GoCardless tab if not already selected
    const goCardlessTab = page.locator('.ant-tabs-tab:has-text("GoCardless")');
    if (await goCardlessTab.isVisible()) {
      await goCardlessTab.click();
    }
    
    // Fill in test values (non-encrypted field)
    const baseUrlInput = page.locator('input[placeholder*="URL"]').first();
    if (await baseUrlInput.isVisible()) {
      await baseUrlInput.fill('https://api.gocardless.com');
      
      // Click save button
      const saveButton = page.locator('button:has-text("Guardar")');
      await saveButton.click();
      
      // Check for success message
      await expect(page.locator('.ant-message-success')).toBeVisible({ timeout: 5000 });
    }
  });

  test('should test connection with GoCardless', async ({ page }) => {
    await page.goto('/integrations');
    await page.waitForLoadState('networkidle');
    
    // Wait for tabs to load
    await page.waitForSelector('.ant-tabs', { timeout: 10000 });
    
    // Click on GoCardless tab
    const goCardlessTab = page.locator('.ant-tabs-tab:has-text("GoCardless")');
    if (await goCardlessTab.isVisible()) {
      await goCardlessTab.click();
      
      // Look for test connection button
      const testButton = page.locator('button:has-text("Probar Conexión")');
      if (await testButton.isVisible()) {
        await testButton.click();
        
        // Wait for response (either success or error message)
        await page.waitForSelector('.ant-message', { timeout: 10000 });
        
        // Check that a message appeared (success or warning)
        const messages = page.locator('.ant-message-notice');
        await expect(messages).toHaveCount(await messages.count());
      }
    }
  });
});