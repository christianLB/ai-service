/**
 * File validation utility class
 * Used by tests for mocking
 */
export class FileValidationUtil {
  static validateFile(
    fileBuffer: Buffer,
    fileName: string,
    declaredMimeType: string,
    options?: any,
    providedChecksum?: string
  ): {
    isValid: boolean;
    errors: string[];
    mimeType?: string;
    extension?: string;
    fileHash?: string;
    secureFileName?: string;
  } {
    const extension = fileName.substring(fileName.lastIndexOf('.'));
    return {
      isValid: true,
      errors: [],
      mimeType: declaredMimeType,
      extension: extension,
      fileHash: providedChecksum || 'mock-hash',
      secureFileName: fileName.replace(/[^a-zA-Z0-9.-]/g, '_')
    };
  }

  static getMaxFileSize(): number {
    return 10 * 1024 * 1024; // 10MB
  }

  static getAllowedMimeTypes(): string[] {
    return [
      'application/pdf',
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/gif',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ];
  }
}

export default FileValidationUtil;