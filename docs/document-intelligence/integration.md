# Integration Guide

## Overview

The Document Intelligence module provides multiple integration options to make document processing accessible through various channels. This guide covers Telegram bot integration, MCP Bridge tools, API integration, and future integration options.

## Telegram Bot Integration

### Architecture

The Telegram bot provides a conversational interface for document processing:

```typescript
interface TelegramBotArchitecture {
  bot: TelegramBot;                    // Main bot instance
  commandHandlers: CommandHandler[];   // Command processors
  documentProcessor: DocumentService;  // Document handling
  sessionManager: SessionManager;      // User session management
  rateLimiter: RateLimiter;           // Rate limiting
}
```

### Setup and Configuration

#### 1. Create Telegram Bot

```bash
# 1. Talk to @BotFather on Telegram
# 2. Send /newbot
# 3. Choose bot name and username
# 4. Save the token provided
```

#### 2. Configure Environment

```env
# Telegram Configuration
TELEGRAM_BOT_TOKEN=your-bot-token-here
TELEGRAM_ENABLED=true
TELEGRAM_WEBHOOK_URL=https://your-domain.com/telegram/webhook  # Optional
TELEGRAM_ALLOWED_USERS=user1,user2  # Optional whitelist
TELEGRAM_MAX_FILE_SIZE=20971520     # 20MB limit
TELEGRAM_SESSION_TIMEOUT=3600       # 1 hour
```

#### 3. Bot Implementation

```typescript
class DocumentTelegramBot {
  constructor(
    private bot: TelegramBot,
    private documentService: DocumentService
  ) {
    this.setupCommands();
    this.setupHandlers();
  }

  private setupCommands() {
    // Command list
    this.bot.setMyCommands([
      { command: 'start', description: 'Start the bot' },
      { command: 'upload', description: 'Upload a document' },
      { command: 'list', description: 'List your documents' },
      { command: 'search', description: 'Search documents' },
      { command: 'ask', description: 'Ask about last document' },
      { command: 'help', description: 'Show help message' },
      { command: 'settings', description: 'Bot settings' }
    ]);
  }

  private setupHandlers() {
    // Start command
    this.bot.onText(/\/start/, this.handleStart.bind(this));
    
    // Document upload
    this.bot.on('document', this.handleDocument.bind(this));
    
    // Search command
    this.bot.onText(/\/search (.+)/, this.handleSearch.bind(this));
    
    // Question handling
    this.bot.onText(/\/ask (.+)/, this.handleQuestion.bind(this));
    
    // Callback queries
    this.bot.on('callback_query', this.handleCallback.bind(this));
  }
}
```

### Command Handlers

#### Document Upload

```typescript
async handleDocument(msg: Message) {
  const chatId = msg.chat.id;
  const document = msg.document;

  // Validate file
  if (!this.validateFile(document)) {
    return this.bot.sendMessage(chatId, '❌ File type not supported or too large');
  }

  // Send processing message
  const statusMsg = await this.bot.sendMessage(chatId, '📄 Processing document...');

  try {
    // Download file
    const file = await this.bot.getFile(document.file_id);
    const fileBuffer = await this.downloadFile(file.file_path);

    // Process document
    const result = await this.documentService.ingestDocument({
      buffer: fileBuffer,
      filename: document.file_name,
      mimeType: document.mime_type,
      userId: msg.from.id.toString()
    });

    // Update status
    await this.bot.editMessageText(
      '✅ Document uploaded successfully!',
      {
        chat_id: chatId,
        message_id: statusMsg.message_id
      }
    );

    // Save to session
    this.sessionManager.setLastDocument(chatId, result.documentId);

    // Offer analysis options
    await this.sendAnalysisOptions(chatId, result.documentId);

  } catch (error) {
    await this.bot.editMessageText(
      '❌ Failed to process document: ' + error.message,
      {
        chat_id: chatId,
        message_id: statusMsg.message_id
      }
    );
  }
}
```

#### Search Documents

```typescript
async handleSearch(msg: Message, match: RegExpMatchArray) {
  const chatId = msg.chat.id;
  const query = match[1];

  const results = await this.documentService.searchDocuments({
    query,
    userId: msg.from.id.toString(),
    limit: 5
  });

  if (results.length === 0) {
    return this.bot.sendMessage(chatId, '🔍 No documents found');
  }

  // Format results
  const message = this.formatSearchResults(results);
  
  // Send with inline keyboard
  const keyboard = this.createSearchResultsKeyboard(results);
  
  await this.bot.sendMessage(chatId, message, {
    parse_mode: 'Markdown',
    reply_markup: keyboard
  });
}
```

