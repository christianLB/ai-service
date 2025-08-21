import { test, expect } from '@playwright/test';

test.describe('Integration Configuration - TDD Tests', () => {
  
  test.beforeEach(async ({ page }) => {
    // Mock authentication - we'll implement this properly
    await page.addInitScript(() => {
      localStorage.setItem('auth_token', 'test-token-123');
    });
  });

  test.describe('Navigation and Page Load', () => {
    test('User can navigate to /integrations page', async ({ page }) => {
      await page.goto('http://localhost:5173/integrations');
      
      // Page should load without errors
      await expect(page).toHaveURL(/.*\/integrations/);
      
      // Should see the integrations title
      await expect(page.locator('h1')).toContainText('Integration');
    });

    test('Integration page displays GoCardless configuration section', async ({ page }) => {
      await page.goto('http://localhost:5173/integrations');
      
      // Should see GoCardless section
      await expect(page.locator('text=GoCardless')).toBeVisible();
      
      // Should see configuration form fields
      await expect(page.locator('label:has-text("Environment")')).toBeVisible();
      await expect(page.locator('label:has-text("Secret ID")')).toBeVisible();
      await expect(page.locator('label:has-text("Secret Key")')).toBeVisible();
    });
  });

  test.describe('Configuration Management', () => {
    test('User can enter GoCardless credentials and save', async ({ page }) => {
      await page.goto('http://localhost:5173/integrations');
      
      // Fill in the form
      await page.selectOption('select[id="environment"]', 'sandbox');
      await page.fill('input[id="secretId"]', 'test_secret_id_123');
      await page.fill('input[id="secretKey"]', 'test_secret_key_456');
      
      // Click save button
      await page.click('button:has-text("Save Configuration")');
      
      // Should see success message
      await expect(page.locator('text=Configuration saved successfully')).toBeVisible();
    });

    test('Saved credentials persist on page reload', async ({ page }) => {
      await page.goto('http://localhost:5173/integrations');
      
      // Save configuration first
      await page.selectOption('select[id="environment"]', 'sandbox');
      await page.fill('input[id="secretId"]', 'persistent_id');
      await page.fill('input[id="secretKey"]', 'persistent_key');
      await page.click('button:has-text("Save Configuration")');
      
      // Wait for save to complete
      await page.waitForSelector('text=Configuration saved successfully');
      
      // Reload the page
      await page.reload();
      
      // Check if environment selection persists
      const environmentValue = await page.locator('select[id="environment"]').inputValue();
      expect(environmentValue).toBe('sandbox');
      
      // Secret ID should be visible (may be masked)
      const secretIdValue = await page.locator('input[id="secretId"]').inputValue();
      expect(secretIdValue).toBeTruthy();
    });

    test('Test connection button validates credentials', async ({ page }) => {
      await page.goto('http://localhost:5173/integrations');
      
      // Fill in valid credentials
      await page.selectOption('select[id="environment"]', 'sandbox');
      await page.fill('input[id="secretId"]', 'sandbox_test_id');
      await page.fill('input[id="secretKey"]', 'sandbox_test_key');
      
      // Click test connection
      await page.click('button:has-text("Test Connection")');
      
      // Should see result (success or failure message)
      const successMessage = page.locator('text=Connection successful');
      const errorMessage = page.locator('text=Connection failed');
      
      // One of these should appear
      await expect(successMessage.or(errorMessage)).toBeVisible({ timeout: 10000 });
    });

    test('Clear button removes configuration', async ({ page }) => {
      await page.goto('http://localhost:5173/integrations');
      
      // First save a configuration
      await page.selectOption('select[id="environment"]', 'live');
      await page.fill('input[id="secretId"]', 'to_be_cleared');
      await page.fill('input[id="secretKey"]', 'to_be_cleared');
      await page.click('button:has-text("Save Configuration")');
      await page.waitForSelector('text=Configuration saved successfully');
      
      // Click clear button
      await page.click('button:has-text("Clear")');
      
      // Confirm in dialog if it appears
      const confirmButton = page.locator('button:has-text("Confirm")');
      if (await confirmButton.isVisible()) {
        await confirmButton.click();
      }
      
      // Fields should be empty
      await expect(page.locator('input[id="secretId"]')).toHaveValue('');
      await expect(page.locator('input[id="secretKey"]')).toHaveValue('');
      await expect(page.locator('select[id="environment"]')).toHaveValue('sandbox');
    });
  });

  test.describe('Error Handling', () => {
    test('Error messages display for invalid credentials', async ({ page }) => {
      await page.goto('http://localhost:5173/integrations');
      
      // Try to save without filling required fields
      await page.click('button:has-text("Save Configuration")');
      
      // Should see validation errors
      const errorText = await page.locator('.text-red-600, .text-red-500, .text-red-700').first();
      await expect(errorText).toBeVisible();
    });

    test('Shows error when test connection fails', async ({ page }) => {
      await page.goto('http://localhost:5173/integrations');
      
      // Fill in invalid credentials
      await page.selectOption('select[id="environment"]', 'sandbox');
      await page.fill('input[id="secretId"]', 'invalid_id');
      await page.fill('input[id="secretKey"]', 'invalid_key');
      
      // Mock API to return error
      await page.route('**/api/integrations/test/gocardless', async route => {
        await route.fulfill({
          status: 400,
          contentType: 'application/json',
          body: JSON.stringify({
            success: false,
            error: 'Invalid credentials'
          })
        });
      });
      
      // Click test connection
      await page.click('button:has-text("Test Connection")');
      
      // Should see error message
      await expect(page.locator('text=Invalid credentials')).toBeVisible();
    });
  });

  test.describe('Integration Status Display', () => {
    test('Shows integration status correctly', async ({ page }) => {
      await page.goto('http://localhost:5173/integrations');
      
      // Should show status section
      await expect(page.locator('text=Integration Status')).toBeVisible();
      
      // Should show GoCardless status (configured or not configured)
      const statusText = await page.locator('text=/Configured|Not Configured/').first();
      await expect(statusText).toBeVisible();
    });
  });
});