import { test, expect } from '../fixtures/test-fixtures';

/**
 * Critical Test 1: Authentication Flow
 * Tests login, logout, and session management
 */

test.describe('Authentication Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the app first before clearing localStorage
    await page.goto('/');
    // Clear any existing session
    await page.context().clearCookies();
    await page.evaluate(() => localStorage.clear());
  });

  test('should successfully login with valid credentials', async ({ authPage }) => {
    await authPage.goto();
    
    // Verify login form is visible
    expect(await authPage.isLoginFormVisible()).toBeTruthy();
    
    // Fill and submit login form with correct credentials
    await authPage.fillLoginForm('admin@ai-service.local', 'admin123');
    await authPage.submitLoginForm();
    
    // Wait for authentication
    await authPage.waitForAuthentication();
    
    // Verify authentication
    expect(await authPage.isAuthenticated()).toBeTruthy();
    
    // Verify redirect to root (dashboard is at /)
    await expect(authPage.page).toHaveURL('http://localhost:3000/');
  });

  test('should fail login with invalid credentials', async ({ authPage }) => {
    await authPage.goto();
    
    // Try to login with invalid credentials
    await authPage.fillLoginForm('invalid@example.com', 'wrongpassword');
    await authPage.submitLoginForm();
    
    // Wait for error message
    await authPage.waitForLoginError();
    
    // Verify error message is displayed
    const errorMessage = await authPage.getErrorMessage();
    expect(errorMessage).toBeTruthy();
    expect(errorMessage).toContain('Invalid');
    
    // Verify still on login page
    await expect(authPage.page).toHaveURL(/.*login/);
    
    // Verify not authenticated
    expect(await authPage.isAuthenticated()).toBeFalsy();
  });

  test('should successfully logout', async ({ authPage, dashboardPage }) => {
    // First login
    await authPage.goto();
    await authPage.login('admin@ai-service.local', 'admin123');
    await authPage.waitForAuthentication();
    
    // Verify on dashboard (root path)
    await dashboardPage.waitForDashboardLoad();
    await expect(authPage.page).toHaveURL('http://localhost:3000/');
    
    // Logout
    await authPage.logout();
    
    // Verify redirected to login
    await authPage.waitForLogout();
    await expect(authPage.page).toHaveURL(/.*login/);
    
    // Verify session cleared
    expect(await authPage.isAuthenticated()).toBeFalsy();
  });

  test('should protect authenticated routes', async ({ page, dashboardPage }) => {
    // Try to access dashboard without authentication
    await dashboardPage.goto();
    
    // Should be redirected to login
    await page.waitForURL(/.*login/);
    await expect(page).toHaveURL(/.*login/);
  });

  test('should maintain session across page refreshes', async ({ authPage, dashboardPage }) => {
    // Login
    await authPage.goto();
    await authPage.login('admin@ai-service.local', 'admin123');
    await authPage.waitForAuthentication();
    
    // Verify on dashboard
    await dashboardPage.waitForDashboardLoad();
    
    // Refresh page
    await authPage.page.reload();
    
    // Should still be on dashboard (root path)
    await dashboardPage.waitForDashboardLoad();
    await expect(authPage.page).toHaveURL('http://localhost:3000/');
    
    // Should still be authenticated
    expect(await authPage.isAuthenticated()).toBeTruthy();
  });
});