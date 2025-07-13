import api from './api';

export interface CryptoConfig {
  id: string;
  user_id: string;
  provider: string;
  api_key?: string;
  secret_key?: string;
  address?: string;
}

class CryptoService {
  async getConfigs(): Promise<CryptoConfig[]> {
    const response = await api.get('/crypto/config');
    return response.data.data;
  }

  async saveConfig(config: { provider: string; apiKey?: string; secretKey?: string; address?: string }): Promise<void> {
    await api.post('/crypto/config', config);
  }
}

export default new CryptoService();
