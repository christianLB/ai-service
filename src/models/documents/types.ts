export interface Document {
  id: string;
  title: string;
  type: DocumentType;
  format: FileFormat;
  content: DocumentContent;
  metadata: DocumentMetadata;
  analysis?: DocumentAnalysis;
  createdAt: Date;
  updatedAt: Date;
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
  metadata?: Record<string, any>;
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
    start: Date;
    end: Date;
  };
  tags?: string[];
  source?: DocumentSource[];
}

// Enums
export enum DocumentType {
  REPORT = 'report',
  INVOICE = 'invoice',
  CONTRACT = 'contract',
  RESEARCH = 'research',
  PRESENTATION = 'presentation',
  MANUAL = 'manual',
  EMAIL = 'email',
  OTHER = 'other',
}

export enum FileFormat {
  PDF = 'pdf',
  DOCX = 'docx',
  DOC = 'doc',
  TXT = 'txt',
  RTF = 'rtf',
  HTML = 'html',
  MARKDOWN = 'markdown',
  CSV = 'csv',
  XLSX = 'xlsx',
  PPTX = 'pptx',
  IMAGE = 'image',
}

export enum DocumentSource {
  TELEGRAM = 'telegram',
  WEB = 'web',
  API = 'api',
  EMAIL = 'email',
  IMPORT = 'import',
  SCAN = 'scan',
}

export enum EntityType {
  PERSON = 'person',
  ORGANIZATION = 'organization',
  LOCATION = 'location',
  DATE = 'date',
  MONEY = 'money',
  PHONE = 'phone',
  EMAIL = 'email',
  URL = 'url',
  PRODUCT = 'product',
  EVENT = 'event',
  OTHER = 'other',
}

export enum ProcessingStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
}

export interface ProcessingJob {
  id: string;
  documentId: string;
  status: ProcessingStatus;
  progress: number;
  startTime: Date;
  endTime?: Date;
  error?: string;
  metadata?: Record<string, any>;
}
