# Document Intelligence Module

## Overview

The Document Intelligence module is an AI-powered document processing system that enables intelligent document analysis, extraction, search, and Q&A capabilities. It supports multiple file formats and provides comprehensive document understanding through OpenAI integration.

## Architecture

The module follows a service-oriented architecture:

```
document-intelligence/
├── ingestion/              # Document intake and processing
│   ├── parsers            # Format-specific parsers
│   └── preprocessors      # Content preparation
├── analysis/              # AI-powered analysis
│   ├── openai-service     # GPT-4 integration
│   └── embeddings         # Vector embeddings
├── storage/               # Document and metadata storage
│   ├── postgresql         # Structured data
│   └── file-storage       # Binary files
├── search/                # Semantic search capabilities
└── api/                   # REST and integration endpoints
```

## Key Features

### 1. Multi-Format Document Support
- PDF documents with text extraction
- Microsoft Word (DOCX) files
- Plain text files (TXT)
- HTML documents
- Markdown files
- CSV spreadsheets
- Excel files (XLSX)
- Images with OCR (planned)

### 2. AI-Powered Analysis
- Document summarization (short/medium/long)
- Entity extraction (people, organizations, locations, dates, money)
- Topic detection and keyword extraction
- Sentiment analysis
- Automatic question generation
- Document type classification

### 3. Semantic Search
- Vector embeddings for semantic similarity
- Natural language queries
- Relevance ranking
- Contextual search results

### 4. Q&A Capabilities
- Ask questions about document content
- Context-aware answers
- Source attribution
- Multi-document Q&A (planned)

### 5. Integration Options
- REST API for programmatic access
- Telegram bot for easy interaction
- MCP Bridge tools for AI assistant integration
- Webhook support (planned)

## Current Status

✅ **Core Features Implemented**:
- Document ingestion for major formats
- OpenAI-based analysis pipeline
- Basic semantic search
- Q&A functionality
- Telegram bot integration
- Database storage system
- REST API endpoints

🚧 **In Development**:
- Knowledge Graph construction
- Advanced analytics dashboard
- Multi-user support with permissions
- Email gateway for document submission

📋 **Planned Features**:
- Active learning system
- Automated report generation
- Web crawler integration
- White-label API
- Advanced visualization

## Quick Start

### Prerequisites
- Node.js 20+
- PostgreSQL 15+
- OpenAI API key
- Telegram bot token (optional)

### Installation
See [setup.md](./setup.md) for detailed installation instructions.

### Configuration
See [configuration.md](./configuration.md) for environment variables and settings.

## Documentation Structure

- [Architecture](./architecture.md) - System design and components
- [Setup Guide](./setup.md) - Installation and configuration
- [API Reference](./api-reference.md) - Complete API documentation
- [File Formats](./file-formats.md) - Supported formats and parsers
- [AI Analysis](./ai-analysis.md) - Analysis capabilities and configuration
- [Search & Q&A](./search-qa.md) - Search and question answering
- [Integration Guide](./integration.md) - Telegram bot and MCP Bridge
- [Security](./security.md) - Security measures and best practices
- [Troubleshooting](./troubleshooting.md) - Common issues and solutions
- [Roadmap](./roadmap.md) - Future features and timeline

## Integration Points

### MCP Bridge
The Document Intelligence module exposes 7 tools through the MCP Bridge:
- Search documents
- Analyze document
- Ask questions
- Get document details
- Extract entities
- Generate summaries
- Compare documents

### Database Schema
Uses the `documents` schema in PostgreSQL with tables for:
- Documents metadata
- File storage references
- Analysis results
- Embeddings and vectors
- User interactions

### External Services
- OpenAI API for analysis
- Telegram API for bot interface
- File storage system
- Vector similarity search

## Use Cases

### Financial Document Processing
- Invoice analysis and data extraction
- Contract review and key terms identification
- Financial report summarization
- Compliance document checking

### Knowledge Management
- Company documentation search
- Policy and procedure Q&A
- Training material analysis
- Meeting notes summarization

### Research & Analysis
- Academic paper summarization
- Research document organization
- Literature review assistance
- Data extraction from reports

## Contributing

See the main project [CONTRIBUTING.md](../../CONTRIBUTING.md) for guidelines on contributing to the Document Intelligence module.