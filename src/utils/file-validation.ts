import { z } from 'zod';

/**
 * File validation utilities for invoice attachments
 */

export const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
export const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/gif',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
];

export const ALLOWED_EXTENSIONS = [
  '.pdf',
  '.jpeg',
  '.jpg',
  '.png',
  '.gif',
  '.doc',
  '.docx'
];

export interface FileValidationResult {
  isValid: boolean;
  errors: string[];
}

export interface InvoiceAttachmentFile {
  originalname: string;
  mimetype: string;
  size: number;
  buffer?: Buffer;
  path?: string;
}

/**
 * Validates an invoice attachment file
 */
export function validateInvoiceAttachment(file: InvoiceAttachmentFile): FileValidationResult {
  const errors: string[] = [];

  // Check file size
  if (file.size > MAX_FILE_SIZE) {
    errors.push(`File size exceeds maximum allowed size of ${MAX_FILE_SIZE / 1024 / 1024}MB`);
  }

  // Check MIME type
  if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    errors.push(`File type ${file.mimetype} is not allowed`);
  }

  // Check file extension
  const extension = file.originalname.toLowerCase().substring(file.originalname.lastIndexOf('.'));
  if (!ALLOWED_EXTENSIONS.includes(extension)) {
    errors.push(`File extension ${extension} is not allowed`);
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * File validation schema for Zod
 */
export const fileValidationSchema = z.object({
  originalname: z.string().min(1),
  mimetype: z.string().refine(
    (val) => ALLOWED_MIME_TYPES.includes(val),
    { message: 'Invalid file type' }
  ),
  size: z.number().max(MAX_FILE_SIZE, { message: 'File size too large' })
});

export default {
  validateInvoiceAttachment,
  fileValidationSchema,
  MAX_FILE_SIZE,
  ALLOWED_MIME_TYPES,
  ALLOWED_EXTENSIONS
};