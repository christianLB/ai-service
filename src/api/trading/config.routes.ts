import { Router } from 'express';
import { configController } from './controllers/config.controller';

const router = Router();

// Config endpoints
router.get('/exchanges', configController.getExchanges);
router.get('/symbols', configController.getSymbols);
router.put('/risk-params', configController.updateRiskParams);
router.post('/emergency/stop-all', configController.emergencyStop);

export { router as configRouter };