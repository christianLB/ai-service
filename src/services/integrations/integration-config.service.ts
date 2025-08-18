import crypto from 'crypto';
import { Logger } from '../../utils/logger';
import { config } from '../../config';
import { db } from '../database';

const logger = new Logger('IntegrationConfigService');

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
}

interface GetConfigOptions {
  userId?: string;
  integrationType: string;
  configKey: string;
  decrypt?: boolean;
}

interface SetConfigOptions extends IntegrationConfig {
  encrypt?: boolean;
}

export class IntegrationConfigService {
  private static instance: IntegrationConfigService;
  private encryptionKey: Buffer;
  private configCache: Map<string, any> = new Map();
  private cacheTTL = 5 * 60 * 1000; // 5 minutes

  private constructor() {
    // Use a key from environment or generate one
    const key =
      process.env.INTEGRATION_CONFIG_KEY ||
      config.jwt.secret ||
      'default-encryption-key-32-chars!!';
    this.encryptionKey = crypto.scryptSync(key, 'salt', 32);

    // Clear cache periodically
    setInterval(() => this.clearExpiredCache(), this.cacheTTL);
  }

  static getInstance(): IntegrationConfigService {
    if (!IntegrationConfigService.instance) {
      IntegrationConfigService.instance = new IntegrationConfigService();
    }
    return IntegrationConfigService.instance;
  }

  private encrypt(text: string): string {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-cbc', this.encryptionKey, iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return iv.toString('hex') + ':' + encrypted;
  }

  private decrypt(text: string): string {
    try {
      const parts = text.split(':');
      const iv = Buffer.from(parts[0], 'hex');
      const encryptedText = parts[1];
      const decipher = crypto.createDecipheriv('aes-256-cbc', this.encryptionKey, iv);
      let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      return decrypted;
    } catch (error) {
      logger.error('Failed to decrypt value', error);
      throw new Error('Failed to decrypt configuration value');
    }
  }

  private getCacheKey(options: GetConfigOptions): string {
    const userId = options.userId || 'global';
    return `${userId}:${options.integrationType}:${options.configKey}`;
  }

  private clearExpiredCache(): void {
    // Simple implementation - clear all cache
    // Could be improved with individual TTL tracking
    this.configCache.clear();
  }

  async clearCache(integrationType?: string): Promise<void> {
    if (integrationType) {
      // Clear cache entries for specific integration type
      const keysToDelete: string[] = [];
      this.configCache.forEach((value, key) => {
        if (key.includes(`:${integrationType}:`)) {
          keysToDelete.push(key);
        }
      });
      keysToDelete.forEach((key) => this.configCache.delete(key));
      logger.info(`Cleared cache for integration type: ${integrationType}`);
    } else {
      // Clear all cache
      this.configCache.clear();
      logger.info('Cleared all config cache');
    }
  }

  async getConfig(options: GetConfigOptions): Promise<string | null> {
    const cacheKey = this.getCacheKey(options);

    // Check cache first
    if (this.configCache.has(cacheKey)) {
      logger.debug('Returning cached config', { cacheKey });
      return this.configCache.get(cacheKey);
    }

    try {
      // Try to get user-specific config first
      let query = `
        SELECT config_value, is_encrypted 
        FROM financial.integration_configs 
        WHERE integration_type = $1 AND config_key = $2
      `;

      const params: any[] = [options.integrationType, options.configKey];

      if (options.userId) {
        query += ' AND user_id = $3';
        params.push(options.userId);
      } else {
        query += ' AND user_id IS NULL AND is_global = true';
      }

      const result = await db.pool.query(query, params);

      if (result.rows.length === 0) {
        return null;
      }

      const { config_value, is_encrypted } = result.rows[0];
      let value = config_value;

      if (is_encrypted && options.decrypt !== false) {
        value = this.decrypt(value);
      }

      // Cache the decrypted value
      this.configCache.set(cacheKey, value);

      return value;
    } catch (error) {
      logger.error('Failed to get config', { error, options });
      return null;
    }
  }

