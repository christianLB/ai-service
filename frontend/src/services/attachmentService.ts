import { api } from './api';
import type { InvoiceAttachment } from '../types';

export interface AttachmentUploadOptions {
  invoiceId: string;
  file: File;
  description?: string;
}

export interface AttachmentListResponse {
  attachments: InvoiceAttachment[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
  };
}

class AttachmentService {
  /**
   * Upload a file attachment for an invoice
   */
  async uploadAttachment(options: AttachmentUploadOptions): Promise<InvoiceAttachment> {
    const formData = new FormData();
    formData.append('file', options.file);
    formData.append('invoiceId', options.invoiceId);
    if (options.description) {
      formData.append('description', options.description);
    }

    const response = await api.post('/financial/invoices/attachments/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    return response.data.data;
  }

  /**
   * Get all attachments for a specific invoice
   */
  async getInvoiceAttachments(invoiceId: string): Promise<InvoiceAttachment[]> {
    const response = await api.get(`/financial/invoices/attachments/invoice/${invoiceId}`);
    return response.data.data;
  }

  /**
   * Download an attachment
   */
  async downloadAttachment(attachmentId: string, fileName: string): Promise<void> {
    const response = await api.get(`/financial/invoices/attachments/${attachmentId}/download`, {
      responseType: 'blob',
    });

    // Create a download link
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', fileName);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  }

  /**
   * Delete an attachment
   */
  async deleteAttachment(attachmentId: string): Promise<void> {
    await api.delete(`/financial/invoices/attachments/${attachmentId}`);
  }

  /**
   * List attachments with optional filters
   */
  async listAttachments(params?: {
    invoiceId?: string;
    limit?: number;
    offset?: number;
  }): Promise<AttachmentListResponse> {
    const response = await api.get('/financial/invoices/attachments', { params });
    return response.data.data;
  }

  /**
   * Get attachment statistics
   */
  async getAttachmentStats(): Promise<{
    totalAttachments: number;
    totalSize: number;
    averageSize: number;
    attachmentsByType: Array<{ type: string; count: number; size: number }>;
  }> {
    const response = await api.get('/financial/invoices/attachments/stats');
    return response.data.data;
  }

  /**
   * Get download URL for an attachment
   * This returns the URL that can be used in an <a> tag or iframe
   */
  getDownloadUrl(attachmentId: string): string {
    return `/api/financial/invoices/attachments/${attachmentId}/download`;
  }

  /**
   * Preview attachment in browser (if supported)
   */
  async previewAttachment(attachmentId: string, fileName: string, fileType: string): Promise<void> {
    // For PDFs and images, open in new tab
    if (fileType === 'application/pdf' || fileType.startsWith('image/')) {
      const response = await api.get(`/financial/invoices/attachments/${attachmentId}/download`, {
        responseType: 'blob',
      });

      const url = window.URL.createObjectURL(new Blob([response.data], { type: fileType }));
      window.open(url, '_blank');
      
      // Clean up after a delay
      setTimeout(() => {
        window.URL.revokeObjectURL(url);
      }, 1000);
    } else {
      // For other file types, download instead
      await this.downloadAttachment(attachmentId, fileName);
    }
  }

  /**
   * Validate file before upload
   */
  validateFile(file: File): { valid: boolean; error?: string } {
    const maxSize = 10 * 1024 * 1024; // 10MB
    const allowedTypes = [
      'application/pdf',
      'image/jpeg',
      'image/jpg',
      'image/png',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/plain',
      'text/csv',
    ];

    if (file.size > maxSize) {
      return {
        valid: false,
        error: `El archivo excede el tamaño máximo permitido de 10MB`,
      };
    }

    if (!allowedTypes.includes(file.type)) {
      return {
        valid: false,
        error: `Tipo de archivo no permitido. Tipos permitidos: PDF, imágenes (JPG, PNG), documentos Word/Excel, texto plano y CSV`,
      };
    }

    return { valid: true };
  }

  /**
   * Format file size for display
   */
  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Get file icon based on file type
   */
  getFileIcon(fileType: string): string {
    if (fileType === 'application/pdf') return '📄';
    if (fileType.startsWith('image/')) return '🖼️';
    if (fileType.includes('word')) return '📝';
    if (fileType.includes('sheet')) return '📊';
    if (fileType === 'text/csv') return '📊';
    if (fileType === 'text/plain') return '📃';
    return '📎';
  }
}

export const attachmentService = new AttachmentService();