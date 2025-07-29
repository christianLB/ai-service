import { Router, Request, Response, NextFunction } from 'express';
import { integrationConfigService } from '../../services/integrations';
import { Logger } from '../../utils/logger';
import { body, param, query, validationResult } from 'express-validator';

const logger = new Logger('IntegrationConfigRoutes');
const router = Router();

// Validation middleware
const validateRequest = (req: Request, res: Response, next: NextFunction): void => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ 
      success: false, 
      errors: errors.array() 
    });
    return;
  }
  next();
};

// GET /api/integrations/configs - Get all configurations
router.get('/configs',
  [
    query('integrationType').optional().isString(),
    query('userId').optional().isUUID()
  ],
  validateRequest,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { integrationType, userId } = req.query;
      
      // For security, only return non-sensitive config metadata
      const configs = await integrationConfigService.getAllConfigs(
        userId as string,
        integrationType as string
      );
      
      // Remove actual values for encrypted configs
      const sanitizedConfigs = configs.map(config => ({
        ...config,
        configValue: config.isEncrypted ? '***ENCRYPTED***' : config.configValue
      }));
      
      res.json({
        success: true,
        data: sanitizedConfigs
      });
    } catch (error) {
      logger.error('Error getting configs', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve configurations'
      });
    }
  }
);

// GET /api/integrations/configs/:type/:key - Get specific config value
router.get('/configs/:integrationType/:configKey',
  [
    param('integrationType').isString(),
    param('configKey').isString(),
    query('userId').optional().isUUID()
  ],
  validateRequest,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { integrationType, configKey } = req.params;
      const { userId } = req.query;
      
      const value = await integrationConfigService.getConfig({
        userId: userId as string,
        integrationType,
        configKey,
        decrypt: true
      });
      
      if (value === null) {
        res.status(404).json({
          success: false,
          error: 'Configuration not found'
        });
        return;
      }
      
      res.json({
        success: true,
        data: {
          integrationType,
          configKey,
          value
        }
      });
    } catch (error) {
      logger.error('Error getting config', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve configuration'
      });
    }
  }
);

// POST /api/integrations/configs - Create or update configuration
router.post('/configs',
  [
    body('integrationType').isString().notEmpty(),
    body('configKey').isString().notEmpty(),
    body('configValue').isString().notEmpty(),
    body('userId').optional().isUUID(),
    body('isGlobal').optional().isBoolean(),
    body('description').optional().isString(),
    body('encrypt').optional().isBoolean()
  ],
  validateRequest,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const {
        integrationType,
        configKey,
        configValue,
        userId,
        isGlobal = false,
        description,
        encrypt = true
      } = req.body;
      
      await integrationConfigService.setConfig({
        userId,
        integrationType,
        configKey,
        configValue,
        isGlobal,
        description,
        encrypt
      });
      
      res.json({
        success: true,
        message: 'Configuration saved successfully'
      });
    } catch (error) {
      logger.error('Error saving config', error);
      res.status(500).json({
        success: false,
        error: 'Failed to save configuration'
      });
    }
  }
);

// PUT /api/integrations/configs/:type/:key - Update specific configuration
router.put('/configs/:integrationType/:configKey',
  [
    param('integrationType').isString(),
    param('configKey').isString(),
    body('configValue').isString().notEmpty(),
    body('userId').optional().isUUID(),
    body('description').optional().isString()
  ],
  validateRequest,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { integrationType, configKey } = req.params;
      const { configValue, userId, description } = req.body;
      
      await integrationConfigService.setConfig({
        userId,
        integrationType,
        configKey,
        configValue,
        description,
        encrypt: true
      });
      
      res.json({
        success: true,
        message: 'Configuration updated successfully'
      });
    } catch (error) {
      logger.error('Error updating config', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update configuration'
      });
    }
  }
);

// DELETE /api/integrations/configs/:type/:key - Delete configuration
router.delete('/configs/:integrationType/:configKey',
  [
    param('integrationType').isString(),
    param('configKey').isString(),
    query('userId').optional().isUUID()
  ],
  validateRequest,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { integrationType, configKey } = req.params;
      const { userId } = req.query;
      
      const deleted = await integrationConfigService.deleteConfig({
        userId: userId as string,
        integrationType,
        configKey
      });
      
      if (!deleted) {
        res.status(404).json({
          success: false,
          error: 'Configuration not found'
        });
        return;
      }
      
      res.json({
        success: true,
        message: 'Configuration deleted successfully'
      });
    } catch (error) {
      logger.error('Error deleting config', error);
      res.status(500).json({
        success: false,
        error: 'Failed to delete configuration'
      });
    }
  }
);

