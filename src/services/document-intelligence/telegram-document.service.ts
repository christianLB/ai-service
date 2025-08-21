import TelegramBot from 'node-telegram-bot-api';
import { DocumentIngestionService } from './document-ingestion.service';
import { OpenAIAnalysisService } from './openai-analysis.service';
import { DocumentStorageService } from './storage.service';
import { Document, DocumentSource, SearchRequest } from '../../models/documents/types';
import { DocumentModel } from '../../models/documents/document.model';
import axios from 'axios';

export interface TelegramDocumentConfig {
  maxFileSize: number;
  allowedTypes: string[];
  autoAnalyze: boolean;
  notifyOnComplete: boolean;
}

export class TelegramDocumentService {
  private bot: TelegramBot;
  private ingestionService: DocumentIngestionService;
  private analysisService: OpenAIAnalysisService;
  private storageService: DocumentStorageService;
  private config: TelegramDocumentConfig;

  constructor(bot: TelegramBot, config: Partial<TelegramDocumentConfig> = {}) {
    this.bot = bot;
    this.ingestionService = new DocumentIngestionService();
    this.analysisService = new OpenAIAnalysisService();
    this.storageService = new DocumentStorageService({
      basePath: process.env.DOCUMENT_STORAGE_PATH,
    });
    this.config = {
      maxFileSize: 50 * 1024 * 1024, // 50MB
      allowedTypes: ['pdf', 'docx', 'doc', 'txt', 'md', 'csv', 'xlsx', 'pptx'],
      autoAnalyze: true,
      notifyOnComplete: true,
      ...config,
    };

    this.setupDocumentCommands();
    this.setupDocumentHandlers();
  }

  private setupDocumentCommands(): void {
    // Document upload command
    this.bot.onText(/\/upload/, async (msg) => {
      const chatId = msg.chat.id;
      await this.bot.sendMessage(
        chatId,
        '📄 *Document Upload*\n\n' +
          "Send me any document (PDF, DOCX, TXT, etc.) and I'll:\n" +
          '• Extract and analyze the content\n' +
          '• Generate a summary\n' +
          '• Extract key information\n' +
          '• Make it searchable\n\n' +
          'Just send the file directly!',
        { parse_mode: 'Markdown' }
      );
    });

    // List documents command
    this.bot.onText(/\/list/, async (msg) => {
      await this.handleListDocuments(msg);
    });

    // Search documents command
    this.bot.onText(/\/search (.+)/, async (msg, match) => {
      const query = match?.[1];
      if (query) {
        await this.handleSearchDocuments(msg, query);
      }
    });

    // Get document summary command
    this.bot.onText(/\/summary (.+)/, async (msg, match) => {
      const docId = match?.[1];
      if (docId) {
        await this.handleGetSummary(msg, docId);
      }
    });

    // Analyze specific document command
    this.bot.onText(/\/analyze (.+)/, async (msg, match) => {
      const docId = match?.[1];
      if (docId) {
        await this.handleAnalyzeDocument(msg, docId);
      }
    });

    // Document help command
    this.bot.onText(/\/dochelp/, async (msg) => {
      await this.handleDocumentHelp(msg);
    });
  }

  private setupDocumentHandlers(): void {
    // Handle document uploads
    this.bot.on('document', async (msg) => {
      await this.handleDocumentUpload(msg);
    });

    // Handle photo uploads (for OCR processing)
    this.bot.on('photo', async (msg) => {
      await this.handlePhotoUpload(msg);
    });
  }

