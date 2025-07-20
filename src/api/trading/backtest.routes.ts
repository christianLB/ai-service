import { Router } from 'express';
import { backtestController } from './controllers/backtest.controller';

const router = Router();

// Backtest endpoints
router.post('/run', backtestController.runBacktest);
router.get('/results', backtestController.getBacktestResults);
router.get('/results/:id', backtestController.getBacktestResult);
router.post('/optimize', backtestController.optimizeStrategy);

export { router as backtestRouter };