#### Ask Questions

```typescript
async handleQuestion(msg: Message, match: RegExpMatchArray) {
  const chatId = msg.chat.id;
  const question = match[1];

  // Get last document from session
  const documentId = this.sessionManager.getLastDocument(chatId);
  
  if (!documentId) {
    return this.bot.sendMessage(
      chatId, 
      '❌ Please upload a document first using /upload'
    );
  }

  // Send typing indicator
  await this.bot.sendChatAction(chatId, 'typing');

  try {
    // Get answer
    const answer = await this.documentService.askQuestion(
      documentId,
      question,
      msg.from.id.toString()
    );

    // Format response
    const response = this.formatAnswer(answer);
    
    await this.bot.sendMessage(chatId, response, {
      parse_mode: 'Markdown'
    });

    // Log interaction
    await this.logQAInteraction(msg.from.id, documentId, question, answer);

  } catch (error) {
    await this.bot.sendMessage(
      chatId,
      '❌ Failed to answer question: ' + error.message
    );
  }
}
```

### Inline Keyboards

```typescript
interface InlineKeyboard {
  createAnalysisOptions(documentId: string): InlineKeyboardMarkup {
    return {
      inline_keyboard: [
        [
          { text: '📝 Summary', callback_data: `analyze:summary:${documentId}` },
          { text: '🏷️ Entities', callback_data: `analyze:entities:${documentId}` }
        ],
        [
          { text: '📊 Topics', callback_data: `analyze:topics:${documentId}` },
          { text: '❓ Questions', callback_data: `analyze:questions:${documentId}` }
        ],
        [
          { text: '📄 Full Analysis', callback_data: `analyze:full:${documentId}` }
        ]
      ]
    };
  }

  createPaginationKeyboard(
    currentPage: number,
    totalPages: number,
    action: string
  ): InlineKeyboardMarkup {
    const buttons = [];
    
    if (currentPage > 1) {
      buttons.push({ 
        text: '⬅️ Previous', 
        callback_data: `${action}:page:${currentPage - 1}` 
      });
    }
    
    buttons.push({ 
      text: `${currentPage}/${totalPages}`, 
      callback_data: 'noop' 
    });
    
    if (currentPage < totalPages) {
      buttons.push({ 
        text: 'Next ➡️', 
        callback_data: `${action}:page:${currentPage + 1}` 
      });
    }
    
    return { inline_keyboard: [buttons] };
  }
}
```

### Session Management

```typescript
class TelegramSessionManager {
  private sessions: Map<number, UserSession> = new Map();
  
  interface UserSession {
    userId: string;
    chatId: number;
    lastDocument?: string;
    searchHistory: string[];
    preferences: UserPreferences;
    createdAt: Date;
    lastActivity: Date;
  }
  
  getSession(chatId: number): UserSession {
    if (!this.sessions.has(chatId)) {
      this.sessions.set(chatId, this.createNewSession(chatId));
    }
    
    const session = this.sessions.get(chatId);
    session.lastActivity = new Date();
    
    return session;
  }
  
  setLastDocument(chatId: number, documentId: string) {
    const session = this.getSession(chatId);
    session.lastDocument = documentId;
  }
  
  cleanupSessions() {
    const now = Date.now();
    const timeout = this.config.sessionTimeout * 1000;
    
    for (const [chatId, session] of this.sessions) {
      if (now - session.lastActivity.getTime() > timeout) {
        this.sessions.delete(chatId);
      }
    }
  }
}
```

## MCP Bridge Integration

### Available Tools

The Document Intelligence module exposes 7 tools through the MCP Bridge:

```typescript
interface DocumentMCPTools {
  search_documents: SearchDocumentsTool;
  analyze_document: AnalyzeDocumentTool;
  ask_document_question: AskQuestionTool;
  get_document_details: GetDetailsTool;
  extract_document_entities: ExtractEntitiesTool;
  generate_document_summary: GenerateSummaryTool;
  compare_documents: CompareDocumentsTool;
}
```

### Tool Implementations

#### Search Documents Tool

```typescript
class SearchDocumentsTool implements MCPTool {
  name = 'search_documents';
  description = 'Search through documents using semantic search';
  
  parameters = {
    query: {
      type: 'string',
      description: 'Search query',
      required: true
    },
    filters: {
      type: 'object',
      description: 'Optional filters',
      properties: {
        fileType: { type: 'array', items: { type: 'string' } },
        dateRange: { 
          type: 'object',
          properties: {
            start: { type: 'string', format: 'date' },
            end: { type: 'string', format: 'date' }
          }
        }
      }
    },
    limit: {
      type: 'number',
      description: 'Maximum results',
      default: 10
    }
  };

  async execute(params: any): Promise<MCPResponse> {
    const results = await this.documentService.searchDocuments({
      query: params.query,
      filters: params.filters,
      limit: params.limit
    });

    return {
      success: true,
      data: results.map(r => ({
        documentId: r.id,
        title: r.title,
        relevance: r.score,
        preview: r.preview
      }))
    };
  }
}
```

