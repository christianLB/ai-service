import { io, Socket } from 'socket.io-client';
import { notification } from 'antd';

export interface WebSocketNotification {
  type: string;
  timestamp: string;
  [key: string]: unknown;
}

export interface FinancialSyncNotification extends WebSocketNotification {
  type: 'sync_started' | 'sync_completed';
  accountId?: string;
  newTransactions?: number;
  updatedBalances?: boolean;
  errors?: string[];
}

export interface TransactionNotification extends WebSocketNotification {
  type: 'new_transaction';
  transaction: {
    id: string;
    amount: number;
    currency: string;
    description: string;
    counterpartyName?: string;
    date: string;
  };
}

export interface BalanceAlertNotification extends WebSocketNotification {
  type: 'balance_alert';
  alert: {
    accountId: string;
    accountName: string;
    currentBalance: number;
    threshold: number;
    type: 'low_balance' | 'negative_balance';
  };
}

type NotificationHandler = (notification: WebSocketNotification) => void;

class WebSocketService {
  private socket: Socket | null = null;
  private handlers: Map<string, Set<NotificationHandler>> = new Map();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;

  connect(token: string): void {
    if (this.socket?.connected) {
      console.log('WebSocket already connected');
      return;
    }

    const serverUrl = (window as Window & { REACT_APP_API_URL?: string }).REACT_APP_API_URL || window.location.origin;
    
    this.socket = io(serverUrl, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: this.maxReconnectAttempts,
      reconnectionDelay: this.reconnectDelay,
      reconnectionDelayMax: 10000,
    });

    this.setupEventHandlers();
  }

  private setupEventHandlers(): void {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      console.log('WebSocket connected');
      this.reconnectAttempts = 0;
      notification.success({
        message: 'Conexión establecida',
        description: 'Notificaciones en tiempo real activadas',
        duration: 3,
      });
    });

    this.socket.on('disconnect', (reason) => {
      console.log('WebSocket disconnected:', reason);
      if (reason === 'io server disconnect') {
        // Server disconnected, attempt to reconnect
        this.socket?.connect();
      }
    });

    this.socket.on('connect_error', (error) => {
      console.error('WebSocket connection error:', error);
      this.reconnectAttempts++;
      
      if (this.reconnectAttempts >= this.maxReconnectAttempts) {
        notification.error({
          message: 'Error de conexión',
          description: 'No se pueden recibir notificaciones en tiempo real',
          duration: 0,
        });
      }
    });

    // Financial events
    this.socket.on('financial:sync:started', (data: FinancialSyncNotification) => {
      this.emit('financial:sync:started', data);
      notification.info({
        message: 'Sincronización iniciada',
        description: 'Actualizando datos bancarios...',
        duration: 3,
      });
    });

    this.socket.on('financial:sync:completed', (data: FinancialSyncNotification) => {
      this.emit('financial:sync:completed', data);
      
      if (data.errors && data.errors.length > 0) {
        notification.warning({
          message: 'Sincronización completada con errores',
          description: `Se encontraron ${data.errors.length} errores durante la sincronización`,
          duration: 5,
        });
      } else if (data.newTransactions && data.newTransactions > 0) {
        notification.success({
          message: 'Sincronización completada',
          description: `Se encontraron ${data.newTransactions} nuevas transacciones`,
          duration: 5,
        });
      } else {
        notification.success({
          message: 'Sincronización completada',
          description: 'Los datos están actualizados',
          duration: 3,
        });
      }
    });

    this.socket.on('financial:transaction:new', (data: TransactionNotification) => {
      this.emit('financial:transaction:new', data);
      
      const { transaction } = data;
      const isIncome = transaction.amount > 0;
      
      notification.info({
        message: isIncome ? 'Nuevo ingreso' : 'Nuevo gasto',
        description: `${transaction.description} - ${this.formatCurrency(transaction.amount, transaction.currency)}`,
        duration: 5,
      });
    });

    this.socket.on('financial:balance:alert', (data: BalanceAlertNotification) => {
      this.emit('financial:balance:alert', data);
      
      const { alert } = data;
      notification.warning({
        message: alert.type === 'low_balance' ? 'Saldo bajo' : 'Saldo negativo',
        description: `La cuenta ${alert.accountName} tiene un saldo de ${this.formatCurrency(alert.currentBalance, 'EUR')}`,
        duration: 0,
      });
    });

    this.socket.on('system:error', (data: WebSocketNotification) => {
      this.emit('system:error', data);
      
      notification.error({
        message: 'Error del sistema',
        description: data.error?.message || 'Ha ocurrido un error inesperado',
        duration: 0,
      });
    });

    // Ping/pong for connection health
    this.socket.on('pong', () => {
      console.log('WebSocket pong received');
    });

    // Send ping every 30 seconds
    setInterval(() => {
      if (this.socket?.connected) {
        this.socket.emit('ping');
      }
    }, 30000);
  }

  private formatCurrency(amount: number, currency: string): string {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: currency || 'EUR',
    }).format(amount);
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.handlers.clear();
    }
  }

  on(event: string, handler: NotificationHandler): void {
    if (!this.handlers.has(event)) {
      this.handlers.set(event, new Set());
    }
    this.handlers.get(event)?.add(handler);
  }

  off(event: string, handler: NotificationHandler): void {
    this.handlers.get(event)?.delete(handler);
  }

  private emit(event: string, data: WebSocketNotification): void {
    const handlers = this.handlers.get(event);
    if (handlers) {
      handlers.forEach(handler => handler(data));
    }
  }

  isConnected(): boolean {
    return this.socket?.connected || false;
  }

  getSocket(): Socket | null {
    return this.socket;
  }
}

// Singleton instance
const websocketService = new WebSocketService();

export default websocketService;