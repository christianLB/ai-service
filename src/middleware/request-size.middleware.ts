import { Request, Response, NextFunction } from 'express';
import { Logger } from '../utils/logger';

const logger = new Logger('RequestSizeMiddleware');

// Default size limits
export const SIZE_LIMITS = {
  json: '10mb',        // JSON payloads
  urlencoded: '10mb',  // URL-encoded forms
  raw: '10mb',         // Raw data
  text: '1mb',         // Text data
  api: '1mb',          // Strict API endpoints
  upload: '50mb'       // File uploads
};

// Create middleware for request size validation
export const createSizeLimitMiddleware = (limit: string | number) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    // Skip if no content-length header
    const contentLength = req.headers['content-length'];
    if (!contentLength) {
      next();
      return;
    }

    const maxSize = parseSize(limit);
    const requestSize = parseInt(contentLength);

    if (requestSize > maxSize) {
      logger.warn(`Request size ${requestSize} exceeds limit ${maxSize}`);
      res.status(413).json({
        success: false,
        error: 'Payload too large',
        details: `Request size ${formatBytes(requestSize)} exceeds maximum allowed size of ${formatBytes(maxSize)}`
      });
      return;
    }

    next();
  };
};

// Parse size string to bytes
const parseSize = (size: string | number): number => {
  if (typeof size === 'number') {
    return size;
  }

  const match = size.match(/^(\d+(?:\.\d+)?)\s*(kb|mb|gb)?$/i);
  if (!match) {
    throw new Error(`Invalid size format: ${size}`);
  }

  const value = parseFloat(match[1]);
  const unit = (match[2] || 'b').toLowerCase();

  const multipliers: Record<string, number> = {
    b: 1,
    kb: 1024,
    mb: 1024 * 1024,
    gb: 1024 * 1024 * 1024
  };

  return Math.floor(value * (multipliers[unit] || 1));
};

// Format bytes to human readable string
const formatBytes = (bytes: number): string => {
  if (bytes === 0) {
    return '0 Bytes';
  }

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

// Pre-configured middleware instances
export const jsonSizeLimit = createSizeLimitMiddleware(SIZE_LIMITS.json);
export const apiSizeLimit = createSizeLimitMiddleware(SIZE_LIMITS.api);
export const uploadSizeLimit = createSizeLimitMiddleware(SIZE_LIMITS.upload);