  public async handleDocumentUpload(msg: TelegramBot.Message): Promise<void> {
    const chatId = msg.chat.id;
    const userId = msg.from?.id.toString();
    const document = msg.document;

    if (!document) {
      await this.bot.sendMessage(chatId, '❌ No document found in the message.');
      return;
    }

    try {
      // Send processing message
      const processingMsg = await this.bot.sendMessage(
        chatId,
        '📄 *Processing Document*\n\n' +
          `• File: ${this.escapeMarkdown(document.file_name || 'unknown')}\n` +
          `• Size: ${this.formatFileSize(document.file_size || 0)}\n` +
          '• Status: Downloading... 📥',
        { parse_mode: 'Markdown' }
      );

      // Validate file
      if (!this.isValidDocument(document)) {
        await this.bot.editMessageText(
          '❌ *Invalid Document*\n\n' +
            'Please send a supported file type:\n' +
            `• ${this.config.allowedTypes.join(', ')}\n` +
            `• Max size: ${this.formatFileSize(this.config.maxFileSize)}`,
          { chat_id: chatId, message_id: processingMsg.message_id, parse_mode: 'Markdown' }
        );
        return;
      }

      // Download file
      const fileBuffer = await this.downloadFile(document.file_id);

      // Update status
      await this.bot.editMessageText(
        '📄 *Processing Document*\n\n' +
          `• File: ${this.escapeMarkdown(document.file_name || 'unknown')}\n` +
          `• Size: ${this.formatFileSize(document.file_size || 0)}\n` +
          '• Status: Extracting content... 📝',
        { chat_id: chatId, message_id: processingMsg.message_id, parse_mode: 'Markdown' }
      );

      // Ingest document
      const ingestedDoc = await this.ingestionService.ingestDocument(fileBuffer, {
        fileName: document.file_name || 'unknown.txt',
        source: DocumentSource.TELEGRAM,
        userId: userId,
        tags: ['telegram-upload'],
      });

      // Update status
      await this.bot.editMessageText(
        '📄 *Processing Document*\n\n' +
          `• File: ${this.escapeMarkdown(document.file_name || 'unknown')}\n` +
          `• Size: ${this.formatFileSize(document.file_size || 0)}\n` +
          '• Status: Analyzing content... 🧠',
        { chat_id: chatId, message_id: processingMsg.message_id, parse_mode: 'Markdown' }
      );

      // Analyze document if auto-analyze is enabled
      if (this.config.autoAnalyze) {
        await this.analysisService.analyzeDocument(ingestedDoc, {
          includeEmbedding: true,
        });
      }

      // Send completion message
      await this.bot.editMessageText(
        '✅ *Document Processed Successfully*\n\n' +
          `${this.formatDocumentSummary(ingestedDoc)}\n\n` +
          `📋 Document ID: \`${ingestedDoc.id}\`\n` +
          '🔍 Use /search to find this document later',
        { chat_id: chatId, message_id: processingMsg.message_id, parse_mode: 'Markdown' }
      );
    } catch (error) {
      console.error('❌ Error processing document:', error);
      await this.bot.sendMessage(
        chatId,
        '❌ *Error Processing Document*\n\n' +
          'Sorry, I encountered an error while processing your document. Please try again.',
        { parse_mode: 'Markdown' }
      );
    }
  }

  private async handlePhotoUpload(msg: TelegramBot.Message): Promise<void> {
    const chatId = msg.chat.id;

    await this.bot.sendMessage(
      chatId,
      '📸 *Photo Upload Detected*\n\n' +
        'Photo processing is not yet implemented. Please send documents in these formats:\n' +
        `• ${this.config.allowedTypes.join(', ')}\n\n` +
        'OCR functionality will be added in a future update!',
      { parse_mode: 'Markdown' }
    );
  }

  public async handleListDocuments(msg: TelegramBot.Message): Promise<void> {
    const chatId = msg.chat.id;
    const userId = msg.from?.id.toString();

    try {
      const documents = await this.ingestionService.listDocuments(userId, 10);

      if (documents.length === 0) {
        await this.bot.sendMessage(
          chatId,
          '📂 *No Documents Found*\n\n' +
            "You haven't uploaded any documents yet. Send me a document to get started!",
          { parse_mode: 'Markdown' }
        );
        return;
      }

      const documentList = documents
        .map((doc, index) => {
          const docModel = new DocumentModel(
            doc.id,
            doc.title,
            doc.type,
            doc.format,
            doc.content,
            doc.metadata,
            doc.analysis,
            doc.createdAt,
            doc.updatedAt
          );
          return (
            `${index + 1}. ${docModel.getTypeIcon()} *${doc.title}*\n` +
            `   📅 ${doc.createdAt.toLocaleDateString()}\n` +
            `   📋 ID: \`${doc.id}\``
          );
        })
        .join('\n\n');

      await this.bot.sendMessage(
        chatId,
        '📂 *Your Documents*\n\n' +
          documentList +
          '\n\n' +
          '💡 Use /summary [ID] to get a summary\n' +
          '🔍 Use /search [query] to search documents',
        { parse_mode: 'Markdown' }
      );
    } catch (error) {
      console.error('❌ Error listing documents:', error);
      await this.bot.sendMessage(chatId, '❌ Error retrieving documents. Please try again.', {
        parse_mode: 'Markdown',
      });
    }
  }

