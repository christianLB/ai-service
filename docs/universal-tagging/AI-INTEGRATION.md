# AI Integration for Universal Tagging System

## Overview

The Universal AI Tagging System now includes advanced AI-powered features using Claude (Anthropic) and OpenAI APIs to provide intelligent tag suggestions, pattern learning, and multi-language support.

## Key Features

### 1. AI-Powered Tag Suggestions

The system uses two AI providers to analyze content and suggest relevant tags:

- **Claude API**: Primary provider for complex analysis and contextual understanding
- **OpenAI API**: Used for embeddings, semantic similarity, and fallback suggestions

#### How it works:
1. Content is analyzed using AI to understand context and meaning
2. Embeddings are generated for semantic similarity matching
3. Historical patterns and learning data enhance accuracy
4. Confidence scores are calculated based on multiple factors

### 2. Pattern-Based Learning

The system learns from user feedback to improve accuracy over time:

- Tracks successful tag applications
- Learns from manual corrections
- Builds confidence scores based on historical accuracy
- Updates tag patterns automatically

### 3. Multi-Language Support

- Automatic language detection
- Tag suggestions in multiple languages
- Cross-language semantic understanding
- Support for content in English, Spanish, French, and more

### 4. Contextual Understanding

The AI system considers context to provide better suggestions:

- Related entities (clients, transactions, etc.)
- Historical tagging patterns
- User preferences
- Domain-specific terminology

### 5. Auto-Categorization

Automatically categorizes content based on AI analysis:

- Primary and sub-category detection
- Confidence scoring
- Integration with existing tag categories

## API Endpoints

### AI Tag Suggestions
```http
POST /api/tagging/suggest
Content-Type: application/json
Authorization: Bearer {token}

{
  "content": "Payment to Amazon Web Services",
  "entityType": "transaction",
  "metadata": {
    "amount": 250.00,
    "date": "2025-01-15"
  },
  "options": {
    "provider": "claude",
    "maxTags": 5,
    "confidenceThreshold": 0.7
  }
}
```

### Auto-Categorization
```http
POST /api/tagging/categorize
Content-Type: application/json
Authorization: Bearer {token}

{
  "content": "Software development invoice",
  "entityType": "invoice",
  "language": "en"
}
```

### Batch AI Processing
```http
POST /api/tagging/batch-ai
Content-Type: application/json
Authorization: Bearer {token}

{
  "items": [
    {
      "id": "1",
      "content": "Netflix subscription",
      "entityType": "transaction"
    }
  ],
  "options": {
    "provider": "openai",
    "batchSize": 10,
    "onProgress": true
  }
}
```

### Multi-Language Suggestions
```http
POST /api/tagging/multilingual
Content-Type: application/json
Authorization: Bearer {token}

{
  "content": "Cloud computing services",
  "entityType": "expense",
  "targetLanguages": ["en", "es", "fr"]
}
```

### Contextual Suggestions
```http
POST /api/tagging/contextual
Content-Type: application/json
Authorization: Bearer {token}

{
  "content": "Website hosting",
  "entityType": "expense",
  "context": {
    "relatedClientId": "client-123",
    "historicalTags": ["TECH", "HOSTING"],
    "userPreferences": {}
  }
}
```

### AI Analytics
```http
GET /api/tagging/analytics
Authorization: Bearer {token}
```

### Pattern Improvement
```http
POST /api/tagging/improve-patterns
Content-Type: application/json
Authorization: Bearer {token}

{
  "tagId": "tag-123",
  "successfulExamples": [
    "AWS cloud services",
    "Amazon Web Services invoice"
  ],
  "failedExamples": [
    "Amazon shopping purchase"
  ]
}
```

## Implementation Details

### Confidence Scoring

The AI system calculates confidence scores using multiple factors:

1. **Semantic Similarity** (50% weight)
   - Cosine similarity between content and tag embeddings
   - Higher scores for closer semantic matches

2. **Pattern Matching** (30% weight)
   - Keyword and regex pattern matches
   - Merchant name recognition
   - Category-specific patterns

3. **Learning Score** (20% weight)
   - Historical accuracy for entity-tag combinations
   - Weighted by number of observations
   - Self-improving over time

### Fallback Mechanisms

The system includes multiple fallback strategies:

1. **Provider Fallback**: If Claude fails, falls back to OpenAI
2. **Pattern Fallback**: If AI fails, uses pattern-based matching
3. **Cache Strategy**: Reuses embeddings and results when possible
4. **Error Handling**: Graceful degradation with meaningful error messages

### Performance Optimization

- **Embedding Cache**: Stores generated embeddings to avoid repeated API calls
- **Batch Processing**: Processes multiple items in parallel
- **Progress Tracking**: Reports progress for long operations
- **Token Optimization**: Efficient prompt engineering to minimize API costs

## Configuration

### Environment Variables
```bash
# AI Provider API Keys
CLAUDE_API_KEY=your-claude-api-key
OPENAI_API_KEY=your-openai-api-key

# Optional Configuration
AI_DEFAULT_PROVIDER=claude  # or openai
AI_MAX_RETRIES=3
AI_TIMEOUT_MS=30000
```

### Provider Selection
- Claude: Better for complex reasoning and contextual understanding
- OpenAI: Better for embeddings and semantic similarity

## Best Practices

1. **Start with High Confidence Threshold**
   - Begin with 0.7+ confidence threshold
   - Lower gradually based on accuracy metrics

2. **Provide Rich Metadata**
   - Include amounts, dates, categories
   - More context = better suggestions

3. **Use Feedback Loops**
   - Submit feedback on tag accuracy
   - Learn from manual corrections
   - Review analytics regularly

4. **Language Considerations**
   - Specify language when known
   - Use multilingual endpoint for international content
   - Train patterns in multiple languages

5. **Batch Operations**
   - Use batch endpoints for bulk processing
   - Set appropriate batch sizes (10-50 items)
   - Monitor progress for large operations

## Monitoring and Analytics

The system provides comprehensive analytics:

- Total suggestions and accuracy rates
- Performance by tag and provider
- Learning progression over time
- Language distribution
- Error rates and fallback usage

## Security Considerations

1. **API Key Management**
   - Store keys securely in environment variables
   - Rotate keys regularly
   - Monitor usage and costs

2. **Data Privacy**
   - Content is sent to AI providers
   - Ensure compliance with data policies
   - Consider data residency requirements

3. **Rate Limiting**
   - Respect provider rate limits
   - Implement request queuing
   - Monitor API usage

## Troubleshooting

### Common Issues

1. **No AI Suggestions**
   - Check API keys are configured
   - Verify AI services are initialized
   - Check network connectivity
   - Review error logs

2. **Low Accuracy**
   - Increase training data
   - Improve tag patterns
   - Adjust confidence thresholds
   - Review feedback data

3. **Performance Issues**
   - Enable embedding cache
   - Reduce batch sizes
   - Use pattern fallback for simple cases
   - Monitor API latency

## Future Enhancements

- Custom model fine-tuning
- Real-time learning updates
- Advanced multi-modal analysis
- Industry-specific models
- Automated A/B testing
- Cost optimization strategies