#### Analyze Document Tool

```typescript
class AnalyzeDocumentTool implements MCPTool {
  name = 'analyze_document';
  description = 'Perform AI analysis on a document';
  
  parameters = {
    documentId: {
      type: 'string',
      description: 'Document ID or filename',
      required: true
    },
    analysisTypes: {
      type: 'array',
      description: 'Types of analysis to perform',
      items: {
        type: 'string',
        enum: ['summary', 'entities', 'topics', 'sentiment', 'questions']
      },
      default: ['summary', 'entities']
    }
  };

  async execute(params: any): Promise<MCPResponse> {
    // Find document
    const document = await this.findDocument(params.documentId);
    
    // Perform analysis
    const analysis = await this.documentService.analyzeDocument(
      document.id,
      params.analysisTypes
    );

    return {
      success: true,
      data: {
        documentId: document.id,
        filename: document.filename,
        analysis: analysis
      }
    };
  }
}
```

### MCP Bridge Configuration

```typescript
// mcp-bridge-config.ts
export const documentIntelligenceTools = {
  category: 'Document Intelligence',
  tools: [
    {
      name: 'search_documents',
      handler: new SearchDocumentsTool(),
      rateLimit: 30,  // per minute
      requiresAuth: true
    },
    {
      name: 'analyze_document',
      handler: new AnalyzeDocumentTool(),
      rateLimit: 10,
      requiresAuth: true,
      costly: true  // Uses OpenAI
    },
    {
      name: 'ask_document_question',
      handler: new AskQuestionTool(),
      rateLimit: 20,
      requiresAuth: true,
      costly: true
    }
    // ... other tools
  ]
};
```

## REST API Integration

### Client Libraries

#### TypeScript/JavaScript Client

```typescript
class DocumentIntelligenceClient {
  constructor(
    private apiUrl: string,
    private apiKey: string
  ) {}

  async uploadDocument(file: File, metadata?: any): Promise<Document> {
    const formData = new FormData();
    formData.append('file', file);
    if (metadata) {
      formData.append('metadata', JSON.stringify(metadata));
    }

    const response = await fetch(`${this.apiUrl}/documents/upload`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`
      },
      body: formData
    });

    return response.json();
  }

  async searchDocuments(query: string, options?: SearchOptions): Promise<SearchResult[]> {
    const response = await fetch(`${this.apiUrl}/documents/search`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ query, ...options })
    });

    return response.json();
  }

  async askQuestion(documentId: string, question: string): Promise<Answer> {
    const response = await fetch(`${this.apiUrl}/documents/${documentId}/ask`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ question })
    });

    return response.json();
  }
}
```

#### Python Client

```python
import requests
from typing import Dict, List, Optional

class DocumentIntelligenceClient:
    def __init__(self, api_url: str, api_key: str):
        self.api_url = api_url
        self.headers = {'Authorization': f'Bearer {api_key}'}
    
    def upload_document(self, file_path: str, metadata: Optional[Dict] = None) -> Dict:
        with open(file_path, 'rb') as f:
            files = {'file': f}
            data = {'metadata': json.dumps(metadata)} if metadata else {}
            
            response = requests.post(
                f'{self.api_url}/documents/upload',
                headers=self.headers,
                files=files,
                data=data
            )
            
        return response.json()
    
    def search_documents(self, query: str, **options) -> List[Dict]:
        response = requests.post(
            f'{self.api_url}/documents/search',
            headers=self.headers,
            json={'query': query, **options}
        )
        return response.json()
    
    def ask_question(self, document_id: str, question: str) -> Dict:
        response = requests.post(
            f'{self.api_url}/documents/{document_id}/ask',
            headers=self.headers,
            json={'question': question}
        )
        return response.json()
```

### Webhook Integration

Configure webhooks for async notifications:

```typescript
interface WebhookConfig {
  url: string;
  secret: string;
  events: WebhookEvent[];
  retryPolicy: {
    maxRetries: number;
    backoffMs: number;
  };
}

