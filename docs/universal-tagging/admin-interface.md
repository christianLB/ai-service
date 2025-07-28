# Universal AI Tagging System - Frontend Administration Interface

## Overview

The Universal AI Tagging Admin Interface provides comprehensive visibility and control over the tagging system's operations, allowing administrators to monitor, analyze, and optimize the AI-powered classification engine.

## Admin Dashboard Architecture

### 1. Main Dashboard Layout

```tsx
// Main admin dashboard structure
const TaggingAdminDashboard = () => {
  return (
    <AdminLayout>
      <Header>
        <SystemHealthIndicator />
        <QuickStats />
        <AdminActions />
      </Header>
      
      <Grid container spacing={3}>
        {/* Real-time Metrics */}
        <Grid item xs={12} lg={8}>
          <LiveTaggingActivity />
          <TaggingPerformanceChart />
        </Grid>
        
        {/* System Status */}
        <Grid item xs={12} lg={4}>
          <AIProviderStatus />
          <QueueStatus />
          <ErrorAlerts />
        </Grid>
        
        {/* Analytics */}
        <Grid item xs={12}>
          <TagAnalytics />
        </Grid>
      </Grid>
    </AdminLayout>
  );
};
```

### 2. Navigation Structure

```yaml
Admin Navigation:
  Dashboard:
    - Overview
    - Real-time Activity
    - System Health
    
  Tag Management:
    - Universal Tags
    - Tag Hierarchy
    - Tag Patterns
    - Import/Export
    
  Entity Monitoring:
    - Recent Taggings
    - Entity Browser
    - Cross-Entity Relations
    - Bulk Operations
    
  AI & Learning:
    - AI Performance
    - Learning Queue
    - Feedback Analysis
    - Model Configuration
    
  Analytics:
    - Tag Usage
    - Accuracy Metrics
    - Performance Reports
    - Cost Analysis
    
  Configuration:
    - System Settings
    - AI Providers
    - Pattern Rules
    - Access Control
```

## Core Admin Components

### 1. Real-Time Activity Monitor

```tsx
interface LiveTaggingActivity {
  // Real-time WebSocket connection for live updates
  useWebSocket: '/ws/tagging-activity';
  
  // Activity feed showing:
  - Entity being tagged
  - Applied tags with confidence
  - AI provider used
  - Processing time
  - User who triggered (if manual)
}

const LiveActivityFeed = () => {
  const activities = useWebSocket('/ws/tagging-activity');
  
  return (
    <Card>
      <CardHeader>
        <Title>Live Tagging Activity</Title>
        <Badge>{activities.length} operations/min</Badge>
      </CardHeader>
      <CardContent>
        <VirtualizedList
          items={activities}
          renderItem={(activity) => (
            <ActivityItem
              key={activity.id}
              entity={activity.entity}
              tags={activity.tags}
              method={activity.method}
              timestamp={activity.timestamp}
              confidence={activity.confidence}
            />
          )}
        />
      </CardContent>
    </Card>
  );
};
```

### 2. Tag Hierarchy Visualizer

```tsx
const TagHierarchyVisualizer = () => {
  const { tags, loading } = useTagHierarchy();
  
  return (
    <Card className="h-full">
      <CardHeader>
        <Title>Tag Hierarchy</Title>
        <Actions>
          <Button onClick={exportHierarchy}>Export</Button>
          <Button onClick={addTag}>Add Tag</Button>
        </Actions>
      </CardHeader>
      <CardContent>
        <TreeView
          data={tags}
          onNodeClick={handleNodeClick}
          onNodeEdit={handleNodeEdit}
          onNodeDelete={handleNodeDelete}
          renderNode={(node) => (
            <TagNode
              tag={node}
              usage={node.usageCount}
              confidence={node.avgConfidence}
              status={node.isActive}
            />
          )}
        />
      </CardContent>
    </Card>
  );
};

// Interactive tag node with inline actions
const TagNode = ({ tag, usage, confidence, status }) => (
  <div className="tag-node">
    <div className="tag-info">
      <TagIcon type={tag.entityType} />
      <span className="tag-name">{tag.name}</span>
      <code className="tag-code">{tag.code}</code>
    </div>
    <div className="tag-metrics">
      <Metric label="Usage" value={usage} />
      <Metric label="Confidence" value={`${confidence}%`} />
      <StatusBadge active={status} />
    </div>
    <div className="tag-actions">
      <IconButton icon="edit" onClick={() => editTag(tag)} />
      <IconButton icon="patterns" onClick={() => viewPatterns(tag)} />
      <IconButton icon="analytics" onClick={() => viewAnalytics(tag)} />
    </div>
  </div>
);
```

