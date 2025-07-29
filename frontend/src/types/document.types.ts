// Document Types
export interface Document {
  id: string;
  title: string;
  type: DocumentType;
  format: FileFormat;
  content: DocumentContent;
  metadata: DocumentMetadata;
  analysis?: DocumentAnalysis;
  createdAt: string;
  updatedAt: string;
}

export interface DocumentContent {
  text: string;
  pages?: number;
  wordCount?: number;
  language?: string;
  originalPath?: string;
  thumbnailPath?: string;
}

export interface DocumentMetadata {
  fileName: string;
  fileSize: number;
  mimeType: string;
  source: DocumentSource;
  userId?: string;
  tags?: string[];
  parentId?: string;
  version?: number;
}

export interface DocumentAnalysis {
  summary: string;
  entities: Entity[];
  topics: Topic[];
  sentiments: Sentiment[];
  questions: string[];
  embedding?: number[];
  keyPhrases?: string[];
  processingTime?: number;
  analysisProfile?: string;
}

export interface Entity {
  text: string;
  type: EntityType;
  confidence: number;
  startIndex?: number;
  endIndex?: number;
  metadata?: Record<string, string | number | boolean | null>;
}

export interface Topic {
  name: string;
  confidence: number;
  keywords: string[];
  relevance?: number;
}

export interface Sentiment {
  label: 'positive' | 'negative' | 'neutral';
  confidence: number;
  text?: string;
}

export interface SearchResult {
  document: Document;
  score: number;
  matchType: 'semantic' | 'keyword' | 'exact';
  highlights?: string[];
}

export interface AnalysisProfile {
  name: string;
  summaryLength: 'short' | 'medium' | 'long';
  extractEntities: boolean;
  detectTopics: boolean;
  generateQuestions: boolean;
  detectSentiment: boolean;
  customPrompts?: string[];
  language?: string;
}

export interface FileMetadata {
  fileName: string;
  source: DocumentSource;
  userId?: string;
  tags?: string[];
  parentId?: string;
}

export interface UploadResponse {
  document: Document;
  analysis?: DocumentAnalysis;
  message: string;
  processingTime: number;
}

export interface SearchRequest {
  query: string;
  limit?: number;
  offset?: number;
  filters?: SearchFilters;
  userId?: string;
}

export interface SearchFilters {
  type?: DocumentType[];
  format?: FileFormat[];
  dateRange?: {
    start: string;
    end: string;
  };
  tags?: string[];
  source?: DocumentSource[];
}

// Enums
export const DocumentType = {
  REPORT: 'report',
  INVOICE: 'invoice',
  CONTRACT: 'contract',
  RESEARCH: 'research',
  PRESENTATION: 'presentation',
  MANUAL: 'manual',
  EMAIL: 'email',
  OTHER: 'other'
} as const;

export type DocumentType = typeof DocumentType[keyof typeof DocumentType];

export const FileFormat = {
  PDF: 'pdf',
  DOCX: 'docx',
  DOC: 'doc',
  TXT: 'txt',
  RTF: 'rtf',
  HTML: 'html',
  MARKDOWN: 'markdown',
  CSV: 'csv',
  XLSX: 'xlsx',
  PPTX: 'pptx',
  IMAGE: 'image'
} as const;

export type FileFormat = typeof FileFormat[keyof typeof FileFormat];

export const DocumentSource = {
  TELEGRAM: 'telegram',
  WEB: 'web',
  API: 'api',
  EMAIL: 'email',
  IMPORT: 'import',
  SCAN: 'scan'
} as const;

export type DocumentSource = typeof DocumentSource[keyof typeof DocumentSource];

export const EntityType = {
  PERSON: 'person',
  ORGANIZATION: 'organization',
  LOCATION: 'location',
  DATE: 'date',
  MONEY: 'money',
  PHONE: 'phone',
  EMAIL: 'email',
  URL: 'url',
  PRODUCT: 'product',
  EVENT: 'event',
  OTHER: 'other'
} as const;

export type EntityType = typeof EntityType[keyof typeof EntityType];

export const ProcessingStatus = {
  PENDING: 'pending',
  PROCESSING: 'processing',
  COMPLETED: 'completed',
  FAILED: 'failed',
  CANCELLED: 'cancelled'
} as const;

export type ProcessingStatus = typeof ProcessingStatus[keyof typeof ProcessingStatus];

export interface ProcessingJob {
  id: string;
  documentId: string;
  status: ProcessingStatus;
  progress: number;
  startTime: string;
  endTime?: string;
  error?: string;
  metadata?: Record<string, string | number | boolean | null>;
}

// Helper functions
export const getDocumentTypeLabel = (type: DocumentType): string => {
  const labels: Record<DocumentType, string> = {
    [DocumentType.REPORT]: 'Reporte',
    [DocumentType.INVOICE]: 'Factura',
    [DocumentType.CONTRACT]: 'Contrato',
    [DocumentType.RESEARCH]: 'Investigación',
    [DocumentType.PRESENTATION]: 'Presentación',
    [DocumentType.MANUAL]: 'Manual',
    [DocumentType.EMAIL]: 'Email',
    [DocumentType.OTHER]: 'Otro'
  };
  return labels[type] || type;
};

export const getFileFormatLabel = (format: FileFormat): string => {
  return format.toUpperCase();
};

export const getDocumentSourceLabel = (source: DocumentSource): string => {
  const labels: Record<DocumentSource, string> = {
    [DocumentSource.TELEGRAM]: 'Telegram',
    [DocumentSource.WEB]: 'Web',
    [DocumentSource.API]: 'API',
    [DocumentSource.EMAIL]: 'Email',
    [DocumentSource.IMPORT]: 'Importación',
    [DocumentSource.SCAN]: 'Escaneo'
  };
  return labels[source] || source;
};

export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
};