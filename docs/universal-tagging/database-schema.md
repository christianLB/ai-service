# Universal AI Tagging System - Database Schema

## Overview

This document details the database schema design for the Universal AI Tagging System, including table structures, relationships, indexes, and migration strategies.

## Schema Design Principles

1. **Flexibility**: Use JSONB for extensible pattern storage
2. **Performance**: Strategic indexing for common queries
3. **Scalability**: Designed for millions of entities
4. **Maintainability**: Clear relationships and constraints
5. **Auditability**: Complete history tracking

## Core Tables

### universal_tags

Stores the master tag definitions that can be applied to any entity.

```sql
CREATE TABLE universal_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(100) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  entity_types TEXT[] NOT NULL,
  
  -- Flexible pattern storage
  patterns JSONB,
  rules JSONB,
  
  -- AI/ML fields
  embedding VECTOR(1536),
  embedding_model VARCHAR(50),
  confidence FLOAT DEFAULT 0.5,
  
  -- Hierarchy
  parent_id UUID REFERENCES universal_tags(id),
  path TEXT NOT NULL,
  level INTEGER NOT NULL DEFAULT 0,
  
  -- Metadata
  color VARCHAR(7),
  icon VARCHAR(50),
  is_active BOOLEAN DEFAULT true,
  is_system BOOLEAN DEFAULT false,
  metadata JSONB,
  
  -- Usage tracking
  usage_count INTEGER DEFAULT 0,
  success_rate FLOAT DEFAULT 0.0,
  last_used TIMESTAMP,
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  -- Indexes
  CONSTRAINT check_confidence CHECK (confidence >= 0 AND confidence <= 1),
  CONSTRAINT check_success_rate CHECK (success_rate >= 0 AND success_rate <= 1)
);

-- Indexes
CREATE INDEX idx_universal_tags_code ON universal_tags(code);
CREATE INDEX idx_universal_tags_entity_types ON universal_tags USING gin(entity_types);
CREATE INDEX idx_universal_tags_parent_id ON universal_tags(parent_id);
CREATE INDEX idx_universal_tags_path ON universal_tags(path);
CREATE INDEX idx_universal_tags_is_active ON universal_tags(is_active) WHERE is_active = true;
CREATE INDEX idx_universal_tags_embedding ON universal_tags USING ivfflat(embedding vector_cosine_ops);
```

### entity_tags

Links tags to specific entities with metadata about how the tag was applied.

```sql
CREATE TABLE entity_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type VARCHAR(50) NOT NULL,
  entity_id VARCHAR(255) NOT NULL,
  tag_id UUID NOT NULL REFERENCES universal_tags(id),
  
  -- Tagging metadata
  method VARCHAR(20) NOT NULL CHECK (method IN ('AI', 'PATTERN', 'RULE', 'MANUAL', 'INFERRED')),
  confidence FLOAT DEFAULT 0.5,
  applied_by VARCHAR(255),
  
  -- AI analysis results
  ai_provider VARCHAR(50),
  ai_model VARCHAR(100),
  ai_response JSONB,
  ai_reasoning TEXT,
  
  -- User feedback
  is_verified BOOLEAN DEFAULT false,
  verified_by VARCHAR(255),
  verified_at TIMESTAMP,
  feedback TEXT,
  is_correct BOOLEAN,
  
  -- Cross-entity relationships
  source_entity_type VARCHAR(50),
  source_entity_id VARCHAR(255),
  relationship_type VARCHAR(50),
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  -- Constraints
  CONSTRAINT unique_entity_tag UNIQUE(entity_type, entity_id, tag_id),
  CONSTRAINT check_confidence CHECK (confidence >= 0 AND confidence <= 1)
);

-- Indexes
CREATE INDEX idx_entity_tags_entity ON entity_tags(entity_type, entity_id);
CREATE INDEX idx_entity_tags_tag_id ON entity_tags(tag_id);
CREATE INDEX idx_entity_tags_confidence ON entity_tags(confidence);
CREATE INDEX idx_entity_tags_method ON entity_tags(method);
CREATE INDEX idx_entity_tags_verified ON entity_tags(is_verified) WHERE is_verified = true;
CREATE INDEX idx_entity_tags_created_at ON entity_tags(created_at);
```

### tag_patterns

Stores specific patterns used for matching entities to tags.

