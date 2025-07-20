import { Router } from 'express';
import { positionsController } from './controllers/positions.controller';

const router = Router();

// Positions endpoints
router.get('/', positionsController.getPositions);
router.get('/:id', positionsController.getPosition);
router.post('/close/:id', positionsController.closePosition);
router.post('/close-all', positionsController.closeAllPositions);
router.put('/:id/sl-tp', positionsController.updateStopLossTakeProfit);

export { router as positionsRouter };