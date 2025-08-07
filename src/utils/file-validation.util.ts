import crypto from 'crypto';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

export interface FileValidationOptions {
  maxFileSize?: number;
  allowedMimeTypes?: string[];
  allowedExtensions?: string[];
  requireChecksum?: boolean;
}

export interface FileValidationResult {
  isValid: boolean;
  secureFileName: string;
  fileHash: string;
  size: number;
  mimeType: string;
  extension: string;
  errors: string[];
}

/**
 * Comprehensive file validation utility with security measures
 */
export class FileValidationUtil {
  private static readonly DEFAULT_MAX_SIZE = 10 * 1024 * 1024; // 10MB
  private static readonly DEFAULT_MIME_TYPES = [
    'application/pdf',
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/webp',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain',
    'text/csv'
  ];
  private static readonly DEFAULT_EXTENSIONS = [
    '.pdf', '.jpg', '.jpeg', '.png', '.webp',
    '.docx', '.doc', '.xlsx', '.xls', '.txt', '.csv'
  ];

  /**
   * Validate file with comprehensive security checks
   */
  static validateFile(
    fileBuffer: Buffer,
    fileName: string,
    declaredMimeType: string,
    options: FileValidationOptions = {},
    providedChecksum?: string
  ): FileValidationResult {
    const {
      maxFileSize = this.DEFAULT_MAX_SIZE,
      allowedMimeTypes = this.DEFAULT_MIME_TYPES,
      allowedExtensions = this.DEFAULT_EXTENSIONS,
      requireChecksum = false
    } = options;

    const errors: string[] = [];
    
    // 1. Basic validations
    if (fileBuffer.length === 0) {
      errors.push('File is empty');
    }
    
    if (fileBuffer.length > maxFileSize) {
      errors.push(`File size ${fileBuffer.length} exceeds maximum allowed size ${maxFileSize}`);
    }
    
    // 2. MIME type validation
    if (!allowedMimeTypes.includes(declaredMimeType)) {
      errors.push(`File type ${declaredMimeType} is not allowed. Allowed types: ${allowedMimeTypes.join(', ')}`);
    }
    
    // 3. File extension validation
    const extension = path.extname(fileName).toLowerCase();
    if (!allowedExtensions.includes(extension)) {
      errors.push(`File extension ${extension} is not allowed. Allowed extensions: ${allowedExtensions.join(', ')}`);
    }
    
    // 4. Filename security checks
    if (fileName.length > 255) {
      errors.push('Filename too long (max 255 characters)');
    }
    
    const suspiciousPatterns = [/\.\./g, /[\\/\\]/g, /^(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])$/i];
    if (suspiciousPatterns.some(pattern => pattern.test(fileName))) {
      errors.push('Filename contains suspicious patterns');
    }
    
    // 5. Content validation (magic number check)
    const detectedMimeType = this.detectMimeTypeFromContent(fileBuffer);
    if (detectedMimeType && detectedMimeType !== declaredMimeType) {
      // Warning but not fatal for some formats
      const isMajorMismatch = !this.isCompatibleMimeType(declaredMimeType, detectedMimeType);
      if (isMajorMismatch) {
        errors.push(`File content doesn't match declared type. Expected: ${declaredMimeType}, Detected: ${detectedMimeType}`);
      }
    }
    
    // 6. Generate file hash and secure filename
    const fileHash = crypto.createHash('sha256').update(fileBuffer).digest('hex');
    const secureFileName = `${uuidv4()}${extension}`;
    
    // 7. Checksum verification
    if (requireChecksum && !providedChecksum) {
      errors.push('Checksum is required but not provided');
    } else if (providedChecksum && providedChecksum !== fileHash) {
      errors.push('File checksum verification failed');
    }

    return {
      isValid: errors.length === 0,
      secureFileName,
      fileHash,
      size: fileBuffer.length,
      mimeType: declaredMimeType,
      extension,
      errors
    };
  }

  /**
   * Generate a secure UUID-based filename
   */
  static generateSecureFileName(originalFileName: string): string {
    const extension = path.extname(originalFileName).toLowerCase();
    return `${uuidv4()}${extension}`;
  }

  /**
   * Calculate file hash for integrity verification
   */
  static calculateFileHash(fileBuffer: Buffer): string {
    return crypto.createHash('sha256').update(fileBuffer).digest('hex');
  }

  /**
   * Detect MIME type from file content (magic numbers)
   */
  private static detectMimeTypeFromContent(buffer: Buffer): string | null {
    // PDF: %PDF
    if (buffer.subarray(0, 4).toString() === '%PDF') {
      return 'application/pdf';
    }
    
    // PNG: 89 50 4E 47
    if (buffer.subarray(0, 4).equals(Buffer.from([0x89, 0x50, 0x4E, 0x47]))) {
      return 'image/png';
    }
    
    // JPEG: FF D8 FF
    if (buffer.subarray(0, 3).equals(Buffer.from([0xFF, 0xD8, 0xFF]))) {
      return 'image/jpeg';
    }
    
    // WebP: RIFF...WEBP
    if (buffer.subarray(0, 4).equals(Buffer.from([0x52, 0x49, 0x46, 0x46])) &&
        buffer.subarray(8, 12).toString() === 'WEBP') {
      return 'image/webp';
    }
    
    // DOCX/XLSX: PK (ZIP archive)
    if (buffer.subarray(0, 2).equals(Buffer.from([0x50, 0x4B]))) {
      return null; // Let declared type stand for ZIP-based formats
    }
    
    return null;
  }

  /**
   * Check if two MIME types are compatible (minor variations)
   */
  private static isCompatibleMimeType(declared: string, detected: string): boolean {
    // Handle JPEG variations
    if ((declared === 'image/jpeg' && detected === 'image/jpg') ||
        (declared === 'image/jpg' && detected === 'image/jpeg')) {
      return true;
    }
    
    return false;
  }

  /**
   * Validate file upload request with Express multer integration
   */
  static validateUploadRequest(files: Express.Multer.File[], options: FileValidationOptions = {}) {
    const results: { file: Express.Multer.File; validation: FileValidationResult }[] = [];
    
    for (const file of files) {
      const validation = this.validateFile(
        file.buffer,
        file.originalname,
        file.mimetype,
        options
      );
      results.push({ file, validation });
    }
    
    return results;
  }
}

export default FileValidationUtil;