  public async handleSearchDocuments(msg: TelegramBot.Message, query: string): Promise<void> {
    const chatId = msg.chat.id;
    const userId = msg.from?.id.toString();

    try {
      const searchRequest: SearchRequest = {
        query,
        limit: 5,
        userId,
      };

      const results = await this.analysisService.searchSimilarDocuments(query, 5);

      if (results.length === 0) {
        await this.bot.sendMessage(
          chatId,
          '🔍 *No Results Found*\n\n' +
            `No documents found matching: "${query}"\n\n` +
            'Try different keywords or upload more documents.',
          { parse_mode: 'Markdown' }
        );
        return;
      }

      const resultList = results
        .map((doc, index) => {
          const docModel = new DocumentModel(
            doc.id,
            doc.title,
            doc.type,
            doc.format,
            doc.content,
            doc.metadata,
            doc.analysis,
            doc.createdAt,
            doc.updatedAt
          );
          return (
            `${index + 1}. ${docModel.getTypeIcon()} *${doc.title}*\n` +
            `   📝 ${docModel.getSummary().substring(0, 100)}...\n` +
            `   📋 ID: \`${doc.id}\``
          );
        })
        .join('\n\n');

      await this.bot.sendMessage(
        chatId,
        `🔍 *Search Results for "${query}"*\n\n` +
          resultList +
          '\n\n' +
          '💡 Use /summary [ID] to get full details',
        { parse_mode: 'Markdown' }
      );
    } catch (error) {
      console.error('❌ Error searching documents:', error);
      await this.bot.sendMessage(chatId, '❌ Error searching documents. Please try again.', {
        parse_mode: 'Markdown',
      });
    }
  }

  public async handleGetSummary(msg: TelegramBot.Message, docId: string): Promise<void> {
    const chatId = msg.chat.id;

    try {
      const document = await this.ingestionService.getDocument(docId);

      if (!document) {
        await this.bot.sendMessage(
          chatId,
          '❌ *Document Not Found*\n\n' + `Document with ID \`${docId}\` not found.`,
          { parse_mode: 'Markdown' }
        );
        return;
      }

      const summary = this.formatDocumentSummary(document);
      await this.bot.sendMessage(chatId, summary, { parse_mode: 'Markdown' });
    } catch (error) {
      console.error('❌ Error getting document summary:', error);
      await this.bot.sendMessage(
        chatId,
        '❌ Error retrieving document summary. Please try again.',
        { parse_mode: 'Markdown' }
      );
    }
  }

  public async handleAnalyzeDocument(msg: TelegramBot.Message, docId: string): Promise<void> {
    const chatId = msg.chat.id;

    try {
      const document = await this.ingestionService.getDocument(docId);

      if (!document) {
        await this.bot.sendMessage(
          chatId,
          '❌ *Document Not Found*\n\n' + `Document with ID \`${docId}\` not found.`,
          { parse_mode: 'Markdown' }
        );
        return;
      }

      const processingMsg = await this.bot.sendMessage(
        chatId,
        '🧠 *Analyzing Document*\n\n' + 'Please wait while I analyze the document...',
        { parse_mode: 'Markdown' }
      );

      const analysisResult = await this.analysisService.analyzeDocument(document, {
        includeEmbedding: true,
      });

      await this.bot.editMessageText(
        '✅ *Analysis Complete*\n\n' +
          this.formatDocumentSummary(document) +
          '\n\n' +
          `⏱ Processing time: ${analysisResult.processingTime}ms`,
        { chat_id: chatId, message_id: processingMsg.message_id, parse_mode: 'Markdown' }
      );
    } catch (error) {
      console.error('❌ Error analyzing document:', error);
      await this.bot.sendMessage(chatId, '❌ Error analyzing document. Please try again.', {
        parse_mode: 'Markdown',
      });
    }
  }

