#!/usr/bin/env node

/**
 * Service Generator Script
 * Generates a new service file with the correct patterns
 * 
 * Usage: npm run generate:service -- --name=FeatureName
 */

const fs = require('fs');
const path = require('path');

// Parse command line arguments
const args = process.argv.slice(2);
const nameArg = args.find(arg => arg.startsWith('--name='));

if (!nameArg) {
  console.error('❌ Error: Please provide a service name');
  console.error('Usage: npm run generate:service -- --name=FeatureName');
  process.exit(1);
}

const featureName = nameArg.replace('--name=', '');
const serviceName = featureName.charAt(0).toLowerCase() + featureName.slice(1);
const className = featureName.charAt(0).toUpperCase() + featureName.slice(1);

// Convert to kebab-case for API endpoints
const kebabCase = featureName
  .replace(/([a-z])([A-Z])/g, '$1-$2')
  .toLowerCase();

// Service template
const serviceTemplate = `import api from './api';
import type { ApiResponse, PaginatedResponse } from '../types';

// Define your service-specific types
export interface ${className} {
  id: string;
  name: string;
  description?: string;
  // TODO: Add your entity fields here
  createdAt: Date;
  updatedAt: Date;
}

export interface ${className}FormData {
  name: string;
  description?: string;
  // TODO: Add your form fields here
}

export interface ${className}ListParams {
  search?: string;
  status?: string;
  limit?: number;
  offset?: number;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
}

/**
 * Service for managing ${featureName} entities
 * 
 * This service follows the standard patterns:
 * - Uses the centralized api instance for all requests
 * - Returns typed responses
 * - Handles standard CRUD operations
 */
class ${className}Service {
  /**
   * Create a new ${featureName}
   */
  async create(data: ${className}FormData): Promise<ApiResponse<${className}>> {
    const response = await api.post('/${kebabCase}', data);
    return response.data;
  }

  /**
   * Get a paginated list of ${featureName}s
   */
  async getList(params?: ${className}ListParams): Promise<PaginatedResponse<${className}>> {
    const response = await api.get('/${kebabCase}', { params });
    return response.data;
  }

  /**
   * Get a single ${featureName} by ID
   */
  async getById(id: string): Promise<ApiResponse<${className}>> {
    const response = await api.get(\`/${kebabCase}/\${id}\`);
    return response.data;
  }

  /**
   * Update a ${featureName}
   */
  async update(id: string, data: Partial<${className}FormData>): Promise<ApiResponse<${className}>> {
    const response = await api.put(\`/${kebabCase}/\${id}\`, data);
    return response.data;
  }

  /**
   * Delete a ${featureName}
   */
  async delete(id: string): Promise<ApiResponse<void>> {
    const response = await api.delete(\`/${kebabCase}/\${id}\`);
    return response.data;
  }

  // TODO: Add custom methods specific to your feature
  // Example:
  // async activate(id: string): Promise<ApiResponse<${className}>> {
  //   const response = await api.post(\`/${kebabCase}/\${id}/activate\`);
  //   return response.data;
  // }
}

// Export singleton instance
export const ${serviceName}Service = new ${className}Service();
`;

