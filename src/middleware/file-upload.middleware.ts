import { Request, Response, NextFunction } from 'express';
import multer from 'multer';
import path from 'path';
import { Logger } from '../utils/logger';

const logger = new Logger('FileUploadMiddleware');

// Allowed MIME types for different file categories
const ALLOWED_MIME_TYPES = {
  documents: [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  ],
  images: [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'image/webp'
  ],
  archives: [
    'application/zip',
    'application/x-zip-compressed',
    'application/x-rar-compressed',
    'application/x-tar',
    'application/gzip'
  ]
};

// File size limits (in bytes)
const FILE_SIZE_LIMITS = {
  documents: 10 * 1024 * 1024, // 10MB
  images: 5 * 1024 * 1024,      // 5MB
  archives: 50 * 1024 * 1024,   // 50MB
  default: 10 * 1024 * 1024     // 10MB
};

// Validate file extension
const validateFileExtension = (filename: string, allowedExtensions: string[]): boolean => {
  const ext = path.extname(filename).toLowerCase();
  return allowedExtensions.includes(ext);
};

// Validate MIME type
const validateMimeType = (mimetype: string, allowedTypes: string[]): boolean => {
  return allowedTypes.includes(mimetype);
};

// Create multer storage configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    // Generate unique filename with timestamp
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const sanitizedName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
    cb(null, uniqueSuffix + '-' + sanitizedName);
  }
});

// File filter function
const createFileFilter = (category: keyof typeof ALLOWED_MIME_TYPES) => {
  return (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
    const allowedTypes = ALLOWED_MIME_TYPES[category] || ALLOWED_MIME_TYPES.documents;
    
    if (!validateMimeType(file.mimetype, allowedTypes)) {
      logger.warn(`Rejected file upload: Invalid MIME type ${file.mimetype}`);
      cb(new Error(`Invalid file type. Allowed types: ${allowedTypes.join(', ')}`));
      return;
    }
    
    // Additional security check on file extension
    const allowedExtensions = getAllowedExtensions(category);
    if (!validateFileExtension(file.originalname, allowedExtensions)) {
      logger.warn(`Rejected file upload: Invalid extension for ${file.originalname}`);
      cb(new Error(`Invalid file extension. Allowed extensions: ${allowedExtensions.join(', ')}`));
      return;
    }
    
    cb(null, true);
  };
};

// Get allowed extensions based on category
const getAllowedExtensions = (category: keyof typeof ALLOWED_MIME_TYPES): string[] => {
  switch (category) {
    case 'documents':
      return ['.pdf', '.doc', '.docx', '.txt', '.xls', '.xlsx'];
    case 'images':
      return ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
    case 'archives':
      return ['.zip', '.rar', '.tar', '.gz'];
    default:
      return ['.pdf', '.doc', '.docx', '.txt'];
  }
};

// Create upload middleware for different file types
export const uploadDocument = multer({
  storage,
  limits: {
    fileSize: FILE_SIZE_LIMITS.documents,
    files: 5 // Max 5 files per request
  },
  fileFilter: createFileFilter('documents')
});

export const uploadImage = multer({
  storage,
  limits: {
    fileSize: FILE_SIZE_LIMITS.images,
    files: 10 // Max 10 images per request
  },
  fileFilter: createFileFilter('images')
});

export const uploadArchive = multer({
  storage,
  limits: {
    fileSize: FILE_SIZE_LIMITS.archives,
    files: 1 // Max 1 archive per request
  },
  fileFilter: createFileFilter('archives')
});

// Generic file upload with custom options
export const createUploadMiddleware = (options: {
  category?: keyof typeof ALLOWED_MIME_TYPES;
  maxFileSize?: number;
  maxFiles?: number;
  allowedMimeTypes?: string[];
  allowedExtensions?: string[];
}) => {
  const {
    category = 'documents',
    maxFileSize = FILE_SIZE_LIMITS.default,
    maxFiles = 5,
    allowedMimeTypes,
    allowedExtensions
  } = options;

  return multer({
    storage,
    limits: {
      fileSize: maxFileSize,
      files: maxFiles
    },
    fileFilter: (req, file, cb) => {
      // Use custom MIME types if provided
      const mimeTypes = allowedMimeTypes || ALLOWED_MIME_TYPES[category] || ALLOWED_MIME_TYPES.documents;
      const extensions = allowedExtensions || getAllowedExtensions(category);
      
      if (!validateMimeType(file.mimetype, mimeTypes)) {
        cb(new Error(`Invalid file type. Allowed types: ${mimeTypes.join(', ')}`));
        return;
      }
      
      if (!validateFileExtension(file.originalname, extensions)) {
        cb(new Error(`Invalid file extension. Allowed extensions: ${extensions.join(', ')}`));
        return;
      }
      
      cb(null, true);
    }
  });
};

// Error handling middleware for multer errors
export const handleUploadError = (error: any, req: Request, res: Response, next: NextFunction): void => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      res.status(413).json({
        success: false,
        error: 'File too large',
        details: 'File size exceeds the allowed limit'
      });
      return;
    }
    if (error.code === 'LIMIT_FILE_COUNT') {
      res.status(400).json({
        success: false,
        error: 'Too many files',
        details: 'Number of files exceeds the allowed limit'
      });
      return;
    }
    if (error.code === 'LIMIT_UNEXPECTED_FILE') {
      res.status(400).json({
        success: false,
        error: 'Unexpected field',
        details: 'File field name not recognized'
      });
      return;
    }
  }
  
  if (error && error.message) {
    res.status(400).json({
      success: false,
      error: 'File upload failed',
      details: error.message
    });
    return;
  }
  
  next(error);
};