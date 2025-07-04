import { Router } from 'express';
import { openai } from '../services/openai';
import { modifyWorkflowPrompt } from '../utils/prompts';
import { logger } from '../utils/log';
import { validateWorkflow, validateWorkflowUpdate } from '../services/validator';
import { db } from '../services/database';
import { metricsService } from '../services/metrics';

const router = Router();

router.post('/flow-update', async (req: any, res: any) => {
  const startTime = Date.now();
  const { workflowId, changes, description } = req.body;
  
  try {
    // Validar entrada
    if (!workflowId || (!changes && !description)) {
      return res.status(400).json({ 
        error: 'workflowId and either changes or description are required' 
      });
    }

    // Obtener workflow existente
    const existingWorkflow = await db.getWorkflow(workflowId);
    if (!existingWorkflow) {
      return res.status(404).json({ error: 'Workflow not found' });
    }

    // Generar workflow actualizado con IA
    const prompt = modifyWorkflowPrompt(changes || description);
    const llmStartTime = Date.now();
    
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: 'You are updating an existing n8n workflow. Preserve the structure and only modify what was requested.' },
        { role: 'user', content: prompt },
        { role: 'assistant', content: `Current workflow: ${JSON.stringify(existingWorkflow.workflow_data)}` }
      ]
    });
    
    const llmDuration = (Date.now() - llmStartTime) / 1000;
    metricsService.recordLLMRequest('openai', 'gpt-4o', llmDuration, true);
    
    const updatedContent = response.choices[0].message?.content || '{}';
    let updatedWorkflow;
    
    try {
      updatedWorkflow = JSON.parse(updatedContent);
    } catch (parseError) {
      logger.error('Failed to parse LLM response as JSON:', parseError);
      metricsService.recordWorkflowGeneration('error', 'gpt-4o');
      return res.status(500).json({ 
        error: 'Failed to parse updated workflow',
        details: 'LLM response was not valid JSON'
      });
    }

    // Validar workflow actualizado
    const validation = validateWorkflowUpdate(existingWorkflow.workflow_data, updatedWorkflow);
    metricsService.recordWorkflowValidation(validation.isValid ? 'valid' : 'invalid', validation.errors[0]);
    
    if (!validation.isValid) {
      logger.error('Updated workflow failed validation:', validation.errors);
      return res.status(400).json({ 
        error: 'Updated workflow failed validation',
        validation_errors: validation.errors,
        warnings: validation.warnings
      });
    }

    // Actualizar en base de datos
    const updateSuccess = await db.updateWorkflow(workflowId, {
      workflow_data: updatedWorkflow,
      description: `${existingWorkflow.description || ''} | Updated: ${changes || description}`
    });

    if (!updateSuccess) {
      return res.status(500).json({ error: 'Failed to save updated workflow' });
    }

    // Crear registro de ejecución
    await db.createExecution({
      workflow_id: workflowId,
      status: 'success',
      input_data: { changes: changes || description },
      output_data: { workflow_updated: true }
    });

    const totalDuration = (Date.now() - startTime) / 1000;
    metricsService.recordWorkflowGeneration('success', 'gpt-4o', totalDuration);
    
    logger.info(`Updated workflow ${workflowId} in ${totalDuration}s`);
    
    res.json({
      ...updatedWorkflow,
      _metadata: {
        id: workflowId,
        updated_at: new Date().toISOString(),
        update_time_ms: Date.now() - startTime,
        changes: changes || description,
        validation: {
          valid: validation.isValid,
          warnings: validation.warnings
        }
      }
    });
    
  } catch (err: any) {
    const totalDuration = (Date.now() - startTime) / 1000;
    metricsService.recordWorkflowGeneration('error', 'gpt-4o', totalDuration);
    metricsService.recordLLMRequest('openai', 'gpt-4o', totalDuration, false);
    
    logger.error('Workflow update failed:', err.message);
    res.status(500).json({ 
      error: 'Failed to update workflow',
      details: err.message 
    });
  }
});

export default router;