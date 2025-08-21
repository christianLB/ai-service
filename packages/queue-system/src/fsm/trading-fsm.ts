import { EventEmitter } from 'events';
import { 
  TradingState, 
  TradingEvent, 
  TradingStateData,
  ServiceEvent,
  EVENT_CHANNELS 
} from '../types';
import { QueueManager } from '../queue-manager';

/**
 * Finite State Machine for Trading Strategy Execution
 * Coordinates queue jobs and state transitions
 */
export class TradingFSM extends EventEmitter {
  private currentState: TradingState = TradingState.IDLE;
  private stateData: TradingStateData;
  private queueManager: QueueManager;
  private stateHistory: Array<{ state: TradingState; timestamp: string; event?: TradingEvent }> = [];

  constructor(
    strategyId: string,
    queueManager: QueueManager,
    initialData: Partial<TradingStateData> = {}
  ) {
    super();
    
    this.queueManager = queueManager;
    this.stateData = {
      strategyId,
      currentState: TradingState.IDLE,
      progress: 0,
      metadata: {},
      lastUpdate: new Date().toISOString(),
      ...initialData,
    };

    this.addToHistory(TradingState.IDLE);
  }

  /**
   * Get current state
   */
  getState(): TradingState {
    return this.currentState;
  }

  /**
   * Get full state data
   */
  getStateData(): TradingStateData {
    return { ...this.stateData };
  }

  /**
   * Get state history
   */
  getStateHistory() {
    return [...this.stateHistory];
  }

  /**
   * Process an event and potentially transition state
   */
  async processEvent(event: TradingEvent, eventData?: any): Promise<boolean> {
    const previousState = this.currentState;
    const newState = this.getNextState(this.currentState, event);
    
    if (newState === null) {
      console.warn(`❌ Invalid transition: ${event} in state ${this.currentState}`);
      return false;
    }

    console.log(`🔄 FSM Transition: ${previousState} --[${event}]--> ${newState}`);
    
    // Update state
    this.currentState = newState;
    this.stateData.currentState = newState;
    this.stateData.lastUpdate = new Date().toISOString();
    this.stateData.metadata = { ...this.stateData.metadata, ...eventData };
    
    this.addToHistory(newState, event);
    
    // Execute state entry actions
    await this.executeStateEntry(newState, eventData);
    
    // Emit state change event
    this.emit('stateChanged', {
      previousState,
      newState,
      event,
      eventData,
      stateData: this.getStateData(),
    });

    // Publish to Redis for cross-service coordination
    await this.publishStateChange(previousState, newState, event, eventData);
    
    return true;
  }

  /**
   * Start the trading strategy execution
   */
  async start(strategyConfig: any): Promise<boolean> {
    return await this.processEvent(TradingEvent.START, { strategyConfig });
  }

  /**
   * Stop the trading strategy execution
   */
  async stop(reason?: string): Promise<boolean> {
    return await this.processEvent(TradingEvent.STOP, { reason });
  }

  /**
   * Reset the FSM to idle state
   */
  async reset(): Promise<boolean> {
    return await this.processEvent(TradingEvent.RESET);
  }

  /**
   * Handle error event
   */
  async handleError(error: string | Error, recovery?: boolean): Promise<boolean> {
    const errorMessage = error instanceof Error ? error.message : error;
    
    if (recovery && this.currentState !== TradingState.ERROR) {
      // Try to recover to previous state
      const lastNormalState = this.getLastNormalState();
      if (lastNormalState) {
        this.stateData.error = errorMessage;
        return await this.processEvent(TradingEvent.ERROR, { 
          error: errorMessage, 
          recovery: true,
          targetState: lastNormalState 
        });
      }
    }
    
    this.stateData.error = errorMessage;
    return await this.processEvent(TradingEvent.ERROR, { error: errorMessage });
  }

  /**
   * Update progress (0-100)
   */
  updateProgress(progress: number): void {
    this.stateData.progress = Math.max(0, Math.min(100, progress));
    this.stateData.lastUpdate = new Date().toISOString();
    
    this.emit('progressUpdated', {
      progress: this.stateData.progress,
      state: this.currentState,
      strategyId: this.stateData.strategyId,
    });
  }

