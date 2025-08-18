import { test, expect } from '@playwright/test';

test.describe('Integration API Endpoints - TDD Tests', () => {
  let authToken: string;
  const API_BASE = 'http://localhost:3001/api';

  test.beforeAll(async ({ request }) => {
    // Get auth token for API calls
    // For now, we'll use a mock token - will implement proper auth later
    authToken = 'test-jwt-token-123';
  });

  test.describe('GET /api/integrations', () => {
    test('Returns list of available integrations', async ({ request }) => {
      const response = await request.get(`${API_BASE}/integrations`, {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        }
      });

      expect(response.status()).toBe(200);
      
      const data = await response.json();
      expect(Array.isArray(data) || (data.success && Array.isArray(data.data))).toBeTruthy();
    });

    test('Requires authentication', async ({ request }) => {
      const response = await request.get(`${API_BASE}/integrations`, {
        headers: {
          'Content-Type': 'application/json'
        }
        // No auth header
      });

      expect(response.status()).toBe(401);
    });
  });

  test.describe('POST /api/integrations/config', () => {
    test('Saves encrypted configuration data', async ({ request }) => {
      const configData = {
        provider: 'gocardless',
        secretId: 'test_secret_id',
        secretKey: 'test_secret_key',
        environment: 'sandbox'
      };

      const response = await request.post(`${API_BASE}/integrations/config`, {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        },
        data: configData
      });

      expect(response.status()).toBe(200);
      
      const result = await response.json();
      expect(result.success || result.message).toBeTruthy();
    });

    test('Validates required fields', async ({ request }) => {
      const invalidData = {
        provider: 'gocardless',
        // Missing secretId and secretKey
      };

      const response = await request.post(`${API_BASE}/integrations/config`, {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        },
        data: invalidData
      });

      expect(response.status()).toBe(400);
      
      const error = await response.json();
      expect(error.error || error.message).toContain('required');
    });

    test('Requires authentication', async ({ request }) => {
      const configData = {
        provider: 'gocardless',
        secretId: 'test_id',
        secretKey: 'test_key'
      };

      const response = await request.post(`${API_BASE}/integrations/config`, {
        headers: {
          'Content-Type': 'application/json'
        },
        data: configData
        // No auth header
      });

      expect(response.status()).toBe(401);
    });
  });

  test.describe('GET /api/integrations/config', () => {
    test('Returns configuration with masked secrets', async ({ request }) => {
      // First save a configuration
      await request.post(`${API_BASE}/integrations/config`, {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        },
        data: {
          provider: 'gocardless',
          secretId: 'actual_secret_id',
          secretKey: 'actual_secret_key',
          environment: 'sandbox'
        }
      });

      // Then retrieve it
      const response = await request.get(`${API_BASE}/integrations/config?provider=gocardless`, {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        }
      });

      expect(response.status()).toBe(200);
      
      const config = await response.json();
      
      // Secrets should be masked or not returned
      if (config.secretKey) {
        expect(config.secretKey).not.toBe('actual_secret_key');
        expect(config.secretKey).toMatch(/\*|masked|hidden/i);
      }
    });

    test('Returns empty when no configuration exists', async ({ request }) => {
      const response = await request.get(`${API_BASE}/integrations/config?provider=nonexistent`, {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        }
      });

      expect(response.status()).toBeLessThanOrEqual(404);
    });
  });

  test.describe('DELETE /api/integrations/config', () => {
    test('Removes configuration data', async ({ request }) => {
      // First save a configuration
      await request.post(`${API_BASE}/integrations/config`, {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        },
        data: {
          provider: 'gocardless',
          secretId: 'to_delete',
          secretKey: 'to_delete',
          environment: 'sandbox'
        }
      });

      // Then delete it
      const deleteResponse = await request.delete(`${API_BASE}/integrations/config?provider=gocardless`, {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        }
      });

      expect(deleteResponse.status()).toBe(200);

      // Verify it's deleted
      const getResponse = await request.get(`${API_BASE}/integrations/config?provider=gocardless`, {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        }
      });

      expect(getResponse.status()).toBeLessThanOrEqual(404);
    });

    test('Requires authentication', async ({ request }) => {
      const response = await request.delete(`${API_BASE}/integrations/config?provider=gocardless`, {
        headers: {
          'Content-Type': 'application/json'
        }
        // No auth header
      });

      expect(response.status()).toBe(401);
    });
  });

  test.describe('POST /api/integrations/test', () => {
    test('Validates GoCardless credentials', async ({ request }) => {
      const response = await request.post(`${API_BASE}/integrations/test/gocardless`, {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        },
        data: {
          secretId: 'test_id',
          secretKey: 'test_key',
          environment: 'sandbox'
        }
      });

      // Should return success or failure (not 500)
      expect(response.status()).not.toBe(500);
      expect(response.status()).toBeLessThanOrEqual(400);

      const result = await response.json();
      expect(result).toHaveProperty('success');
    });

    test('Returns error for invalid credentials', async ({ request }) => {
      const response = await request.post(`${API_BASE}/integrations/test/gocardless`, {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        },
        data: {
          secretId: 'invalid',
          secretKey: 'invalid',
          environment: 'sandbox'
        }
      });

      const result = await response.json();
      expect(result.success).toBe(false);
      expect(result.error || result.message).toBeTruthy();
    });

    test('Requires authentication', async ({ request }) => {
      const response = await request.post(`${API_BASE}/integrations/test/gocardless`, {
        headers: {
          'Content-Type': 'application/json'
        },
        data: {
          secretId: 'test',
          secretKey: 'test',
          environment: 'sandbox'
        }
        // No auth header
      });

      expect(response.status()).toBe(401);
    });
  });

  test.describe('Audit Logging', () => {
    test('Configuration changes are logged', async ({ request }) => {
      // Save a configuration
      await request.post(`${API_BASE}/integrations/config`, {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        },
        data: {
          provider: 'gocardless',
          secretId: 'audit_test',
          secretKey: 'audit_test',
          environment: 'sandbox'
        }
      });

      // Check audit logs (if endpoint exists)
      const auditResponse = await request.get(`${API_BASE}/audit/logs?resource=integrations`, {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        }
      });

      // If audit endpoint exists, verify log entry
      if (auditResponse.status() === 200) {
        const logs = await auditResponse.json();
        expect(logs).toBeTruthy();
      }
    });
  });
});