  public async handleDocumentHelp(msg: TelegramBot.Message): Promise<void> {
    const chatId = msg.chat.id;

    await this.bot.sendMessage(
      chatId,
      '📚 *Document Intelligence Help*\n\n' +
        '*Commands:*\n' +
        '• /upload - Upload and analyze documents\n' +
        '• /list - List your documents\n' +
        '• /search [query] - Search documents\n' +
        '• /summary [ID] - Get document summary\n' +
        '• /analyze [ID] - Re-analyze document\n' +
        '• /dochelp - Show this help\n\n' +
        '*Supported Formats:*\n' +
        `• ${this.config.allowedTypes.join(', ')}\n` +
        `• Max size: ${this.formatFileSize(this.config.maxFileSize)}\n\n` +
        '*Features:*\n' +
        '• Automatic content extraction\n' +
        '• AI-powered analysis and summaries\n' +
        '• Semantic search across all documents\n' +
        '• Entity extraction and topic detection\n' +
        '• Question generation\n\n' +
        "💡 *Tip:* Just send any document and I'll process it automatically!",
      { parse_mode: 'Markdown' }
    );
  }

  private async downloadFile(fileId: string): Promise<Buffer> {
    try {
      const fileInfo = await this.bot.getFile(fileId);
      const fileUrl = `https://api.telegram.org/file/bot${(this.bot as any).token}/${fileInfo.file_path}`;

      const response = await axios.get(fileUrl, { responseType: 'arraybuffer' });
      return Buffer.from(response.data);
    } catch (error: any) {
      console.error('❌ Error downloading file:', error);
      throw new Error(`Failed to download file: ${error.message}`);
    }
  }

  private isValidDocument(document: TelegramBot.Document): boolean {
    const fileName = document.file_name || '';
    const fileSize = document.file_size || 0;
    const extension = fileName.split('.').pop()?.toLowerCase();

    return (
      fileSize <= this.config.maxFileSize &&
      extension !== undefined &&
      this.config.allowedTypes.includes(extension)
    );
  }

  private formatFileSize(bytes: number): string {
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unitIndex = 0;

    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }

    return `${size.toFixed(1)} ${units[unitIndex]}`;
  }

  private formatDocumentSummary(document: Document): string {
    const docModel = new DocumentModel(
      document.id,
      document.title,
      document.type,
      document.format,
      document.content,
      document.metadata,
      document.analysis,
      document.createdAt,
      document.updatedAt
    );
    const analysis = document.analysis;

    let summary = `${docModel.getTypeIcon()} *${document.title}*\n\n`;

    if (analysis?.summary) {
      summary += `📝 *Summary:*\n${analysis.summary}\n\n`;
    }

    if (analysis?.entities && analysis.entities.length > 0) {
      const topEntities = analysis.entities.slice(0, 3);
      summary += `🏷 *Key Entities:*\n${topEntities.map((e) => `• ${e.text} (${e.type})`).join('\n')}\n\n`;
    }

    if (analysis?.topics && analysis.topics.length > 0) {
      const topTopics = analysis.topics.slice(0, 3);
      summary += `📊 *Topics:*\n${topTopics.map((t) => `• ${t.name}`).join('\n')}\n\n`;
    }

    if (analysis?.questions && analysis.questions.length > 0) {
      summary += `❓ *Key Questions:*\n${analysis.questions
        .slice(0, 2)
        .map((q) => `• ${q}`)
        .join('\n')}\n\n`;
    }

    summary += '📊 *Info:*\n';
    summary += `• Words: ${docModel.getWordCount()}\n`;
    summary += `• Reading time: ${docModel.getReadingTime()} min\n`;
    summary += `• Format: ${document.format.toUpperCase()}\n`;
    summary += `• Size: ${docModel.getSize()}\n`;
    summary += `• Date: ${document.createdAt.toLocaleDateString()}`;

    return summary;
  }

  private escapeMarkdown(text: string): string {
    // Escape special Markdown characters that can break parsing
    return text
      .replace(/\*/g, '\\*')
      .replace(/_/g, '\\_')
      .replace(/\[/g, '\\[')
      .replace(/\]/g, '\\]')
      .replace(/\(/g, '\\(')
      .replace(/\)/g, '\\)')
      .replace(/~/g, '\\~')
      .replace(/`/g, '\\`')
      .replace(/>/g, '\\>')
      .replace(/#/g, '\\#')
      .replace(/\+/g, '\\+')
      .replace(/-/g, '\\-')
      .replace(/=/g, '\\=')
      .replace(/\|/g, '\\|')
      .replace(/\{/g, '\\{')
      .replace(/\}/g, '\\}')
      .replace(/\./g, '\\.')
      .replace(/!/g, '\\!');
  }
}
