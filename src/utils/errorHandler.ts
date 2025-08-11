import { Response } from 'express';
import { Logger } from './logger';

const logger = new Logger('ErrorHandler');

/**
 * Secure error handler that prevents information leakage
 * @param error - The error object
 * @param res - Express response object
 * @param context - Context where the error occurred (for logging)
 * @param defaultMessage - Safe message to return to client
 */
export const handleSecureError = (
  error: any,
  res: Response,
  context: string,
  defaultMessage: string
): void => {
  // Log detailed error internally
  const errorDetails = {
    context,
    message: error?.message || 'Unknown error',
    stack: error?.stack,
    code: error?.code,
    statusCode: error?.statusCode,
    timestamp: new Date().toISOString()
  };

  logger.error(`${context} failed:`, errorDetails);

  // Determine status code
  const statusCode = error?.statusCode || error?.status || 500;

  // Send safe response to client
  const responseData = {
    success: false,
    error: defaultMessage,
    // Only include error code if it's a known safe code
    ...(error?.code && ['INVALID_INPUT', 'NOT_FOUND', 'UNAUTHORIZED', 'FORBIDDEN'].includes(error.code)
      ? { code: error.code }
      : {})
  };

  res.status(statusCode).json(responseData);
};