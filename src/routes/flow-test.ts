import { Router } from 'express';
import { n8nClient } from '../services/n8n';
import { logger } from '../utils/log';

const router = Router();

router.post('/flow-test', async (req, res) => {
  const { workflow } = req.body;
  try {
    const response = await n8nClient.post('/workflow/test', workflow);
    logger.info('Tested workflow');
    res.json(response.data);
  } catch (err: any) {
    logger.error(err.message);
    res.status(500).json({ error: 'Failed to test workflow' });
  }
});

export default router;