### 3. AI Performance Dashboard

```tsx
const AIPerformanceDashboard = () => {
  return (
    <Grid container spacing={3}>
      {/* Provider Status */}
      <Grid item xs={12} md={6}>
        <AIProviderStatus />
      </Grid>
      
      {/* Accuracy Metrics */}
      <Grid item xs={12} md={6}>
        <AccuracyMetrics />
      </Grid>
      
      {/* Cost Analysis */}
      <Grid item xs={12} md={4}>
        <AICostAnalysis />
      </Grid>
      
      {/* Response Time */}
      <Grid item xs={12} md={4}>
        <ResponseTimeChart />
      </Grid>
      
      {/* Token Usage */}
      <Grid item xs={12} md={4}>
        <TokenUsageMetrics />
      </Grid>
      
      {/* Model Performance Comparison */}
      <Grid item xs={12}>
        <ModelComparisonChart />
      </Grid>
    </Grid>
  );
};

// AI Provider Status Component
const AIProviderStatus = () => {
  const providers = useAIProviders();
  
  return (
    <Card>
      <CardHeader>
        <Title>AI Provider Status</Title>
      </CardHeader>
      <CardContent>
        {providers.map(provider => (
          <ProviderCard key={provider.id}>
            <ProviderLogo src={provider.logo} />
            <ProviderInfo>
              <h4>{provider.name}</h4>
              <StatusIndicator status={provider.status} />
            </ProviderInfo>
            <ProviderMetrics>
              <Metric label="Requests/hr" value={provider.requestsPerHour} />
              <Metric label="Avg Latency" value={`${provider.avgLatency}ms`} />
              <Metric label="Error Rate" value={`${provider.errorRate}%`} />
              <Metric label="Cost/1K" value={`$${provider.costPer1k}`} />
            </ProviderMetrics>
            <ProviderActions>
              <Switch
                checked={provider.enabled}
                onChange={() => toggleProvider(provider.id)}
              />
              <IconButton
                icon="settings"
                onClick={() => configureProvider(provider.id)}
              />
            </ProviderActions>
          </ProviderCard>
        ))}
      </CardContent>
    </Card>
  );
};
```

### 4. Pattern Management Interface

```tsx
const PatternManagement = () => {
  const [selectedTag, setSelectedTag] = useState(null);
  const { patterns, loading } = useTagPatterns(selectedTag);
  
  return (
    <Container>
      <Grid container spacing={3}>
        {/* Tag Selector */}
        <Grid item xs={12} md={3}>
          <TagSelector
            value={selectedTag}
            onChange={setSelectedTag}
            showStats
          />
        </Grid>
        
        {/* Pattern List */}
        <Grid item xs={12} md={9}>
          <PatternList
            patterns={patterns}
            onEdit={handleEditPattern}
            onDelete={handleDeletePattern}
            onTest={handleTestPattern}
          />
        </Grid>
        
        {/* Pattern Editor */}
        <Grid item xs={12}>
          <PatternEditor
            tagId={selectedTag}
            onSave={handleSavePattern}
          />
        </Grid>
        
        {/* Pattern Testing */}
        <Grid item xs={12}>
          <PatternTester
            patterns={patterns}
            onTest={handleBatchTest}
          />
        </Grid>
      </Grid>
    </Container>
  );
};

// Pattern Editor with live preview
const PatternEditor = ({ tagId, onSave }) => {
  const [pattern, setPattern] = useState({
    type: 'KEYWORD',
    pattern: {},
    testContent: ''
  });
  
  const [preview, setPreview] = useState(null);
  
  // Live preview as user types
  useEffect(() => {
    const timer = setTimeout(() => {
      testPattern(pattern).then(setPreview);
    }, 500);
    return () => clearTimeout(timer);
  }, [pattern]);
  
  return (
    <Card>
      <CardHeader>
        <Title>Pattern Editor</Title>
      </CardHeader>
      <CardContent>
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <PatternTypeSelector
              value={pattern.type}
              onChange={(type) => setPattern({ ...pattern, type })}
            />
            
            {pattern.type === 'KEYWORD' && (
              <KeywordPatternEditor
                value={pattern.pattern}
                onChange={(p) => setPattern({ ...pattern, pattern: p })}
              />
            )}
            
            {pattern.type === 'REGEX' && (
              <RegexPatternEditor
                value={pattern.pattern}
                onChange={(p) => setPattern({ ...pattern, pattern: p })}
              />
            )}
            
            {pattern.type === 'SEMANTIC' && (
              <SemanticPatternEditor
                value={pattern.pattern}
                onChange={(p) => setPattern({ ...pattern, pattern: p })}
              />
            )}
            
            <TextField
              label="Test Content"
              multiline
              rows={4}
              value={pattern.testContent}
              onChange={(e) => setPattern({ ...pattern, testContent: e.target.value })}
              fullWidth
              margin="normal"
            />
          </Grid>
          
          <Grid item xs={12} md={6}>
            <PreviewCard>
              <h4>Live Preview</h4>
              {preview && (
                <>
                  <MatchResult match={preview.matches} />
                  <ConfidenceScore score={preview.confidence} />
                  <MatchDetails details={preview.details} />
                </>
              )}
            </PreviewCard>
          </Grid>
        </Grid>
        
        <Actions>
          <Button onClick={() => onSave(pattern)} variant="contained">
            Save Pattern
          </Button>
        </Actions>
      </CardContent>
    </Card>
  );
};
```

