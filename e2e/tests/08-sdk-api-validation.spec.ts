import { test, expect } from '@playwright/test';

/**
 * SDK API Validation Test
 * 
 * This test validates that the SDK migration maintains API compatibility
 * and proper response structures.
 */

test.describe('SDK API Validation', () => {
  let authToken: string;

  test.beforeAll(async ({ request }) => {
    // Login using test credentials
    const loginResponse = await request.post('http://localhost:3001/api/auth/login', {
      data: {
        email: 'admin@ai-service.local',
        password: 'admin123'
      }
    });
    
    if (!loginResponse.ok()) {
      console.log('Login failed:', await loginResponse.text());
      throw new Error('Login failed');
    }
    
    const loginData = await loginResponse.json();
    authToken = loginData.data?.accessToken || loginData.accessToken || loginData.token;
    console.log('Auth token obtained:', authToken ? 'Yes' : 'No');
  });

  test('SDK client API - GET /clients returns correct structure', async ({ request }) => {
    const response = await request.get('http://localhost:3001/api/financial/clients', {
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });
    
    expect(response.ok()).toBe(true);
    const data = await response.json();
    
    // Verify response structure matches SDK contract
    expect(data).toHaveProperty('success');
    expect(data.success).toBe(true);
    expect(data).toHaveProperty('data');
    expect(data.data).toHaveProperty('items');
    expect(Array.isArray(data.data.items)).toBe(true);
  });

  test('SDK dashboard API - GET /dashboard/quick-stats works', async ({ request }) => {
    const response = await request.get('http://localhost:3001/api/financial/dashboard/quick-stats', {
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });
    
    expect(response.ok()).toBe(true);
    const data = await response.json();
    
    // Verify dashboard metrics structure
    expect(data).toHaveProperty('success');
    expect(data).toHaveProperty('data');
    expect(data.data).toHaveProperty('current');
    expect(data.data).toHaveProperty('previous');
    expect(data.data).toHaveProperty('changes');
    expect(data.data).toHaveProperty('currency');
  });

  test('SDK auth API - GET /auth/me returns user info', async ({ request }) => {
    const response = await request.get('http://localhost:3001/api/auth/me', {
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });
    
    expect(response.ok()).toBe(true);
    const data = await response.json();
    
    // Verify user structure
    expect(data).toHaveProperty('id');
    expect(data).toHaveProperty('email');
    expect(data.email).toBe('admin@ai-service.local');
  });

  test('SDK error handling - 404 returns proper error structure', async ({ request }) => {
    const response = await request.get('http://localhost:3001/api/financial/clients/non-existent-id', {
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });
    
    expect(response.status()).toBe(404);
    const data = await response.json();
    
    // Verify error structure
    expect(data).toHaveProperty('success');
    expect(data.success).toBe(false);
    expect(data).toHaveProperty('error');
  });

  test('SDK pagination - Clients API supports pagination', async ({ request }) => {
    const response = await request.get('http://localhost:3001/api/financial/clients', {
      headers: {
        'Authorization': `Bearer ${authToken}`
      },
      params: {
        page: 1,
        limit: 5
      }
    });
    
    expect(response.ok()).toBe(true);
    const data = await response.json();
    
    // Verify pagination metadata
    expect(data.data).toHaveProperty('page');
    expect(data.data).toHaveProperty('limit');
    expect(data.data).toHaveProperty('total');
    expect(data.data).toHaveProperty('totalPages');
  });

  test('Frontend loads with SDK client integration', async ({ page }) => {
    // Navigate to the frontend
    await page.goto('http://localhost:3000/login');
    
    // Check that the page loads
    await expect(page).toHaveTitle(/AI Service/);
    
    // Login form should be visible
    const loginForm = page.locator('form');
    await expect(loginForm).toBeVisible();
    
    // Fill in credentials
    await page.fill('input[placeholder*="email" i]', 'admin@ai-service.local');
    await page.fill('input[placeholder*="password" i]', 'admin123');
    
    // Submit the form
    await page.click('button[type="submit"]');
    
    // Wait for navigation to dashboard
    await page.waitForURL('**/dashboard', { timeout: 10000 }).catch(() => {
      console.log('Dashboard navigation failed, checking current URL');
    });
    
    // Check if we're logged in (either on dashboard or redirected)
    const currentUrl = page.url();
    console.log('Current URL after login:', currentUrl);
    
    // The dashboard or any authenticated page should load
    expect(currentUrl).not.toContain('/login');
  });

  test('SDK type safety - Response types match contracts', async ({ request }) => {
    // Test invoice templates endpoint
    const response = await request.get('http://localhost:3001/api/financial/invoice-templates', {
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });
    
    if (response.ok()) {
      const data = await response.json();
      
      // Verify response matches expected contract
      expect(data).toHaveProperty('success');
      expect(data).toHaveProperty('data');
      
      if (data.data.items && data.data.items.length > 0) {
        const template = data.data.items[0];
        
        // Verify template structure
        expect(template).toHaveProperty('id');
        expect(template).toHaveProperty('name');
        expect(template).toHaveProperty('createdAt');
        expect(template).toHaveProperty('updatedAt');
      }
    }
  });

  test('SDK integration - Multiple API calls work together', async ({ request }) => {
    // 1. Get dashboard metrics
    const metricsResponse = await request.get('http://localhost:3001/api/financial/dashboard/quick-stats', {
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });
    expect(metricsResponse.ok()).toBe(true);
    
    // 2. Get clients
    const clientsResponse = await request.get('http://localhost:3001/api/financial/clients', {
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });
    expect(clientsResponse.ok()).toBe(true);
    
    // 3. Get categories
    const categoriesResponse = await request.get('http://localhost:3001/api/financial/categories', {
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });
    expect(categoriesResponse.ok()).toBe(true);
    
    // All responses should have consistent structure
    const metrics = await metricsResponse.json();
    const clients = await clientsResponse.json();
    const categories = await categoriesResponse.json();
    
    expect(metrics.success).toBe(true);
    expect(clients.success).toBe(true);
    expect(categories.success).toBe(true);
  });
});