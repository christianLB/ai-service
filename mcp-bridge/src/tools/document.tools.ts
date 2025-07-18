import { z } from 'zod';
import { MCPTool } from '../types/mcp.types';
import { aiServiceClient } from '../utils/ai-service-client';

// Search Documents Tool
export const searchDocumentsTool: MCPTool = {
  name: 'search_documents',
  description: 'Search documents using semantic search with optional filters',
  category: 'documents',
  requiresAuth: true,
  inputSchema: z.object({
    query: z.string().min(1).describe('Search query for semantic search'),
    limit: z.number().min(1).max(50).optional().default(10).describe('Maximum results to return'),
    documentType: z.string().optional().describe('Filter by document type (pdf, docx, txt, etc.)'),
    tags: z.array(z.string()).optional().describe('Filter by tags'),
    dateFrom: z.string().optional().describe('Filter documents created after this date'),
    dateTo: z.string().optional().describe('Filter documents created before this date'),
  }),
  handler: async (params) => {
    try {
      const { query, ...filters } = params;
      const data = await aiServiceClient.searchDocuments(query, filters);
      return {
        success: true,
        data,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
      };
    }
  },
};

// Analyze Document Tool
export const analyzeDocumentTool: MCPTool = {
  name: 'analyze_document',
  description: 'Analyze a document using AI to extract summary, entities, topics, and insights',
  category: 'documents',
  requiresAuth: true,
  rateLimit: {
    maxPerMinute: 10,
    maxPerHour: 50,
  },
  inputSchema: z.object({
    documentId: z.string().describe('ID of the document to analyze'),
    analysisType: z.array(z.enum(['summary', 'entities', 'topics', 'sentiment', 'all']))
      .optional()
      .default(['all'])
      .describe('Types of analysis to perform'),
  }),
  handler: async (params) => {
    try {
      const data = await aiServiceClient.analyzeDocument(params.documentId);
      return {
        success: true,
        data,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
      };
    }
  },
};

// Ask Document Question Tool
export const askDocumentQuestionTool: MCPTool = {
  name: 'ask_document_question',
  description: 'Ask a question about a specific document and get an AI-powered answer',
  category: 'documents',
  requiresAuth: true,
  rateLimit: {
    maxPerMinute: 20,
    maxPerHour: 100,
  },
  inputSchema: z.object({
    documentId: z.string().describe('ID of the document to query'),
    question: z.string().min(5).describe('Question to ask about the document'),
    contextWindow: z.number().min(100).max(5000).optional().default(1000)
      .describe('Size of context window for answer generation'),
  }),
  handler: async (params) => {
    try {
      const data = await aiServiceClient.askDocumentQuestion(
        params.documentId,
        params.question
      );
      return {
        success: true,
        data,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
      };
    }
  },
};

// Get Document Details Tool
export const getDocumentDetailsTool: MCPTool = {
  name: 'get_document_details',
  description: 'Get detailed information about a specific document',
  category: 'documents',
  requiresAuth: true,
  inputSchema: z.object({
    documentId: z.string().describe('ID of the document'),
    includeContent: z.boolean().optional().default(false)
      .describe('Include full document content in response'),
    includeAnalysis: z.boolean().optional().default(true)
      .describe('Include existing analysis data'),
  }),
  handler: async (params) => {
    try {
      const data = await aiServiceClient.getDocumentById(params.documentId);
      
      // Filter response based on parameters
      if (!params.includeContent && data.content) {
        delete data.content;
      }
      if (!params.includeAnalysis && data.analysis) {
        delete data.analysis;
      }
      
      return {
        success: true,
        data,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
      };
    }
  },
};

// Extract Document Entities Tool
export const extractDocumentEntitiesTool: MCPTool = {
  name: 'extract_document_entities',
  description: 'Extract named entities (people, places, organizations, dates, etc.) from documents',
  category: 'documents',
  requiresAuth: true,
  inputSchema: z.object({
    documentIds: z.array(z.string()).min(1).max(10)
      .describe('IDs of documents to extract entities from'),
    entityTypes: z.array(z.enum(['person', 'organization', 'location', 'date', 'money', 'all']))
      .optional()
      .default(['all'])
      .describe('Types of entities to extract'),
  }),
  handler: async (params) => {
    try {
      const results = await Promise.all(
        params.documentIds.map((id: string) => aiServiceClient.analyzeDocument(id))
      );
      
      const entities = results.map((result: any, index) => ({
        documentId: params.documentIds[index],
        entities: result.analysis?.entities || [],
      }));
      
      return {
        success: true,
        data: { entities },
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
      };
    }
  },
};

// Generate Document Summary Tool
export const generateDocumentSummaryTool: MCPTool = {
  name: 'generate_document_summary',
  description: 'Generate a concise summary of one or multiple documents',
  category: 'documents',
  requiresAuth: true,
  rateLimit: {
    maxPerMinute: 5,
    maxPerHour: 30,
  },
  inputSchema: z.object({
    documentIds: z.array(z.string()).min(1).max(5)
      .describe('IDs of documents to summarize'),
    summaryLength: z.enum(['brief', 'detailed', 'comprehensive'])
      .optional()
      .default('detailed')
      .describe('Desired length of summary'),
    focusAreas: z.array(z.string()).optional()
      .describe('Specific areas to focus on in the summary'),
  }),
  handler: async (params) => {
    try {
      const summaries = await Promise.all(
        params.documentIds.map((id: string) => aiServiceClient.analyzeDocument(id))
      );
      
      return {
        success: true,
        data: {
          summaries: summaries.map((result: any, index) => ({
            documentId: params.documentIds[index],
            summary: result.analysis?.summary || 'No summary available',
          })),
        },
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
      };
    }
  },
};

// Compare Documents Tool
export const compareDocumentsTool: MCPTool = {
  name: 'compare_documents',
  description: 'Compare multiple documents to find similarities, differences, and relationships',
  category: 'documents',
  requiresAuth: true,
  rateLimit: {
    maxPerMinute: 3,
    maxPerHour: 15,
  },
  inputSchema: z.object({
    documentIds: z.array(z.string()).min(2).max(5)
      .describe('IDs of documents to compare'),
    comparisonType: z.enum(['similarity', 'differences', 'comprehensive'])
      .optional()
      .default('comprehensive')
      .describe('Type of comparison to perform'),
  }),
  handler: async (params) => {
    try {
      // This would need a specific endpoint in AI Service
      // For now, we'll fetch documents and provide basic comparison
      const documents = await Promise.all(
        params.documentIds.map((id: string) => aiServiceClient.getDocumentById(id))
      );
      
      return {
        success: true,
        data: {
          comparison: {
            documents: documents.map(d => ({
              id: d.id,
              title: d.title,
              type: d.documentType,
              size: d.size,
            })),
            message: 'Document comparison requires AI Service endpoint implementation',
          },
        },
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
      };
    }
  },
};

// Export all document tools
export const documentTools: MCPTool[] = [
  searchDocumentsTool,
  analyzeDocumentTool,
  askDocumentQuestionTool,
  getDocumentDetailsTool,
  extractDocumentEntitiesTool,
  generateDocumentSummaryTool,
  compareDocumentsTool,
];