### 5. Entity Browser with Tagging History

```tsx
const EntityBrowser = () => {
  const [filters, setFilters] = useState({
    entityType: 'all',
    dateRange: 'last7days',
    tagFilter: [],
    confidenceRange: [0, 100]
  });
  
  const { entities, loading } = useEntities(filters);
  
  return (
    <Container>
      {/* Filters */}
      <FilterBar>
        <EntityTypeFilter
          value={filters.entityType}
          onChange={(type) => setFilters({ ...filters, entityType: type })}
        />
        <DateRangeFilter
          value={filters.dateRange}
          onChange={(range) => setFilters({ ...filters, dateRange: range })}
        />
        <TagMultiSelect
          value={filters.tagFilter}
          onChange={(tags) => setFilters({ ...filters, tagFilter: tags })}
        />
        <ConfidenceSlider
          value={filters.confidenceRange}
          onChange={(range) => setFilters({ ...filters, confidenceRange: range })}
        />
      </FilterBar>
      
      {/* Entity Grid */}
      <DataGrid
        rows={entities}
        columns={[
          { field: 'type', headerName: 'Type', width: 100 },
          { field: 'id', headerName: 'ID', width: 150 },
          { field: 'preview', headerName: 'Content Preview', flex: 1 },
          {
            field: 'tags',
            headerName: 'Tags',
            width: 300,
            renderCell: (params) => (
              <TagChips tags={params.value} onClick={handleTagClick} />
            )
          },
          {
            field: 'confidence',
            headerName: 'Confidence',
            width: 120,
            renderCell: (params) => (
              <ConfidenceBadge value={params.value} />
            )
          },
          {
            field: 'method',
            headerName: 'Method',
            width: 100
          },
          {
            field: 'actions',
            headerName: 'Actions',
            width: 150,
            renderCell: (params) => (
              <EntityActions
                entity={params.row}
                onView={handleView}
                onRetag={handleRetag}
                onHistory={handleHistory}
              />
            )
          }
        ]}
        onRowClick={handleRowClick}
      />
    </Container>
  );
};

// Entity Detail Modal
const EntityDetailModal = ({ entity, open, onClose }) => {
  const { history, loading } = useTaggingHistory(entity.type, entity.id);
  
  return (
    <Modal open={open} onClose={onClose} maxWidth="lg">
      <ModalContent>
        <Grid container spacing={3}>
          {/* Entity Information */}
          <Grid item xs={12} md={6}>
            <EntityInfo entity={entity} />
          </Grid>
          
          {/* Current Tags */}
          <Grid item xs={12} md={6}>
            <CurrentTags
              tags={entity.tags}
              onRemove={handleRemoveTag}
              onVerify={handleVerifyTag}
            />
          </Grid>
          
          {/* Tagging History */}
          <Grid item xs={12}>
            <TaggingHistoryTimeline history={history} />
          </Grid>
          
          {/* Related Entities */}
          <Grid item xs={12}>
            <RelatedEntities
              entityType={entity.type}
              entityId={entity.id}
            />
          </Grid>
          
          {/* Actions */}
          <Grid item xs={12}>
            <Actions>
              <Button onClick={() => retagEntity(entity)}>
                Retag Entity
              </Button>
              <Button onClick={() => exportEntity(entity)}>
                Export Data
              </Button>
            </Actions>
          </Grid>
        </Grid>
      </ModalContent>
    </Modal>
  );
};
```

