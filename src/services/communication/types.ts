export interface TelegramConfig {
  botToken: string;
  chatId: string;
  webhookUrl?: string;
  alertsEnabled: boolean;
}

export interface FinancialAlert {
  type: 'transaction' | 'sync_error' | 'unusual_spending' | 'system_error';
  priority: 'critical' | 'high' | 'medium' | 'low';
  message: string;
  data?: any;
  timestamp: Date;
}

export interface TelegramCommand {
  name: string;
  params: string[];
  chatId: string;
  messageId: number;
}

export interface SystemStatus {
  aiService: 'online' | 'offline' | 'degraded';
  financialService: 'online' | 'offline' | 'degraded';
  database: 'connected' | 'disconnected' | 'slow';
  memory: number;
  uptime: number;
}

export interface FinancialSummary {
  totalBalance: number;
  recentTransactions: number;
  lastSync: Date;
  categorizedTransactions: number;
  pendingCategorizations: number;
}

export type ReportType = 'daily' | 'weekly' | 'monthly' | 'custom';
export type AlertPriority = 'critical' | 'high' | 'medium' | 'low';