```sql
CREATE TABLE tag_patterns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tag_id UUID NOT NULL REFERENCES universal_tags(id) ON DELETE CASCADE,
  
  pattern_type VARCHAR(20) NOT NULL CHECK (pattern_type IN ('KEYWORD', 'REGEX', 'SEMANTIC', 'NUMERIC', 'DATE', 'COMPOSITE')),
  pattern JSONB NOT NULL,
  weight FLOAT DEFAULT 1.0,
  min_confidence FLOAT DEFAULT 0.5,
  
  -- Performance tracking
  match_count INTEGER DEFAULT 0,
  success_count INTEGER DEFAULT 0,
  accuracy FLOAT DEFAULT 0.0,
  
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  -- Constraints
  CONSTRAINT check_weight CHECK (weight > 0),
  CONSTRAINT check_min_confidence CHECK (min_confidence >= 0 AND min_confidence <= 1),
  CONSTRAINT check_accuracy CHECK (accuracy >= 0 AND accuracy <= 1)
);

-- Indexes
CREATE INDEX idx_tag_patterns_tag_id ON tag_patterns(tag_id, pattern_type);
CREATE INDEX idx_tag_patterns_is_active ON tag_patterns(is_active) WHERE is_active = true;
```

### entity_relationships

Tracks relationships discovered between entities through tagging.

```sql
CREATE TABLE entity_relationships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Source entity
  source_type VARCHAR(50) NOT NULL,
  source_id VARCHAR(255) NOT NULL,
  
  -- Target entity
  target_type VARCHAR(50) NOT NULL,
  target_id VARCHAR(255) NOT NULL,
  
  -- Relationship details
  relationship_type VARCHAR(50) NOT NULL,
  confidence FLOAT NOT NULL,
  discovered_by VARCHAR(20) NOT NULL CHECK (discovered_by IN ('AI', 'PATTERN', 'USER', 'SYSTEM')),
  metadata JSONB,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  -- Constraints
  CONSTRAINT unique_relationship UNIQUE(source_type, source_id, target_type, target_id, relationship_type),
  CONSTRAINT check_confidence CHECK (confidence >= 0 AND confidence <= 1)
);

-- Indexes
CREATE INDEX idx_entity_relationships_source ON entity_relationships(source_type, source_id);
CREATE INDEX idx_entity_relationships_target ON entity_relationships(target_type, target_id);
CREATE INDEX idx_entity_relationships_type ON entity_relationships(relationship_type);
```

### tagging_audit_log

Maintains a complete audit trail of all tagging operations.

```sql
CREATE TABLE tagging_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Operation details
  operation VARCHAR(50) NOT NULL,
  entity_type VARCHAR(50) NOT NULL,
  entity_id VARCHAR(255) NOT NULL,
  
  -- Change details
  previous_tags JSONB,
  new_tags JSONB,
  changes JSONB,
  
  -- Context
  method VARCHAR(20),
  user_id VARCHAR(255),
  user_email VARCHAR(255),
  ip_address INET,
  user_agent TEXT,
  
  -- Results
  success BOOLEAN NOT NULL,
  error_message TEXT,
  processing_time_ms INTEGER,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX idx_tagging_audit_log_entity ON tagging_audit_log(entity_type, entity_id);
CREATE INDEX idx_tagging_audit_log_operation ON tagging_audit_log(operation);
CREATE INDEX idx_tagging_audit_log_created_at ON tagging_audit_log(created_at);
CREATE INDEX idx_tagging_audit_log_user_id ON tagging_audit_log(user_id);
```

### tag_learning_feedback

Stores user feedback for continuous learning.

```sql
CREATE TABLE tag_learning_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Entity reference
  entity_type VARCHAR(50) NOT NULL,
  entity_id VARCHAR(255) NOT NULL,
  entity_tag_id UUID REFERENCES entity_tags(id),
  
  -- Feedback details
  original_tag_id UUID REFERENCES universal_tags(id),
  suggested_tag_id UUID REFERENCES universal_tags(id),
  is_correct BOOLEAN NOT NULL,
  confidence_impact FLOAT,
  
  -- User info
  user_id VARCHAR(255) NOT NULL,
  user_role VARCHAR(50),
  feedback_text TEXT,
  
  -- Processing
  is_processed BOOLEAN DEFAULT false,
  processed_at TIMESTAMP,
  applied_changes JSONB,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX idx_tag_learning_feedback_entity ON tag_learning_feedback(entity_type, entity_id);
CREATE INDEX idx_tag_learning_feedback_is_processed ON tag_learning_feedback(is_processed) WHERE is_processed = false;
CREATE INDEX idx_tag_learning_feedback_created_at ON tag_learning_feedback(created_at);
```

### tag_metrics

Aggregated metrics for tag performance analysis.