### 6. Learning & Feedback Analysis

```tsx
const LearningDashboard = () => {
  return (
    <Container>
      <Grid container spacing={3}>
        {/* Feedback Overview */}
        <Grid item xs={12} md={6}>
          <FeedbackOverview />
        </Grid>
        
        {/* Learning Progress */}
        <Grid item xs={12} md={6}>
          <LearningProgress />
        </Grid>
        
        {/* Pattern Evolution */}
        <Grid item xs={12}>
          <PatternEvolutionChart />
        </Grid>
        
        {/* Feedback Queue */}
        <Grid item xs={12}>
          <FeedbackQueue />
        </Grid>
      </Grid>
    </Container>
  );
};

// Feedback Queue Management
const FeedbackQueue = () => {
  const { feedbacks, loading } = useFeedbackQueue();
  
  return (
    <Card>
      <CardHeader>
        <Title>Feedback Queue</Title>
        <Badge>{feedbacks.length} pending</Badge>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Entity</TableCell>
              <TableCell>Original Tag</TableCell>
              <TableCell>Suggested Tag</TableCell>
              <TableCell>Confidence Impact</TableCell>
              <TableCell>User</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {feedbacks.map(feedback => (
              <TableRow key={feedback.id}>
                <TableCell>
                  <EntityLink
                    type={feedback.entityType}
                    id={feedback.entityId}
                  />
                </TableCell>
                <TableCell>
                  <TagBadge tag={feedback.originalTag} />
                </TableCell>
                <TableCell>
                  <TagBadge tag={feedback.suggestedTag} />
                </TableCell>
                <TableCell>
                  <ImpactIndicator value={feedback.confidenceImpact} />
                </TableCell>
                <TableCell>{feedback.userName}</TableCell>
                <TableCell>
                  <IconButton
                    icon="check"
                    onClick={() => approveFeedback(feedback.id)}
                  />
                  <IconButton
                    icon="close"
                    onClick={() => rejectFeedback(feedback.id)}
                  />
                  <IconButton
                    icon="info"
                    onClick={() => viewDetails(feedback.id)}
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};
```

### 7. Analytics & Reporting

```tsx
const AnalyticsDashboard = () => {
  const [dateRange, setDateRange] = useState('last30days');
  const [groupBy, setGroupBy] = useState('day');
  
  return (
    <Container>
      {/* Controls */}
      <ControlBar>
        <DateRangePicker
          value={dateRange}
          onChange={setDateRange}
        />
        <GroupBySelector
          value={groupBy}
          onChange={setGroupBy}
          options={['hour', 'day', 'week', 'month']}
        />
        <ExportButton onClick={exportReport} />
      </ControlBar>
      
      {/* Key Metrics */}
      <Grid container spacing={3}>
        <Grid item xs={12} md={3}>
          <MetricCard
            title="Total Entities Tagged"
            value="1,234,567"
            change="+12.5%"
            sparkline={totalTaggedData}
          />
        </Grid>
        <Grid item xs={12} md={3}>
          <MetricCard
            title="Average Confidence"
            value="87.3%"
            change="+2.1%"
            sparkline={confidenceData}
          />
        </Grid>
        <Grid item xs={12} md={3}>
          <MetricCard
            title="User Verification Rate"
            value="94.2%"
            change="+0.8%"
            sparkline={verificationData}
          />
        </Grid>
        <Grid item xs={12} md={3}>
          <MetricCard
            title="AI Cost"
            value="$1,234"
            change="-5.3%"
            sparkline={costData}
          />
        </Grid>
      </Grid>
      
      {/* Detailed Charts */}
      <Grid container spacing={3}>
        <Grid item xs={12} md={8}>
          <TaggingVolumeChart
            dateRange={dateRange}
            groupBy={groupBy}
          />
        </Grid>
        <Grid item xs={12} md={4}>
          <TopTagsChart
            dateRange={dateRange}
            limit={10}
          />
        </Grid>
        <Grid item xs={12} md={6}>
          <EntityTypeDistribution
            dateRange={dateRange}
          />
        </Grid>
        <Grid item xs={12} md={6}>
          <MethodDistribution
            dateRange={dateRange}
          />
        </Grid>
        <Grid item xs={12}>
          <AccuracyTrendChart
            dateRange={dateRange}
            groupBy={groupBy}
          />
        </Grid>
      </Grid>
    </Container>
  );
};

// Custom Report Builder
const ReportBuilder = () => {
  const [report, setReport] = useState({
    name: '',
    metrics: [],
    filters: {},
    schedule: null
  });
  
  return (
    <Card>
      <CardHeader>
        <Title>Custom Report Builder</Title>
      </CardHeader>
      <CardContent>
        <ReportNameInput
          value={report.name}
          onChange={(name) => setReport({ ...report, name })}
        />
        
        <MetricSelector
          selected={report.metrics}
          onChange={(metrics) => setReport({ ...report, metrics })}
          available={availableMetrics}
        />
        
        <FilterBuilder
          filters={report.filters}
          onChange={(filters) => setReport({ ...report, filters })}
        />
        
        <ScheduleSelector
          value={report.schedule}
          onChange={(schedule) => setReport({ ...report, schedule })}
        />
        
        <PreviewButton onClick={() => previewReport(report)} />
        <SaveButton onClick={() => saveReport(report)} />
      </CardContent>
    </Card>
  );
};
```

