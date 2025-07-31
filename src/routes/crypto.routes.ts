import { Router, Request, Response, NextFunction } from 'express';
import { Pool } from 'pg';
import { AuthRequest } from '../middleware/auth.middleware';
import { CryptoConfigService } from '../services/crypto/crypto-config.service';
import { createDefaultOrchestrator } from '../services/crypto/crypto-orchestrator.service';
import { validate } from '../middleware/validation.middleware';
import { cryptoConfigSchema } from '../validation/crypto.validation';
import { standardRateLimit } from '../middleware/express-rate-limit.middleware';
import { handleSecureError } from '../utils/errorHandler';

export function createCryptoRoutes(pool: Pool): Router {
  const router = Router();
  const service = new CryptoConfigService(pool);

  router.get('/crypto/config', standardRateLimit, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const authReq = req as AuthRequest;
    try {
      if (!authReq.user) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }
      const configs = await service.getConfigs(authReq.user.userId);
      res.json({ success: true, data: configs });
    } catch (err: any) {
      handleSecureError(err, res, 'Crypto config retrieval', 'Failed to retrieve crypto configuration');
    }
  });

  router.post('/crypto/config', standardRateLimit, validate(cryptoConfigSchema), async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const authReq = req as AuthRequest;
    try {
      if (!authReq.user) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }
      const { provider, apiKey, secretKey, address } = authReq.body;
      await service.upsertConfig(authReq.user.userId, provider, apiKey, secretKey, address);
      res.json({ success: true });
    } catch (err: any) {
      handleSecureError(err, res, 'Crypto config update', 'Failed to update crypto configuration');
    }
  });

  router.post('/crypto/sync', standardRateLimit, async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const orchestrator = createDefaultOrchestrator();
      await orchestrator.syncAll();
      res.json({ success: true });
    } catch (err: any) {
      handleSecureError(err, res, 'Crypto sync', 'Failed to sync crypto data');
    }
  });

  return router;
}