class WebhookManager {
  async sendWebhook(event: WebhookEvent, data: any): Promise<void> {
    const payload = {
      event,
      timestamp: new Date().toISOString(),
      data
    };

    const signature = this.generateSignature(payload);

    await fetch(this.config.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Webhook-Signature': signature
      },
      body: JSON.stringify(payload)
    });
  }

  private generateSignature(payload: any): string {
    return crypto
      .createHmac('sha256', this.config.secret)
      .update(JSON.stringify(payload))
      .digest('hex');
  }
}
```

### WebSocket Integration

Real-time updates for document processing:

```typescript
class DocumentWebSocket {
  connect(token: string): void {
    this.ws = new WebSocket(`wss://api.example.com/documents/ws`);
    
    this.ws.onopen = () => {
      this.authenticate(token);
      this.subscribe(['document.processed', 'analysis.completed']);
    };
    
    this.ws.onmessage = (event) => {
      const message = JSON.parse(event.data);
      this.handleMessage(message);
    };
  }

  subscribeToDocument(documentId: string): void {
    this.send({
      type: 'subscribe',
      channel: `document.${documentId}`,
      events: ['analysis', 'processing', 'error']
    });
  }
}
```

## Future Integration Options

### Planned Integrations

#### 1. Email Gateway

```typescript
interface EmailGatewayConfig {
  // Inbound email processing
  inbound: {
    address: 'documents@yourdomain.com';
    allowedSenders: string[];
    autoProcess: boolean;
  };
  
  // Outbound notifications
  outbound: {
    from: 'noreply@yourdomain.com';
    templates: {
      analysisComplete: EmailTemplate;
      documentShared: EmailTemplate;
      errorNotification: EmailTemplate;
    };
  };
}
```

#### 2. Slack Integration

```typescript
interface SlackIntegration {
  bot: {
    commands: SlackCommand[];
    interactivity: boolean;
    homeTab: boolean;
  };
  
  app: {
    shortcuts: SlackShortcut[];
    workflows: SlackWorkflow[];
    unfurling: boolean;
  };
}
```

#### 3. Microsoft Teams

```typescript
interface TeamsIntegration {
  bot: TeamsBot;
  connectors: TeamsConnector[];
  messagingExtensions: MessagingExtension[];
  tabs: TeamsTab[];
}
```

#### 4. WhatsApp Business

```typescript
interface WhatsAppIntegration {
  businessAccount: string;
  phoneNumber: string;
  webhooks: boolean;
  templates: MessageTemplate[];
}
```

### API Gateway Integration

For enterprise deployments:

```typescript
interface APIGatewayConfig {
  // Rate limiting
  rateLimits: {
    global: number;
    perUser: number;
    perIP: number;
  };
  
  // Authentication
  auth: {
    methods: ['apiKey', 'oauth2', 'jwt'];
    providers: ['auth0', 'okta', 'custom'];
  };
  
  // Monitoring
  monitoring: {
    metrics: boolean;
    tracing: boolean;
    logging: 'verbose' | 'normal' | 'minimal';
  };
}
```

## Security Considerations

### API Security

```typescript
interface SecurityConfig {
  // Authentication
  authentication: {
    required: boolean;
    methods: AuthMethod[];
    tokenExpiry: number;
  };
  
  // Rate limiting
  rateLimiting: {
    enabled: boolean;
    limits: RateLimitConfig;
  };
  
  // File validation
  fileValidation: {
    maxSize: number;
    allowedTypes: string[];
    virusScan: boolean;
  };
  
  // Data protection
  encryption: {
    atRest: boolean;
    inTransit: boolean;
    algorithm: string;
  };
}
```

### Telegram Security

```typescript
class TelegramSecurity {
  validateUser(msg: Message): boolean {
    // Check whitelist
    if (this.config.allowedUsers.length > 0) {
      return this.config.allowedUsers.includes(
        msg.from.id.toString()
      );
    }
    
    // Check rate limits
    if (!this.rateLimiter.checkLimit(msg.from.id)) {
      return false;
    }
    
    return true;
  }
  
  sanitizeInput(text: string): string {
    return text
      .replace(/<[^>]*>/g, '')  // Remove HTML
      .substring(0, 1000);      // Limit length
  }
}
```

## Best Practices

### 1. Error Handling
- Provide clear error messages
- Log errors for debugging
- Implement retry mechanisms
- Graceful degradation

### 2. Performance
- Implement caching
- Use pagination
- Optimize file transfers
- Monitor response times

### 3. User Experience
- Provide progress indicators
- Clear action feedback
- Help documentation
- Intuitive commands

### 4. Security
- Validate all inputs
- Implement rate limiting
- Use secure connections
- Regular security audits