import { Page } from '@playwright/test';

/**
 * Test utilities for E2E tests
 */

/**
 * Login as test user
 */
export async function loginAsTestUser(page: Page): Promise<void> {
  await page.goto('/login');
  await page.fill('input[name="email"]', 'test@example.com');
  await page.fill('input[name="password"]', 'Test123!');
  await page.click('button[type="submit"]');
  await page.waitForURL('/dashboard', { timeout: 10000 });
}

/**
 * Generate test data
 */
export const generateTestData = {
  client: () => ({
    name: `Test Client ${Date.now()}`,
    email: `test${Date.now()}@example.com`,
    businessName: `Test Business ${Date.now()}`,
    vatNumber: `VAT${Date.now()}`,
    address: '123 Test Street',
    city: 'Test City',
    postalCode: '12345',
    country: 'Test Country',
    phone: '+1234567890'
  }),
  
  invoice: () => ({
    invoiceNumber: `INV-${Date.now()}`,
    amount: Math.floor(Math.random() * 10000) + 100,
    description: `Test Invoice ${Date.now()}`,
    dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
  }),
  
  notification: () => ({
    title: `Test Notification ${Date.now()}`,
    message: `Test message ${Date.now()}`,
    type: 'info'
  })
};

/**
 * Cleanup test data
 */
export async function cleanupTestData(
  request: any,
  authToken: string,
  ids: { clients?: string[], invoices?: string[], notifications?: string[] }
): Promise<void> {
  // Cleanup clients
  if (ids.clients) {
    for (const id of ids.clients) {
      await request.delete(`/api/financial/clients/${id}`, {
        headers: { 'Authorization': `Bearer ${authToken}` }
      }).catch(() => {});
    }
  }
  
  // Cleanup invoices
  if (ids.invoices) {
    for (const id of ids.invoices) {
      await request.delete(`/api/financial/invoices/${id}`, {
        headers: { 'Authorization': `Bearer ${authToken}` }
      }).catch(() => {});
    }
  }
  
  // Cleanup notifications
  if (ids.notifications) {
    for (const id of ids.notifications) {
      await request.delete(`/api/comm/notifications/${id}`, {
        headers: { 'Authorization': `Bearer ${authToken}` }
      }).catch(() => {});
    }
  }
}

/**
 * Wait for API response
 */
export async function waitForApiResponse(
  page: Page,
  urlPattern: string | RegExp,
  timeout = 5000
): Promise<any> {
  return page.waitForResponse(
    response => {
      const url = response.url();
      if (typeof urlPattern === 'string') {
        return url.includes(urlPattern) && response.status() === 200;
      }
      return urlPattern.test(url) && response.status() === 200;
    },
    { timeout }
  );
}

/**
 * Get auth token for API requests
 */
export async function getAuthToken(request: any): Promise<string> {
  const loginResponse = await request.post('/api/auth/login', {
    data: {
      email: 'test@example.com',
      password: 'Test123!'
    }
  });
  
  const loginData = await loginResponse.json();
  return loginData.data?.accessToken || loginData.accessToken || '';
}