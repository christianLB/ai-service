import { Router } from 'express';
import { dashboardController } from './controllers/dashboard.controller';

const router = Router();

// Dashboard endpoints
router.get('/overview', dashboardController.getOverview);
router.get('/metrics', dashboardController.getMetrics);

export { router as dashboardRouter };