  async setConfig(options: SetConfigOptions): Promise<void> {
    const {
      userId,
      integrationType,
      configKey,
      configValue,
      isGlobal = false,
      description,
      metadata = {},
      encrypt = true,
    } = options;

    try {
      const finalValue = encrypt ? this.encrypt(configValue) : configValue;

      let query: string;

      // Handle different ON CONFLICT cases based on whether it's a global config
      if (isGlobal && !userId) {
        // For global configs (user_id is NULL)
        query = `
          INSERT INTO financial.integration_configs (
            user_id, integration_type, config_key, config_value, 
            is_encrypted, is_global, description, metadata
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
          ON CONFLICT (integration_type, config_key) 
          WHERE user_id IS NULL AND is_global = true
          DO UPDATE SET 
            config_value = EXCLUDED.config_value,
            is_encrypted = EXCLUDED.is_encrypted,
            description = EXCLUDED.description,
            metadata = EXCLUDED.metadata,
            updated_at = NOW()
        `;
      } else {
        // For user-specific configs
        query = `
          INSERT INTO financial.integration_configs (
            user_id, integration_type, config_key, config_value, 
            is_encrypted, is_global, description, metadata
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
          ON CONFLICT (user_id, integration_type, config_key) 
          WHERE user_id IS NOT NULL
          DO UPDATE SET 
            config_value = EXCLUDED.config_value,
            is_encrypted = EXCLUDED.is_encrypted,
            description = EXCLUDED.description,
            metadata = EXCLUDED.metadata,
            updated_at = NOW()
        `;
      }

      await db.pool.query(query, [
        userId || null,
        integrationType,
        configKey,
        finalValue,
        encrypt,
        isGlobal,
        description,
        JSON.stringify(metadata),
      ]);

      // Clear cache for this config
      const cacheKey = this.getCacheKey({ userId, integrationType, configKey });
      this.configCache.delete(cacheKey);

      logger.info('Config updated successfully', { integrationType, configKey, userId });
    } catch (error) {
      logger.error('Failed to set config', { error, options });
      throw error;
    }
  }

  async deleteConfig(options: GetConfigOptions): Promise<boolean> {
    try {
      const query = `
        DELETE FROM financial.integration_configs 
        WHERE integration_type = $1 AND config_key = $2
        ${options.userId ? 'AND user_id = $3' : 'AND user_id IS NULL'}
      `;

      const params = [options.integrationType, options.configKey];
      if (options.userId) {
        params.push(options.userId);
      }

      const result = await db.pool.query(query, params);

      // Clear cache
      const cacheKey = this.getCacheKey(options);
      this.configCache.delete(cacheKey);

      return (result.rowCount || 0) > 0;
    } catch (error) {
      logger.error('Failed to delete config', { error, options });
      throw error;
    }
  }

  async getAllConfigs(userId?: string, integrationType?: string): Promise<IntegrationConfig[]> {
    try {
      let query = 'SELECT * FROM financial.integration_configs WHERE 1=1';
      const params: any[] = [];

      if (userId) {
        params.push(userId);
        query += ` AND user_id = $${params.length}`;
      }

      if (integrationType) {
        params.push(integrationType);
        query += ` AND integration_type = $${params.length}`;
      }

      query += ' ORDER BY integration_type, config_key';

      const result = await db.pool.query(query, params);

      return result.rows.map((row: any) => ({
        id: row.id,
        userId: row.user_id,
        integrationType: row.integration_type,
        configKey: row.config_key,
        configValue: row.config_value, // Keep encrypted
        isEncrypted: row.is_encrypted,
        isGlobal: row.is_global,
        description: row.description,
        metadata: row.metadata,
      }));
    } catch (error) {
      logger.error('Failed to get all configs', { error, userId, integrationType });
      throw error;
    }
  }

  // Helper method to get multiple configs at once
  async getIntegrationConfigs(
    integrationType: string,
    userId?: string
  ): Promise<Record<string, string>> {
    const configs = await this.getAllConfigs(userId, integrationType);
    const result: Record<string, string> = {};

    for (const config of configs) {
      if (config.isEncrypted) {
        try {
          result[config.configKey] = this.decrypt(config.configValue);
        } catch (error) {
          logger.error('Failed to decrypt config', {
            integrationType,
            configKey: config.configKey,
          });
        }
      } else {
        result[config.configKey] = config.configValue;
      }
    }

    return result;
  }

  // Test connection method for validation
  async testConfig(integrationType: string, configs: Record<string, string>): Promise<boolean> {
    // This would be implemented per integration type
    // For now, just return true
    logger.info('Testing config', { integrationType });
    return true;
  }
}

// Export singleton instance
export const integrationConfigService = IntegrationConfigService.getInstance();
