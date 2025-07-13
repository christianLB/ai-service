import { Router, Request, Response } from 'express';
import { RealEstateService } from '../services/real-estate';
import { Pool } from 'pg';

const router = Router();

const pool = new Pool({
  host: process.env.POSTGRES_HOST,
  port: Number(process.env.POSTGRES_PORT),
  database: process.env.POSTGRES_DB,
  user: process.env.POSTGRES_USER,
  password: process.env.POSTGRES_PASSWORD,
});

const service = new RealEstateService(pool);

router.get('/properties', async (_req: Request, res: Response) => {
  try {
    const properties = await service.listProperties();
    res.json({ success: true, data: properties });
  } catch (err) {
    res.status(500).json({ success: false, error: (err as Error).message });
  }
});

router.post('/properties', async (req: Request, res: Response) => {
  try {
    const property = await service.createProperty(req.body);
    res.status(201).json({ success: true, data: property });
  } catch (err) {
    res.status(500).json({ success: false, error: (err as Error).message });
  }
});

export default router;
