export type Capability = 'chat' | 'json' | 'vision' | 'embed' | 'toolcall';

export type MessageRole = 'system' | 'user' | 'assistant';

export interface Message {
  role: MessageRole;
  content: string | any;
}

export interface ChatRequest {
  messages: Message[];
  json?: boolean;
  tools?: any[];
  temperature?: number;
  maxTokens?: number;
}

export interface ChatResponse {
  output: string;
  tokens: {
    input: number;
    output: number;
    total: number;
  };
  raw?: any;
  toolCalls?: any[];
  metadata?: {
    model?: string;
    provider?: string;
  };
}

export interface EmbedRequest {
  input: string | string[];
  model?: string;
}

export interface EmbedResponse {
  vectors: number[][];
  dimensions: number;
  model: string;
}

export interface ModelInfo {
  id: string;
  capabilities: Capability[];
  contextWindow: number;
  costPer1kInput?: number;
  costPer1kOutput?: number;
}

export interface Provider {
  name: string;
  capabilities: Capability[];
  models(): Promise<ModelInfo[]>;
  chat(req: ChatRequest, modelId: string): Promise<ChatResponse>;
  embed(req: EmbedRequest, modelId: string): Promise<EmbedResponse>;
}

export interface RoutingDecision {
  provider: string;
  model: string;
  reason?: string;
}

export interface TaskConfig {
  provider?: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  json?: boolean;
  retryOnLowConfidence?: boolean;
}

export interface SummarizeRequest {
  input: string | { text?: string; docId?: string };
  size?: 'short' | 'medium' | 'long';
  style?: 'technical' | 'executive' | 'casual';
}

export interface SummarizeResponse {
  summary: string;
  tokens: number;
  provider: string;
  model: string;
}

export interface ClassifyRequest {
  input: string | { text?: string; docId?: string };
  labels?: string[];
  taxonomyId?: string;
  autoTag?: boolean;
  threshold?: number;
}

export interface ClassifyResponse {
  labels: string[];
  confidence: number;
  tagIds?: string[];
  provider: string;
  model: string;
}

export interface ExtractRequest {
  input: string | { text?: string; docId?: string };
  schema: any;
  examples?: any[];
}

export interface ExtractResponse {
  data: any;
  confidence: number;
  provider: string;
  model: string;
}

export interface AgentRequest {
  name: string;
  input: any;
  params?: Record<string, any>;
  tools?: string[];
}

export interface AgentResponse {
  result: any;
  logs: string[];
  toolCalls: any[];
  provider: string;
  model: string;
}

export interface PolicyConfig {
  providers: ProviderConfig[];
  routing: RoutingConfig;
  budgets: BudgetConfig;
  thresholds: ThresholdConfig;
}

export interface ProviderConfig {
  type: string;
  name: string;
  apiKey?: string;
  baseUrl?: string;
  models: string[];
}

export interface RoutingConfig {
  default: RoutingTarget;
  tasks: Record<string, RoutingTarget>;
}

export interface RoutingTarget {
  target: string;
  json?: boolean;
  retryOnLowConfidence?: boolean;
  fallback?: string;
}

export interface BudgetConfig {
  [service: string]: {
    monthlyEur: number;
    hardStop?: boolean;
  };
}

export interface ThresholdConfig {
  extractConfidence: number;
  classifyConfidence: number;
  summarizeMinLength?: number;
  summarizeMaxLength?: number;
}

export interface CacheConfig {
  ttl: number;
  maxSize: number;
  enabled: boolean;
}

export interface ServiceContext {
  service: string;
  requestId: string;
  userId?: string;
}