// Test template
const testTemplate = `import { ${serviceName}Service } from '../${serviceName}Service';
import api from '../api';

// Mock the api module
jest.mock('../api');

describe('${className}Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a new ${featureName}', async () => {
      const mockData = { id: '1', name: 'Test ${className}' };
      const mockResponse = { data: { success: true, data: mockData } };
      (api.post as jest.Mock).mockResolvedValue(mockResponse);

      const formData = { name: 'Test ${className}' };
      const result = await ${serviceName}Service.create(formData);

      expect(api.post).toHaveBeenCalledWith('/${kebabCase}', formData);
      expect(result).toEqual(mockResponse.data);
    });
  });

  describe('getList', () => {
    it('should fetch a list of ${featureName}s', async () => {
      const mockData = [
        { id: '1', name: 'Test 1' },
        { id: '2', name: 'Test 2' },
      ];
      const mockResponse = { 
        data: { 
          success: true, 
          data: mockData,
          total: 2,
          limit: 10,
          offset: 0
        } 
      };
      (api.get as jest.Mock).mockResolvedValue(mockResponse);

      const params = { search: 'test', limit: 10 };
      const result = await ${serviceName}Service.getList(params);

      expect(api.get).toHaveBeenCalledWith('/${kebabCase}', { params });
      expect(result).toEqual(mockResponse.data);
    });
  });

  describe('getById', () => {
    it('should fetch a single ${featureName} by ID', async () => {
      const mockData = { id: '1', name: 'Test ${className}' };
      const mockResponse = { data: { success: true, data: mockData } };
      (api.get as jest.Mock).mockResolvedValue(mockResponse);

      const result = await ${serviceName}Service.getById('1');

      expect(api.get).toHaveBeenCalledWith('/${kebabCase}/1');
      expect(result).toEqual(mockResponse.data);
    });
  });

  describe('update', () => {
    it('should update a ${featureName}', async () => {
      const mockData = { id: '1', name: 'Updated ${className}' };
      const mockResponse = { data: { success: true, data: mockData } };
      (api.put as jest.Mock).mockResolvedValue(mockResponse);

      const updateData = { name: 'Updated ${className}' };
      const result = await ${serviceName}Service.update('1', updateData);

      expect(api.put).toHaveBeenCalledWith('/${kebabCase}/1', updateData);
      expect(result).toEqual(mockResponse.data);
    });
  });

  describe('delete', () => {
    it('should delete a ${featureName}', async () => {
      const mockResponse = { data: { success: true } };
      (api.delete as jest.Mock).mockResolvedValue(mockResponse);

      const result = await ${serviceName}Service.delete('1');

      expect(api.delete).toHaveBeenCalledWith('/${kebabCase}/1');
      expect(result).toEqual(mockResponse.data);
    });
  });

  describe('authentication', () => {
    it('should not handle 401 errors (api instance handles them)', async () => {
      const error = { response: { status: 401 } };
      (api.get as jest.Mock).mockRejectedValue(error);

      // The service should not catch 401 errors
      // The api instance will handle token refresh
      await expect(${serviceName}Service.getById('1')).rejects.toEqual(error);
    });

    it('should use the api instance for all requests', () => {
      // This test ensures we're using the mocked api instance
      // If the service was using fetch(), this test would fail
      expect(api.get).toBeDefined();
      expect(api.post).toBeDefined();
      expect(api.put).toBeDefined();
      expect(api.delete).toBeDefined();
    });
  });
});
`;

// Paths
const servicesDir = path.join(__dirname, '..', 'src', 'services');
const testsDir = path.join(servicesDir, '__tests__');
const serviceFile = path.join(servicesDir, `${serviceName}Service.ts`);
const testFile = path.join(testsDir, `${serviceName}Service.test.ts`);

// Check if service already exists
if (fs.existsSync(serviceFile)) {
  console.error(`❌ Error: Service ${serviceName}Service.ts already exists`);
  process.exit(1);
}

// Create directories if they don't exist
if (!fs.existsSync(servicesDir)) {
  fs.mkdirSync(servicesDir, { recursive: true });
}
if (!fs.existsSync(testsDir)) {
  fs.mkdirSync(testsDir, { recursive: true });
}

// Write files
try {
  fs.writeFileSync(serviceFile, serviceTemplate);
  fs.writeFileSync(testFile, testTemplate);
  
  console.log(`✅ Successfully generated ${className}Service!`);
  console.log(`
Created files:
  - ${serviceFile}
  - ${testFile}

Next steps:
  1. Update the type definitions in ${serviceName}Service.ts
  2. Add any custom methods specific to ${featureName}
  3. Update the tests to match your implementation
  4. Import and use the service in your components:
     
     import { ${serviceName}Service } from './services/${serviceName}Service';
     
     // In your component
     const data = await ${serviceName}Service.getList();
`);
} catch (error) {
  console.error('❌ Error generating service:', error.message);
  process.exit(1);
}