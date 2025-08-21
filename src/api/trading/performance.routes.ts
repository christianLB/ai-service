import { Router } from 'express';
import { performanceController } from './controllers/performance.controller';

const router = Router();

// Performance endpoints
router.get('/metrics', performanceController.getPerformanceMetrics);

export { router as performanceRouter };
