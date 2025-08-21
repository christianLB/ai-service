import * as fs from 'fs/promises';
import { Stats } from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';

export interface StorageOptions {
  basePath?: string;
  maxFileSize?: number;
  allowedTypes?: string[];
  generateThumbnails?: boolean;
}

export interface StorageResult {
  path: string;
  url: string;
  size: number;
  mimeType: string;
}

export interface SignedUrlOptions {
  expiresIn?: number; // seconds
  action?: 'read' | 'write' | 'delete';
}

export class DocumentStorageService {
  private basePath: string;
  private maxFileSize: number;
  private allowedTypes: string[];
  private generateThumbnails: boolean;

  constructor(options: StorageOptions = {}) {
    this.basePath =
      options.basePath ||
      process.env.DOCUMENT_STORAGE_PATH ||
      path.join(process.cwd(), 'data', 'documents', 'storage');
    this.maxFileSize = options.maxFileSize || 50 * 1024 * 1024; // 50MB default
    this.allowedTypes = options.allowedTypes || [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/msword',
      'text/plain',
      'text/html',
      'text/markdown',
      'text/csv',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/bmp',
    ];
    this.generateThumbnails = options.generateThumbnails || false;
  }

  async init(): Promise<void> {
    try {
      await fs.mkdir(this.basePath, { recursive: true });
      await fs.mkdir(path.join(this.basePath, 'thumbnails'), { recursive: true });
      await fs.mkdir(path.join(this.basePath, 'temp'), { recursive: true });
      // console.log('✅ Document storage initialized at:', this.basePath);
    } catch (error) {
      console.error('❌ Failed to initialize document storage:', error);
      throw error;
    }
  }

  async uploadFile(file: Buffer, fileName: string, mimeType: string): Promise<StorageResult> {
    // Validate file
    this.validateFile(file, mimeType);

    // Generate unique filename
    const extension = path.extname(fileName);
    const uniqueId = uuidv4();
    const uniqueFileName = `${uniqueId}${extension}`;
    const filePath = path.join(this.basePath, uniqueFileName);

    try {
      // Write file to disk
      await fs.writeFile(filePath, file);

      // Generate thumbnail if needed
      if (this.generateThumbnails && this.isImageFile(mimeType)) {
        await this.generateThumbnail(file, uniqueId);
      }

      return {
        path: filePath,
        url: `/api/documents/files/${uniqueFileName}`,
        size: file.length,
        mimeType,
      };
    } catch (error: any) {
      console.error('❌ Failed to upload file:', error);
      throw new Error(`Failed to upload file: ${error.message}`);
    }
  }

  async downloadFile(filePath: string): Promise<Buffer> {
    try {
      const fullPath = path.isAbsolute(filePath) ? filePath : path.join(this.basePath, filePath);
      const file = await fs.readFile(fullPath);
      return file;
    } catch (error: any) {
      console.error('❌ Failed to download file:', error);
      throw new Error(`Failed to download file: ${error.message}`);
    }
  }

  async deleteFile(filePath: string): Promise<void> {
    try {
      const fullPath = path.isAbsolute(filePath) ? filePath : path.join(this.basePath, filePath);
      await fs.unlink(fullPath);

      // Also delete thumbnail if it exists
      const fileName = path.basename(fullPath, path.extname(fullPath));
      const thumbnailPath = path.join(this.basePath, 'thumbnails', `${fileName}_thumb.jpg`);

      try {
        await fs.unlink(thumbnailPath);
      } catch (error) {
        // Thumbnail might not exist, ignore error
      }
    } catch (error: any) {
      console.error('❌ Failed to delete file:', error);
      throw new Error(`Failed to delete file: ${error.message}`);
    }
  }

  async getSignedUrl(filePath: string, options: SignedUrlOptions = {}): Promise<string> {
    // For local storage, we'll return a simple URL with a token
    // In production, this should be replaced with cloud storage signed URLs
    const expiresIn = options.expiresIn || 3600; // 1 hour default
    const action = options.action || 'read';

    const token = this.generateAccessToken(filePath, expiresIn, action);
    const fileName = path.basename(filePath);

    return `/api/documents/files/${fileName}?token=${token}&expires=${Date.now() + expiresIn * 1000}`;
  }

  async fileExists(filePath: string): Promise<boolean> {
    try {
      const fullPath = path.isAbsolute(filePath) ? filePath : path.join(this.basePath, filePath);
      await fs.access(fullPath);
      return true;
    } catch {
      return false;
    }
  }

  async getFileStats(filePath: string): Promise<Stats> {
    try {
      const fullPath = path.isAbsolute(filePath) ? filePath : path.join(this.basePath, filePath);
      return await fs.stat(fullPath);
    } catch (error: any) {
      console.error('❌ Failed to get file stats:', error);
      throw new Error(`Failed to get file stats: ${error.message}`);
    }
  }

