import { Router } from 'express';
import { strategiesController } from './controllers/strategies.controller';

const router = Router();

// Strategies endpoints
router.get('/', strategiesController.getStrategies);
router.get('/:id', strategiesController.getStrategy);
router.get('/:id/performance', strategiesController.getStrategyPerformance);
router.post('/:id/start', strategiesController.startStrategy);
router.post('/:id/stop', strategiesController.stopStrategy);
router.post('/:id/pause', strategiesController.pauseStrategy);
router.put('/:id/params', strategiesController.updateStrategyParams);

export { router as strategiesRouter };