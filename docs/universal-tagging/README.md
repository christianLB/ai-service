# Universal AI Tagging System

## Overview

The Universal AI Tagging System is a comprehensive, AI-powered classification and tagging engine designed to work across all entities in the AI Service application. This system replaces entity-specific categorization with a unified approach that enables intelligent tagging for transactions, documents, clients, invoices, and any future entity types.

## Documentation Structure

### Core Documentation
- [System Overview](system-overview.md) - Complete system concepts and capabilities
- [Architecture](architecture.md) - Detailed technical architecture and design
- [Implementation Roadmap](implementation-roadmap.md) - Phased implementation plan

### Frontend & Admin
- [Admin Interface](admin-interface.md) - Comprehensive admin dashboard and monitoring tools

### Technical Guides
- [API Reference](api-reference.md) - Complete API documentation
- [Database Schema](database-schema.md) - Schema design and migrations
- [Integration Guide](integration-guide.md) - How to integrate with existing entities

### Development
- [Setup Guide](setup.md) - Development environment setup
- [Testing Guide](testing.md) - Testing strategies and frameworks
- [Performance Optimization](performance.md) - Optimization techniques

## Quick Start

### Prerequisites
- Node.js 20+
- PostgreSQL 15+ with pgvector extension
- Redis for caching and queues
- AI API keys (Claude, OpenAI)

### Installation
```bash
# Install dependencies
npm install

# Run database migrations
make db-migrate-create NAME=universal_tagging_schema
make db-migrate

# Seed initial data
npm run seed:tags

# Start development server
make dev-up
```

### Basic Usage
```typescript
// Tag a transaction
const result = await taggingService.tagEntity({
  type: 'transaction',
  id: 'trans-123',
  content: 'NETFLIX SUBSCRIPTION',
  metadata: { amount: -15.99, currency: 'EUR' }
});

// Tag a document
const result = await taggingService.tagEntity({
  type: 'document',
  id: 'doc-456',
  content: documentText,
  metadata: { format: 'pdf' }
});
```

## Key Features

### 🎯 Universal Classification
- Works with ANY entity type (transactions, documents, clients, invoices, etc.)
- Consistent tagging experience across all entities
- Flexible schema adapts to new entity types

### 🤖 AI-Powered Intelligence
- Claude AI integration for understanding context
- OpenAI embeddings for semantic search
- Continuous learning from user feedback
- Multi-language support

### 🔗 Cross-Entity Relationships
- Discovers connections between different entities
- Links related documents, transactions, and clients
- Builds knowledge graph of business data

### 📊 Administrative Control
- Real-time monitoring dashboard
- Complete audit trail
- Performance analytics
- Cost tracking and optimization

### ⚡ Performance & Scale
- Handles millions of entities
- Sub-100ms response times
- Intelligent caching
- Batch processing capabilities

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    Universal AI Tagging System               │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────┐  ┌─────────────┐  ┌──────────────────┐  │
│  │   Entities   │  │   AI Engine  │  │   Tag Storage    │  │
│  ├─────────────┤  ├─────────────┤  ├──────────────────┤  │
│  │ Transactions │  │   Claude AI  │  │  Universal Tags  │  │
│  │  Documents   │  │   OpenAI     │  │  Entity Tags     │  │
│  │   Clients    │  │  Embeddings  │  │  Tag Patterns    │  │
│  │   Invoices   │  │   ML Models  │  │  Tag Hierarchy   │  │
│  │   [Future]   │  │              │  │                  │  │
│  └─────────────┘  └─────────────┘  └──────────────────┘  │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐  │
│  │              Core Tagging Service                    │  │
│  ├─────────────────────────────────────────────────────┤  │
│  │ • Pattern Matching  • AI Analysis  • Learning Loop  │  │
│  │ • Cross-Entity Links • Semantic Search • Feedback   │  │
│  └─────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

## Migration from Current System

### Current State
- Transaction-specific categorization only
- Limited AI tag fields
- No cross-entity intelligence
- Basic pattern matching

### Target State
- Universal tagging for all entities
- Flexible JSONB pattern storage
- AI-powered classification
- Cross-entity relationship discovery
- Complete admin visibility

### Migration Benefits
- 90%+ accuracy in classification
- 50% reduction in manual categorization
- Unified experience across entities
- Future-proof architecture

## Contributing

Please follow the existing patterns and conventions:
1. Update documentation when adding features
2. Write tests for all new functionality
3. Follow TypeScript best practices
4. Document API changes

## Related Documentation

- [Financial Intelligence](../financial-intelligence/README.md) - Current categorization system
- [Document Intelligence](../document-intelligence/README.md) - Document processing system
- [Trading Intelligence](../trading-intelligence/README.md) - Trading system integration

## Support

For questions or issues:
1. Check the [Troubleshooting Guide](troubleshooting.md)
2. Review the [FAQ](faq.md)
3. Contact the development team