  async moveFile(sourcePath: string, destinationPath: string): Promise<void> {
    try {
      const fullSourcePath = path.isAbsolute(sourcePath)
        ? sourcePath
        : path.join(this.basePath, sourcePath);
      const fullDestPath = path.isAbsolute(destinationPath)
        ? destinationPath
        : path.join(this.basePath, destinationPath);

      await fs.rename(fullSourcePath, fullDestPath);
    } catch (error: any) {
      console.error('❌ Failed to move file:', error);
      throw new Error(`Failed to move file: ${error.message}`);
    }
  }

  async copyFile(sourcePath: string, destinationPath: string): Promise<void> {
    try {
      const fullSourcePath = path.isAbsolute(sourcePath)
        ? sourcePath
        : path.join(this.basePath, sourcePath);
      const fullDestPath = path.isAbsolute(destinationPath)
        ? destinationPath
        : path.join(this.basePath, destinationPath);

      await fs.copyFile(fullSourcePath, fullDestPath);
    } catch (error: any) {
      console.error('❌ Failed to copy file:', error);
      throw new Error(`Failed to copy file: ${error.message}`);
    }
  }

  async listFiles(directory: string = ''): Promise<string[]> {
    try {
      const fullPath = path.join(this.basePath, directory);
      const files = await fs.readdir(fullPath);
      return files.filter((file) => !file.startsWith('.'));
    } catch (error: any) {
      console.error('❌ Failed to list files:', error);
      throw new Error(`Failed to list files: ${error.message}`);
    }
  }

  async getStorageStats(): Promise<{
    totalFiles: number;
    totalSize: number;
    availableSpace: number;
    usedSpace: number;
  }> {
    try {
      const files = await this.listFiles();
      let totalSize = 0;
      let totalFiles = 0;

      for (const file of files) {
        try {
          const stats = await this.getFileStats(file);
          totalSize += stats.size;
          totalFiles++;
        } catch (error) {
          // Skip files that can't be accessed
          continue;
        }
      }

      return {
        totalFiles,
        totalSize,
        availableSpace: 0, // Would need to implement disk space checking
        usedSpace: totalSize,
      };
    } catch (error: any) {
      console.error('❌ Failed to get storage stats:', error);
      throw new Error(`Failed to get storage stats: ${error.message}`);
    }
  }

  private validateFile(file: Buffer, mimeType: string): void {
    if (file.length > this.maxFileSize) {
      throw new Error(`File size ${file.length} exceeds maximum allowed size ${this.maxFileSize}`);
    }

    if (!this.allowedTypes.includes(mimeType)) {
      throw new Error(`File type ${mimeType} is not allowed`);
    }
  }

  private isImageFile(mimeType: string): boolean {
    return mimeType.startsWith('image/');
  }

  private async generateThumbnail(file: Buffer, uniqueId: string): Promise<void> {
    // For now, this is a placeholder
    // In production, you would use a library like sharp or jimp
    const thumbnailPath = path.join(this.basePath, 'thumbnails', `${uniqueId}_thumb.jpg`);

    try {
      // This is a placeholder - in production, implement actual thumbnail generation
      await fs.writeFile(thumbnailPath, file.slice(0, 1024)); // Just a placeholder
    } catch (error) {
      console.warn('Warning: Failed to generate thumbnail:', error);
    }
  }

  private generateAccessToken(filePath: string, expiresIn: number, action: string): string {
    // Simple token generation - in production, use proper JWT or similar
    const payload = {
      filePath,
      expiresAt: Date.now() + expiresIn * 1000,
      action,
    };

    return Buffer.from(JSON.stringify(payload)).toString('base64');
  }

  validateAccessToken(token: string): { isValid: boolean; filePath?: string; action?: string } {
    try {
      const payload = JSON.parse(Buffer.from(token, 'base64').toString());

      if (payload.expiresAt < Date.now()) {
        return { isValid: false };
      }

      return {
        isValid: true,
        filePath: payload.filePath,
        action: payload.action,
      };
    } catch (error) {
      return { isValid: false };
    }
  }

  async cleanupTempFiles(): Promise<void> {
    try {
      const tempDir = path.join(this.basePath, 'temp');
      const files = await fs.readdir(tempDir);

      for (const file of files) {
        const filePath = path.join(tempDir, file);
        const stats = await fs.stat(filePath);

        // Delete files older than 24 hours
        if (Date.now() - stats.mtime.getTime() > 24 * 60 * 60 * 1000) {
          await fs.unlink(filePath);
        }
      }
    } catch (error) {
      console.warn('Warning: Failed to cleanup temp files:', error);
    }
  }
}