```sql
CREATE TABLE tag_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tag_id UUID NOT NULL REFERENCES universal_tags(id),
  
  -- Time period
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  period_type VARCHAR(20) NOT NULL CHECK (period_type IN ('DAILY', 'WEEKLY', 'MONTHLY', 'QUARTERLY', 'YEARLY')),
  
  -- Usage metrics
  usage_count INTEGER DEFAULT 0,
  unique_entities INTEGER DEFAULT 0,
  
  -- Accuracy metrics
  verified_count INTEGER DEFAULT 0,
  correct_count INTEGER DEFAULT 0,
  accuracy_rate FLOAT,
  
  -- Performance metrics
  avg_confidence FLOAT,
  avg_processing_time_ms FLOAT,
  
  -- Method breakdown
  ai_count INTEGER DEFAULT 0,
  pattern_count INTEGER DEFAULT 0,
  manual_count INTEGER DEFAULT 0,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  -- Constraints
  CONSTRAINT unique_tag_metric_period UNIQUE(tag_id, period_start, period_type),
  CONSTRAINT check_accuracy_rate CHECK (accuracy_rate >= 0 AND accuracy_rate <= 1)
);

-- Indexes
CREATE INDEX idx_tag_metrics_tag_id ON tag_metrics(tag_id);
CREATE INDEX idx_tag_metrics_period ON tag_metrics(period_start, period_type);
```

## Pattern Storage Examples

### Keyword Pattern
```json
{
  "type": "keyword",
  "keywords": ["netflix", "subscription", "streaming"],
  "match_type": "any",
  "case_sensitive": false
}
```

### Merchant Pattern
```json
{
  "type": "merchant",
  "merchants": [
    {
      "name": "Netflix Inc",
      "aliases": ["NETFLIX.COM", "Netflix"],
      "regex": "^NETFLIX.*"
    }
  ]
}
```

### Amount Range Pattern
```json
{
  "type": "amount_range",
  "min": 10.00,
  "max": 20.00,
  "currency": "EUR",
  "include_fees": true
}
```

### Composite Pattern
```json
{
  "type": "composite",
  "operator": "AND",
  "patterns": [
    {
      "type": "keyword",
      "keywords": ["subscription"]
    },
    {
      "type": "amount_range",
      "min": 5.00,
      "max": 50.00
    }
  ]
}
```

## Views and Materialized Views

### tag_hierarchy_view
```sql
CREATE VIEW tag_hierarchy_view AS
WITH RECURSIVE tag_tree AS (
  SELECT 
    id,
    code,
    name,
    parent_id,
    path,
    level,
    ARRAY[id] as hierarchy_ids,
    ARRAY[name] as hierarchy_names
  FROM universal_tags
  WHERE parent_id IS NULL
  
  UNION ALL
  
  SELECT 
    t.id,
    t.code,
    t.name,
    t.parent_id,
    t.path,
    t.level,
    tt.hierarchy_ids || t.id,
    tt.hierarchy_names || t.name
  FROM universal_tags t
  JOIN tag_tree tt ON t.parent_id = tt.id
)
SELECT * FROM tag_tree;
```

### tag_usage_stats
```sql
CREATE MATERIALIZED VIEW tag_usage_stats AS
SELECT 
  t.id,
  t.code,
  t.name,
  t.entity_types,
  COUNT(DISTINCT et.id) as total_uses,
  COUNT(DISTINCT CASE WHEN et.is_verified THEN et.id END) as verified_uses,
  AVG(et.confidence) as avg_confidence,
  COUNT(DISTINCT et.entity_type) as entity_type_count,
  MAX(et.created_at) as last_used
FROM universal_tags t
LEFT JOIN entity_tags et ON t.id = et.tag_id
GROUP BY t.id, t.code, t.name, t.entity_types;

-- Refresh periodically
CREATE INDEX idx_tag_usage_stats_total_uses ON tag_usage_stats(total_uses DESC);
```

## Migration Strategy

### Phase 1: Create New Schema
```sql
-- Create schema for universal tagging
CREATE SCHEMA IF NOT EXISTS tagging;

-- Create all tables in new schema
-- This allows parallel operation with existing system
```

### Phase 2: Migrate Existing Data
```sql
-- Migrate existing ai_tags to universal_tags
INSERT INTO universal_tags (code, name, entity_types, confidence)
SELECT 
  UPPER(REPLACE(tag_name, ' ', '_')),
  tag_name,
  ARRAY['transaction'],
  confidence_threshold
FROM financial.ai_tags;

-- Migrate existing categorizations
INSERT INTO entity_tags (entity_type, entity_id, tag_id, method, confidence)
SELECT 
  'transaction',
  tc.transaction_id,
  ut.id,
  CASE 
    WHEN tc.method = 'ai_auto' THEN 'AI'
    WHEN tc.method = 'manual' THEN 'MANUAL'
    ELSE 'PATTERN'
  END,
  tc.confidence
FROM financial.transaction_categorizations tc
JOIN universal_tags ut ON ut.code = UPPER(REPLACE(c.name, ' ', '_'))
JOIN financial.categories c ON tc.category_id = c.id;
```