// POST /api/integrations/test/:type - Test integration configuration
router.post('/test/:integrationType',
  [
    param('integrationType').isString(),
    body('configs').isObject()
  ],
  validateRequest,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { integrationType } = req.params;
      const { configs } = req.body;
      
      const isValid = await integrationConfigService.testConfig(integrationType, configs);
      
      res.json({
        success: true,
        data: {
          integrationType,
          isValid,
          message: isValid ? 'Configuration is valid' : 'Configuration test failed'
        }
      });
    } catch (error) {
      logger.error('Error testing config', error);
      res.status(500).json({
        success: false,
        error: 'Failed to test configuration'
      });
    }
  }
);

// GET /api/integrations/types - Get available integration types
router.get('/types', async (req: Request, res: Response) => {
  try {
    const { category } = req.query;
    
    // Define available integration types and their config keys
    const allIntegrationTypes = [
      {
        type: 'telegram',
        name: 'Telegram',
        category: 'notifications',
        description: 'Telegram bot integration for notifications and commands',
        configKeys: [
          { key: 'bot_token', required: true, encrypted: true, description: 'Bot API token from BotFather' },
          { key: 'chat_id', required: true, encrypted: false, description: 'Default chat ID for notifications' },
          { key: 'webhook_url', required: false, encrypted: false, description: 'Webhook URL for receiving updates' },
          { key: 'alerts_enabled', required: false, encrypted: false, description: 'Enable/disable alerts' }
        ]
      },
      {
        type: 'gocardless',
        name: 'GoCardless',
        category: 'integrations',
        description: 'Open Banking integration for bank account access',
        configKeys: [
          // Common Configuration
          { key: 'base_url', required: false, encrypted: false, description: 'API URL (default: https://bankaccountdata.gocardless.com/api/v2)' },
          { key: 'redirect_uri', required: true, encrypted: false, description: 'Redirect URI after bank authorization' },
          
          // Production Configuration
          { key: 'secret_id', required: false, encrypted: true, description: 'Production Secret ID (for live mode)' },
          { key: 'secret_key', required: false, encrypted: true, description: 'Production Secret Key (for live mode)' }
        ]
      },
      {
        type: 'crypto',
        name: 'Cryptocurrency',
        category: 'integrations',
        description: 'Cryptocurrency exchange integrations',
        configKeys: [
          { key: 'binance_api_key', required: false, encrypted: true, description: 'Binance API key' },
          { key: 'binance_secret_key', required: false, encrypted: true, description: 'Binance secret key' },
          { key: 'cryptocom_api_key', required: false, encrypted: true, description: 'Crypto.com API key' },
          { key: 'cryptocom_secret_key', required: false, encrypted: true, description: 'Crypto.com secret key' }
        ]
      },
      {
        type: 'email',
        name: 'Email',
        category: 'integrations',
        description: 'Email service configuration',
        configKeys: [
          { key: 'smtp_host', required: true, encrypted: false, description: 'SMTP server host' },
          { key: 'smtp_port', required: true, encrypted: false, description: 'SMTP server port' },
          { key: 'smtp_user', required: true, encrypted: false, description: 'SMTP username' },
          { key: 'smtp_pass', required: true, encrypted: true, description: 'SMTP password' },
          { key: 'from_email', required: true, encrypted: false, description: 'Default from email' }
        ]
      },
      {
        type: 'openai',
        name: 'OpenAI',
        category: 'integrations',
        description: 'OpenAI API integration',
        configKeys: [
          { key: 'api_key', required: true, encrypted: true, description: 'OpenAI API key' },
          { key: 'organization_id', required: false, encrypted: false, description: 'OpenAI organization ID' },
          { key: 'model', required: false, encrypted: false, description: 'Default model to use' }
        ]
      },
      {
        type: 'claude',
        name: 'Claude (Anthropic)',
        category: 'integrations',
        description: 'Anthropic Claude AI integration for trading intelligence',
        configKeys: [
          { key: 'api_key', required: true, encrypted: true, description: 'Claude API key' },
          { key: 'model', required: false, encrypted: false, description: 'Model (e.g., claude-3-opus-20240229)' },
          { key: 'max_tokens', required: false, encrypted: false, description: 'Maximum tokens per request' },
          { key: 'temperature', required: false, encrypted: false, description: 'Temperature (0.0-1.0)' }
        ]
      }
    ];
    
    // Filter by category if requested
    let integrationTypes = allIntegrationTypes;
    if (category) {
      integrationTypes = allIntegrationTypes.filter(type => type.category === category);
    }
    
    res.json({
      success: true,
      data: integrationTypes
    });
  } catch (error) {
    logger.error('Error getting integration types', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve integration types'
    });
  }
});

export default router;