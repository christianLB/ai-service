import { Router } from 'express';
import { openai } from '../services/openai';
import { modifyWorkflowPrompt } from '../utils/prompts';
import { logger } from '../utils/log';

const router = Router();

router.post('/flow-update', async (req, res) => {
  const { description, workflow } = req.body;
  try {
    const prompt = modifyWorkflowPrompt(description);
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'user', content: prompt },
        { role: 'system', content: JSON.stringify(workflow) }
      ]
    });
    const updated = response.choices[0].message?.content || '{}';
    logger.info('Updated workflow');
    res.json(JSON.parse(updated));
  } catch (err: any) {
    logger.error(err.message);
    res.status(500).json({ error: 'Failed to update workflow' });
  }
});

export default router;

