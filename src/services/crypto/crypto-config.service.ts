import { Pool } from 'pg';
import { integrationConfigService } from '../integrations';
import { Logger } from '../../utils/logger';

const logger = new Logger('CryptoConfigService');

export interface CryptoConfig {
  id: string;
  user_id: string;
  provider: string;
  api_key?: string;
  secret_key?: string;
  address?: string;
  created_at: Date;
  updated_at: Date;
}

export class CryptoConfigService {
  private pool: Pool;

  constructor(pool: Pool) {
    this.pool = pool;
  }

  async upsertConfig(
    userId: string,
    provider: string,
    apiKey?: string,
    secretKey?: string,
    address?: string
  ): Promise<void> {
    try {
      // Store in integration_configs table
      const promises = [];

      if (apiKey) {
        promises.push(
          integrationConfigService.setConfig({
            userId,
            integrationType: 'crypto',
            configKey: `${provider}_api_key`,
            configValue: apiKey,
            encrypt: true,
            description: `${provider} API Key`,
          })
        );
      }

      if (secretKey) {
        promises.push(
          integrationConfigService.setConfig({
            userId,
            integrationType: 'crypto',
            configKey: `${provider}_secret_key`,
            configValue: secretKey,
            encrypt: true,
            description: `${provider} Secret Key`,
          })
        );
      }

      if (address) {
        promises.push(
          integrationConfigService.setConfig({
            userId,
            integrationType: 'crypto',
            configKey: `${provider}_address`,
            configValue: address,
            encrypt: false,
            description: `${provider} Wallet Address`,
          })
        );
      }

      await Promise.all(promises);

      // Also store in legacy table for backward compatibility
      const query = `
        INSERT INTO financial.user_crypto_configs (user_id, provider, api_key, secret_key, address)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (user_id, provider)
        DO UPDATE SET api_key = EXCLUDED.api_key, secret_key = EXCLUDED.secret_key, address = EXCLUDED.address, updated_at = NOW();
      `;
      await this.pool.query(query, [userId, provider, apiKey, secretKey, address]);

      logger.info('Crypto config updated', { userId, provider });
    } catch (error) {
      logger.error('Failed to update crypto config', { error, userId, provider });
      throw error;
    }
  }

  async getConfigs(userId: string): Promise<CryptoConfig[]> {
    try {
      // First try to get from integration_configs
      const configs = await integrationConfigService.getAllConfigs(userId, 'crypto');

      // Group by provider
      const providerMap = new Map<string, any>();

      for (const config of configs) {
        const [provider, keyType] = config.configKey.split('_');

        if (!providerMap.has(provider)) {
          providerMap.set(provider, {
            id: config.id,
            user_id: userId,
            provider,
            created_at: new Date(),
            updated_at: new Date(),
          });
        }

        const providerConfig = providerMap.get(provider);
        const value = config.isEncrypted
          ? await integrationConfigService.getConfig({
              userId,
              integrationType: 'crypto',
              configKey: config.configKey,
              decrypt: true,
            })
          : config.configValue;

        if (keyType === 'api' && config.configKey.endsWith('_key')) {
          providerConfig.api_key = value;
        } else if (keyType === 'secret' && config.configKey.endsWith('_key')) {
          providerConfig.secret_key = value;
        } else if (keyType === 'address') {
          providerConfig.address = value;
        }
      }

      // If no configs in integration_configs, fall back to legacy table
      if (providerMap.size === 0) {
        const result = await this.pool.query<CryptoConfig>(
          'SELECT * FROM financial.user_crypto_configs WHERE user_id = $1',
          [userId]
        );
        return result.rows;
      }

      return Array.from(providerMap.values());
    } catch (error) {
      logger.error('Failed to get crypto configs', { error, userId });
      // Fallback to legacy table on error
      const result = await this.pool.query<CryptoConfig>(
        'SELECT * FROM financial.user_crypto_configs WHERE user_id = $1',
        [userId]
      );
      return result.rows;
    }
  }
}
