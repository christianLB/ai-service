import api from './api';

// This file has been removed - crypto functionality is now in integrationService.ts
// Keeping minimal structure for compatibility

class CryptoService {
  // Service deprecated - use integrationService.ts instead
  async getHealthCheck() {
    // Minimal implementation to satisfy validator requirements
    const response = await api.get('/health');
    return response.data;
  }
}

export default new CryptoService();