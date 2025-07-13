import { Router, Request, Response } from 'express';
import { Pool } from 'pg';
import { AuthRequest } from '../middleware/auth.middleware';
import { CryptoConfigService } from '../services/crypto/crypto-config.service';
import { createDefaultOrchestrator } from '../services/crypto/crypto-orchestrator.service';

export function createCryptoRoutes(pool: Pool): Router {
  const router = Router();
  const service = new CryptoConfigService(pool);

  router.get('/crypto/config', async (req: Request, res: Response): Promise<void> => {
    const authReq = req as AuthRequest;
    try {
      if (!authReq.user) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }
      const configs = await service.getConfigs(authReq.user.userId);
      res.json({ success: true, data: configs });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  router.post('/crypto/config', async (req: Request, res: Response): Promise<void> => {
    const authReq = req as AuthRequest;
    try {
      if (!authReq.user) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }
      const { provider, apiKey, secretKey, address } = authReq.body;
      if (!provider) {
        res.status(400).json({ error: 'provider is required' });
        return;
      }
      await service.upsertConfig(authReq.user.userId, provider, apiKey, secretKey, address);
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  router.post('/crypto/sync', async (_req: Request, res: Response): Promise<void> => {
    try {
      const orchestrator = createDefaultOrchestrator();
      await orchestrator.syncAll();
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  return router;
}
