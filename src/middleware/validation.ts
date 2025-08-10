import { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import { z } from 'zod';

export const validateRequest = (req: Request, res: Response, _next: NextFunction): void => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({
      success: false,
      errors: errors.array()
    });
    return;
  }
  next();
};

export const validateZod = (schema: z.ZodSchema) => {
  return (req: Request, res: Response, _next: NextFunction): void => {
    try {
      schema.parse(req.body);
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({
          success: false,
          errors: error.errors
        });
        return;
      }
      next(error);
    }
  };
};

// Alias for validateZod to match generated route expectations
export const validateBody = validateZod;

// Validate query parameters
export const validateQuery = (schema: z.ZodSchema) => {
  return (req: Request, res: Response, _next: NextFunction): void => {
    try {
      schema.parse(req.query);
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({
          success: false,
          errors: error.errors
        });
        return;
      }
      next(error);
    }
  };
};