import { test, expect } from '@playwright/test';
import { loginAsTestUser, generateTestData, cleanupTestData } from '../helpers/test-utils';

/**
 * E2E Test Suite: SDK Migration Validation
 * 
 * This test suite validates that the SDK migration is working correctly
 * by testing the new SDK-based hooks and services in real scenarios.
 */

test.describe('SDK Migration Validation', () => {
  let authToken: string;
  let testClientId: string;

  test.beforeAll(async ({ request }) => {
    // Get auth token for API calls
    const loginResponse = await request.post('/api/auth/login', {
      data: {
        email: 'test@example.com',
        password: 'Test123!'
      }
    });
    
    const loginData = await loginResponse.json();
    authToken = loginData.data?.accessToken || loginData.accessToken;
  });

  test.afterAll(async ({ request }) => {
    // Cleanup test data
    if (testClientId) {
      await request.delete(`/api/financial/clients/${testClientId}`, {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });
    }
  });

  test('SDK client hook creates client successfully', async ({ page, request }) => {
    // Login to the application
    await loginAsTestUser(page);
    
    // Navigate to clients page
    await page.goto('/clients');
    await page.waitForLoadState('networkidle');
    
    // Click on "Add Client" button
    await page.click('button:has-text("Add Client")');
    
    // Fill in client form
    const testClient = generateTestData.client();
    await page.fill('input[name="name"]', testClient.name);
    await page.fill('input[name="email"]', testClient.email);
    await page.fill('input[name="businessName"]', testClient.businessName);
    await page.fill('input[name="vatNumber"]', testClient.vatNumber);
    
    // Submit form
    await page.click('button[type="submit"]');
    
    // Wait for success message
    await expect(page.locator('.ant-message-success')).toContainText('Client created successfully');
    
    // Verify client appears in the list
    await expect(page.locator(`text=${testClient.name}`)).toBeVisible();
    
    // Verify via API that client was created with SDK
    const response = await request.get('/api/financial/clients', {
      headers: {
        'Authorization': `Bearer ${authToken}`
      },
      params: {
        search: testClient.email
      }
    });
    
    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.data.items).toHaveLength(1);
    expect(data.data.items[0].email).toBe(testClient.email);
    
    testClientId = data.data.items[0].id;
  });

  test('SDK dashboard service fetches metrics correctly', async ({ page, request }) => {
    await loginAsTestUser(page);
    
    // Navigate to dashboard
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    
    // Wait for dashboard to load with SDK data
    await expect(page.locator('[data-testid="revenue-card"]')).toBeVisible();
    await expect(page.locator('[data-testid="expenses-card"]')).toBeVisible();
    await expect(page.locator('[data-testid="net-income-card"]')).toBeVisible();
    await expect(page.locator('[data-testid="transactions-card"]')).toBeVisible();
    
    // Verify API call uses SDK pattern
    const response = await request.get('/api/financial/dashboard/quick-stats', {
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });
    
    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.data).toHaveProperty('current');
    expect(data.data).toHaveProperty('previous');
    expect(data.data).toHaveProperty('changes');
  });

  test('SDK notification hook handles real-time updates', async ({ page, request }) => {
    await loginAsTestUser(page);
    
    // Create a notification via API
    const notificationResponse = await request.post('/api/comm/notifications', {
      headers: {
        'Authorization': `Bearer ${authToken}`
      },
      data: {
        title: 'SDK Test Notification',
        message: 'Testing SDK migration with real-time updates',
        type: 'info'
      }
    });
    
    expect(notificationResponse.ok()).toBe(true);
    const notification = await notificationResponse.json();
    
    // Navigate to page with notifications
    await page.goto('/dashboard');
    
    // Click on notification bell
    await page.click('[data-testid="notification-bell"]');
    
    // Verify notification appears
    await expect(page.locator(`text=SDK Test Notification`)).toBeVisible();
    
    // Mark as read using SDK hook
    await page.click('[data-testid="mark-all-read"]');
    
    // Verify success message
    await expect(page.locator('.ant-message-success')).toContainText('marked as read');
    
    // Cleanup
    await request.delete(`/api/comm/notifications/${notification.data.id}`, {
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });
  });

  test('SDK auth context manages authentication flow', async ({ page, context }) => {
    // Test logout with SDK
    await loginAsTestUser(page);
    await page.goto('/dashboard');
    
    // Click user menu
    await page.click('[data-testid="user-menu"]');
    
    // Click logout
    await page.click('text=Logout');
    
    // Verify redirected to login
    await expect(page).toHaveURL('/login');
    
    // Verify token is cleared
    const cookies = await context.cookies();
    const authCookie = cookies.find(c => c.name === 'auth_token');
    expect(authCookie).toBeUndefined();
    
    // Test login with SDK
    await page.fill('input[name="email"]', 'test@example.com');
    await page.fill('input[name="password"]', 'Test123!');
    await page.click('button[type="submit"]');
    
    // Verify successful login
    await expect(page).toHaveURL('/dashboard');
    await expect(page.locator('[data-testid="user-menu"]')).toBeVisible();
  });

  test('SDK invoice template hook manages templates', async ({ page, request }) => {
    await loginAsTestUser(page);
    
    // Navigate to invoice templates
    await page.goto('/invoice-templates');
    await page.waitForLoadState('networkidle');
    
    // Create new template
    await page.click('button:has-text("New Template")');
    
    const templateName = `SDK Test Template ${Date.now()}`;
    await page.fill('input[name="name"]', templateName);
    await page.fill('textarea[name="description"]', 'Testing SDK migration');
    await page.fill('input[name="taxRate"]', '21');
    
    // Submit
    await page.click('button[type="submit"]');
    
    // Verify success
    await expect(page.locator('.ant-message-success')).toContainText('Template created successfully');
    
    // Verify template appears in list
    await expect(page.locator(`text=${templateName}`)).toBeVisible();
    
    // Verify via API
    const response = await request.get('/api/financial/invoice-templates', {
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });
    
    const data = await response.json();
    const template = data.data.items.find(t => t.name === templateName);
    expect(template).toBeDefined();
    
    // Cleanup
    if (template) {
      await request.delete(`/api/financial/invoice-templates/${template.id}`, {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });
    }
  });

  test('SDK handles error states gracefully', async ({ page, request }) => {
    await loginAsTestUser(page);
    
    // Navigate to clients
    await page.goto('/clients');
    
    // Try to create client with invalid data
    await page.click('button:has-text("Add Client")');
    
    // Submit empty form
    await page.click('button[type="submit"]');
    
    // Verify validation errors are shown
    await expect(page.locator('text=Name is required')).toBeVisible();
    await expect(page.locator('text=Email is required')).toBeVisible();
    
    // Try to fetch non-existent client via API
    const response = await request.get('/api/financial/clients/non-existent-id', {
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });
    
    expect(response.status()).toBe(404);
    const error = await response.json();
    expect(error.success).toBe(false);
    expect(error.error).toBeDefined();
  });

  test('SDK maintains type safety in responses', async ({ request }) => {
    // Test that SDK responses match expected contract types
    const metricsResponse = await request.get('/api/financial/dashboard/client-metrics', {
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });
    
    const metrics = await metricsResponse.json();
    
    // Verify response structure matches SDK contract
    expect(metrics).toHaveProperty('success');
    expect(metrics).toHaveProperty('data');
    expect(metrics.data).toHaveProperty('summary');
    expect(metrics.data).toHaveProperty('clients');
    expect(metrics.data).toHaveProperty('currency');
    expect(metrics.data).toHaveProperty('generatedAt');
    
    // Verify types
    expect(typeof metrics.data.summary.totalClients).toBe('number');
    expect(typeof metrics.data.summary.activeClients).toBe('number');
    expect(typeof metrics.data.currency).toBe('string');
    expect(Array.isArray(metrics.data.clients)).toBe(true);
  });

  test('SDK webhook integration works correctly', async ({ page, request }) => {
    await loginAsTestUser(page);
    
    // Navigate to dashboard
    await page.goto('/dashboard');
    
    // Wait for WebSocket connection
    await page.waitForTimeout(2000);
    
    // Trigger a backend event that should update via WebSocket
    const syncResponse = await request.post('/api/financial/sync', {
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });
    
    expect(syncResponse.ok()).toBe(true);
    
    // Wait for real-time update to appear
    await expect(page.locator('text=Sync completed')).toBeVisible({ timeout: 10000 });
  });
});

// Helper functions
const testUtils = {
  loginAsTestUser: async (page) => {
    await page.goto('/login');
    await page.fill('input[name="email"]', 'test@example.com');
    await page.fill('input[name="password"]', 'Test123!');
    await page.click('button[type="submit"]');
    await page.waitForURL('/dashboard');
  },
  
  generateTestData: {
    client: () => ({
      name: `Test Client ${Date.now()}`,
      email: `test${Date.now()}@example.com`,
      businessName: `Test Business ${Date.now()}`,
      vatNumber: `VAT${Date.now()}`
    })
  }
};