/**
 * Trading Finite State Machine (FSM)
 * Implements the required states: Idle → Live → Stopped
 * With additional states for comprehensive trading operations
 */

import { EventEmitter } from 'events';
import { Queue, Job } from 'bull';
import Redis from 'ioredis';

// FSM States as per F4 requirements
export enum TradingState {
  IDLE = 'idle',
  ANALYZING = 'analyzing',
  PREPARING = 'preparing',
  LIVE = 'live',
  MONITORING = 'monitoring',
  STOPPED = 'stopped',
  ERROR = 'error'
}

// FSM Events for state transitions
export enum TradingEvent {
  DEPLOY = 'DEPLOY',
  START_ANALYSIS = 'START_ANALYSIS',
  ANALYSIS_COMPLETE = 'ANALYSIS_COMPLETE',
  PREPARE_TRADING = 'PREPARE_TRADING',
  GO_LIVE = 'GO_LIVE',
  STOP = 'STOP',
  PAUSE = 'PAUSE',
  RESUME = 'RESUME',
  ERROR_OCCURRED = 'ERROR_OCCURRED',
  RESET = 'RESET'
}

// Trading strategy configuration
export interface TradingStrategy {
  id: string;
  name: string;
  symbol: string;
  exchange: string;
  timeframe: string;
  parameters: Record<string, any>;
  riskLimits: {
    maxPositionSize: number;
    maxLoss: number;
    maxDrawdown: number;
  };
}

// FSM Context
export interface FSMContext {
  sessionId: string;
  strategy: TradingStrategy;
  state: TradingState;
  previousState?: TradingState;
  startTime: Date;
  lastStateChange: Date;
  metrics: {
    trades: number;
    profit: number;
    loss: number;
    winRate: number;
  };
  errors: string[];
  metadata: Record<string, any>;
}

// State transition rules
interface StateTransition {
  from: TradingState;
  event: TradingEvent;
  to: TradingState;
  guard?: (context: FSMContext) => boolean;
  action?: (context: FSMContext) => Promise<void>;
}

export class TradingFSM extends EventEmitter {
  private currentState: TradingState;
  private context: FSMContext;
  private transitions: Map<string, StateTransition>;
  private queue: Queue;
  private redis: Redis;
  private stateHistory: Array<{ state: TradingState; timestamp: Date; event?: TradingEvent }>;

  constructor(
    sessionId: string,
    strategy: TradingStrategy,
    queue: Queue,
    redis: Redis
  ) {
    super();
    
    this.currentState = TradingState.IDLE;
    this.queue = queue;
    this.redis = redis;
    this.stateHistory = [];
    
    this.context = {
      sessionId,
      strategy,
      state: TradingState.IDLE,
      startTime: new Date(),
      lastStateChange: new Date(),
      metrics: {
        trades: 0,
        profit: 0,
        loss: 0,
        winRate: 0
      },
      errors: [],
      metadata: {}
    };

    this.transitions = new Map();
    this.setupTransitions();
    this.recordStateChange(TradingState.IDLE);
  }

