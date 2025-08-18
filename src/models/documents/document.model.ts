import {
  Document,
  DocumentAnalysis,
  DocumentContent,
  DocumentMetadata,
  DocumentType,
  FileFormat,
} from './types';

export class DocumentModel {
  constructor(
    public id: string,
    public title: string,
    public type: DocumentType,
    public format: FileFormat,
    public content: DocumentContent,
    public metadata: DocumentMetadata,
    public analysis?: DocumentAnalysis,
    public createdAt: Date = new Date(),
    public updatedAt: Date = new Date()
  ) {}

  static fromJSON(json: any): DocumentModel {
    return new DocumentModel(
      json.id,
      json.title,
      json.type,
      json.format,
      json.content,
      json.metadata,
      json.analysis,
      new Date(json.createdAt),
      new Date(json.updatedAt)
    );
  }

  toJSON(): Document {
    return {
      id: this.id,
      title: this.title,
      type: this.type,
      format: this.format,
      content: this.content,
      metadata: this.metadata,
      analysis: this.analysis,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }

  updateAnalysis(analysis: DocumentAnalysis): void {
    this.analysis = analysis;
    this.updatedAt = new Date();
  }

  addTag(tag: string): void {
    if (!this.metadata.tags) {
      this.metadata.tags = [];
    }
    if (!this.metadata.tags.includes(tag)) {
      this.metadata.tags.push(tag);
      this.updatedAt = new Date();
    }
  }

  removeTag(tag: string): void {
    if (this.metadata.tags) {
      this.metadata.tags = this.metadata.tags.filter((t) => t !== tag);
      this.updatedAt = new Date();
    }
  }

  getPreview(maxLength: number = 200): string {
    if (!this.content.text) {
      return '';
    }

    const text = this.content.text.trim();
    if (text.length <= maxLength) {
      return text;
    }

    return text.substring(0, maxLength) + '...';
  }

  getSummary(): string {
    return this.analysis?.summary || this.getPreview(300);
  }

  getWordCount(): number {
    return this.content.wordCount || this.content.text.split(/\s+/).length;
  }

  getReadingTime(): number {
    // Assume 200 words per minute reading speed
    const wordsPerMinute = 200;
    const wordCount = this.getWordCount();
    return Math.ceil(wordCount / wordsPerMinute);
  }

  hasAnalysis(): boolean {
    return !!this.analysis;
  }

  isProcessed(): boolean {
    return this.hasAnalysis() && !!this.analysis?.embedding;
  }

  getSize(): string {
    const bytes = this.metadata.fileSize;
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unitIndex = 0;

    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }

    return `${size.toFixed(1)} ${units[unitIndex]}`;
  }

  getTypeIcon(): string {
    const iconMap: Record<DocumentType, string> = {
      [DocumentType.REPORT]: '📊',
      [DocumentType.INVOICE]: '🧾',
      [DocumentType.CONTRACT]: '📋',
      [DocumentType.RESEARCH]: '🔬',
      [DocumentType.PRESENTATION]: '📽️',
      [DocumentType.MANUAL]: '📖',
      [DocumentType.EMAIL]: '📧',
      [DocumentType.OTHER]: '📄',
    };

    return iconMap[this.type] || '📄';
  }

  getFormatIcon(): string {
    const iconMap: Record<FileFormat, string> = {
      [FileFormat.PDF]: '📕',
      [FileFormat.DOCX]: '📘',
      [FileFormat.DOC]: '📘',
      [FileFormat.TXT]: '📄',
      [FileFormat.RTF]: '📄',
      [FileFormat.HTML]: '🌐',
      [FileFormat.MARKDOWN]: '📝',
      [FileFormat.CSV]: '📊',
      [FileFormat.XLSX]: '📊',
      [FileFormat.PPTX]: '📽️',
      [FileFormat.IMAGE]: '🖼️',
    };

    return iconMap[this.format] || '📄';
  }

  validate(): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!this.id) {
      errors.push('Document ID is required');
    }
    if (!this.title) {
      errors.push('Document title is required');
    }
    if (!this.content.text) {
      errors.push('Document content is required');
    }
    if (!this.metadata.fileName) {
      errors.push('File name is required');
    }
    if (this.metadata.fileSize <= 0) {
      errors.push('File size must be greater than 0');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }
}
