import { EventEmitter } from 'events';
import Bull from 'bull';
import Redis from 'ioredis';

/**
 * Trading Session Finite State Machine
 * States: Idle → Initializing → Live → Stopping → Stopped
 * 
 * This FSM manages the lifecycle of trading sessions, ensuring proper
 * state transitions and handling of trading operations.
 */

export enum TradingState {
  IDLE = 'idle',
  INITIALIZING = 'initializing',
  LIVE = 'live',
  STOPPING = 'stopping',
  STOPPED = 'stopped',
  ERROR = 'error'
}

export enum TradingEvent {
  DEPLOY = 'deploy',
  START = 'start',
  STOP = 'stop',
  ERROR = 'error',
  RESET = 'reset'
}

export interface TradingSession {
  id: string;
  state: TradingState;
  strategy: string;
  config: Record<string, any>;
  startedAt?: Date;
  stoppedAt?: Date;
  error?: string;
  metrics?: {
    trades: number;
    profit: number;
    loss: number;
  };
}

export interface StateTransition {
  from: TradingState;
  to: TradingState;
  event: TradingEvent;
  timestamp: Date;
  metadata?: Record<string, any>;
}

export class TradingFSM extends EventEmitter {
  private state: TradingState;
  private session: TradingSession | null;
  private transitions: StateTransition[];
  private queue: Bull.Queue;
  private redis: Redis;

  // Valid state transitions
  private readonly validTransitions: Map<TradingState, Map<TradingEvent, TradingState>> = new Map([
    [TradingState.IDLE, new Map([
      [TradingEvent.DEPLOY, TradingState.INITIALIZING]
    ])],
    [TradingState.INITIALIZING, new Map([
      [TradingEvent.START, TradingState.LIVE],
      [TradingEvent.ERROR, TradingState.ERROR],
      [TradingEvent.STOP, TradingState.STOPPED]
    ])],
    [TradingState.LIVE, new Map([
      [TradingEvent.STOP, TradingState.STOPPING],
      [TradingEvent.ERROR, TradingState.ERROR]
    ])],
    [TradingState.STOPPING, new Map([
      [TradingEvent.STOP, TradingState.STOPPED],
      [TradingEvent.ERROR, TradingState.ERROR]
    ])],
    [TradingState.STOPPED, new Map([
      [TradingEvent.RESET, TradingState.IDLE],
      [TradingEvent.DEPLOY, TradingState.INITIALIZING]
    ])],
    [TradingState.ERROR, new Map([
      [TradingEvent.RESET, TradingState.IDLE]
    ])]
  ]);

  constructor(redisUrl: string, queueName: string = 'trading-jobs') {
    super();
    this.state = TradingState.IDLE;
    this.session = null;
    this.transitions = [];
    
    // Initialize Redis and Bull queue
    this.redis = new Redis(redisUrl);
    this.queue = new Bull(queueName, redisUrl);
    
    this.setupEventHandlers();
  }

  private setupEventHandlers(): void {
    // Log all state transitions
    this.on('transition', (transition: StateTransition) => {
      console.log(`[FSM] State transition: ${transition.from} → ${transition.to} (event: ${transition.event})`);
      this.transitions.push(transition);
    });

    // Handle errors
    this.on('error', (error: Error) => {
      console.error('[FSM] Error:', error);
    });
  }

  /**
   * Get current state
   */
  public getState(): TradingState {
    return this.state;
  }

  /**
   * Get current session
   */
  public getSession(): TradingSession | null {
    return this.session;
  }

  /**
   * Check if a transition is valid
   */
  private canTransition(event: TradingEvent): boolean {
    const stateTransitions = this.validTransitions.get(this.state);
    return stateTransitions ? stateTransitions.has(event) : false;
  }

  /**
   * Get next state for an event
   */
  private getNextState(event: TradingEvent): TradingState | null {
    const stateTransitions = this.validTransitions.get(this.state);
    return stateTransitions ? stateTransitions.get(event) || null : null;
  }

  /**
   * Perform state transition
   */
  private async transition(event: TradingEvent, metadata?: Record<string, any>): Promise<void> {
    if (!this.canTransition(event)) {
      throw new Error(`Invalid transition: ${this.state} cannot handle event ${event}`);
    }

    const fromState = this.state;
    const toState = this.getNextState(event);
    
    if (!toState) {
      throw new Error(`No target state for event ${event} from state ${this.state}`);
    }

    // Update state
    this.state = toState;

    // Create transition record
    const transition: StateTransition = {
      from: fromState,
      to: toState,
      event,
      timestamp: new Date(),
      metadata
    };

    // Emit transition event
    this.emit('transition', transition);
    
    // Store state in Redis for persistence
    if (this.session) {
      await this.redis.set(
        `trading:session:${this.session.id}`,
        JSON.stringify({ ...this.session, state: this.state })
      );
    }
  }

