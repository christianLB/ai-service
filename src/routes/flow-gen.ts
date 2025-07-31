import { Router, Request, Response, NextFunction } from 'express';
import { openai } from '../services/openai';
import { createWorkflowPrompt } from '../utils/prompts';
import { logger } from '../utils/log';
import { validateWorkflow } from '../services/validator';
import { db } from '../services/database';
import { metricsService } from '../services/metrics';
import { validate } from '../middleware/validation.middleware';
import { flowGenSchema, getFlowsSchema, getFlowByIdSchema, getPerformanceSchema } from '../validation/flow.validation';
import { standardRateLimit } from '../middleware/express-rate-limit.middleware';

const router = Router();

router.post('/flow-gen', standardRateLimit, validate(flowGenSchema), async (req: Request, res: Response, next: NextFunction) => {
  const startTime = Date.now();
  const { description, save = true } = req.body;
  
  try {

    // Generar workflow con IA
    const prompt = createWorkflowPrompt(description);
    const llmStartTime = Date.now();
    
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [{ role: 'user', content: prompt }]
    });
    
    const llmDuration = (Date.now() - llmStartTime) / 1000;
    metricsService.recordLLMRequest('openai', 'gpt-4o', llmDuration, true);
    
    const workflowContent = response.choices[0].message?.content || '{}';
    let workflow;
    
    try {
      workflow = JSON.parse(workflowContent);
    } catch (parseError) {
      logger.error('Failed to parse LLM response as JSON:', parseError);
      metricsService.recordWorkflowGeneration('error', 'gpt-4o');
      return res.status(500).json({ 
        error: 'Failed to parse generated workflow',
        details: 'LLM response was not valid JSON'
      });
    }

    // Validar workflow generado
    const validation = validateWorkflow(workflow);
    metricsService.recordWorkflowValidation(validation.isValid ? 'valid' : 'invalid', validation.errors[0]);
    
    if (!validation.isValid) {
      logger.error('Generated workflow failed validation:', validation.errors);
      metricsService.recordWorkflowGeneration('error', 'gpt-4o');
      return res.status(400).json({ 
        error: 'Generated workflow failed validation',
        validation_errors: validation.errors,
        warnings: validation.warnings
      });
    }

    // Guardar en base de datos si se solicita
    let workflowId;
    if (save) {
      try {
        workflowId = await db.createWorkflow({
          name: workflow.name || 'Generated Workflow',
          description: `Generated from: ${description}`,
          active: false,
          workflow_data: workflow,
          created_by: 'ai-service',
          tags: ['ai-generated', 'auto-created']
        });
        
        // Crear registro de ejecución
        await db.createExecution({
          workflow_id: workflowId,
          status: 'success',
          input_data: { description },
          output_data: { workflow_generated: true }
        });
        
        logger.info(`Workflow created and saved: ${workflowId}`);
      } catch (dbError: any) {
        logger.error('Failed to save workflow to database:', dbError.message);
        // No fallar la respuesta, solo logear el error
      }
    }

    const totalDuration = (Date.now() - startTime) / 1000;
    metricsService.recordWorkflowGeneration('success', 'gpt-4o', totalDuration);
    
    logger.info(`Generated workflow from description in ${totalDuration}s`);
    
    res.json({
      ...workflow,
      _metadata: {
        id: workflowId,
        generated_at: new Date().toISOString(),
        generation_time_ms: Date.now() - startTime,
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
    
    logger.error('Workflow generation failed:', err.message);
    res.status(500).json({ 
      error: 'Failed to generate workflow',
      details: err.message 
    });
  }
});

// Endpoint para obtener workflows guardados
router.get('/flows', standardRateLimit, validate(getFlowsSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { active } = req.query;
    const activeFilter = active === 'true' ? true : active === 'false' ? false : undefined;
    
    const workflows = await db.getAllWorkflows(activeFilter);
    res.json({
      workflows,
      total: workflows.length,
      active_count: workflows.filter(w => w.active).length
    });
  } catch (err: any) {
    logger.error('Failed to get workflows:', err.message);
    res.status(500).json({ error: 'Failed to retrieve workflows' });
  }
});

// Endpoint para obtener un workflow específico
router.get('/flows/:id', standardRateLimit, validate(getFlowByIdSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const workflow = await db.getWorkflow(id);
    
    if (!workflow) {
      return res.status(404).json({ error: 'Workflow not found' });
    }
    
    // Obtener ejecuciones recientes
    const executions = await db.getExecutionsForWorkflow(id, 10);
    
    res.json({
      ...workflow,
      recent_executions: executions
    });
  } catch (err: any) {
    logger.error('Failed to get workflow:', err.message);
    res.status(500).json({ error: 'Failed to retrieve workflow' });
  }
});

// Endpoint para métricas
router.get('/metrics', standardRateLimit, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const metrics = await metricsService.getMetrics();
    res.set('Content-Type', 'text/plain');
    res.send(metrics);
  } catch (err: any) {
    logger.error('Failed to get metrics:', err.message);
    res.status(500).json({ error: 'Failed to retrieve metrics' });
  }
});

// Endpoint para métricas en JSON
router.get('/metrics/json', standardRateLimit, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const metrics = await metricsService.getMetricsJson();
    res.json(metrics);
  } catch (err: any) {
    logger.error('Failed to get metrics JSON:', err.message);
    res.status(500).json({ error: 'Failed to retrieve metrics' });
  }
});

// Endpoint para reporte de rendimiento
router.get('/performance', standardRateLimit, validate(getPerformanceSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const hours = parseInt(req.query.hours as string) || 24;
    const report = await metricsService.getPerformanceReport(hours);
    res.json(report);
  } catch (err: any) {
    logger.error('Failed to get performance report:', err.message);
    res.status(500).json({ error: 'Failed to generate performance report' });
  }
});

export default router;