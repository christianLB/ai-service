import { Request, Response, NextFunction } from 'express';
import { AnyZodObject, ZodError } from 'zod';
import { Logger } from '../utils/logger';

const logger = new Logger('ValidationMiddleware');

export const validate = (schema: AnyZodObject) => {
  return async (req: Request, res: Response, _next: NextFunction: Promise<void> => {
    try {
      await schema.parseAsync({
        body: req.body,
        query: req.query,
        params: req.params
      });
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const errorMessages = error.errors.map(issue => ({
          path: issue.path.join('.'),
          message: issue.message
        }));

        logger.warn('Validation failed:', errorMessages);

        res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: errorMessages
        });
        return;
      }

      logger.error('Unexpected validation error:', error);
      res.status(500).json({
        success: false,
        error: 'An unexpected error occurred during validation'
      });
    }
  };
};