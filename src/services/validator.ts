import Joi from 'joi';
import { logger } from '../utils/log';

const workflowSchema = Joi.object({
  id: Joi.string().optional(),
  name: Joi.string().required().min(1).max(100),
  active: Joi.boolean().default(false),
  nodes: Joi.array().items(
    Joi.object({
      id: Joi.string().required(),
      name: Joi.string().required(),
      type: Joi.string().required(),
      typeVersion: Joi.number().default(1),
      position: Joi.array().items(Joi.number()).length(2).required(),
      parameters: Joi.object().optional(),
      credentials: Joi.object().optional(),
      webhookId: Joi.string().optional(),
      disabled: Joi.boolean().default(false)
    })
  ).min(1).required(),
  connections: Joi.object().pattern(
    Joi.string(),
    Joi.object().pattern(
      Joi.string(),
      Joi.array().items(
        Joi.object({
          node: Joi.string().required(),
          type: Joi.string().required(),
          index: Joi.number().default(0)
        })
      )
    )
  ).optional(),
  settings: Joi.object({
    executionOrder: Joi.string().valid('v0', 'v1').default('v1'),
    saveManualExecutions: Joi.boolean().default(false),
    callerPolicy: Joi.string().optional(),
    errorWorkflow: Joi.string().optional(),
    timezone: Joi.string().default('America/New_York')
  }).optional(),
  staticData: Joi.object().optional(),
  meta: Joi.object().optional(),
  pinData: Joi.object().optional(),
  versionId: Joi.string().optional(),
  triggerCount: Joi.number().default(0),
  createdAt: Joi.date().optional(),
  updatedAt: Joi.date().optional()
});

const SECURITY_POLICIES = {
  MAX_NODES: 50,
  MAX_CONNECTIONS_PER_NODE: 10,
  ALLOWED_NODE_TYPES: [
    'n8n-nodes-base.start',
    'n8n-nodes-base.set',
    'n8n-nodes-base.if',
    'n8n-nodes-base.switch',
    'n8n-nodes-base.merge',
    'n8n-nodes-base.noOp',
    'n8n-nodes-base.httpRequest',
    'n8n-nodes-base.webhook',
    'n8n-nodes-base.function',
    'n8n-nodes-base.functionItem',
    'n8n-nodes-base.cron',
    'n8n-nodes-base.interval',
    'n8n-nodes-base.executeWorkflow',
    'n8n-nodes-base.emailSend',
    'n8n-nodes-base.slack',
    'n8n-nodes-base.postgres',
    'n8n-nodes-base.redis'
  ],
  FORBIDDEN_FUNCTIONS: [
    'eval',
    'Function',
    'require',
    'import',
    'process',
    'child_process',
    'fs',
    'path'
  ]
};

interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export const validateWorkflow = (workflow: any): ValidationResult => {
  const result: ValidationResult = {
    isValid: true,
    errors: [],
    warnings: []
  };

  try {
    // Validación estructural con Joi
    const { error } = workflowSchema.validate(workflow, { abortEarly: false });
    if (error) {
      result.isValid = false;
      result.errors = error.details.map(detail => detail.message);
      logger.error('Workflow validation failed:', error.details);
      return result;
    }

    // Validaciones de seguridad
    const securityValidation = validateSecurity(workflow);
    result.errors.push(...securityValidation.errors);
    result.warnings.push(...securityValidation.warnings);
    
    if (securityValidation.errors.length > 0) {
      result.isValid = false;
    }

    // Validaciones de lógica de negocio
    const businessValidation = validateBusinessLogic(workflow);
    result.errors.push(...businessValidation.errors);
    result.warnings.push(...businessValidation.warnings);
    
    if (businessValidation.errors.length > 0) {
      result.isValid = false;
    }

    logger.info(`Workflow validation completed: ${result.isValid ? 'PASSED' : 'FAILED'}`);
    return result;

  } catch (err: any) {
    logger.error('Validation error:', err.message);
    return {
      isValid: false,
      errors: [`Validation error: ${err.message}`],
      warnings: []
    };
  }
};

