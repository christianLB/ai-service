import { test, expect } from '@playwright/test';
import { SERVICES } from '../fixtures/microservices-config';

test.describe('Microservices E2E Tests', () => {
  test('API Gateway health check', async ({ request }) => {
    const response = await request.get(`${SERVICES.gateway}/health`);
    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    expect(data.status).toBe('healthy');
  });
  
  test('Financial service through gateway', async ({ request }) => {
    // Get token first
    const authResponse = await request.post(`${SERVICES.gateway}/api/auth/dev-token`);
    const { token } = await authResponse.json();
    
    // Test financial endpoint
    const response = await request.get(`${SERVICES.gateway}/api/financial/clients`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    expect(response.ok()).toBeTruthy();
  });
  
  test('AI service through gateway', async ({ request }) => {
    const authResponse = await request.post(`${SERVICES.gateway}/api/auth/dev-token`);
    const { token } = await authResponse.json();
    
    const response = await request.get(`${SERVICES.gateway}/api/ai/documents`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    expect(response.ok()).toBeTruthy();
  });
  
  test('Complete user journey', async ({ page }) => {
    // Login
    await page.goto(SERVICES.frontend);
    await page.fill('input[type="email"]', 'admin@ai-service.local');
    await page.fill('input[type="password"]', 'admin123');
    await page.click('button[type="submit"]');
    
    // Navigate to clients
    await page.click('a[href*="/clients"]');
    await page.waitForSelector('h1:has-text("Clients")');
    
    // Navigate to invoices
    await page.click('a[href*="/invoices"]');
    await page.waitForSelector('h1:has-text("Invoices")');
    
    // Verify no errors
    const errors = await page.$$('.error-message');
    expect(errors.length).toBe(0);
  });
});
