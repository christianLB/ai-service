import { AppError } from '../../utils/errors';
import { ErrorCode } from '../../types/tagging/response.types';

// Base tagging error
export class TaggingError extends AppError {
  public code: ErrorCode;
  public details?: any;

  constructor(message: string, statusCode: number, code: ErrorCode, details?: any) {
    super(message, statusCode);
    this.code = code;
    this.details = details;
  }
}

// Specific error classes
export class TagNotFoundError extends TaggingError {
  constructor(tagId: string) {
    super(`Tag not found: ${tagId}`, 404, ErrorCode.NOT_FOUND, { tagId });
  }
}

export class EntityNotFoundError extends TaggingError {
  constructor(entityType: string, entityId: string) {
    super(
      `Entity not found: ${entityType}/${entityId}`,
      404,
      ErrorCode.NOT_FOUND,
      { entityType, entityId }
    );
  }
}

export class DuplicateTagCodeError extends TaggingError {
  constructor(code: string) {
    super(
      `Tag with code '${code}' already exists`,
      409,
      ErrorCode.CONFLICT,
      { code }
    );
  }
}

export class InvalidTagHierarchyError extends TaggingError {
  constructor(message: string, details?: any) {
    super(message, 400, ErrorCode.VALIDATION_ERROR, details);
  }
}

export class AIProviderError extends TaggingError {
  constructor(provider: string, message: string) {
    super(
      `AI provider error (${provider}): ${message}`,
      503,
      ErrorCode.AI_PROVIDER_ERROR,
      { provider }
    );
  }
}

export class InsufficientCreditsError extends TaggingError {
  constructor(required: number, available: number) {
    super(
      'Insufficient AI credits for this operation',
      402,
      ErrorCode.INSUFFICIENT_CREDITS,
      { required, available }
    );
  }
}

export class RateLimitError extends TaggingError {
  constructor(limit: number, reset: Date) {
    super(
      'Rate limit exceeded',
      429,
      ErrorCode.RATE_LIMIT_EXCEEDED,
      { limit, reset: reset.toISOString() }
    );
  }
}

export class ValidationError extends TaggingError {
  constructor(field: string, value: any, constraint: string) {
    super(
      `Validation failed for field '${field}'`,
      400,
      ErrorCode.VALIDATION_ERROR,
      { field, value, constraint }
    );
  }
}

// Error handler utility
export function handleTaggingError(error: any): TaggingError {
  if (error instanceof TaggingError) {
    return error;
  }

  if (error.code === 'P2002' && error.meta?.target?.includes('code')) {
    return new DuplicateTagCodeError(error.meta.target);
  }

  if (error.code === 'P2025') {
    return new TaggingError(
      'Record not found',
      404,
      ErrorCode.NOT_FOUND,
      error.meta
    );
  }

  // Default to internal error
  return new TaggingError(
    error.message || 'An unexpected error occurred',
    500,
    ErrorCode.INTERNAL_ERROR,
    { originalError: error.toString() }
  );
}