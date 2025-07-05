import api from './api';
import type { 
  Document, 
  DocumentAnalysis, 
  SearchRequest, 
  SearchResult,
  UploadResponse 
} from '../types/document.types';

class DocumentService {
  private basePath = '/documents';

  // Upload a document
  async uploadDocument(file: File, metadata?: {
    tags?: string[];
    userId?: string;
    parentId?: string;
  }): Promise<UploadResponse> {
    const formData = new FormData();
    formData.append('file', file);
    
    if (metadata) {
      formData.append('metadata', JSON.stringify(metadata));
    }

    const response = await api.post(`${this.basePath}/upload`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    return response.data.data;
  }

  // List documents with pagination
  async listDocuments(params?: {
    limit?: number;
    offset?: number;
    type?: string;
    source?: string;
    userId?: string;
  }): Promise<{
    documents: Document[];
    pagination: {
      total: number;
      limit: number;
      offset: number;
      hasMore: boolean;
    };
  }> {
    const response = await api.get(this.basePath, { params });
    return response.data.data;
  }

  // Get a specific document
  async getDocument(id: string): Promise<Document> {
    const response = await api.get(`${this.basePath}/${id}`);
    return response.data.data;
  }

  // Get document analysis
  async getDocumentAnalysis(id: string): Promise<DocumentAnalysis> {
    const response = await api.get(`${this.basePath}/${id}/analysis`);
    return response.data.data;
  }

  // Analyze a document
  async analyzeDocument(id: string, profile?: string): Promise<DocumentAnalysis> {
    const response = await api.post(`${this.basePath}/${id}/analyze`, { profile });
    return response.data.data;
  }

  // Answer a question about a document
  async answerQuestion(id: string, question: string): Promise<{
    answer: string;
    confidence: number;
    sources: string[];
  }> {
    const response = await api.post(`${this.basePath}/${id}/question`, { question });
    return response.data.data;
  }

  // Delete a document
  async deleteDocument(id: string): Promise<void> {
    await api.delete(`${this.basePath}/${id}`);
  }

  // Search documents
  async searchDocuments(request: SearchRequest): Promise<{
    results: SearchResult[];
    totalCount: number;
  }> {
    const response = await api.post(`${this.basePath}/search`, request);
    return response.data.data;
  }

  // Get document statistics
  async getDocumentStats(): Promise<{
    totalDocuments: number;
    documentsByType: Record<string, number>;
    documentsByFormat: Record<string, number>;
    totalSize: number;
    recentDocuments: Document[];
  }> {
    const response = await api.get(`${this.basePath}/stats/overview`);
    return response.data.data;
  }

  // Download a document file
  async downloadFile(filename: string): Promise<Blob> {
    const response = await api.get(`${this.basePath}/files/${filename}`, {
      responseType: 'blob',
    });
    return response.data;
  }

  // Get signed URL for file access
  async getSignedUrl(filename: string): Promise<string> {
    const response = await api.get(`${this.basePath}/files/${filename}/signed-url`);
    return response.data.data.url;
  }
}

export default new DocumentService();