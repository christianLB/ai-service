import { Router } from 'express';
import { openai } from '../services/openai';
import { createWorkflowPrompt } from '../utils/prompts';
import { logger } from '../utils/log';

const router = Router();

router.post('/flow-gen', async (req, res) => {
  const { description } = req.body;
  try {
    const prompt = createWorkflowPrompt(description);
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [{ role: 'user', content: prompt }]
    });
    const workflow = response.choices[0].message?.content || '{}';
    logger.info(`Generated workflow from description`);
    res.json(JSON.parse(workflow));
  } catch (err: any) {
    logger.error(err.message);
    res.status(500).json({ error: 'Failed to generate workflow' });
  }
});

export default router;

