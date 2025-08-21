import express from 'express';
import swaggerUi from 'swagger-ui-express';
import { readFileSync } from 'fs';
import { join } from 'path';
import yaml from 'js-yaml';

/**
 * Setup Swagger UI documentation
 */
export function setupSwaggerDocs(app: express.Application) {
  // Load the gateway OpenAPI specification
  const openapiPath = join(__dirname, '..', '..', 'openapi', 'gateway.yaml');

  try {
    const openapiSpec = yaml.load(readFileSync(openapiPath, 'utf8')) as any;

    // Swagger UI options
    const options: swaggerUi.SwaggerUiOptions = {
      customCss: '.swagger-ui .topbar { display: none }',
      customSiteTitle: 'AI Service API Documentation',
      swaggerOptions: {
        persistAuthorization: true,
        displayRequestDuration: true,
        docExpansion: 'none',
        filter: true,
        showCommonExtensions: true,
        showExtensions: true,
        tryItOutEnabled: true,
      },
    };

    // Serve Swagger UI at /api-docs
    app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(openapiSpec, options));

    // Also serve individual API specs
    app.get('/api-docs/specs/:service', (req, res) => {
      const service = req.params.service;
      const allowedServices = ['gateway', 'auth', 'financial', 'trading', 'ai-core', 'comm'];

      if (!allowedServices.includes(service)) {
        return res.status(404).json({ error: 'Service specification not found' });
      }

      try {
        const specPath = join(__dirname, '..', '..', 'openapi', `${service}.yaml`);
        const spec = yaml.load(readFileSync(specPath, 'utf8'));
        res.json(spec);
      } catch (error) {
        res.status(500).json({
          error: 'Failed to load specification',
          details: error instanceof Error ? error.message : String(error),
        });
      }
    });

    // Provide a JSON version of the OpenAPI spec
    app.get('/api-docs/openapi.json', (req, res) => {
      res.json(openapiSpec);
    });

    console.error('📚 Swagger UI documentation available at /api-docs');
  } catch (error) {
    console.error('❌ Failed to setup Swagger UI:', error);
  }
}

/**
 * Middleware to add OpenAPI documentation headers
 */
export function openapiHeaders(): express.RequestHandler {
  return (req, res, next) => {
    // Add Link header pointing to OpenAPI spec
    res.setHeader('Link', '</api-docs/openapi.json>; rel="describedby"; type="application/json"');

    // Add X-API-Version header
    res.setHeader('X-API-Version', '1.0.0');

    next();
  };
}