  /**
   * Deploy a new trading session
   */
  public async deploy(strategy: string, config: Record<string, any>): Promise<TradingSession> {
    if (this.state !== TradingState.IDLE && this.state !== TradingState.STOPPED) {
      throw new Error(`Cannot deploy from state ${this.state}. Must be IDLE or STOPPED.`);
    }

    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Create new session
    this.session = {
      id: sessionId,
      state: TradingState.INITIALIZING,
      strategy,
      config,
      startedAt: new Date(),
      metrics: {
        trades: 0,
        profit: 0,
        loss: 0
      }
    };

    // Transition to INITIALIZING
    await this.transition(TradingEvent.DEPLOY, { sessionId, strategy });

    // Queue initialization job
    await this.queue.add('initialize-trading', {
      sessionId,
      strategy,
      config
    });

    // Auto-transition to LIVE after initialization (simulate async init)
    setTimeout(async () => {
      if (this.state === TradingState.INITIALIZING) {
        await this.start();
      }
    }, 2000);

    return this.session;
  }

  /**
   * Start trading (transition to LIVE)
   */
  public async start(): Promise<void> {
    if (this.state !== TradingState.INITIALIZING) {
      throw new Error(`Cannot start from state ${this.state}. Must be INITIALIZING.`);
    }

    await this.transition(TradingEvent.START);

    // Queue trading jobs
    if (this.session) {
      await this.queue.add('start-trading', {
        sessionId: this.session.id,
        strategy: this.session.strategy
      }, {
        repeat: {
          every: 5000 // Check markets every 5 seconds
        }
      });
    }

    this.emit('trading-started', this.session);
  }

  /**
   * Stop trading session
   */
  public async stop(): Promise<void> {
    if (this.state !== TradingState.LIVE && this.state !== TradingState.INITIALIZING) {
      throw new Error(`Cannot stop from state ${this.state}. Must be LIVE or INITIALIZING.`);
    }

    // Transition to STOPPING
    if (this.state === TradingState.LIVE) {
      await this.transition(TradingEvent.STOP);
      
      // Queue cleanup jobs
      if (this.session) {
        await this.queue.add('stop-trading', {
          sessionId: this.session.id
        });

        // Remove repeating jobs
        const repeatableJobs = await this.queue.getRepeatableJobs();
        for (const job of repeatableJobs) {
          if (job.name === 'start-trading') {
            await this.queue.removeRepeatableByKey(job.key);
          }
        }
      }

      // Simulate async cleanup
      setTimeout(async () => {
        if (this.state === TradingState.STOPPING) {
          await this.finalizeStopping();
        }
      }, 1000);
    } else {
      // Direct transition from INITIALIZING to STOPPED
      await this.transition(TradingEvent.STOP);
      this.finalizeSession();
    }
  }

  /**
   * Finalize stopping process
   */
  private async finalizeStopping(): Promise<void> {
    if (this.state !== TradingState.STOPPING) {
      return;
    }

    await this.transition(TradingEvent.STOP);
    this.finalizeSession();
  }

  /**
   * Finalize session
   */
  private finalizeSession(): void {
    if (this.session) {
      this.session.stoppedAt = new Date();
      this.session.state = TradingState.STOPPED;
      this.emit('trading-stopped', this.session);
    }
  }

  /**
   * Handle error
   */
  public async handleError(error: Error): Promise<void> {
    if (!this.canTransition(TradingEvent.ERROR)) {
      console.error('Cannot transition to ERROR state from', this.state);
      return;
    }

    await this.transition(TradingEvent.ERROR, { error: error.message });
    
    if (this.session) {
      this.session.error = error.message;
      this.session.state = TradingState.ERROR;
    }

    this.emit('trading-error', { session: this.session, error });
  }

  /**
   * Reset FSM to IDLE state
   */
  public async reset(): Promise<void> {
    if (this.state !== TradingState.STOPPED && this.state !== TradingState.ERROR) {
      throw new Error(`Cannot reset from state ${this.state}. Must be STOPPED or ERROR.`);
    }

    await this.transition(TradingEvent.RESET);
    
    // Clear session
    if (this.session) {
      await this.redis.del(`trading:session:${this.session.id}`);
    }
    
    this.session = null;
    this.transitions = [];
    
    this.emit('fsm-reset');
  }

  /**
   * Get transition history
   */
  public getTransitionHistory(): StateTransition[] {
    return [...this.transitions];
  }

  /**
   * Load session from Redis
   */
  public async loadSession(sessionId: string): Promise<TradingSession | null> {
    const data = await this.redis.get(`trading:session:${sessionId}`);
    if (data) {
      const session = JSON.parse(data) as TradingSession;
      this.session = session;
      this.state = session.state;
      return session;
    }
    return null;
  }

  /**
   * Get all active sessions
   */
  public async getActiveSessions(): Promise<TradingSession[]> {
    const keys = await this.redis.keys('trading:session:*');
    const sessions: TradingSession[] = [];
    
    for (const key of keys) {
      const data = await this.redis.get(key);
      if (data) {
        const session = JSON.parse(data) as TradingSession;
        if (session.state === TradingState.LIVE || session.state === TradingState.INITIALIZING) {
          sessions.push(session);
        }
      }
    }
    
    return sessions;
  }

  /**
   * Cleanup resources
   */
  public async cleanup(): Promise<void> {
    // Stop any active sessions
    if (this.state === TradingState.LIVE || this.state === TradingState.INITIALIZING) {
      await this.stop();
    }

    // Close connections
    await this.queue.close();
    this.redis.disconnect();
    
    this.removeAllListeners();
  }
}

// Export factory function
export function createTradingFSM(redisUrl: string): TradingFSM {
  return new TradingFSM(redisUrl);
}

// Export types for external use
export type { StateTransition, TradingSession };