### 8. System Configuration

```tsx
const SystemConfiguration = () => {
  const [activeTab, setActiveTab] = useState('general');
  
  return (
    <Container>
      <Tabs value={activeTab} onChange={setActiveTab}>
        <Tab value="general" label="General Settings" />
        <Tab value="ai" label="AI Configuration" />
        <Tab value="patterns" label="Pattern Rules" />
        <Tab value="thresholds" label="Thresholds" />
        <Tab value="access" label="Access Control" />
        <Tab value="integrations" label="Integrations" />
      </Tabs>
      
      <TabPanel value={activeTab} index="general">
        <GeneralSettings />
      </TabPanel>
      
      <TabPanel value={activeTab} index="ai">
        <AIConfiguration />
      </TabPanel>
      
      <TabPanel value={activeTab} index="patterns">
        <PatternRules />
      </TabPanel>
      
      <TabPanel value={activeTab} index="thresholds">
        <ThresholdSettings />
      </TabPanel>
      
      <TabPanel value={activeTab} index="access">
        <AccessControl />
      </TabPanel>
      
      <TabPanel value={activeTab} index="integrations">
        <IntegrationSettings />
      </TabPanel>
    </Container>
  );
};

// AI Provider Configuration
const AIConfiguration = () => {
  const { providers, loading } = useAIProviders();
  
  return (
    <Grid container spacing={3}>
      {providers.map(provider => (
        <Grid item xs={12} key={provider.id}>
          <ProviderConfigCard>
            <ProviderHeader>
              <h3>{provider.name}</h3>
              <Switch
                checked={provider.enabled}
                onChange={(e) => toggleProvider(provider.id, e.target.checked)}
              />
            </ProviderHeader>
            
            <ConfigSection>
              <TextField
                label="API Key"
                type="password"
                value={provider.apiKey}
                onChange={(e) => updateProviderConfig(provider.id, { apiKey: e.target.value })}
              />
              
              <Select
                label="Model"
                value={provider.model}
                onChange={(e) => updateProviderConfig(provider.id, { model: e.target.value })}
              >
                {provider.availableModels.map(model => (
                  <MenuItem key={model} value={model}>{model}</MenuItem>
                ))}
              </Select>
              
              <NumberInput
                label="Max Tokens"
                value={provider.maxTokens}
                onChange={(value) => updateProviderConfig(provider.id, { maxTokens: value })}
              />
              
              <Slider
                label="Temperature"
                value={provider.temperature}
                min={0}
                max={1}
                step={0.1}
                onChange={(value) => updateProviderConfig(provider.id, { temperature: value })}
              />
            </ConfigSection>
            
            <TestSection>
              <Button onClick={() => testProvider(provider.id)}>
                Test Connection
              </Button>
            </TestSection>
          </ProviderConfigCard>
        </Grid>
      ))}
    </Grid>
  );
};
```

## Real-Time Monitoring Features

### 1. WebSocket Integration

