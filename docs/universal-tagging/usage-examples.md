# Universal AI Tagging System - Usage Examples

## Table of Contents
1. [Frontend Integration (React)](#frontend-integration-react)
2. [Backend Integration (Node.js)](#backend-integration-nodejs)
3. [Webhook Integration](#webhook-integration)
4. [Batch Processing Scenarios](#batch-processing-scenarios)

## Frontend Integration (React)

### 1. Tag Management Component

```jsx
import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { TaggingClient } from './tagging-client';

const TagManager = () => {
  const queryClient = useQueryClient();
  const [selectedEntityType, setSelectedEntityType] = useState('transaction');
  
  // Fetch tags
  const { data: tags, isLoading } = useQuery({
    queryKey: ['tags', selectedEntityType],
    queryFn: () => TaggingClient.getTags({ entityType: selectedEntityType })
  });

  // Create tag mutation
  const createTagMutation = useMutation({
    mutationFn: (newTag) => TaggingClient.createTag(newTag),
    onSuccess: () => {
      queryClient.invalidateQueries(['tags']);
      toast.success('Tag created successfully');
    }
  });

  // Delete tag mutation
  const deleteTagMutation = useMutation({
    mutationFn: (tagId) => TaggingClient.deleteTag(tagId),
    onSuccess: () => {
      queryClient.invalidateQueries(['tags']);
      toast.success('Tag deleted');
    }
  });

  return (
    <div className="tag-manager">
      <h2>Tag Management</h2>
      
      {/* Entity Type Selector */}
      <select 
        value={selectedEntityType} 
        onChange={(e) => setSelectedEntityType(e.target.value)}
        className="entity-type-selector"
      >
        <option value="transaction">Transactions</option>
        <option value="document">Documents</option>
        <option value="client">Clients</option>
        <option value="invoice">Invoices</option>
      </select>

      {/* Tag List */}
      {isLoading ? (
        <Spinner />
      ) : (
        <TagList 
          tags={tags} 
          onDelete={(tagId) => deleteTagMutation.mutate(tagId)}
        />
      )}

      {/* Create Tag Form */}
      <CreateTagForm 
        entityType={selectedEntityType}
        onSubmit={(newTag) => createTagMutation.mutate(newTag)}
      />
    </div>
  );
};

// Tag List Component
const TagList = ({ tags, onDelete }) => {
  return (
    <div className="tag-list">
      {tags.map(tag => (
        <TagItem key={tag.id} tag={tag} onDelete={onDelete} />
      ))}
    </div>
  );
};

// Individual Tag Item
const TagItem = ({ tag, onDelete }) => {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="tag-item">
      <div className="tag-header">
        <span 
          className="tag-badge" 
          style={{ backgroundColor: tag.color || '#6B7280' }}
        >
          {tag.icon && <i className={`icon-${tag.icon}`} />}
          {tag.name}
        </span>
        <span className="tag-code">{tag.code}</span>
        <div className="tag-metrics">
          <span>Used: {tag.usageCount}</span>
          <span>Success: {(tag.successRate * 100).toFixed(0)}%</span>
        </div>
        <button 
          onClick={() => setExpanded(!expanded)}
          className="expand-button"
        >
          {expanded ? '−' : '+'}
        </button>
        <button 
          onClick={() => onDelete(tag.id)}
          className="delete-button"
        >
          ×
        </button>
      </div>
      
      {expanded && (
        <div className="tag-details">
          <p>{tag.description}</p>
          {tag.patterns && (
            <div className="tag-patterns">
              <h4>Patterns:</h4>
              <ul>
                {tag.patterns.keywords?.map(keyword => (
                  <li key={keyword} className="keyword">{keyword}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// Create Tag Form
const CreateTagForm = ({ entityType, onSubmit }) => {
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    description: '',
    entityTypes: [entityType],
    patterns: { keywords: [] },
    color: '#6B7280'
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
    setFormData({
      code: '',
      name: '',
      description: '',
      entityTypes: [entityType],
      patterns: { keywords: [] },
      color: '#6B7280'
    });
  };

  return (
    <form onSubmit={handleSubmit} className="create-tag-form">
      <h3>Create New Tag</h3>
      
      <input
        type="text"
        placeholder="Tag Code (e.g., EXPENSE_TRAVEL)"
        value={formData.code}
        onChange={(e) => setFormData({
          ...formData,
          code: e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, '_')
        })}
        required
        pattern="^[A-Z][A-Z0-9_]*$"
      />

      <input
        type="text"
        placeholder="Tag Name"
        value={formData.name}
        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
        required
      />

      <textarea
        placeholder="Description"
        value={formData.description}
        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
        rows={3}
      />

      <KeywordInput
        keywords={formData.patterns.keywords}
        onChange={(keywords) => setFormData({
          ...formData,
          patterns: { ...formData.patterns, keywords }
        })}
      />

      <input
        type="color"
        value={formData.color}
        onChange={(e) => setFormData({ ...formData, color: e.target.value })}
      />

      <button type="submit">Create Tag</button>
    </form>
  );
};
```

### 2. Entity Tagging Interface

```jsx
import React, { useState, useCallback } from 'react';
import { useMutation } from '@tanstack/react-query';
import { TaggingClient } from './tagging-client';

const EntityTagger = ({ entity, entityType, onTagsUpdated }) => {
  const [isTagging, setIsTagging] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [appliedTags, setAppliedTags] = useState(entity.tags || []);

  // Get AI suggestions
  const getSuggestionsMutation = useMutation({
    mutationFn: () => TaggingClient.getAISuggestions({
      content: entity.description || entity.content,
      entityType: entityType,
      metadata: {
        amount: entity.amount,
        date: entity.date,
        merchant: entity.merchant
      }
    }),
    onSuccess: (data) => {
      setSuggestions(data.suggestions);
      setIsTagging(true);
    }
  });

  // Apply tags
  const applyTagsMutation = useMutation({
    mutationFn: (selectedTags) => TaggingClient.tagEntity(
      entityType,
      entity.id,
      { tags: selectedTags }
    ),
    onSuccess: (data) => {
      setAppliedTags(data.tags);
      setIsTagging(false);
      onTagsUpdated(data.tags);
      toast.success('Tags applied successfully');
    }
  });

  // Remove tag
  const removeTagMutation = useMutation({
    mutationFn: (tagId) => TaggingClient.removeEntityTag(
      entityType,
      entity.id,
      tagId
    ),
    onSuccess: (_, tagId) => {
      setAppliedTags(appliedTags.filter(t => t.tagId !== tagId));
      toast.success('Tag removed');
    }
  });

  return (
    <div className="entity-tagger">
      {/* Current Tags */}
      <div className="current-tags">
        <h4>Current Tags:</h4>
        <div className="tag-list">
          {appliedTags.length === 0 ? (
            <span className="no-tags">No tags applied</span>
          ) : (
            appliedTags.map(tag => (
              <TagChip
                key={tag.tagId}
                tag={tag}
                onRemove={() => removeTagMutation.mutate(tag.tagId)}
                verified={tag.isVerified}
              />
            ))
          )}
        </div>
      </div>

      {/* Tagging Interface */}
      {!isTagging ? (
        <button 
          onClick={() => getSuggestionsMutation.mutate()}
          className="suggest-tags-button"
        >
          Get Tag Suggestions
        </button>
      ) : (
        <TagSuggestions
          suggestions={suggestions}
          onApply={(selected) => applyTagsMutation.mutate(selected)}
          onCancel={() => setIsTagging(false)}
        />
      )}
    </div>
  );
};

// Tag Chip Component
const TagChip = ({ tag, onRemove, verified }) => {
  return (
    <div className={`tag-chip ${verified ? 'verified' : ''}`}>
      <span className="tag-name">{tag.tagName}</span>
      <span className="confidence">{(tag.confidence * 100).toFixed(0)}%</span>
      {verified && <span className="verified-icon">✓</span>}
      <button onClick={onRemove} className="remove-tag">×</button>
    </div>
  );
};

// Tag Suggestions Component
const TagSuggestions = ({ suggestions, onApply, onCancel }) => {
  const [selected, setSelected] = useState(
    suggestions.filter(s => s.confidence >= 0.8).map(s => s.tagId)
  );

  const toggleSelection = (tagId) => {
    setSelected(prev => 
      prev.includes(tagId) 
        ? prev.filter(id => id !== tagId)
        : [...prev, tagId]
    );
  };

  return (
    <div className="tag-suggestions">
      <h4>AI Suggestions:</h4>
      <div className="suggestion-list">
        {suggestions.map(suggestion => (
          <div 
            key={suggestion.tagId}
            className={`suggestion-item ${selected.includes(suggestion.tagId) ? 'selected' : ''}`}
            onClick={() => toggleSelection(suggestion.tagId)}
          >
            <input
              type="checkbox"
              checked={selected.includes(suggestion.tagId)}
              readOnly
            />
            <span className="tag-name">{suggestion.tagName}</span>
            <span className="confidence">
              {(suggestion.confidence * 100).toFixed(0)}%
            </span>
            {suggestion.reasoning && (
              <span className="reasoning">{suggestion.reasoning}</span>
            )}
          </div>
        ))}
      </div>
      
      <div className="actions">
        <button onClick={() => onApply(selected)} className="apply-button">
          Apply Selected Tags
        </button>
        <button onClick={onCancel} className="cancel-button">
          Cancel
        </button>
      </div>
    </div>
  );
};
```

### 3. Tag Analytics Dashboard

```jsx
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const TagAnalytics = () => {
  const { data: accuracy } = useQuery({
    queryKey: ['tagging-accuracy'],
    queryFn: () => TaggingClient.getAccuracy({ period: 'month' })
  });

  const { data: tagMetrics } = useQuery({
    queryKey: ['tag-metrics'],
    queryFn: () => TaggingClient.getTopTags({ limit: 10 })
  });

  if (!accuracy || !tagMetrics) {
    return <Spinner />;
  }

  return (
    <div className="tag-analytics">
      <h2>Tagging Analytics</h2>

      {/* Overall Accuracy */}
      <div className="metric-card">
        <h3>Overall Accuracy</h3>
        <div className="metric-value">
          {(accuracy.overall.accuracy * 100).toFixed(1)}%
        </div>
        <div className="metric-details">
          <span>Total Tagged: {accuracy.overall.totalTagged}</span>
          <span>Verified: {accuracy.overall.verified}</span>
        </div>
      </div>

      {/* Accuracy by Method */}
      <div className="chart-container">
        <h3>Accuracy by Method</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={Object.entries(accuracy.byMethod).map(([method, data]) => ({
            method,
            accuracy: data.accuracy * 100
          }))}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="method" />
            <YAxis />
            <Tooltip />
            <Bar dataKey="accuracy" fill="#8884d8" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Top Tags */}
      <div className="top-tags">
        <h3>Most Used Tags</h3>
        <div className="tag-metrics-list">
          {tagMetrics.map(tag => (
            <TagMetricItem key={tag.id} tag={tag} />
          ))}
        </div>
      </div>
    </div>
  );
};

const TagMetricItem = ({ tag }) => {
  const [showDetails, setShowDetails] = useState(false);

  return (
    <div className="tag-metric-item">
      <div className="tag-metric-header" onClick={() => setShowDetails(!showDetails)}>
        <span className="tag-name">{tag.name}</span>
        <span className="usage-count">{tag.usageCount} uses</span>
        <span className="success-rate">{(tag.successRate * 100).toFixed(0)}%</span>
      </div>
      
      {showDetails && (
        <TagTrendChart tagId={tag.id} />
      )}
    </div>
  );
};
```

### 4. Real-time Tagging Updates

```jsx
import React, { useEffect, useState } from 'react';
import { io } from 'socket.io-client';

const RealtimeTaggingDashboard = () => {
  const [recentTags, setRecentTags] = useState([]);
  const [socket, setSocket] = useState(null);

  useEffect(() => {
    // Connect to WebSocket
    const newSocket = io(process.env.REACT_APP_WS_URL, {
      auth: {
        token: localStorage.getItem('authToken')
      }
    });

    newSocket.on('entity.tagged', (data) => {
      setRecentTags(prev => [data, ...prev].slice(0, 20));
      
      // Show notification
      showNotification(`New tags applied to ${data.entityType} ${data.entityId}`);
    });

    newSocket.on('tag.verified', (data) => {
      // Update UI to show verification
      updateTagVerification(data.entityId, data.tagId);
    });

    setSocket(newSocket);

    return () => {
      newSocket.close();
    };
  }, []);

  return (
    <div className="realtime-dashboard">
      <h3>Recent Tagging Activity</h3>
      <div className="activity-feed">
        {recentTags.map((activity, index) => (
          <ActivityItem key={index} activity={activity} />
        ))}
      </div>
    </div>
  );
};

const ActivityItem = ({ activity }) => {
  const timeAgo = useTimeAgo(activity.timestamp);

  return (
    <div className="activity-item">
      <div className="activity-icon">
        <TagIcon type={activity.entityType} />
      </div>
      <div className="activity-content">
        <p>
          <strong>{activity.entityType}</strong> {activity.entityId}
        </p>
        <div className="applied-tags">
          {activity.tags.map(tag => (
            <span key={tag.tagId} className="mini-tag">
              {tag.tagCode}
            </span>
          ))}
        </div>
      </div>
      <div className="activity-time">
        {timeAgo}
      </div>
    </div>
  );
};
```

## Backend Integration (Node.js)

### 1. Express Middleware for Auto-Tagging

```javascript
const express = require('express');
const { TaggingClient } = require('./tagging-client');

// Auto-tagging middleware
const autoTaggingMiddleware = (entityType) => {
  return async (req, res, next) => {
    try {
      // Skip if entity already has tags
      if (req.body.skipTagging || req.entity?.tags?.length > 0) {
        return next();
      }

      // Prepare content for tagging
      const content = extractContent(req.entity, entityType);
      const metadata = extractMetadata(req.entity, entityType);

      // Get AI suggestions
      const taggingResult = await TaggingClient.tagEntity(
        entityType,
        req.entity.id,
        {
          method: 'auto',
          options: {
            aiProvider: 'claude',
            confidenceThreshold: 0.7,
            maxTags: 5
          }
        }
      );

      // Attach tags to entity
      req.entity.tags = taggingResult.tags;
      
      // Log for monitoring
      logger.info('Auto-tagged entity', {
        entityType,
        entityId: req.entity.id,
        tagCount: taggingResult.tags.length,
        processingTime: taggingResult.processingTime
      });

      next();
    } catch (error) {
      logger.error('Auto-tagging failed', error);
      // Don't fail the request if tagging fails
      next();
    }
  };
};

// Content extraction helpers
function extractContent(entity, entityType) {
  switch (entityType) {
    case 'transaction':
      return `${entity.description} ${entity.merchant || ''} ${entity.category || ''}`;
    
    case 'document':
      return entity.content || entity.title || '';
    
    case 'invoice':
      return `${entity.description} ${entity.items?.map(i => i.description).join(' ')}`;
    
    case 'client':
      return `${entity.name} ${entity.industry || ''} ${entity.notes || ''}`;
    
    default:
      return JSON.stringify(entity);
  }
}

function extractMetadata(entity, entityType) {
  const common = {
    createdAt: entity.createdAt,
    updatedAt: entity.updatedAt
  };

  switch (entityType) {
    case 'transaction':
      return {
        ...common,
        amount: entity.amount,
        currency: entity.currency,
        date: entity.date,
        merchant: entity.merchant,
        category: entity.category
      };
    
    case 'document':
      return {
        ...common,
        fileType: entity.fileType,
        size: entity.size,
        author: entity.author
      };
    
    default:
      return common;
  }
}

// Usage in routes
const router = express.Router();

// Auto-tag new transactions
router.post('/transactions', 
  validateTransaction,
  createTransaction,
  autoTaggingMiddleware('transaction'),
  (req, res) => {
    res.json({
      success: true,
      data: req.entity
    });
  }
);

// Auto-tag uploaded documents
router.post('/documents',
  upload.single('file'),
  processDocument,
  autoTaggingMiddleware('document'),
  (req, res) => {
    res.json({
      success: true,
      data: req.entity
    });
  }
);
```

### 2. Background Job Processing

```javascript
const Bull = require('bull');
const { TaggingClient } = require('./tagging-client');

// Create queue for tagging jobs
const taggingQueue = new Bull('tagging', {
  redis: {
    host: process.env.REDIS_HOST,
    port: process.env.REDIS_PORT
  }
});

// Process tagging jobs
taggingQueue.process('tag-entity', async (job) => {
  const { entityType, entityId, options } = job.data;
  
  try {
    // Tag the entity
    const result = await TaggingClient.tagEntity(entityType, entityId, options);
    
    // Update database
    await updateEntityTags(entityType, entityId, result.tags);
    
    // Send notification
    await notifyTaggingComplete(entityType, entityId, result);
    
    return result;
  } catch (error) {
    logger.error('Tagging job failed', { entityType, entityId, error });
    throw error;
  }
});

// Process batch tagging jobs
taggingQueue.process('batch-tag', 10, async (job) => {
  const { entities, options } = job.data;
  
  try {
    const result = await TaggingClient.batchTag(entities, options);
    
    // Update progress
    job.progress(50);
    
    // Update database for all entities
    await Promise.all(
      result.results.map(r => 
        updateEntityTags(r.entityType, r.entityId, r.tags)
      )
    );
    
    job.progress(100);
    
    return result;
  } catch (error) {
    logger.error('Batch tagging failed', error);
    throw error;
  }
});

// Schedule periodic re-tagging
const scheduleRetagging = () => {
  // Re-tag unverified entities daily
  cron.schedule('0 2 * * *', async () => {
    const unverifiedEntities = await getUnverifiedEntities({
      limit: 1000,
      olderThan: '7d'
    });

    for (const batch of chunk(unverifiedEntities, 100)) {
      await taggingQueue.add('batch-tag', {
        entities: batch,
        options: {
          method: 'ai',
          forceReTag: true
        }
      });
    }
  });

  // Improve patterns weekly
  cron.schedule('0 3 * * 0', async () => {
    await improveTagPatterns();
  });
};

// Pattern improvement job
async function improveTagPatterns() {
  const tags = await TaggingClient.getTags({ limit: 100 });
  
  for (const tag of tags) {
    const examples = await getTagExamples(tag.id);
    
    if (examples.successful.length > 10) {
      await TaggingClient.improvePatterns(tag.id, {
        successfulExamples: examples.successful,
        failedExamples: examples.failed
      });
    }
  }
}
```

### 3. API Service Layer

```javascript
class TaggingService {
  constructor() {
    this.client = new TaggingClient({
      apiKey: process.env.TAGGING_API_KEY,
      baseUrl: process.env.TAGGING_API_URL
    });
    
    this.cache = new NodeCache({ stdTTL: 600 });
  }

  // Tag entity with caching
  async tagEntity(entityType, entityId, options = {}) {
    const cacheKey = `tags:${entityType}:${entityId}`;
    
    // Check cache if not forcing re-tag
    if (!options.forceReTag) {
      const cached = this.cache.get(cacheKey);
      if (cached) return cached;
    }

    // Get entity content
    const entity = await this.getEntity(entityType, entityId);
    const content = this.extractContent(entity, entityType);

    // Tag entity
    const result = await this.client.tagEntity(entityType, entityId, {
      content,
      method: options.method || 'auto',
      options: {
        aiProvider: options.aiProvider || 'claude',
        confidenceThreshold: options.confidenceThreshold || 0.7
      }
    });

    // Cache result
    this.cache.set(cacheKey, result);

    // Emit event
    eventEmitter.emit('entity.tagged', {
      entityType,
      entityId,
      tags: result.tags
    });

    return result;
  }

  // Smart batch tagging with progress tracking
  async batchTagEntities(entities, options = {}) {
    const results = [];
    const errors = [];
    
    // Group by entity type for optimization
    const grouped = entities.reduce((acc, entity) => {
      acc[entity.type] = acc[entity.type] || [];
      acc[entity.type].push(entity);
      return acc;
    }, {});

    for (const [entityType, typeEntities] of Object.entries(grouped)) {
      // Process in chunks
      const chunks = chunk(typeEntities, 50);
      
      for (const [index, chunk] of chunks.entries()) {
        try {
          const chunkResult = await this.client.batchTag({
            entities: chunk.map(e => ({
              type: entityType,
              id: e.id,
              content: this.extractContent(e, entityType),
              metadata: e
            })),
            options
          });

          results.push(...chunkResult.results);
          
          // Report progress
          const progress = ((index + 1) / chunks.length) * 100;
          eventEmitter.emit('batch.progress', {
            entityType,
            progress,
            processed: results.length,
            total: entities.length
          });
        } catch (error) {
          errors.push({
            chunk: chunk.map(e => e.id),
            error: error.message
          });
        }

        // Rate limiting pause
        await this.rateLimitPause();
      }
    }

    return {
      success: errors.length === 0,
      results,
      errors,
      summary: {
        total: entities.length,
        successful: results.filter(r => r.status === 'success').length,
        failed: results.filter(r => r.status === 'failed').length,
        errors: errors.length
      }
    };
  }

  // Intelligent re-tagging
  async retagEntities(filter, options = {}) {
    // Get entities to re-tag
    const entities = await this.getEntitiesForRetagging(filter);
    
    logger.info('Starting re-tagging', {
      entityCount: entities.length,
      filter,
      options
    });

    // Dry run mode
    if (options.dryRun) {
      return {
        wouldProcess: entities.length,
        entities: entities.slice(0, 10) // Sample
      };
    }

    // Process re-tagging
    return await this.batchTagEntities(entities, {
      ...options,
      forceReTag: true
    });
  }

  // Get tagging suggestions with context
  async getSuggestions(content, entityType, context = {}) {
    // Check for cached similar content
    const similar = await this.findSimilarTagged(content, entityType);
    
    if (similar.length > 0) {
      context.similarEntities = similar;
    }

    // Get AI suggestions
    const suggestions = await this.client.getSuggestions({
      content,
      entityType,
      metadata: context,
      options: {
        provider: 'claude',
        includeReasoning: true
      }
    });

    // Enhance with local rules
    const enhanced = await this.enhanceSuggestions(
      suggestions,
      content,
      entityType,
      context
    );

    return enhanced;
  }

  // Apply business rules to suggestions
  async enhanceSuggestions(suggestions, content, entityType, context) {
    const rules = await this.getBusinessRules(entityType);
    const enhanced = [...suggestions];

    for (const rule of rules) {
      if (rule.matches(content, context)) {
        const ruleTag = await this.getTagByCode(rule.tagCode);
        
        if (ruleTag && !enhanced.find(s => s.tagId === ruleTag.id)) {
          enhanced.push({
            tagId: ruleTag.id,
            tagCode: ruleTag.code,
            tagName: ruleTag.name,
            confidence: rule.confidence || 0.9,
            reasoning: rule.reason,
            method: 'RULE'
          });
        }
      }
    }

    // Sort by confidence
    enhanced.sort((a, b) => b.confidence - a.confidence);

    return enhanced;
  }

  // Analytics and reporting
  async getTaggingAnalytics(period = 'month') {
    const [accuracy, performance, trends] = await Promise.all([
      this.client.getAccuracy({ period }),
      this.getPerformanceMetrics(period),
      this.getTaggingTrends(period)
    ]);

    return {
      accuracy: accuracy.data,
      performance,
      trends,
      recommendations: this.generateRecommendations(accuracy.data, performance)
    };
  }

  generateRecommendations(accuracy, performance) {
    const recommendations = [];

    // Check AI accuracy
    if (accuracy.byMethod.AI.accuracy < 0.8) {
      recommendations.push({
        type: 'accuracy',
        priority: 'high',
        message: 'AI accuracy is below 80%. Consider retraining with verified examples.',
        action: 'retrain-ai'
      });
    }

    // Check processing time
    if (performance.avgProcessingTime > 2000) {
      recommendations.push({
        type: 'performance',
        priority: 'medium',
        message: 'Average processing time exceeds 2 seconds. Consider batch processing.',
        action: 'enable-batching'
      });
    }

    // Check verification rate
    const verificationRate = accuracy.overall.verified / accuracy.overall.totalTagged;
    if (verificationRate < 0.5) {
      recommendations.push({
        type: 'quality',
        priority: 'medium',
        message: 'Low verification rate. Implement user feedback collection.',
        action: 'improve-feedback'
      });
    }

    return recommendations;
  }

  // Helper methods
  async rateLimitPause() {
    const remaining = this.client.getRateLimitRemaining();
    if (remaining < 10) {
      const resetTime = this.client.getRateLimitReset();
      const waitTime = resetTime - Date.now() + 1000;
      
      logger.info(`Rate limit pause: ${waitTime}ms`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
  }

  extractContent(entity, entityType) {
    // Entity-specific content extraction
    const extractors = {
      transaction: (e) => `${e.description} ${e.merchant} ${e.category}`,
      document: (e) => e.content || e.extractedText || e.title,
      invoice: (e) => `${e.number} ${e.client} ${e.description}`,
      client: (e) => `${e.name} ${e.industry} ${e.description}`
    };

    return extractors[entityType]?.(entity) || '';
  }
}

module.exports = TaggingService;
```

## Webhook Integration

### 1. Webhook Server Setup

```javascript
const express = require('express');
const crypto = require('crypto');

class WebhookHandler {
  constructor(secret) {
    this.secret = secret;
    this.handlers = new Map();
    
    // Register handlers
    this.registerHandlers();
  }

  // Verify webhook signature
  verifySignature(payload, signature) {
    const hash = crypto
      .createHmac('sha256', this.secret)
      .update(payload)
      .digest('hex');
    
    return `sha256=${hash}` === signature;
  }

  // Register event handlers
  registerHandlers() {
    this.handlers.set('tag.created', this.handleTagCreated.bind(this));
    this.handlers.set('tag.updated', this.handleTagUpdated.bind(this));
    this.handlers.set('tag.deleted', this.handleTagDeleted.bind(this));
    this.handlers.set('entity.tagged', this.handleEntityTagged.bind(this));
    this.handlers.set('entity.tag.removed', this.handleTagRemoved.bind(this));
    this.handlers.set('entity.tag.verified', this.handleTagVerified.bind(this));
  }

  // Process webhook
  async processWebhook(event, data) {
    const handler = this.handlers.get(event);
    
    if (!handler) {
      logger.warn('Unknown webhook event', { event });
      return;
    }

    try {
      await handler(data);
      logger.info('Webhook processed', { event });
    } catch (error) {
      logger.error('Webhook processing failed', { event, error });
      throw error;
    }
  }

  // Event handlers
  async handleTagCreated(data) {
    // Invalidate tag cache
    await cache.del('tags:*');
    
    // Notify connected clients
    io.emit('tag.created', data);
    
    // Update search index
    await searchIndex.addTag(data);
  }

  async handleTagUpdated(data) {
    // Update cached tag
    await cache.set(`tag:${data.id}`, data);
    
    // Re-index affected entities
    await this.reindexEntitiesWithTag(data.id);
    
    // Notify clients
    io.emit('tag.updated', data);
  }

  async handleTagDeleted(data) {
    // Remove from cache
    await cache.del(`tag:${data.id}`);
    await cache.del('tags:*');
    
    // Handle reassignment if specified
    if (data.reassignedTo) {
      await this.handleTagReassignment(data.id, data.reassignedTo);
    }
    
    // Notify clients
    io.emit('tag.deleted', data);
  }

  async handleEntityTagged(data) {
    const { entityType, entityId, tags } = data;
    
    // Update entity in database
    await db.updateEntity(entityType, entityId, {
      tags: tags.map(t => t.tagId),
      lastTagged: new Date()
    });
    
    // Update analytics
    await analytics.recordTagging({
      entityType,
      entityId,
      tagCount: tags.length,
      method: tags[0]?.method,
      avgConfidence: tags.reduce((sum, t) => sum + t.confidence, 0) / tags.length
    });
    
    // Trigger dependent workflows
    await this.triggerWorkflows('entity.tagged', data);
  }

  async handleTagRemoved(data) {
    const { entityType, entityId, tagId } = data;
    
    // Update entity
    await db.removeEntityTag(entityType, entityId, tagId);
    
    // Update tag usage statistics
    await this.updateTagUsageStats(tagId, -1);
    
    // Notify clients
    io.emit('entity.tag.removed', data);
  }

  async handleTagVerified(data) {
    const { entityType, entityId, tagId, verifiedBy } = data;
    
    // Update verification status
    await db.verifyEntityTag(entityType, entityId, tagId, verifiedBy);
    
    // Update tag confidence
    await this.updateTagConfidence(tagId, true);
    
    // Learn from verification
    await this.submitLearningFeedback({
      entityType,
      entityId,
      tagId,
      isCorrect: true,
      verifiedBy
    });
  }

  // Helper methods
  async reindexEntitiesWithTag(tagId) {
    const entities = await db.getEntitiesWithTag(tagId);
    
    for (const entity of entities) {
      await searchIndex.updateEntity(entity);
    }
  }

  async triggerWorkflows(event, data) {
    const workflows = await db.getActiveWorkflows(event);
    
    for (const workflow of workflows) {
      await workflowEngine.execute(workflow, data);
    }
  }

  async updateTagConfidence(tagId, isCorrect) {
    const tag = await db.getTag(tagId);
    const currentRate = tag.successRate || 0.5;
    const weight = 0.1; // Learning rate
    
    const newRate = isCorrect
      ? currentRate + (1 - currentRate) * weight
      : currentRate - currentRate * weight;
    
    await db.updateTag(tagId, {
      successRate: Math.max(0, Math.min(1, newRate)),
      lastUsed: new Date()
    });
  }
}

// Express webhook endpoint
const webhookHandler = new WebhookHandler(process.env.WEBHOOK_SECRET);

app.post('/webhooks/tagging', express.raw({ type: 'application/json' }), async (req, res) => {
  try {
    // Verify signature
    const signature = req.headers['x-webhook-signature'];
    if (!webhookHandler.verifySignature(req.body, signature)) {
      return res.status(401).json({ error: 'Invalid signature' });
    }

    // Parse payload
    const payload = JSON.parse(req.body);
    
    // Process webhook
    await webhookHandler.processWebhook(payload.event, payload.data);
    
    res.status(200).json({ received: true });
  } catch (error) {
    logger.error('Webhook error', error);
    res.status(500).json({ error: 'Processing failed' });
  }
});
```

### 2. Webhook Event Emitter

```javascript
class TaggingEventEmitter extends EventEmitter {
  constructor(taggingClient) {
    super();
    this.client = taggingClient;
    this.setupInternalHandlers();
  }

  setupInternalHandlers() {
    // Auto-tag on entity creation
    this.on('entity.created', async (entity) => {
      try {
        const result = await this.client.tagEntity(
          entity.type,
          entity.id,
          { method: 'auto' }
        );
        
        this.emit('entity.auto-tagged', {
          entity,
          tags: result.tags
        });
      } catch (error) {
        this.emit('tagging.error', { entity, error });
      }
    });

    // Re-tag on significant updates
    this.on('entity.updated', async (entity, changes) => {
      if (this.shouldRetag(changes)) {
        await this.scheduleRetagging(entity);
      }
    });

    // Handle feedback
    this.on('tag.feedback.negative', async (feedback) => {
      await this.client.submitFeedback(feedback);
      
      // Schedule retagging
      await this.scheduleRetagging({
        type: feedback.entityType,
        id: feedback.entityId
      });
    });
  }

  shouldRetag(changes) {
    const significantFields = [
      'description',
      'content',
      'amount',
      'merchant',
      'category'
    ];
    
    return Object.keys(changes).some(field => 
      significantFields.includes(field)
    );
  }

  async scheduleRetagging(entity, delay = 5000) {
    setTimeout(async () => {
      try {
        await this.client.tagEntity(
          entity.type,
          entity.id,
          { 
            method: 'auto',
            forceReTag: true 
          }
        );
        
        this.emit('entity.retagged', entity);
      } catch (error) {
        this.emit('retagging.error', { entity, error });
      }
    }, delay);
  }
}
```

## Batch Processing Scenarios

### 1. Daily Transaction Import

```javascript
class DailyTransactionProcessor {
  constructor(taggingService) {
    this.taggingService = taggingService;
    this.batchSize = 500;
  }

  async processDaily() {
    const startTime = Date.now();
    logger.info('Starting daily transaction processing');

    try {
      // Get yesterday's transactions
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      
      const transactions = await this.getTransactions({
        date: yesterday,
        untagged: true
      });

      logger.info(`Found ${transactions.length} transactions to process`);

      // Process in batches
      const results = await this.processBatches(transactions);

      // Generate report
      const report = this.generateReport(results, startTime);
      
      // Send notifications
      await this.sendNotifications(report);

      return report;
    } catch (error) {
      logger.error('Daily processing failed', error);
      throw error;
    }
  }

  async processBatches(transactions) {
    const batches = chunk(transactions, this.batchSize);
    const results = [];

    for (const [index, batch] of batches.entries()) {
      logger.info(`Processing batch ${index + 1}/${batches.length}`);
      
      try {
        const batchResult = await this.taggingService.batchTagEntities(
          batch.map(tx => ({
            type: 'transaction',
            id: tx.id,
            description: tx.description,
            amount: tx.amount,
            merchant: tx.merchant,
            date: tx.date
          })),
          {
            aiProvider: 'claude',
            confidenceThreshold: 0.7,
            parallel: true
          }
        );

        results.push(...batchResult.results);

        // Apply business rules
        await this.applyBusinessRules(batchResult.results);

        // Pause between batches
        await new Promise(resolve => setTimeout(resolve, 2000));
      } catch (error) {
        logger.error(`Batch ${index + 1} failed`, error);
        
        // Try individual processing for failed batch
        const fallbackResults = await this.processFallback(batch);
        results.push(...fallbackResults);
      }
    }

    return results;
  }

  async applyBusinessRules(results) {
    for (const result of results) {
      if (result.status !== 'success') continue;

      const transaction = await this.getTransaction(result.entityId);
      
      // High-value transaction rule
      if (transaction.amount > 10000) {
        await this.addManualTag(result.entityId, 'HIGH_VALUE');
        await this.notifyCompliance(transaction);
      }

      // Suspicious pattern detection
      if (await this.isSuspicious(transaction, result.tags)) {
        await this.addManualTag(result.entityId, 'REVIEW_REQUIRED');
        await this.createReviewTask(transaction);
      }
    }
  }

  async processFallback(transactions) {
    const results = [];

    for (const tx of transactions) {
      try {
        const result = await this.taggingService.tagEntity(
          'transaction',
          tx.id,
          { method: 'pattern' } // Use pattern matching as fallback
        );

        results.push({
          entityId: tx.id,
          status: 'success',
          tags: result.tags,
          method: 'fallback'
        });
      } catch (error) {
        results.push({
          entityId: tx.id,
          status: 'failed',
          error: error.message
        });
      }
    }

    return results;
  }

  generateReport(results, startTime) {
    const successful = results.filter(r => r.status === 'success');
    const failed = results.filter(r => r.status === 'failed');
    
    const tagDistribution = {};
    successful.forEach(r => {
      r.tags?.forEach(tag => {
        tagDistribution[tag.tagCode] = (tagDistribution[tag.tagCode] || 0) + 1;
      });
    });

    return {
      summary: {
        total: results.length,
        successful: successful.length,
        failed: failed.length,
        successRate: (successful.length / results.length) * 100,
        processingTime: Date.now() - startTime
      },
      tagDistribution,
      topTags: Object.entries(tagDistribution)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 10),
      failures: failed.map(f => ({
        entityId: f.entityId,
        error: f.error
      }))
    };
  }

  async sendNotifications(report) {
    // Email summary
    await emailService.send({
      to: process.env.ADMIN_EMAIL,
      subject: `Daily Tagging Report - ${new Date().toDateString()}`,
      template: 'daily-tagging-report',
      data: report
    });

    // Slack notification
    if (report.summary.failed > 0) {
      await slackService.send({
        channel: '#alerts',
        text: `⚠️ Daily tagging completed with ${report.summary.failed} failures`,
        attachments: [{
          color: 'warning',
          fields: [
            {
              title: 'Success Rate',
              value: `${report.summary.successRate.toFixed(1)}%`,
              short: true
            },
            {
              title: 'Processing Time',
              value: `${(report.summary.processingTime / 1000).toFixed(1)}s`,
              short: true
            }
          ]
        }]
      });
    }
  }
}
```

### 2. Document Batch Import

```javascript
class DocumentBatchImporter {
  constructor(taggingService, storageService) {
    this.taggingService = taggingService;
    this.storageService = storageService;
    this.supportedFormats = ['.pdf', '.docx', '.txt', '.md'];
  }

  async importBatch(files) {
    const importId = generateImportId();
    const results = {
      importId,
      total: files.length,
      processed: [],
      failed: [],
      startTime: Date.now()
    };

    // Validate files
    const validFiles = files.filter(file => 
      this.supportedFormats.includes(path.extname(file.name).toLowerCase())
    );

    logger.info(`Starting batch import ${importId}`, {
      total: files.length,
      valid: validFiles.length
    });

    // Process files in parallel with concurrency limit
    const concurrency = 5;
    const chunks = chunk(validFiles, concurrency);

    for (const chunk of chunks) {
      const chunkResults = await Promise.all(
        chunk.map(file => this.processFile(file, importId))
      );

      chunkResults.forEach(result => {
        if (result.success) {
          results.processed.push(result);
        } else {
          results.failed.push(result);
        }
      });

      // Update progress
      await this.updateImportProgress(importId, {
        processed: results.processed.length,
        total: files.length
      });
    }

    // Batch tag all successfully imported documents
    await this.batchTagDocuments(results.processed);

    // Generate final report
    results.endTime = Date.now();
    results.duration = results.endTime - results.startTime;
    
    await this.saveImportReport(results);

    return results;
  }

  async processFile(file, importId) {
    try {
      // Upload file
      const uploadResult = await this.storageService.upload(file);
      
      // Extract text content
      const content = await this.extractContent(file, uploadResult.url);
      
      // Create document record
      const document = await db.createDocument({
        title: file.name,
        fileUrl: uploadResult.url,
        fileType: path.extname(file.name),
        fileSize: file.size,
        content: content,
        importId: importId,
        metadata: {
          originalName: file.name,
          uploadedAt: new Date(),
          contentHash: generateHash(content)
        }
      });

      return {
        success: true,
        documentId: document.id,
        fileName: file.name,
        content: content
      };
    } catch (error) {
      logger.error('File processing failed', {
        fileName: file.name,
        error: error.message
      });

      return {
        success: false,
        fileName: file.name,
        error: error.message
      };
    }
  }

  async extractContent(file, url) {
    const extension = path.extname(file.name).toLowerCase();

    switch (extension) {
      case '.pdf':
        return await this.extractPdfContent(url);
      
      case '.docx':
        return await this.extractDocxContent(url);
      
      case '.txt':
      case '.md':
        return await this.extractTextContent(url);
      
      default:
        throw new Error(`Unsupported file type: ${extension}`);
    }
  }

  async batchTagDocuments(documents) {
    if (documents.length === 0) return;

    const entities = documents.map(doc => ({
      type: 'document',
      id: doc.documentId,
      content: doc.content,
      metadata: {
        fileName: doc.fileName,
        fileType: path.extname(doc.fileName)
      }
    }));

    const taggingResult = await this.taggingService.batchTagEntities(entities, {
      aiProvider: 'claude',
      method: 'auto',
      confidenceThreshold: 0.6
    });

    // Apply document-specific rules
    for (const result of taggingResult.results) {
      if (result.status === 'success') {
        await this.applyDocumentRules(result);
      }
    }

    return taggingResult;
  }

  async applyDocumentRules(tagResult) {
    const document = await db.getDocument(tagResult.entityId);
    
    // Confidential document detection
    const confidentialKeywords = ['confidential', 'proprietary', 'secret', 'internal only'];
    
    if (confidentialKeywords.some(keyword => 
      document.content.toLowerCase().includes(keyword)
    )) {
      await this.taggingService.addManualTag(
        'document',
        document.id,
        'CONFIDENTIAL'
      );
      
      // Apply access restrictions
      await this.applyAccessRestrictions(document.id);
    }

    // Contract detection
    if (this.isContract(document)) {
      await this.taggingService.addManualTag(
        'document',
        document.id,
        'CONTRACT'
      );
      
      // Extract contract metadata
      await this.extractContractMetadata(document);
    }
  }

  isContract(document) {
    const contractIndicators = [
      'agreement',
      'contract',
      'terms and conditions',
      'party',
      'parties',
      'whereas',
      'hereinafter'
    ];

    const content = document.content.toLowerCase();
    const matches = contractIndicators.filter(indicator => 
      content.includes(indicator)
    ).length;

    return matches >= 3;
  }

  async updateImportProgress(importId, progress) {
    await cache.set(`import:${importId}:progress`, progress, 3600);
    
    // Send real-time update
    io.to(`import:${importId}`).emit('import.progress', progress);
  }

  async saveImportReport(results) {
    const report = {
      ...results,
      summary: {
        successRate: (results.processed.length / results.total) * 100,
        avgProcessingTime: results.duration / results.total,
        topTags: await this.getTopTagsFromResults(results.processed)
      }
    };

    await db.saveImportReport(report);
    
    return report;
  }
}
```

### 3. Historical Data Re-tagging

```javascript
class HistoricalDataRetagging {
  constructor(taggingService) {
    this.taggingService = taggingService;
    this.chunkSize = 1000;
  }

  async retagHistoricalData(options = {}) {
    const {
      entityType = 'transaction',
      startDate,
      endDate,
      dryRun = false,
      progressCallback
    } = options;

    logger.info('Starting historical data re-tagging', {
      entityType,
      startDate,
      endDate,
      dryRun
    });

    // Get total count
    const totalCount = await this.getEntityCount({
      entityType,
      startDate,
      endDate
    });

    if (dryRun) {
      return {
        wouldProcess: totalCount,
        estimatedTime: this.estimateProcessingTime(totalCount)
      };
    }

    // Process in chunks
    let processed = 0;
    let offset = 0;
    const results = [];

    while (offset < totalCount) {
      const entities = await this.getEntityChunk({
        entityType,
        startDate,
        endDate,
        offset,
        limit: this.chunkSize
      });

      if (entities.length === 0) break;

      // Process chunk
      const chunkResult = await this.processChunk(entities, entityType);
      results.push(...chunkResult.results);

      processed += entities.length;
      offset += this.chunkSize;

      // Report progress
      const progress = (processed / totalCount) * 100;
      
      if (progressCallback) {
        await progressCallback({
          processed,
          total: totalCount,
          progress,
          currentChunk: Math.ceil(offset / this.chunkSize),
          totalChunks: Math.ceil(totalCount / this.chunkSize)
        });
      }

      // Rate limiting pause
      await new Promise(resolve => setTimeout(resolve, 5000));
    }

    // Generate summary
    return this.generateRetaggingSummary(results, totalCount);
  }

  async processChunk(entities, entityType) {
    // Analyze existing tags
    const existingAnalysis = await this.analyzeExistingTags(entities);
    
    // Prepare for re-tagging
    const entitiesToRetag = entities.map(entity => ({
      type: entityType,
      id: entity.id,
      content: this.extractEntityContent(entity, entityType),
      metadata: {
        ...entity,
        existingTags: entity.tags,
        previousAnalysis: existingAnalysis[entity.id]
      }
    }));

    // Batch re-tag
    const result = await this.taggingService.batchTagEntities(
      entitiesToRetag,
      {
        method: 'auto',
        forceReTag: true,
        preserveVerified: true // Don't override verified tags
      }
    );

    // Compare results
    await this.compareAndLearn(entities, result.results);

    return result;
  }

  async analyzeExistingTags(entities) {
    const analysis = {};

    for (const entity of entities) {
      const tags = entity.tags || [];
      
      analysis[entity.id] = {
        tagCount: tags.length,
        verifiedCount: tags.filter(t => t.isVerified).length,
        avgConfidence: tags.length > 0
          ? tags.reduce((sum, t) => sum + t.confidence, 0) / tags.length
          : 0,
        methods: [...new Set(tags.map(t => t.method))]
      };
    }

    return analysis;
  }

  async compareAndLearn(originalEntities, retagResults) {
    const improvements = [];
    const regressions = [];

    for (const result of retagResults) {
      if (result.status !== 'success') continue;

      const original = originalEntities.find(e => e.id === result.entityId);
      const comparison = this.compareTags(original.tags, result.tags);

      if (comparison.improved) {
        improvements.push({
          entityId: result.entityId,
          oldTags: original.tags,
          newTags: result.tags,
          improvement: comparison
        });
      } else if (comparison.regressed) {
        regressions.push({
          entityId: result.entityId,
          oldTags: original.tags,
          newTags: result.tags,
          regression: comparison
        });
      }
    }

    // Learn from improvements
    if (improvements.length > 0) {
      await this.submitImprovements(improvements);
    }

    // Flag regressions for review
    if (regressions.length > 0) {
      await this.flagRegressions(regressions);
    }

    return { improvements, regressions };
  }

  compareTags(oldTags, newTags) {
    const oldTagIds = new Set(oldTags.map(t => t.tagId));
    const newTagIds = new Set(newTags.map(t => t.tagId));
    
    const added = [...newTagIds].filter(id => !oldTagIds.has(id));
    const removed = [...oldTagIds].filter(id => !newTagIds.has(id));
    
    const oldAvgConfidence = oldTags.length > 0
      ? oldTags.reduce((sum, t) => sum + t.confidence, 0) / oldTags.length
      : 0;
    
    const newAvgConfidence = newTags.length > 0
      ? newTags.reduce((sum, t) => sum + t.confidence, 0) / newTags.length
      : 0;

    return {
      added,
      removed,
      confidenceChange: newAvgConfidence - oldAvgConfidence,
      improved: newAvgConfidence > oldAvgConfidence + 0.1,
      regressed: newAvgConfidence < oldAvgConfidence - 0.1
    };
  }

  generateRetaggingSummary(results, totalCount) {
    const successful = results.filter(r => r.status === 'success');
    const failed = results.filter(r => r.status === 'failed');
    
    const tagChanges = successful.reduce((acc, result) => {
      result.tags.forEach(tag => {
        acc[tag.tagCode] = (acc[tag.tagCode] || 0) + 1;
      });
      return acc;
    }, {});

    return {
      summary: {
        totalProcessed: results.length,
        successful: successful.length,
        failed: failed.length,
        successRate: (successful.length / results.length) * 100,
        coverage: (results.length / totalCount) * 100
      },
      tagDistribution: tagChanges,
      topNewTags: Object.entries(tagChanges)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 20),
      failures: failed.slice(0, 100) // Limit failure details
    };
  }

  estimateProcessingTime(count) {
    const avgTimePerEntity = 50; // milliseconds
    const totalTime = count * avgTimePerEntity;
    const batchOverhead = Math.ceil(count / this.chunkSize) * 5000; // Rate limiting
    
    return {
      estimated: totalTime + batchOverhead,
      formatted: formatDuration(totalTime + batchOverhead)
    };
  }
}
```

### 4. Multi-Entity Relationship Tagging

```javascript
class RelationshipTagger {
  constructor(taggingService) {
    this.taggingService = taggingService;
  }

  async tagRelatedEntities(primaryEntity, options = {}) {
    const {
      depth = 2,
      entityTypes = ['transaction', 'document', 'invoice'],
      relationshipTypes = ['payment_for', 'related_to', 'references']
    } = options;

    logger.info('Starting relationship tagging', {
      primaryEntity,
      depth,
      entityTypes
    });

    // Build relationship graph
    const graph = await this.buildRelationshipGraph(
      primaryEntity,
      depth,
      entityTypes,
      relationshipTypes
    );

    // Tag all entities in graph
    const results = await this.tagEntityGraph(graph);

    // Apply relationship-based rules
    await this.applyRelationshipRules(graph, results);

    return {
      primaryEntity,
      graph,
      taggingResults: results,
      relatedEntities: graph.nodes.length - 1
    };
  }

  async buildRelationshipGraph(startEntity, maxDepth, entityTypes, relationshipTypes) {
    const graph = {
      nodes: [],
      edges: []
    };

    const visited = new Set();
    const queue = [{
      entity: startEntity,
      depth: 0
    }];

    while (queue.length > 0) {
      const { entity, depth } = queue.shift();
      const entityKey = `${entity.type}:${entity.id}`;

      if (visited.has(entityKey) || depth > maxDepth) {
        continue;
      }

      visited.add(entityKey);
      graph.nodes.push(entity);

      // Get related entities
      const relations = await this.getRelatedEntities(
        entity,
        entityTypes,
        relationshipTypes
      );

      for (const relation of relations) {
        graph.edges.push({
          from: entityKey,
          to: `${relation.targetType}:${relation.targetId}`,
          type: relation.relationshipType,
          confidence: relation.confidence
        });

        if (depth < maxDepth) {
          queue.push({
            entity: {
              type: relation.targetType,
              id: relation.targetId
            },
            depth: depth + 1
          });
        }
      }
    }

    return graph;
  }

  async tagEntityGraph(graph) {
    const results = new Map();

    // Group by entity type for efficient batching
    const grouped = graph.nodes.reduce((acc, node) => {
      acc[node.type] = acc[node.type] || [];
      acc[node.type].push(node);
      return acc;
    }, {});

    for (const [entityType, entities] of Object.entries(grouped)) {
      const batchResult = await this.taggingService.batchTagEntities(
        entities.map(e => ({
          type: entityType,
          id: e.id,
          content: e.content || e.description,
          metadata: {
            ...e,
            inRelationshipGraph: true
          }
        })),
        {
          method: 'auto',
          includeRelated: true
        }
      );

      batchResult.results.forEach(result => {
        results.set(`${entityType}:${result.entityId}`, result);
      });
    }

    return results;
  }

  async applyRelationshipRules(graph, taggingResults) {
    // Propagate tags through relationships
    for (const edge of graph.edges) {
      const fromResult = taggingResults.get(edge.from);
      const toResult = taggingResults.get(edge.to);

      if (!fromResult || !toResult) continue;

      // High-confidence relationships propagate tags
      if (edge.confidence > 0.8) {
        await this.propagateTags(
          fromResult,
          toResult,
          edge.type,
          edge.confidence
        );
      }
    }

    // Apply cluster detection
    const clusters = this.detectClusters(graph);
    
    for (const cluster of clusters) {
      await this.tagCluster(cluster, taggingResults);
    }
  }

  async propagateTags(fromResult, toResult, relationshipType, confidence) {
    const propagationRules = {
      'payment_for': ['EXPENSE_CATEGORY', 'PROJECT', 'CLIENT'],
      'related_to': ['PROJECT', 'TOPIC'],
      'references': ['TOPIC', 'CATEGORY']
    };

    const allowedTags = propagationRules[relationshipType] || [];
    
    const tagsToPropagate = fromResult.tags
      .filter(tag => allowedTags.some(allowed => tag.tagCode.includes(allowed)))
      .map(tag => ({
        ...tag,
        confidence: tag.confidence * confidence * 0.8, // Reduce confidence
        method: 'PROPAGATED',
        propagatedFrom: fromResult.entityId
      }));

    if (tagsToPropagate.length > 0) {
      await this.taggingService.addTags(
        toResult.entityType,
        toResult.entityId,
        tagsToPropagate
      );
    }
  }

  detectClusters(graph) {
    // Simple clustering based on shared connections
    const clusters = [];
    const visited = new Set();

    for (const node of graph.nodes) {
      const nodeKey = `${node.type}:${node.id}`;
      
      if (visited.has(nodeKey)) continue;

      const cluster = this.expandCluster(nodeKey, graph, visited);
      
      if (cluster.size > 2) {
        clusters.push(cluster);
      }
    }

    return clusters;
  }

  async tagCluster(cluster, taggingResults) {
    // Find common tags in cluster
    const tagFrequency = new Map();
    
    for (const nodeKey of cluster) {
      const result = taggingResults.get(nodeKey);
      
      if (result?.tags) {
        result.tags.forEach(tag => {
          tagFrequency.set(
            tag.tagCode,
            (tagFrequency.get(tag.tagCode) || 0) + 1
          );
        });
      }
    }

    // Apply cluster tag if consensus exists
    const clusterSize = cluster.size;
    const consensusThreshold = Math.ceil(clusterSize * 0.6);

    for (const [tagCode, frequency] of tagFrequency.entries()) {
      if (frequency >= consensusThreshold) {
        // Apply to all cluster members that don't have it
        for (const nodeKey of cluster) {
          const result = taggingResults.get(nodeKey);
          
          if (!result.tags.some(t => t.tagCode === tagCode)) {
            const [entityType, entityId] = nodeKey.split(':');
            
            await this.taggingService.addManualTag(
              entityType,
              entityId,
              tagCode,
              {
                method: 'CLUSTER_CONSENSUS',
                confidence: frequency / clusterSize
              }
            );
          }
        }
      }
    }
  }
}
```

## Best Practices Summary

1. **Always use batch operations** for processing multiple entities
2. **Implement proper error handling** with fallback strategies
3. **Cache frequently used data** like tag lists and hierarchies
4. **Use webhooks** for real-time updates and event-driven workflows
5. **Monitor performance** and adjust rate limits accordingly
6. **Collect user feedback** to continuously improve accuracy
7. **Apply business rules** on top of AI suggestions
8. **Use appropriate confidence thresholds** based on your use case
9. **Implement progress tracking** for long-running operations
10. **Test thoroughly** with different entity types and content variations