### Phase 3: Add Triggers

```sql
-- Update timestamp trigger
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_universal_tags_updated_at
  BEFORE UPDATE ON universal_tags
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_entity_tags_updated_at
  BEFORE UPDATE ON entity_tags
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- Update usage statistics trigger
CREATE OR REPLACE FUNCTION update_tag_usage()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE universal_tags 
    SET usage_count = usage_count + 1,
        last_used = CURRENT_TIMESTAMP
    WHERE id = NEW.tag_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_tag_usage_on_entity_tag
  AFTER INSERT ON entity_tags
  FOR EACH ROW
  EXECUTE FUNCTION update_tag_usage();
```

## Performance Optimization

### Partitioning Strategy

For very large deployments, partition entity_tags by entity_type:

```sql
-- Create partitioned table
CREATE TABLE entity_tags_partitioned (
  LIKE entity_tags INCLUDING ALL
) PARTITION BY LIST (entity_type);

-- Create partitions
CREATE TABLE entity_tags_transactions PARTITION OF entity_tags_partitioned
  FOR VALUES IN ('transaction');

CREATE TABLE entity_tags_documents PARTITION OF entity_tags_partitioned
  FOR VALUES IN ('document');

CREATE TABLE entity_tags_clients PARTITION OF entity_tags_partitioned
  FOR VALUES IN ('client');

CREATE TABLE entity_tags_invoices PARTITION OF entity_tags_partitioned
  FOR VALUES IN ('invoice');
```

### Query Optimization

Common query patterns and their optimizations:

```sql
-- Get all tags for an entity (uses composite index)
SELECT t.*, et.confidence, et.method
FROM entity_tags et
JOIN universal_tags t ON et.tag_id = t.id
WHERE et.entity_type = 'transaction' 
  AND et.entity_id = 'trans_123';

-- Find entities by tag (uses tag_id index)
SELECT et.entity_type, et.entity_id, et.confidence
FROM entity_tags et
WHERE et.tag_id = 'tag_123'
  AND et.is_verified = true
ORDER BY et.confidence DESC
LIMIT 100;

-- Tag hierarchy query (uses path index)
SELECT * FROM universal_tags
WHERE path LIKE '/expenses/food%'
  AND is_active = true;
```

## Backup and Recovery

### Backup Strategy
```bash
# Daily backup of tag definitions
pg_dump -t 'tagging.*' -f tags_backup_$(date +%Y%m%d).sql

# Continuous replication for entity_tags
pg_basebackup -D /backup/tagging -R -X stream
```

### Recovery Procedures
```sql
-- Restore tag definitions
psql -f tags_backup_20250127.sql

-- Verify integrity
SELECT COUNT(*) FROM universal_tags;
SELECT COUNT(*) FROM entity_tags;

-- Rebuild materialized views
REFRESH MATERIALIZED VIEW tag_usage_stats;
```

## Monitoring Queries

### Health Check
```sql
-- Check tagging system health
SELECT 
  (SELECT COUNT(*) FROM universal_tags WHERE is_active = true) as active_tags,
  (SELECT COUNT(*) FROM entity_tags WHERE created_at > NOW() - INTERVAL '1 hour') as recent_taggings,
  (SELECT AVG(confidence) FROM entity_tags WHERE created_at > NOW() - INTERVAL '1 day') as avg_confidence,
  (SELECT COUNT(*) FROM tag_learning_feedback WHERE is_processed = false) as pending_feedback;
```

### Performance Metrics
```sql
-- Tag performance by entity type
SELECT 
  entity_type,
  COUNT(*) as total_tags,
  AVG(confidence) as avg_confidence,
  COUNT(CASE WHEN is_verified THEN 1 END)::float / COUNT(*) as verification_rate
FROM entity_tags
WHERE created_at > NOW() - INTERVAL '7 days'
GROUP BY entity_type;
```

## Security Considerations

1. **Row Level Security**: Implement RLS for multi-tenant scenarios
2. **Audit Logging**: All modifications logged to tagging_audit_log
3. **Data Encryption**: Sensitive patterns encrypted at rest
4. **Access Control**: Granular permissions per tag and entity type
5. **Input Validation**: Strict validation on pattern definitions