  /**
   * Define state transitions
   */
  private getNextState(currentState: TradingState, event: TradingEvent): TradingState | null {
    const transitions: Record<TradingState, Partial<Record<TradingEvent, TradingState>>> = {
      [TradingState.IDLE]: {
        [TradingEvent.START]: TradingState.ANALYZING,
        [TradingEvent.RESET]: TradingState.IDLE,
      },
      
      [TradingState.ANALYZING]: {
        [TradingEvent.ANALYZE_COMPLETE]: TradingState.PREPARING,
        [TradingEvent.ERROR]: TradingState.ERROR,
        [TradingEvent.STOP]: TradingState.STOPPING,
        [TradingEvent.RESET]: TradingState.IDLE,
      },
      
      [TradingState.PREPARING]: {
        [TradingEvent.PREPARE_COMPLETE]: TradingState.EXECUTING,
        [TradingEvent.ERROR]: TradingState.ERROR,
        [TradingEvent.STOP]: TradingState.STOPPING,
        [TradingEvent.RESET]: TradingState.IDLE,
      },
      
      [TradingState.EXECUTING]: {
        [TradingEvent.EXECUTE_COMPLETE]: TradingState.MONITORING,
        [TradingEvent.COMPLETE]: TradingState.COMPLETED,
        [TradingEvent.ERROR]: TradingState.ERROR,
        [TradingEvent.STOP]: TradingState.STOPPING,
        [TradingEvent.RESET]: TradingState.IDLE,
      },
      
      [TradingState.MONITORING]: {
        [TradingEvent.MONITOR_COMPLETE]: TradingState.EXECUTING,
        [TradingEvent.COMPLETE]: TradingState.COMPLETED,
        [TradingEvent.ERROR]: TradingState.ERROR,
        [TradingEvent.STOP]: TradingState.STOPPING,
        [TradingEvent.RESET]: TradingState.IDLE,
      },
      
      [TradingState.STOPPING]: {
        [TradingEvent.COMPLETE]: TradingState.COMPLETED,
        [TradingEvent.ERROR]: TradingState.ERROR,
        [TradingEvent.RESET]: TradingState.IDLE,
      },
      
      [TradingState.ERROR]: {
        [TradingEvent.RESET]: TradingState.IDLE,
        [TradingEvent.START]: TradingState.ANALYZING, // Allow restart from error
      },
      
      [TradingState.COMPLETED]: {
        [TradingEvent.RESET]: TradingState.IDLE,
        [TradingEvent.START]: TradingState.ANALYZING, // Allow restart
      },
    };

    return transitions[currentState]?.[event] || null;
  }

  /**
   * Execute actions when entering a state
   */
  private async executeStateEntry(state: TradingState, eventData?: any): Promise<void> {
    switch (state) {
      case TradingState.ANALYZING:
        await this.scheduleAnalysisJobs(eventData);
        break;
        
      case TradingState.PREPARING:
        await this.schedulePrepationJobs(eventData);
        break;
        
      case TradingState.EXECUTING:
        await this.scheduleExecutionJobs(eventData);
        break;
        
      case TradingState.MONITORING:
        await this.scheduleMonitoringJobs(eventData);
        break;
        
      case TradingState.STOPPING:
        await this.scheduleStopJobs(eventData);
        break;
        
      case TradingState.ERROR:
        await this.handleErrorState(eventData);
        break;
        
      case TradingState.COMPLETED:
        await this.handleCompletionState(eventData);
        break;
    }
  }

  /**
   * Schedule analysis jobs (risk analysis, market analysis)
   */
  private async scheduleAnalysisJobs(eventData?: any): Promise<void> {
    console.log(`📊 Scheduling analysis jobs for strategy ${this.stateData.strategyId}`);
    
    // Schedule risk analysis
    await this.queueManager.addJob('risk-analysis', {
      id: `risk-${this.stateData.strategyId}-${Date.now()}`,
      timestamp: new Date().toISOString(),
      analysisType: 'portfolio',
      scope: {
        timeframe: '1d',
        portfolioId: this.stateData.strategyId,
      },
      parameters: eventData?.strategyConfig || {},
    });
    
    this.updateProgress(20);
  }

  /**
   * Schedule preparation jobs
   */
  private async schedulePrepationJobs(eventData?: any): Promise<void> {
    console.log(`🔧 Scheduling preparation jobs for strategy ${this.stateData.strategyId}`);
    
    // Schedule arbitrage detection if applicable
    if (eventData?.strategyConfig?.type === 'arbitrage') {
      await this.queueManager.addJob('arbitrage-detection', {
        id: `arbitrage-${this.stateData.strategyId}-${Date.now()}`,
        timestamp: new Date().toISOString(),
        exchangePair: eventData.strategyConfig.exchanges || ['binance', 'coinbase'],
        symbol: eventData.strategyConfig.symbol || 'BTC/USD',
        minProfitPercentage: eventData.strategyConfig.minProfit || 0.5,
      });
    }
    
    this.updateProgress(40);
  }