  private setupTransitions(): void {
    // Define all valid state transitions
    const transitions: StateTransition[] = [
      // From IDLE
      {
        from: TradingState.IDLE,
        event: TradingEvent.DEPLOY,
        to: TradingState.ANALYZING,
        action: async (ctx) => {
          await this.queue.add('analyze-market', {
            sessionId: ctx.sessionId,
            strategy: ctx.strategy
          });
        }
      },
      {
        from: TradingState.IDLE,
        event: TradingEvent.GO_LIVE,
        to: TradingState.LIVE,
        guard: (ctx) => ctx.metadata.skipAnalysis === true
      },

      // From ANALYZING
      {
        from: TradingState.ANALYZING,
        event: TradingEvent.ANALYSIS_COMPLETE,
        to: TradingState.PREPARING,
        action: async (ctx) => {
          await this.queue.add('prepare-trading', {
            sessionId: ctx.sessionId,
            analysisResults: ctx.metadata.analysisResults
          });
        }
      },
      {
        from: TradingState.ANALYZING,
        event: TradingEvent.STOP,
        to: TradingState.STOPPED
      },
      {
        from: TradingState.ANALYZING,
        event: TradingEvent.ERROR_OCCURRED,
        to: TradingState.ERROR
      },

      // From PREPARING
      {
        from: TradingState.PREPARING,
        event: TradingEvent.GO_LIVE,
        to: TradingState.LIVE,
        action: async (ctx) => {
          await this.queue.add('start-trading', {
            sessionId: ctx.sessionId,
            strategy: ctx.strategy
          }, {
            repeat: {
              every: 5000 // Execute every 5 seconds
            }
          });
        }
      },
      {
        from: TradingState.PREPARING,
        event: TradingEvent.STOP,
        to: TradingState.STOPPED
      },

      // From LIVE
      {
        from: TradingState.LIVE,
        event: TradingEvent.PAUSE,
        to: TradingState.MONITORING
      },
      {
        from: TradingState.LIVE,
        event: TradingEvent.STOP,
        to: TradingState.STOPPED,
        action: async (ctx) => {
          // Cancel all repeating jobs
          const jobs = await this.queue.getRepeatableJobs();
          for (const job of jobs) {
            if (job.name === 'start-trading' && job.id?.includes(ctx.sessionId)) {
              await this.queue.removeRepeatableByKey(job.key);
            }
          }
        }
      },
      {
        from: TradingState.LIVE,
        event: TradingEvent.ERROR_OCCURRED,
        to: TradingState.ERROR
      },

      // From MONITORING
      {
        from: TradingState.MONITORING,
        event: TradingEvent.RESUME,
        to: TradingState.LIVE
      },
      {
        from: TradingState.MONITORING,
        event: TradingEvent.STOP,
        to: TradingState.STOPPED
      },

      // From STOPPED
      {
        from: TradingState.STOPPED,
        event: TradingEvent.RESET,
        to: TradingState.IDLE,
        action: async (ctx) => {
          // Reset context
          ctx.metrics = {
            trades: 0,
            profit: 0,
            loss: 0,
            winRate: 0
          };
          ctx.errors = [];
          ctx.metadata = {};
        }
      },

      // From ERROR
      {
        from: TradingState.ERROR,
        event: TradingEvent.RESET,
        to: TradingState.IDLE
      },
      {
        from: TradingState.ERROR,
        event: TradingEvent.STOP,
        to: TradingState.STOPPED
      }
    ];

    // Build transition map for quick lookup
    transitions.forEach(t => {
      const key = `${t.from}:${t.event}`;
      this.transitions.set(key, t);
    });
  }

  /**
   * Process an event and transition to new state if valid
   */
  async processEvent(event: TradingEvent, metadata?: Record<string, any>): Promise<boolean> {
    const key = `${this.currentState}:${event}`;
    const transition = this.transitions.get(key);

    if (!transition) {
      this.emit('invalid-transition', {
        from: this.currentState,
        event,
        timestamp: new Date()
      });
      return false;
    }

    // Check guard condition if exists
    if (transition.guard && !transition.guard(this.context)) {
      this.emit('guard-failed', {
        from: this.currentState,
        event,
        to: transition.to,
        timestamp: new Date()
      });
      return false;
    }

    // Update metadata if provided
    if (metadata) {
      this.context.metadata = { ...this.context.metadata, ...metadata };
    }

    // Store previous state
    this.context.previousState = this.currentState;

    // Transition to new state
    const previousState = this.currentState;
    this.currentState = transition.to;
    this.context.state = transition.to;
    this.context.lastStateChange = new Date();

    // Record state change
    this.recordStateChange(transition.to, event);

    // Execute transition action if exists
    if (transition.action) {
      try {
        await transition.action(this.context);
      } catch (error) {
        // Rollback on action failure
        this.currentState = previousState;
        this.context.state = previousState;
        this.context.errors.push(`Action failed: ${error}`);
        
        this.emit('action-failed', {
          from: previousState,
          to: transition.to,
          event,
          error,
          timestamp: new Date()
        });
        
        return false;
      }
    }

    // Persist state to Redis
    await this.persistState();

    // Emit state change event
    this.emit('state-changed', {
      from: previousState,
      to: this.currentState,
      event,
      context: this.context,
      timestamp: new Date()
    });

    return true;
  }

