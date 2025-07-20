import { Router } from 'express';
import { dashboardRouter } from './dashboard.routes';
import { positionsRouter } from './positions.routes';
import { strategiesRouter } from './strategies.routes';
import { backtestRouter } from './backtest.routes';
import { performanceRouter } from './performance.routes';
import { configRouter } from './config.routes';

const router = Router();

// Trading routes
router.use('/dashboard', dashboardRouter);
router.use('/positions', positionsRouter);
router.use('/strategies', strategiesRouter);
router.use('/backtest', backtestRouter);
router.use('/performance', performanceRouter);
router.use('/config', configRouter);

// Health check
router.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'trading' });
});

export { router as tradingRouter };