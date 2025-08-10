// InvoiceAttachment types for frontend
export interface InvoiceAttachment {
  id: string;
  invoiceId: string;
  fileName: string;
  filePath: string;
  fileSize: string;
  fileType: string;
  description?: string;
  uploadedBy: string;
  uploadedAt: Date | string;
  isDeleted: boolean;
  deletedAt?: Date | string;
  deletedBy?: string;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface CreateInvoiceAttachment {
  invoiceId: string;
  fileName: string;
  filePath: string;
  fileSize: string;
  fileType: string;
  description?: string;
  uploadedBy: string;
  uploadedAt: Date | string;
  isDeleted: boolean;
  deletedAt?: Date | string;
  deletedBy?: string;
}

export interface UpdateInvoiceAttachment extends Partial<CreateInvoiceAttachment> {
  id: string;
}

export interface InvoiceAttachmentQuery {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  // Add model-specific query filters based on your needs
}