const validateSecurity = (workflow: any): { errors: string[], warnings: string[] } => {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Límite de nodos
  if (workflow.nodes.length > SECURITY_POLICIES.MAX_NODES) {
    errors.push(`Workflow exceeds maximum nodes limit (${SECURITY_POLICIES.MAX_NODES})`);
  }

  // Validar tipos de nodos permitidos
  for (const node of workflow.nodes) {
    if (!SECURITY_POLICIES.ALLOWED_NODE_TYPES.includes(node.type)) {
      errors.push(`Node type '${node.type}' is not allowed`);
    }

    // Validar parámetros de función
    if (node.type === 'n8n-nodes-base.function' || node.type === 'n8n-nodes-base.functionItem') {
      const code = node.parameters?.functionCode || '';
      for (const forbidden of SECURITY_POLICIES.FORBIDDEN_FUNCTIONS) {
        if (code.includes(forbidden)) {
          errors.push(`Function node contains forbidden code: '${forbidden}'`);
        }
      }
    }
  }

  // Validar conexiones
  if (workflow.connections) {
    for (const [nodeId, connections] of Object.entries(workflow.connections)) {
      const totalConnections = Object.values(connections as any).flat().length;
      if (totalConnections > SECURITY_POLICIES.MAX_CONNECTIONS_PER_NODE) {
        warnings.push(`Node '${nodeId}' has many connections (${totalConnections})`);
      }
    }
  }

  return { errors, warnings };
};

const validateBusinessLogic = (workflow: any): { errors: string[], warnings: string[] } => {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Validar que hay al menos un nodo de inicio
  const startNodes = workflow.nodes.filter((node: any) => 
    node.type === 'n8n-nodes-base.start' || 
    node.type === 'n8n-nodes-base.webhook' || 
    node.type === 'n8n-nodes-base.cron'
  );
  
  if (startNodes.length === 0) {
    errors.push('Workflow must have at least one trigger node (start, webhook, or cron)');
  }

  // Validar IDs únicos
  const nodeIds = workflow.nodes.map((node: any) => node.id);
  const duplicateIds = nodeIds.filter((id: string, index: number) => nodeIds.indexOf(id) !== index);
  if (duplicateIds.length > 0) {
    errors.push(`Duplicate node IDs found: ${duplicateIds.join(', ')}`);
  }

  // Validar conexiones válidas
  if (workflow.connections) {
    for (const [sourceId, outputs] of Object.entries(workflow.connections)) {
      const sourceExists = workflow.nodes.some((node: any) => node.id === sourceId);
      if (!sourceExists) {
        errors.push(`Connection references non-existent source node: ${sourceId}`);
      }

      for (const [outputType, connections] of Object.entries(outputs as Record<string, any[]>)) {
        for (const connection of connections) {
          const targetExists = workflow.nodes.some((node: any) => node.id === connection.node);
          if (!targetExists) {
            errors.push(`Connection references non-existent target node: ${connection.node}`);
          }
        }
      }
    }
  }

  // Advertir sobre nodos desconectados
  const connectedNodes = new Set();
  if (workflow.connections) {
    for (const [sourceId, outputs] of Object.entries(workflow.connections)) {
      connectedNodes.add(sourceId);
      for (const [outputType, connections] of Object.entries(outputs as Record<string, any[]>)) {
        for (const connection of connections) {
          connectedNodes.add(connection.node);
        }
      }
    }
  }

  const disconnectedNodes = workflow.nodes.filter((node: any) => 
    !connectedNodes.has(node.id) && 
    !['n8n-nodes-base.start', 'n8n-nodes-base.webhook', 'n8n-nodes-base.cron'].includes(node.type)
  );
  
  if (disconnectedNodes.length > 0) {
    warnings.push(`Workflow has disconnected nodes: ${disconnectedNodes.map((n: any) => n.name).join(', ')}`);
  }

  return { errors, warnings };
};

export const validateWorkflowUpdate = (existingWorkflow: any, updatedWorkflow: any): ValidationResult => {
  const result = validateWorkflow(updatedWorkflow);
  
  if (!result.isValid) {
    return result;
  }

  // Validaciones específicas para actualizaciones
  if (existingWorkflow.id !== updatedWorkflow.id) {
    result.errors.push('Workflow ID cannot be changed during update');
    result.isValid = false;
  }

  // Advertir sobre cambios críticos
  if (existingWorkflow.active && !updatedWorkflow.active) {
    result.warnings.push('Workflow will be deactivated');
  }

  const existingTriggers = existingWorkflow.nodes.filter((n: any) => 
    ['n8n-nodes-base.webhook', 'n8n-nodes-base.cron'].includes(n.type)
  );
  const newTriggers = updatedWorkflow.nodes.filter((n: any) => 
    ['n8n-nodes-base.webhook', 'n8n-nodes-base.cron'].includes(n.type)
  );

  if (existingTriggers.length !== newTriggers.length) {
    result.warnings.push('Trigger configuration has changed');
  }

  return result;
};