  /**
   * Schedule execution jobs
   */
  private async scheduleExecutionJobs(eventData?: any): Promise<void> {
    console.log(`⚡ Scheduling execution jobs for strategy ${this.stateData.strategyId}`);
    
    await this.queueManager.addJob('strategy-execution', {
      id: `exec-${this.stateData.strategyId}-${Date.now()}`,
      timestamp: new Date().toISOString(),
      strategyName: eventData?.strategyConfig?.name || 'default',
      exchange: eventData?.strategyConfig?.exchange || 'binance',
      symbol: eventData?.strategyConfig?.symbol || 'BTC/USD',
      parameters: eventData?.strategyConfig?.parameters || {},
      riskLimits: eventData?.strategyConfig?.riskLimits || {
        maxPositionSize: 1000,
        maxLoss: 100,
      },
    });
    
    this.updateProgress(60);
  }

  /**
   * Schedule monitoring jobs
   */
  private async scheduleMonitoringJobs(eventData?: any): Promise<void> {
    console.log(`👀 Scheduling monitoring jobs for strategy ${this.stateData.strategyId}`);
    
    await this.queueManager.addJob('position-monitoring', {
      id: `monitor-${this.stateData.strategyId}-${Date.now()}`,
      timestamp: new Date().toISOString(),
      positionId: this.stateData.strategyId,
      exchange: eventData?.exchange || 'binance',
      symbol: eventData?.symbol || 'BTC/USD',
      monitoringType: 'risk_check',
      thresholds: eventData?.thresholds || { stopLoss: 0.05, takeProfit: 0.1 },
    });
    
    this.updateProgress(80);
  }

  /**
   * Schedule stop jobs
   */
  private async scheduleStopJobs(eventData?: any): Promise<void> {
    console.log(`🛑 Scheduling stop jobs for strategy ${this.stateData.strategyId}`);
    
    // Cancel pending jobs
    // Close positions
    // Generate final report
    
    this.updateProgress(100);
  }

  /**
   * Handle error state
   */
  private async handleErrorState(eventData?: any): Promise<void> {
    console.error(`💥 Strategy ${this.stateData.strategyId} entered error state:`, eventData?.error);
    
    this.stateData.error = eventData?.error;
    
    // Publish error event
    await this.queueManager.publishEvent(EVENT_CHANNELS.TRADING_EVENTS, {
      service: 'trading-fsm',
      event: 'strategy_error',
      data: {
        strategyId: this.stateData.strategyId,
        error: eventData?.error,
        state: this.currentState,
      },
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Handle completion state
   */
  private async handleCompletionState(eventData?: any): Promise<void> {
    console.log(`🎉 Strategy ${this.stateData.strategyId} completed successfully`);
    
    this.updateProgress(100);
    
    // Publish completion event
    await this.queueManager.publishEvent(EVENT_CHANNELS.TRADING_EVENTS, {
      service: 'trading-fsm',
      event: 'strategy_completed',
      data: {
        strategyId: this.stateData.strategyId,
        finalState: this.currentState,
        stateHistory: this.stateHistory,
        metadata: this.stateData.metadata,
      },
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Add state to history
   */
  private addToHistory(state: TradingState, event?: TradingEvent): void {
    this.stateHistory.push({
      state,
      event,
      timestamp: new Date().toISOString(),
    });
    
    // Keep only last 50 entries
    if (this.stateHistory.length > 50) {
      this.stateHistory = this.stateHistory.slice(-50);
    }
  }

  /**
   * Get last normal (non-error) state
   */
  private getLastNormalState(): TradingState | null {
    for (let i = this.stateHistory.length - 1; i >= 0; i--) {
      const entry = this.stateHistory[i];
      if (entry.state !== TradingState.ERROR && entry.state !== TradingState.STOPPING) {
        return entry.state;
      }
    }
    return null;
  }

  /**
   * Publish state change to Redis
   */
  private async publishStateChange(
    previousState: TradingState,
    newState: TradingState,
    event: TradingEvent,
    eventData?: any
  ): Promise<void> {
    await this.queueManager.publishEvent(EVENT_CHANNELS.TRADING_EVENTS, {
      service: 'trading-fsm',
      event: 'state_changed',
      data: {
        strategyId: this.stateData.strategyId,
        previousState,
        newState,
        triggerEvent: event,
        eventData,
        progress: this.stateData.progress,
        timestamp: this.stateData.lastUpdate,
      },
      timestamp: new Date().toISOString(),
    });
  }
}