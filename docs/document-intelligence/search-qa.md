# Search & Question Answering Documentation

## Overview

The Search & Q&A module provides intelligent information retrieval and natural language question answering capabilities across your document collection. It combines semantic search, traditional text search, and AI-powered comprehension to deliver accurate and contextual responses.

## Search Architecture

### Hybrid Search System

The system combines multiple search approaches for optimal results:

```typescript
interface HybridSearch {
  vectorSearch: SemanticSearch;      // Embedding-based similarity
  textSearch: FullTextSearch;        // Traditional keyword search
  metadataSearch: StructuredSearch;  // Filter by metadata
  
  combine(results: SearchResult[][]): RankedResults {
    // Weighted combination of different search methods
    return this.rankingAlgorithm.combine(results, {
      vectorWeight: 0.6,
      textWeight: 0.3,
      metadataWeight: 0.1
    });
  }
}
```

### 1. Semantic Search

Uses vector embeddings to find conceptually similar content:

```typescript
class SemanticSearch {
  async search(query: string, options: SearchOptions): Promise<SearchResult[]> {
    // Generate query embedding
    const queryEmbedding = await this.generateEmbedding(query);
    
    // Search in vector database
    const results = await this.vectorDB.query({
      vector: queryEmbedding,
      topK: options.limit * 2,  // Get more for re-ranking
      filter: this.buildFilter(options),
      includeMetadata: true
    });
    
    // Post-process results
    return results.map(r => ({
      documentId: r.metadata.documentId,
      chunkId: r.id,
      score: r.score,
      content: r.metadata.content,
      highlights: this.generateHighlights(query, r.metadata.content)
    }));
  }
}
```

### 2. Full-Text Search

Traditional keyword-based search with advanced features:

```typescript
interface FullTextConfig {
  language: 'english' | 'spanish' | 'french';
  stemming: boolean;
  fuzzyMatching: boolean;
  synonyms: Map<string, string[]>;
  stopWords: string[];
}

class FullTextSearch {
  async search(query: string, options: SearchOptions): Promise<SearchResult[]> {
    // Parse query
    const parsed = this.parseQuery(query);
    
    // Build PostgreSQL tsquery
    const tsquery = this.buildTsQuery(parsed, {
      stemming: true,
      fuzzy: true,
      prefix: true
    });
    
    // Execute search
    const results = await this.db.query(`
      SELECT 
        id,
        filename,
        ts_rank(search_vector, query) as rank,
        ts_headline(content, query, 
          'StartSel=<mark>, StopSel=</mark>, MaxWords=30, MinWords=15'
        ) as highlight
      FROM documents.documents,
           to_tsquery('english', $1) query
      WHERE search_vector @@ query
      ORDER BY rank DESC
      LIMIT $2
    `, [tsquery, options.limit]);
    
    return this.formatResults(results);
  }
}
```

### 3. Metadata Search

Filter and search by document metadata:

```typescript
interface MetadataFilters {
  fileType?: string[];
  dateRange?: {
    start: Date;
    end: Date;
  };
  author?: string[];
  tags?: string[];
  category?: string[];
  customFields?: Record<string, any>;
}

class MetadataSearch {
  buildQuery(filters: MetadataFilters): DatabaseQuery {
    let query = this.db.select().from('documents');
    
    if (filters.fileType) {
      query = query.whereIn('file_type', filters.fileType);
    }
    
    if (filters.dateRange) {
      query = query.whereBetween('created_at', 
        [filters.dateRange.start, filters.dateRange.end]
      );
    }
    
    if (filters.customFields) {
      query = query.whereRaw('metadata @> ?', 
        [JSON.stringify(filters.customFields)]
      );
    }
    
    return query;
  }
}
```

## Question Answering System

### Q&A Pipeline

```mermaid
graph LR
    A[Question] --> B[Question Analysis]
    B --> C[Context Retrieval]
    C --> D[Answer Generation]
    D --> E[Answer Validation]
    E --> F[Response]
```

### 1. Question Analysis

Understand the question type and intent:

```typescript
class QuestionAnalyzer {
  async analyze(question: string): Promise<QuestionAnalysis> {
    // Classify question type
    const type = await this.classifyQuestion(question);
    
    // Extract key entities
    const entities = await this.extractEntities(question);
    
    // Identify required information
    const requirements = this.identifyRequirements(question, type);
    
    return {
      type,              // factual, analytical, comparative, etc.
      entities,
      requirements,
      complexity: this.assessComplexity(question),
      answerFormat: this.determineFormat(question)
    };
  }
  
  private classifyQuestion(question: string): QuestionType {
    const patterns = {
      factual: /^(what|when|where|who|how much|how many)/i,
      analytical: /^(why|how does|explain|analyze)/i,
      comparative: /(compare|difference|versus|vs\.?)/i,
      procedural: /^(how to|how do I|steps to)/i,
      definitional: /^(what is|define|meaning of)/i
    };
    
    for (const [type, pattern] of Object.entries(patterns)) {
      if (pattern.test(question)) {
        return type as QuestionType;
      }
    }
    
    return 'general';
  }
}
```

### 2. Context Retrieval

Find relevant information to answer the question:

```typescript
class ContextRetriever {
  async retrieveContext(
    question: string,
    documentId?: string
  ): Promise<RetrievalResult> {
    // Phase 1: Initial retrieval
    const candidates = await this.initialRetrieval(question, {
      documentId,
      method: 'hybrid',
      limit: 20
    });
    
    // Phase 2: Re-ranking
    const reranked = await this.rerank(question, candidates);
    
    // Phase 3: Context assembly
    const context = this.assembleContext(reranked, {
      maxTokens: 3000,
      preserveCoherence: true
    });
    
    return {
      context,
      sources: reranked.slice(0, 5),
      confidence: this.calculateConfidence(reranked)
    };
  }
  
  private async rerank(
    question: string,
    candidates: SearchResult[]
  ): Promise<RankedResult[]> {
    // Use cross-encoder for accurate relevance scoring
    const scores = await this.crossEncoder.score(
      question,
      candidates.map(c => c.content)
    );
    
    return candidates
      .map((c, i) => ({ ...c, relevanceScore: scores[i] }))
      .sort((a, b) => b.relevanceScore - a.relevanceScore);
  }
}
```

### 3. Answer Generation

Generate accurate answers using retrieved context:

```typescript
class AnswerGenerator {
  async generateAnswer(
    question: string,
    context: Context,
    analysis: QuestionAnalysis
  ): Promise<Answer> {
    // Build prompt based on question type
    const prompt = this.buildPrompt(question, context, analysis);
    
    // Generate answer
    const response = await this.openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [
        {
          role: 'system',
          content: this.getSystemPrompt(analysis.type)
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.2,  // Low temperature for accuracy
      max_tokens: this.getMaxTokens(analysis.answerFormat)
    });
    
    // Extract and structure answer
    return this.structureAnswer(response, context.sources);
  }
  
  private getSystemPrompt(questionType: QuestionType): string {
    const prompts = {
      factual: `
        You are a precise information retrieval system.
        Answer questions using ONLY the provided context.
        If the answer is not in the context, say "I cannot find this information in the provided documents."
        Be concise and direct.
      `,
      analytical: `
        You are an analytical assistant.
        Provide thoughtful analysis based on the context.
        Explain reasoning and connections clearly.
        Cite specific parts of the context.
      `,
      comparative: `
        You are a comparison specialist.
        Identify similarities and differences clearly.
        Use structured format when appropriate.
        Base all comparisons on the provided context.
      `
    };
    
    return prompts[questionType] || prompts.factual;
  }
}
```

### 4. Answer Validation

Ensure answer quality and accuracy:

```typescript
class AnswerValidator {
  async validate(
    answer: Answer,
    question: string,
    context: Context
  ): Promise<ValidationResult> {
    const checks = await Promise.all([
      this.checkFactualAccuracy(answer, context),
      this.checkCompleteness(answer, question),
      this.checkCoherence(answer),
      this.checkSourceAttribution(answer, context)
    ]);
    
    const score = checks.reduce((sum, check) => sum + check.score, 0) / checks.length;
    
    return {
      isValid: score > 0.7,
      score,
      issues: checks.filter(c => !c.passed).map(c => c.issue),
      suggestions: this.generateSuggestions(checks)
    };
  }
  
  private async checkFactualAccuracy(
    answer: Answer,
    context: Context
  ): Promise<Check> {
    // Verify claims against context
    const claims = this.extractClaims(answer);
    const verified = await Promise.all(
      claims.map(claim => this.verifyClaim(claim, context))
    );
    
    const accuracy = verified.filter(v => v).length / claims.length;
    
    return {
      passed: accuracy > 0.9,
      score: accuracy,
      issue: accuracy <= 0.9 ? 'Some claims cannot be verified' : null
    };
  }
}
```

## Advanced Search Features

### 1. Query Understanding

```typescript
class QueryProcessor {
  process(query: string): ProcessedQuery {
    // Spell correction
    const corrected = this.spellCheck(query);
    
    // Synonym expansion
    const expanded = this.expandSynonyms(corrected);
    
    // Intent detection
    const intent = this.detectIntent(expanded);
    
    // Entity recognition
    const entities = this.recognizeEntities(expanded);
    
    // Query reformulation
    const reformulated = this.reformulate(expanded, intent, entities);
    
    return {
      original: query,
      processed: reformulated,
      intent,
      entities,
      suggestions: this.generateSuggestions(query)
    };
  }
}
```

### 2. Faceted Search

```typescript
interface SearchFacets {
  fileTypes: FacetGroup;
  dateRanges: FacetGroup;
  authors: FacetGroup;
  categories: FacetGroup;
  customFacets: Map<string, FacetGroup>;
}

class FacetedSearch {
  async search(
    query: string,
    selectedFacets: SelectedFacets
  ): Promise<FacetedSearchResult> {
    // Execute main search
    const results = await this.hybridSearch.search(query, {
      filters: this.buildFilters(selectedFacets)
    });
    
    // Calculate facets for results
    const facets = await this.calculateFacets(results);
    
    return {
      results,
      facets,
      appliedFacets: selectedFacets,
      totalCount: results.totalCount
    };
  }
}
```

### 3. Search Suggestions

```typescript
class SearchSuggestions {
  async getSuggestions(
    partialQuery: string,
    context: SearchContext
  ): Promise<Suggestion[]> {
    const suggestions = await Promise.all([
      this.getQueryCompletions(partialQuery),
      this.getRelatedSearches(partialQuery),
      this.getPopularSearches(context),
      this.getEntitySuggestions(partialQuery)
    ]);
    
    return this.rankSuggestions(
      suggestions.flat(),
      partialQuery,
      context
    );
  }
}
```

## Multi-Document Q&A

### Cross-Document Analysis

```typescript
class MultiDocumentQA {
  async answerAcrossDocuments(
    question: string,
    documentIds: string[]
  ): Promise<MultiDocAnswer> {
    // Retrieve context from each document
    const contexts = await Promise.all(
      documentIds.map(id => 
        this.contextRetriever.retrieveContext(question, id)
      )
    );
    
    // Merge and deduplicate information
    const mergedContext = this.mergeContexts(contexts);
    
    // Generate comprehensive answer
    const answer = await this.generateMultiDocAnswer(
      question,
      mergedContext
    );
    
    // Attribute sources
    return this.attributeSources(answer, contexts);
  }
}
```

### Comparative Q&A

```typescript
class ComparativeQA {
  async compareDocuments(
    question: string,
    documentIds: string[],
    aspects: string[]
  ): Promise<ComparisonResult> {
    // Extract relevant information from each document
    const extractions = await Promise.all(
      documentIds.map(id => 
        this.extractAspects(id, aspects)
      )
    );
    
    // Generate comparison table
    const comparison = this.generateComparison(extractions, aspects);
    
    // Answer specific question if provided
    const answer = question 
      ? await this.answerComparativeQuestion(question, comparison)
      : null;
    
    return {
      comparison,
      answer,
      visualization: this.createVisualization(comparison)
    };
  }
}
```

## Performance Optimization

### 1. Caching Strategy

