import { api } from './api';

interface IntegrationType {
  type: string;
  name: string;
  description: string;
  configKeys: ConfigKey[];
}

interface ConfigKey {
  key: string;
  required: boolean;
  encrypted: boolean;
  description: string;
}

interface IntegrationConfig {
  id?: string;
  userId?: string;
  integrationType: string;
  configKey: string;
  configValue: string;
  isEncrypted?: boolean;
  isGlobal?: boolean;
  description?: string;
  metadata?: Record<string, any>;
  createdAt?: string;
  updatedAt?: string;
}

interface SaveConfigParams {
  integrationType: string;
  configKey: string;
  configValue: string;
  userId?: string;
  isGlobal?: boolean;
  description?: string;
  encrypt?: boolean;
}

class IntegrationService {
  private baseURL: string;

  constructor() {
    this.baseURL = '/integrations';
  }

  async getIntegrationTypes(category?: string): Promise<IntegrationType[]> {
    try {
      const params = category ? `?category=${category}` : '';
      const response = await api.get(`${this.baseURL}/types${params}`);
      return response.data.data;
    } catch (error) {
      console.error('Error fetching integration types:', error);
      throw error;
    }
  }

  async getAllConfigs(userId?: string, integrationType?: string): Promise<IntegrationConfig[]> {
    try {
      const params = new URLSearchParams();
      if (userId) params.append('userId', userId);
      if (integrationType) params.append('integrationType', integrationType);
      
      const response = await api.get(`${this.baseURL}/configs?${params.toString()}`);
      return response.data.data;
    } catch (error) {
      console.error('Error fetching configs:', error);
      throw error;
    }
  }

  async getConfig(integrationType: string, configKey: string, userId?: string): Promise<string | null> {
    try {
      const params = userId ? `?userId=${userId}` : '';
      const response = await api.get(
        `${this.baseURL}/configs/${integrationType}/${configKey}${params}`
      );
      return response.data.data.value;
    } catch (error: any) {
      if (error.response?.status === 404) {
        return null;
      }
      console.error('Error fetching config:', error);
      throw error;
    }
  }

  async saveConfig(params: SaveConfigParams): Promise<void> {
    try {
      await api.post(`${this.baseURL}/configs`, params);
    } catch (error) {
      console.error('Error saving config:', error);
      throw error;
    }
  }

  async updateConfig(
    integrationType: string, 
    configKey: string, 
    configValue: string,
    userId?: string,
    description?: string
  ): Promise<void> {
    try {
      await api.put(`${this.baseURL}/configs/${integrationType}/${configKey}`, {
        configValue,
        userId,
        description
      });
    } catch (error) {
      console.error('Error updating config:', error);
      throw error;
    }
  }

  async deleteConfig(params: {
    integrationType: string;
    configKey: string;
    userId?: string;
  }): Promise<boolean> {
    try {
      const { integrationType, configKey, userId } = params;
      const queryParams = userId ? `?userId=${userId}` : '';
      const response = await api.delete(
        `${this.baseURL}/configs/${integrationType}/${configKey}${queryParams}`
      );
      return response.data.success;
    } catch (error) {
      console.error('Error deleting config:', error);
      throw error;
    }
  }

  async testConfig(integrationType: string, configs: Record<string, string>): Promise<{
    integrationType: string;
    isValid: boolean;
    message: string;
  }> {
    try {
      const response = await api.post(`${this.baseURL}/test/${integrationType}`, {
        configs
      });
      return response.data.data;
    } catch (error) {
      console.error('Error testing config:', error);
      throw error;
    }
  }

  // Helper method to get all configurations for a specific integration type
  async getConfiguration(integrationType: string): Promise<Record<string, string>> {
    try {
      const types = await this.getIntegrationTypes();
      const integType = types.find(t => t.type === integrationType);
      
      if (!integType) {
        throw new Error(`Integration type ${integrationType} not found`);
      }

      const config: Record<string, string> = {};
      
      for (const configKey of integType.configKeys) {
        const value = await this.getConfig(integrationType, configKey.key);
        if (value !== null) {
          config[configKey.key] = value;
        }
      }
      
      return config;
    } catch (error) {
      console.error('Error getting configuration:', error);
      throw error;
    }
  }

  // Helper method to save all configurations for a specific integration type
  async setConfiguration(integrationType: string, configs: Record<string, string>): Promise<void> {
    try {
      const types = await this.getIntegrationTypes();
      const integType = types.find(t => t.type === integrationType);
      
      if (!integType) {
        throw new Error(`Integration type ${integrationType} not found`);
      }

      for (const [key, value] of Object.entries(configs)) {
        const configKey = integType.configKeys.find(ck => ck.key === key);
        if (configKey) {
          // Check if config exists
          const existing = await this.getConfig(integrationType, key);
          
          if (existing !== null) {
            await this.updateConfig(integrationType, key, value, undefined, configKey.description);
          } else {
            await this.saveConfig({
              integrationType,
              configKey: key,
              configValue: value,
              isGlobal: true,
              description: configKey.description,
              encrypt: configKey.encrypted
            });
          }
        }
      }
    } catch (error) {
      console.error('Error setting configuration:', error);
      throw error;
    }
  }
}

const integrationService = new IntegrationService();
export { integrationService };
export default integrationService;