  /**
   * Get current state
   */
  getCurrentState(): TradingState {
    return this.currentState;
  }

  /**
   * Get full context
   */
  getContext(): FSMContext {
    return { ...this.context };
  }

  /**
   * Get state history
   */
  getStateHistory(): Array<{ state: TradingState; timestamp: Date; event?: TradingEvent }> {
    return [...this.stateHistory];
  }

  /**
   * Check if transition is valid
   */
  canTransition(event: TradingEvent): boolean {
    const key = `${this.currentState}:${event}`;
    const transition = this.transitions.get(key);
    
    if (!transition) return false;
    
    if (transition.guard) {
      return transition.guard(this.context);
    }
    
    return true;
  }

  /**
   * Get available events for current state
   */
  getAvailableEvents(): TradingEvent[] {
    const events: TradingEvent[] = [];
    
    for (const [key, transition] of this.transitions) {
      if (key.startsWith(`${this.currentState}:`)) {
        const event = key.split(':')[1] as TradingEvent;
        if (!transition.guard || transition.guard(this.context)) {
          events.push(event);
        }
      }
    }
    
    return events;
  }

  /**
   * Update metrics
   */
  updateMetrics(metrics: Partial<FSMContext['metrics']>): void {
    this.context.metrics = {
      ...this.context.metrics,
      ...metrics
    };
    
    // Calculate win rate
    if (this.context.metrics.trades > 0) {
      const wins = this.context.metrics.profit > 0 ? 
        Math.floor(this.context.metrics.trades * 0.6) : 0; // Simplified calculation
      this.context.metrics.winRate = wins / this.context.metrics.trades;
    }
  }

  /**
   * Add error to context
   */
  addError(error: string): void {
    this.context.errors.push(error);
    
    // Limit error history
    if (this.context.errors.length > 100) {
      this.context.errors = this.context.errors.slice(-100);
    }
  }

  /**
   * Record state change in history
   */
  private recordStateChange(state: TradingState, event?: TradingEvent): void {
    this.stateHistory.push({
      state,
      timestamp: new Date(),
      event
    });

    // Limit history size
    if (this.stateHistory.length > 1000) {
      this.stateHistory = this.stateHistory.slice(-1000);
    }
  }

  /**
   * Persist state to Redis
   */
  private async persistState(): Promise<void> {
    const key = `fsm:${this.context.sessionId}`;
    const data = JSON.stringify({
      state: this.currentState,
      context: this.context,
      history: this.stateHistory.slice(-100) // Store last 100 history entries
    });

    // Store with 24 hour expiry
    await this.redis.setex(key, 86400, data);
  }

  /**
   * Load state from Redis
   */
  static async loadFromRedis(
    sessionId: string,
    queue: Queue,
    redis: Redis
  ): Promise<TradingFSM | null> {
    const key = `fsm:${sessionId}`;
    const data = await redis.get(key);
    
    if (!data) return null;
    
    try {
      const parsed = JSON.parse(data);
      const fsm = new TradingFSM(
        sessionId,
        parsed.context.strategy,
        queue,
        redis
      );
      
      // Restore state
      fsm.currentState = parsed.state;
      fsm.context = parsed.context;
      fsm.stateHistory = parsed.history || [];
      
      return fsm;
    } catch (error) {
      console.error('Failed to load FSM from Redis:', error);
      return null;
    }
  }
}