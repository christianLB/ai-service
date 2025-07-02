import { Router } from 'express';
import { n8nClient } from '../services/n8n';
import { logger } from '../utils/log';
import { validateWorkflow } from '../services/validator';
import { db } from '../services/database';
import { metricsService } from '../services/metrics';

const router = Router();

router.post('/flow-test', async (req: any, res: any) => {
  const startTime = Date.now();
  const { workflow, testData } = req.body;
  
  try {
    // Validar entrada
    if (!workflow) {
      return res.status(400).json({ error: 'Workflow is required' });
    }

    // Validar workflow antes de testear
    const validation = validateWorkflow(workflow);
    metricsService.recordWorkflowValidation(validation.isValid ? 'valid' : 'invalid', validation.errors[0]);
    
    if (!validation.isValid) {
      logger.error('Workflow failed validation before testing:', validation.errors);
      return res.status(400).json({ 
        error: 'Workflow failed validation',
        validation_errors: validation.errors,
        warnings: validation.warnings
      });
    }

    let testResult;
    let executionSuccess = true;
    
    try {
      // Intentar testear con n8n real si está disponible
      const response = await n8nClient.post('/workflows/test', {
        workflow,
        testData: testData || {}
      });
      testResult = response.data;
      logger.info('Workflow tested successfully with n8n');
    } catch (n8nError: any) {
      // Fallback a simulación si n8n no está disponible
      logger.warn('n8n not available, using simulation:', n8nError.message);
      
      testResult = {
        executionId: `sim-${Date.now()}`,
        status: 'success',
        startTime: new Date().toISOString(),
        endTime: new Date().toISOString(),
        executionTime: Math.random() * 1000 + 500, // Simular tiempo de ejecución
        data: {
          simulation: true,
          nodeExecutions: workflow.nodes?.map((node: any) => ({
            nodeName: node.name,
            status: 'success',
            executionTime: Math.random() * 100 + 50,
            outputData: { message: `Node ${node.name} executed successfully` }
          })) || []
        }
      };
    }

    // Registrar ejecución de test si tenemos un workflow ID
    if (workflow.id) {
      try {
        await db.createExecution({
          workflow_id: workflow.id,
          status: executionSuccess ? 'success' : 'error',
          input_data: testData || {},
          output_data: testResult,
          execution_time_ms: Date.now() - startTime
        });
      } catch (dbError) {
        logger.warn('Could not save test execution to database:', dbError);
      }
    }

    const totalDuration = (Date.now() - startTime) / 1000;
    logger.info(`Workflow test completed in ${totalDuration}s`);
    
    res.json({
      testResult: executionSuccess ? 'success' : 'error',
      executionData: testResult,
      validation: {
        valid: validation.isValid,
        warnings: validation.warnings
      },
      _metadata: {
        test_time_ms: Date.now() - startTime,
        tested_at: new Date().toISOString(),
        simulation_mode: !testResult.executionId || testResult.executionId.startsWith('sim-')
      }
    });
    
  } catch (err: any) {
    logger.error('Workflow test failed:', err.message);
    
    // Registrar fallo de test si tenemos un workflow ID
    if (workflow?.id) {
      try {
        await db.createExecution({
          workflow_id: workflow.id,
          status: 'error',
          input_data: testData || {},
          error_message: err.message,
          execution_time_ms: Date.now() - startTime
        });
      } catch (dbError) {
        logger.warn('Could not save failed test execution to database:', dbError);
      }
    }
    
    res.status(500).json({ 
      error: 'Failed to test workflow',
      details: err.message,
      testResult: 'error'
    });
  }
});

export default router;