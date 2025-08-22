import * as crypto from 'crypto';
import { Logger } from '../../utils/logger';
import { config } from '../../config';
import { prisma } from '../../lib/prisma';
import { Prisma } from '@prisma/client';

const logger = new Logger('IntegrationConfigService');

// =====================================================
// INTERFACES
// =====================================================

interface IntegrationConfig {
  id?: string;
  userId?: string | null;  // Allow null for global configs
  integrationType: string;
  configKey: string;
  configValue: string;
  isEncrypted?: boolean;
  isGlobal?: boolean;
  description?: string;
  metadata?: Record<string, any>;
}

interface GetConfigOptions {
  userId?: string | null;  // Allow null for global configs
  integrationType: string;
  configKey: string;
  decrypt?: boolean;
}

interface SetConfigOptions extends IntegrationConfig {
  encrypt?: boolean;
}

// =====================================================
// SERVICE CLASS
// =====================================================

export class IntegrationConfigService {
  private static instance: IntegrationConfigService;
  private encryptionKey: Buffer;
  private configCache: Map<string, any> = new Map();
  private cacheTTL = 5 * 60 * 1000; // 5 minutes
  private intervalId: NodeJS.Timeout | null = null;

  private constructor() {
    // Use a key from environment or generate one
    const key =
      process.env.INTEGRATION_CONFIG_KEY ||
      config.jwt.secret ||
      'default-encryption-key-32-chars!!';
    this.encryptionKey = crypto.scryptSync(key, 'salt', 32);

    // Clear cache periodically - but not in test environment
    if (process.env.NODE_ENV !== 'test') {
      this.intervalId = setInterval(() => this.clearExpiredCache(), this.cacheTTL);
    }
  }

  static getInstance(): IntegrationConfigService {
    if (!IntegrationConfigService.instance) {
      IntegrationConfigService.instance = new IntegrationConfigService();

      // Register cleanup for tests
      if (process.env.NODE_ENV === 'test' && typeof afterAll === 'function') {
        afterAll(() => {
          IntegrationConfigService.instance?.cleanup();
        });
      }
    }
    return IntegrationConfigService.instance;
  }

  // =====================================================
  // UTILITY METHODS
  // =====================================================

  cleanup(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.configCache.clear();
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

  // =====================================================
  // PUBLIC CACHE METHODS
  // =====================================================

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

  // =====================================================
  // CRUD METHODS WITH SPECIAL FEATURES
  // =====================================================

  async getConfig(options: GetConfigOptions): Promise<string | null> {
    const cacheKey = this.getCacheKey(options);

    // Check cache first
    if (this.configCache.has(cacheKey)) {
      logger.debug('Returning cached config', { cacheKey });
      return this.configCache.get(cacheKey);
    }

    try {
      // Build where clause
      const where: Prisma.integration_configsWhereInput = {
        integration_type: options.integrationType,
        config_key: options.configKey,
      };

      if (options.userId) {
        where.user_id = options.userId;
      } else {
        where.user_id = null;
        where.is_global = true;
      }

      // Use Prisma to fetch the config
      const config = await prisma.integration_configs.findFirst({
        where,
      });

      if (!config) {
        return null;
      }

      let value = config.config_value;

      if (config.is_encrypted && options.decrypt !== false) {
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

      // Prepare data for create/update
      const dataFields = {
        config_value: finalValue,
        is_encrypted: encrypt,
        is_global: isGlobal,
        description,
        metadata: metadata as Prisma.InputJsonValue,
      };

      // Since Prisma doesn't support composite unique constraints in where clause directly,
      // we need to use findFirst + create/update pattern
      const existingConfig = await prisma.integration_configs.findFirst({
        where: {
          integration_type: integrationType,
          config_key: configKey,
          user_id: isGlobal ? null : (userId || null),  // Force null for global configs
        },
      });

      if (existingConfig) {
        // Update existing config
        await prisma.integration_configs.update({
          where: { id: existingConfig.id },
          data: {
            ...dataFields,
            updated_at: new Date(),
          },
        });
      } else {
        // Create new config
        await prisma.integration_configs.create({
          data: {
            user_id: isGlobal ? null : (userId || null),  // Force null for global configs
            integration_type: integrationType,
            config_key: configKey,
            ...dataFields,
          },
        });
      }

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
      // Build where clause
      const where: Prisma.integration_configsWhereInput = {
        integration_type: options.integrationType,
        config_key: options.configKey,
      };

      if (options.userId) {
        where.user_id = options.userId;
      } else {
        where.user_id = null;
      }

      // Delete using Prisma
      const result = await prisma.integration_configs.deleteMany({
        where,
      });

      // Clear cache
      const cacheKey = this.getCacheKey(options);
      this.configCache.delete(cacheKey);

      return result.count > 0;
    } catch (error) {
      logger.error('Failed to delete config', { error, options });
      throw error;
    }
  }

  async getAllConfigs(userId?: string, integrationType?: string): Promise<IntegrationConfig[]> {
    try {
      // Build where clause
      const where: Prisma.integration_configsWhereInput = {};

      if (userId) {
        where.user_id = userId;
      }

      if (integrationType) {
        where.integration_type = integrationType;
      }

      // Fetch configs using Prisma
      const configs = await prisma.integration_configs.findMany({
        where,
        orderBy: [{ integration_type: 'asc' }, { config_key: 'asc' }],
      });

      return configs.map((config) => ({
        id: config.id,
        userId: config.user_id || undefined,
        integrationType: config.integration_type,
        configKey: config.config_key,
        configValue: config.config_value, // Keep encrypted
        isEncrypted: config.is_encrypted,
        isGlobal: config.is_global,
        description: config.description || undefined,
        metadata: config.metadata as Record<string, any> | undefined,
      }));
    } catch (error) {
      logger.error('Failed to get all configs', { error, userId, integrationType });
      throw error;
    }
  }

  // =====================================================
  // SPECIAL BUSINESS METHODS
  // =====================================================

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
        } catch {
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
  async testConfig(integrationType: string, _configs: Record<string, string>): Promise<boolean> {
    // This would be implemented per integration type
    // For now, just return true
    logger.info('Testing config', { integrationType });
    return true;
  }

  // Audit log integration configuration changes
  async logConfigChange(
    action: string,
    integrationType: string,
    configKey: string,
    userId?: string
  ): Promise<void> {
    try {
      await prisma.auditLog.create({
        data: {
          userId: userId || null,
          action,
          resource: 'integration_config',
          resourceId: `${integrationType}:${configKey}`,
          ipAddress: null, // Would be set from request context
          userAgent: null, // Would be set from request context
        },
      });
    } catch (error) {
      logger.error('Failed to log config change', { error, action, integrationType, configKey });
    }
  }
}

// =====================================================
// SINGLETON EXPORT
// =====================================================

// Export singleton instance
export const integrationConfigService = IntegrationConfigService.getInstance();
