import { Server as HTTPServer } from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { logger } from '../../utils/log';

interface AuthenticatedSocket extends Socket {
  userId?: string;
  email?: string;
}

export class WebSocketService {
  private io: SocketIOServer;
  private connectedClients: Map<string, AuthenticatedSocket> = new Map();

  constructor(httpServer: HTTPServer) {
    this.io = new SocketIOServer(httpServer, {
      cors: {
        origin: process.env.FRONTEND_URL || 'http://localhost:3000',
        credentials: true,
      },
      transports: ['websocket', 'polling'],
    });

    this.setupMiddleware();
    this.setupEventHandlers();
  }

  private setupMiddleware(): void {
    // Authentication middleware
    this.io.use(async (socket: AuthenticatedSocket, next) => {
      try {
        const token = socket.handshake.auth.token;
        if (!token) {
          return next(new Error('Authentication required'));
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret') as any;
        socket.userId = decoded.id;
        socket.email = decoded.email;

        logger.info('WebSocket client authenticated', { userId: socket.userId });
        next();
      } catch (error) {
        logger.error('WebSocket authentication failed', error);
        next(new Error('Authentication failed'));
      }
    });
  }

  private setupEventHandlers(): void {
    this.io.on('connection', (socket: AuthenticatedSocket) => {
      logger.info('WebSocket client connected', {
        socketId: socket.id,
        userId: socket.userId
      });

      // Store client connection
      if (socket.userId) {
        this.connectedClients.set(socket.userId, socket);
      }

      // Join user-specific room
      socket.join(`user:${socket.userId}`);

      // Handle ping/pong for connection health
      socket.on('ping', () => {
        socket.emit('pong');
      });

      // Handle disconnection
      socket.on('disconnect', () => {
        logger.info('WebSocket client disconnected', {
          socketId: socket.id,
          userId: socket.userId
        });

        if (socket.userId) {
          this.connectedClients.delete(socket.userId);
        }
      });
    });
  }

  // Send notification to specific user
  public sendToUser(userId: string, event: string, data: any): void {
    this.io.to(`user:${userId}`).emit(event, data);
  }

  // Send notification to all connected users
  public broadcast(event: string, data: any): void {
    this.io.emit(event, data);
  }

  // Send notification to multiple users
  public sendToUsers(userIds: string[], event: string, data: any): void {
    userIds.forEach(userId => {
      this.sendToUser(userId, event, data);
    });
  }

  // Check if user is connected
  public isUserConnected(userId: string): boolean {
    return this.connectedClients.has(userId);
  }

  // Get all connected users
  public getConnectedUsers(): string[] {
    return Array.from(this.connectedClients.keys());
  }

  // Financial event notifications
  public notifySyncStarted(userId: string, accountId?: string): void {
    this.sendToUser(userId, 'financial:sync:started', {
      type: 'sync_started',
      accountId,
      timestamp: new Date().toISOString(),
    });
  }

  public notifySyncCompleted(userId: string, result: {
    accountId?: string;
    newTransactions: number;
    updatedBalances: boolean;
    errors?: string[];
  }): void {
    this.sendToUser(userId, 'financial:sync:completed', {
      type: 'sync_completed',
      ...result,
      timestamp: new Date().toISOString(),
    });
  }

  public notifyTransactionReceived(userId: string, transaction: {
    id: string;
    amount: number;
    currency: string;
    description: string;
    counterpartyName?: string;
    date: string;
  }): void {
    this.sendToUser(userId, 'financial:transaction:new', {
      type: 'new_transaction',
      transaction,
      timestamp: new Date().toISOString(),
    });
  }

  public notifyBalanceAlert(userId: string, alert: {
    accountId: string;
    accountName: string;
    currentBalance: number;
    threshold: number;
    type: 'low_balance' | 'negative_balance';
  }): void {
    this.sendToUser(userId, 'financial:balance:alert', {
      type: 'balance_alert',
      alert,
      timestamp: new Date().toISOString(),
    });
  }

  public notifyError(userId: string, error: {
    type: string;
    message: string;
    details?: any;
  }): void {
    this.sendToUser(userId, 'system:error', {
      type: 'error',
      error,
      timestamp: new Date().toISOString(),
    });
  }

  // Get server instance for external use
  public getServer(): SocketIOServer {
    return this.io;
  }
}