```typescript
class SearchCache {
  private queryCache: LRUCache<string, SearchResult[]>;
  private embeddingCache: LRUCache<string, number[]>;
  private answerCache: LRUCache<string, Answer>;
  
  async getCachedResults(
    query: string,
    options: SearchOptions
  ): Promise<SearchResult[] | null> {
    const cacheKey = this.generateKey(query, options);
    const cached = this.queryCache.get(cacheKey);
    
    if (cached && !this.isStale(cached)) {
      return cached;
    }
    
    return null;
  }
}
```

### 2. Query Optimization

```typescript
class QueryOptimizer {
  optimize(query: ParsedQuery): OptimizedQuery {
    // Remove redundant terms
    const deduped = this.removeDuplicates(query);
    
    // Optimize boolean logic
    const optimized = this.optimizeBooleanLogic(deduped);
    
    // Reorder for performance
    const reordered = this.reorderClauses(optimized);
    
    // Add query hints
    return this.addHints(reordered);
  }
}
```

### 3. Parallel Processing

```typescript
class ParallelSearcher {
  async search(
    query: string,
    options: SearchOptions
  ): Promise<SearchResult[]> {
    // Execute different search types in parallel
    const [semantic, fullText, metadata] = await Promise.all([
      this.semanticSearch.search(query, options),
      this.fullTextSearch.search(query, options),
      this.metadataSearch.search(query, options)
    ]);
    
    // Combine results
    return this.combineResults([semantic, fullText, metadata]);
  }
}
```

## Search Analytics

### Query Analytics

```typescript
interface QueryAnalytics {
  query: string;
  timestamp: Date;
  userId: string;
  resultCount: number;
  clickedResults: string[];
  dwellTime: number;
  refinements: string[];
  successful: boolean;
}

class SearchAnalytics {
  async trackSearch(analytics: QueryAnalytics): Promise<void> {
    // Store analytics
    await this.store(analytics);
    
    // Update search suggestions
    await this.updateSuggestions(analytics);
    
    // Improve ranking if needed
    if (!analytics.successful) {
      await this.flagForImprovement(analytics);
    }
  }
}
```

### Q&A Analytics

```typescript
class QAAnalytics {
  trackQuestion(
    question: string,
    answer: Answer,
    feedback?: UserFeedback
  ): void {
    this.analytics.track('qa_interaction', {
      question,
      answerConfidence: answer.confidence,
      sourcesUsed: answer.sources.length,
      responseTime: answer.metadata.processingTime,
      userSatisfied: feedback?.satisfied,
      feedbackScore: feedback?.score
    });
  }
}
```

## API Integration

### Search Endpoints

```typescript
// Basic search
POST /api/documents/search
{
  "query": "invoice payment terms",
  "limit": 20,
  "filters": {
    "fileType": ["pdf", "docx"],
    "dateRange": {
      "start": "2024-01-01",
      "end": "2024-12-31"
    }
  }
}

// Faceted search
POST /api/documents/search/faceted
{
  "query": "contract",
  "facets": {
    "category": ["legal"],
    "year": ["2024"]
  }
}

// Search suggestions
GET /api/documents/search/suggestions?q=inv
```

### Q&A Endpoints

```typescript
// Single document Q&A
POST /api/documents/:id/ask
{
  "question": "What are the payment terms?"
}

// Multi-document Q&A
POST /api/documents/ask-multiple
{
  "question": "What are the payment terms across all contracts?",
  "documentIds": ["doc1", "doc2", "doc3"]
}

// Comparative Q&A
POST /api/documents/compare
{
  "question": "How do the payment terms differ?",
  "documentIds": ["doc1", "doc2"],
  "aspects": ["payment_terms", "penalties", "duration"]
}
```

## Best Practices

### 1. Search Optimization
- Use appropriate chunk sizes (500-1000 tokens)
- Implement query caching
- Pre-compute embeddings
- Index metadata properly

### 2. Q&A Accuracy
- Validate answers against context
- Provide confidence scores
- Include source attribution
- Handle "unknown" gracefully

### 3. User Experience
- Provide search suggestions
- Show result previews
- Highlight matching terms
- Enable search refinement

### 4. Performance
- Cache frequent queries
- Use connection pooling
- Implement pagination
- Monitor response times