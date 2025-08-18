import { Router } from 'express';
import configRoutes from './config.routes';

const router = Router();

// Mount config routes
router.use('/', configRoutes);

export default router;