```typescript
// Real-time updates service
class RealtimeTaggingService {
  private socket: Socket;
  
  connect() {
    this.socket = io('/tagging-admin', {
      auth: { token: getAuthToken() }
    });
    
    this.socket.on('tagging:new', this.handleNewTagging);
    this.socket.on('tagging:updated', this.handleUpdatedTagging);
    this.socket.on('system:alert', this.handleSystemAlert);
    this.socket.on('metrics:update', this.handleMetricsUpdate);
  }
  
  subscribeToEntity(entityType: string, entityId: string) {
    this.socket.emit('subscribe:entity', { entityType, entityId });
  }
  
  subscribeToTag(tagId: string) {
    this.socket.emit('subscribe:tag', { tagId });
  }
}

// React hook for real-time updates
const useRealtimeTagging = (filters?: TaggingFilters) => {
  const [activities, setActivities] = useState<TaggingActivity[]>([]);
  
  useEffect(() => {
    const service = new RealtimeTaggingService();
    service.connect();
    
    service.on('tagging:new', (activity) => {
      if (matchesFilters(activity, filters)) {
        setActivities(prev => [activity, ...prev].slice(0, 100));
      }
    });
    
    return () => service.disconnect();
  }, [filters]);
  
  return activities;
};
```

### 2. Alert System

```tsx
const AlertConfiguration = () => {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  
  return (
    <Container>
      <AlertList>
        <AlertRule
          name="Low Confidence Tags"
          condition="confidence < 0.5"
          severity="warning"
          channels={['email', 'slack']}
        />
        
        <AlertRule
          name="AI Provider Failure"
          condition="error_rate > 0.05"
          severity="critical"
          channels={['email', 'pagerduty']}
        />
        
        <AlertRule
          name="High Cost Alert"
          condition="hourly_cost > 100"
          severity="warning"
          channels={['email']}
        />
        
        <AlertRule
          name="Pattern Match Failure"
          condition="pattern_accuracy < 0.7"
          severity="info"
          channels={['slack']}
        />
      </AlertList>
      
      <AddAlertButton onClick={showAddAlertModal} />
    </Container>
  );
};
```

## Mobile Admin App

### 1. Responsive Design

```tsx
// Mobile-optimized admin components
const MobileAdminDashboard = () => {
  return (
    <MobileLayout>
      {/* Simplified metrics */}
      <SwipeableViews>
        <MetricsCard title="Today's Tags" value="12,345" />
        <MetricsCard title="Accuracy" value="89.2%" />
        <MetricsCard title="Active Alerts" value="3" />
      </SwipeableViews>
      
      {/* Quick actions */}
      <QuickActions>
        <ActionButton icon="tag" label="View Tags" />
        <ActionButton icon="alert" label="Alerts" />
        <ActionButton icon="chart" label="Analytics" />
      </QuickActions>
      
      {/* Recent activity */}
      <RecentActivityList simplified />
    </MobileLayout>
  );
};
```

### 2. Push Notifications

```typescript
// Push notification service
class AdminNotificationService {
  async setupPushNotifications() {
    const registration = await navigator.serviceWorker.register('/sw.js');
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(PUBLIC_VAPID_KEY)
    });
    
    await api.post('/admin/notifications/subscribe', subscription);
  }
  
  async sendNotification(alert: Alert) {
    await self.registration.showNotification('Tagging System Alert', {
      body: alert.message,
      icon: '/icon-192x192.png',
      badge: '/badge-72x72.png',
      data: { url: `/admin/alerts/${alert.id}` }
    });
  }
}
```

## Security & Access Control

### 1. Role-Based Access

```typescript
// Admin roles and permissions
enum AdminRole {
  SUPER_ADMIN = 'super_admin',
  TAG_MANAGER = 'tag_manager',
  ANALYST = 'analyst',
  VIEWER = 'viewer'
}

const rolePermissions = {
  [AdminRole.SUPER_ADMIN]: ['*'],
  [AdminRole.TAG_MANAGER]: [
    'tags:read',
    'tags:write',
    'patterns:read',
    'patterns:write',
    'entities:read',
    'entities:retag'
  ],
  [AdminRole.ANALYST]: [
    'tags:read',
    'entities:read',
    'analytics:read',
    'reports:create'
  ],
  [AdminRole.VIEWER]: [
    'tags:read',
    'entities:read',
    'analytics:read'
  ]
};

// Permission-based component rendering
const ProtectedComponent = ({ permission, children }) => {
  const { hasPermission } = useAuth();
  
  if (!hasPermission(permission)) {
    return <AccessDenied />;
  }
  
  return children;
};
```

### 2. Audit Logging

```tsx
const AuditLog = () => {
  const { logs, loading } = useAuditLogs();
  
  return (
    <DataTable
      columns={[
        { field: 'timestamp', headerName: 'Time', width: 180 },
        { field: 'user', headerName: 'User', width: 150 },
        { field: 'action', headerName: 'Action', width: 200 },
        { field: 'resource', headerName: 'Resource', width: 250 },
        { field: 'details', headerName: 'Details', flex: 1 },
        { field: 'ip', headerName: 'IP Address', width: 150 }
      ]}
      rows={logs}
      filters={
        <AuditFilters>
          <UserFilter />
          <ActionFilter />
          <DateRangeFilter />
        </AuditFilters>
      }
    />
  );
};
```

## Performance Optimization

### 1. Data Virtualization

```tsx
// Virtual scrolling for large datasets
const VirtualizedTagList = ({ tags }) => {
  const rowRenderer = ({ index, key, style }) => (
    <div key={key} style={style}>
      <TagRow tag={tags[index]} />
    </div>
  );
  
  return (
    <AutoSizer>
      {({ height, width }) => (
        <List
          height={height}
          width={width}
          rowCount={tags.length}
          rowHeight={60}
          rowRenderer={rowRenderer}
        />
      )}
    </AutoSizer>
  );
};
```

### 2. Lazy Loading

```tsx
// Lazy load heavy components
const LazyAnalytics = lazy(() => import('./AnalyticsDashboard'));
const LazyPatternEditor = lazy(() => import('./PatternEditor'));

// Route-based code splitting
const AdminRoutes = () => (
  <Suspense fallback={<LoadingSpinner />}>
    <Routes>
      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="/analytics" element={<LazyAnalytics />} />
      <Route path="/patterns" element={<LazyPatternEditor />} />
    </Routes>
  </Suspense>
);
```

## Export & Integration

### 1. Data Export

```tsx
const ExportManager = () => {
  const [exportConfig, setExportConfig] = useState({
    format: 'csv',
    entities: [],
    dateRange: 'all',
    includeMetadata: true
  });
  
  const handleExport = async () => {
    const data = await api.post('/admin/export', exportConfig);
    downloadFile(data, `tagging-export-${Date.now()}.${exportConfig.format}`);
  };
  
  return (
    <Card>
      <CardHeader>
        <Title>Export Data</Title>
      </CardHeader>
      <CardContent>
        <FormatSelector
          value={exportConfig.format}
          onChange={(format) => setExportConfig({ ...exportConfig, format })}
          options={['csv', 'json', 'xlsx', 'parquet']}
        />
        
        <EntitySelector
          value={exportConfig.entities}
          onChange={(entities) => setExportConfig({ ...exportConfig, entities })}
        />
        
        <DateRangeSelector
          value={exportConfig.dateRange}
          onChange={(dateRange) => setExportConfig({ ...exportConfig, dateRange })}
        />
        
        <Checkbox
          label="Include Metadata"
          checked={exportConfig.includeMetadata}
          onChange={(checked) => setExportConfig({ ...exportConfig, includeMetadata: checked })}
        />
        
        <Button onClick={handleExport} variant="contained">
          Export Data
        </Button>
      </CardContent>
    </Card>
  );
};
```

### 2. API Integration

```tsx
const APIIntegration = () => {
  const [apiKeys, setApiKeys] = useState<APIKey[]>([]);
  
  return (
    <Container>
      <APIKeyManager
        keys={apiKeys}
        onGenerate={generateNewKey}
        onRevoke={revokeKey}
      />
      
      <WebhookConfiguration
        endpoints={webhookEndpoints}
        onAdd={addWebhook}
        onTest={testWebhook}
      />
      
      <APIDocumentation />
    </Container>
  );
};
```

## Conclusion

The Universal AI Tagging Admin Interface provides comprehensive visibility and control over the entire tagging system. With real-time monitoring, detailed analytics, and powerful management tools, administrators can ensure optimal performance, accuracy, and reliability of the AI-powered classification engine. The responsive design ensures accessibility across devices, while role-based access control maintains security and compliance.