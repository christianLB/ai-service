import { Request, Response } from 'express';
import { 
  QueueManager, 
  TradingFSM, 
  QUEUE_NAMES,
  TradingState,
  TradingEvent,
  EVENT_CHANNELS
} from '@ai/queue-system';
import { env } from '@ai/config';

/**
 * Trading Service Controller
 * Manages trading strategies with FSM and queue coordination
 */
export class TradingController {
  private queueManager: QueueManager;
  private activeFSMs: Map<string, TradingFSM> = new Map();

  constructor() {
    this.queueManager = new QueueManager(env.REDIS_URL);
  }

  /**
   * Initialize the trading controller
   */
  async initialize(): Promise<void> {
    console.log('🚀 Initializing Trading Controller...');
    await this.queueManager.initialize();
    
    // Subscribe to trading events for FSM coordination
    await this.subscribeToTradingEvents();
    
    console.log('✅ Trading Controller initialized');
  }

  /**
   * Deploy a trading strategy
   * POST /v1/trading/deploy
   */
  async deployStrategy(req: Request, res: Response): Promise<void> {
    try {
      const {
        strategyName,
        exchange = 'binance',
        symbol = 'BTC/USD',
        parameters = {},
        riskLimits = {
          maxPositionSize: 1000,
          maxLoss: 100,
        }
      } = req.body;

      if (!strategyName) {
        res.status(400).json({
          error: 'Strategy name is required',
          code: 'MISSING_STRATEGY_NAME'
        });
        return;
      }

      const strategyId = `strategy_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // Create FSM for strategy
      const fsm = new TradingFSM(strategyId, this.queueManager, {
        metadata: {
          strategyName,
          exchange,
          symbol,
          parameters,
          riskLimits,
          deployedBy: req.headers['user-id'] || 'anonymous',
          deployedAt: new Date().toISOString(),
        }
      });

      // Store FSM reference
      this.activeFSMs.set(strategyId, fsm);

      // Set up FSM event listeners
      fsm.on('stateChanged', (event: any) => {
        console.log(`🔄 Strategy ${strategyId} state changed: ${event.previousState} → ${event.newState}`);
      });

      fsm.on('progressUpdated', (event: any) => {
        console.log(`📊 Strategy ${strategyId} progress: ${event.progress}%`);
      });

      // Start the strategy
      const started = await fsm.start({
        strategyName,
        exchange,
        symbol,
        parameters,
        riskLimits,
      });

      if (!started) {
        res.status(400).json({
          error: 'Failed to start strategy',
          code: 'FSM_START_FAILED'
        });
        return;
      }

      // Publish deployment event
      await this.queueManager.publishEvent(EVENT_CHANNELS.TRADING_EVENTS, {
        service: 'trading-svc',
        event: 'strategy_deployed',
        data: {
          strategyId,
          strategyName,
          exchange,
          symbol,
          deployedBy: req.headers['user-id'] || 'anonymous',
        },
        timestamp: new Date().toISOString(),
      });

      res.status(201).json({
        strategyId,
        strategyName,
        exchange,
        symbol,
        state: fsm.getState(),
        stateData: fsm.getStateData(),
        progress: fsm.getStateData().progress,
        deployedAt: new Date().toISOString(),
        endpoints: {
          status: `/v1/trading/status/${strategyId}`,
          stop: `/v1/trading/stop/${strategyId}`,
          history: `/v1/trading/history/${strategyId}`,
        }
      });

    } catch (error) {
      console.error('Strategy deployment failed:', error);
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Internal server error',
        code: 'DEPLOYMENT_FAILED'
      });
    }
  }

  /**
   * Stop a trading strategy
   * POST /v1/trading/stop/:strategyId
   */
  async stopStrategy(req: Request, res: Response): Promise<void> {
    try {
      const { strategyId } = req.params;
      const { reason = 'User requested' } = req.body;

      const fsm = this.activeFSMs.get(strategyId);
      if (!fsm) {
        res.status(404).json({
          error: 'Strategy not found',
          code: 'STRATEGY_NOT_FOUND',
          strategyId
        });
        return;
      }

      const stopped = await fsm.stop(reason);
      if (!stopped) {
        res.status(400).json({
          error: 'Failed to stop strategy',
          code: 'FSM_STOP_FAILED',
          currentState: fsm.getState()
        });
        return;
      }

      // Publish stop event
      await this.queueManager.publishEvent(EVENT_CHANNELS.TRADING_EVENTS, {
        service: 'trading-svc',
        event: 'strategy_stopped',
        data: {
          strategyId,
          reason,
          stoppedBy: req.headers['user-id'] || 'anonymous',
          finalState: fsm.getState(),
        },
        timestamp: new Date().toISOString(),
      });

      res.json({
        strategyId,
        state: fsm.getState(),
        stateData: fsm.getStateData(),
        reason,
        stoppedAt: new Date().toISOString(),
      });

    } catch (error) {
      console.error('Strategy stop failed:', error);
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Internal server error',
        code: 'STOP_FAILED'
      });
    }
  }

  /**
   * Get strategy status
   * GET /v1/trading/status/:strategyId
   */
  async getStrategyStatus(req: Request, res: Response): Promise<void> {
    try {
      const { strategyId } = req.params;

      if (strategyId === 'all') {
        // Return status of all active strategies
        const allStrategies = Array.from(this.activeFSMs.entries()).map(([id, fsm]) => ({
          strategyId: id,
          state: fsm.getState(),
          stateData: fsm.getStateData(),
          history: fsm.getStateHistory().slice(-5), // Last 5 state changes
        }));

        res.json({
          strategies: allStrategies,
          totalActive: allStrategies.length,
          byState: this.getStrategiesByState(),
          timestamp: new Date().toISOString(),
        });
        return;
      }

      const fsm = this.activeFSMs.get(strategyId);
      if (!fsm) {
        res.status(404).json({
          error: 'Strategy not found',
          code: 'STRATEGY_NOT_FOUND',
          strategyId
        });
        return;
      }

      res.json({
        strategyId,
        state: fsm.getState(),
        stateData: fsm.getStateData(),
        history: fsm.getStateHistory(),
        queueStatus: await this.getStrategyQueueStatus(strategyId),
        timestamp: new Date().toISOString(),
      });

    } catch (error) {
      console.error('Get strategy status failed:', error);
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Internal server error',
        code: 'STATUS_FAILED'
      });
    }
  }

  /**
   * Get strategy history
   * GET /v1/trading/history/:strategyId
   */
  async getStrategyHistory(req: Request, res: Response): Promise<void> {
    try {
      const { strategyId } = req.params;

      const fsm = this.activeFSMs.get(strategyId);
      if (!fsm) {
        res.status(404).json({
          error: 'Strategy not found',
          code: 'STRATEGY_NOT_FOUND',
          strategyId
        });
        return;
      }

      const history = fsm.getStateHistory();
      const stateData = fsm.getStateData();

      res.json({
        strategyId,
        currentState: fsm.getState(),
        totalStateChanges: history.length,
        stateHistory: history,
        timeline: history.map((entry: any, index: number) => ({
          step: index + 1,
          state: entry.state,
          event: entry.event,
          timestamp: entry.timestamp,
          duration: index > 0 ? 
            new Date(entry.timestamp).getTime() - new Date(history[index - 1].timestamp).getTime() 
            : 0,
        })),
        metadata: stateData.metadata,
        error: stateData.error,
        timestamp: new Date().toISOString(),
      });

    } catch (error) {
      console.error('Get strategy history failed:', error);
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Internal server error',
        code: 'HISTORY_FAILED'
      });
    }
  }

  /**
   * Run backtest
   * POST /v1/trading/backtest
   */
  async runBacktest(req: Request, res: Response): Promise<void> {
    try {
      const {
        strategyName,
        exchange = 'binance',
        symbol = 'BTC/USD',
        parameters = {},
        dateRange = {
          from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days ago
          to: new Date().toISOString(),
        }
      } = req.body;

      if (!strategyName) {
        res.status(400).json({
          error: 'Strategy name is required for backtesting',
          code: 'MISSING_STRATEGY_NAME'
        });
        return;
      }

      const backtestId = `backtest_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // Queue backtest job - this would go to a specialized backtest worker
      await this.queueManager.addJob(QUEUE_NAMES.STRATEGY_EXECUTION, {
        id: backtestId,
        timestamp: new Date().toISOString(),
        strategyName: `${strategyName}_backtest`,
        exchange,
        symbol,
        parameters: {
          ...parameters,
          mode: 'backtest',
          dateRange,
        },
        riskLimits: {
          maxPositionSize: 10000, // Higher limits for backtesting
          maxLoss: 1000,
        },
      }, {
        priority: 5, // Normal priority for backtests
        attempts: 1, // Don't retry backtests
      });

      res.status(202).json({
        backtestId,
        strategyName,
        exchange,
        symbol,
        dateRange,
        status: 'queued',
        queuedAt: new Date().toISOString(),
        estimatedDuration: '2-5 minutes',
        endpoints: {
          status: `/v1/trading/backtest/status/${backtestId}`,
          results: `/v1/trading/backtest/results/${backtestId}`,
        }
      });

    } catch (error) {
      console.error('Backtest submission failed:', error);
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Internal server error',
        code: 'BACKTEST_FAILED'
      });
    }
  }

  /**
   * Get queue and FSM status overview
   * GET /v1/trading/system-status
   */
  async getSystemStatus(req: Request, res: Response): Promise<void> {
    try {
      const queueStats = await this.queueManager.getAllQueueStats();
      const strategiesByState = this.getStrategiesByState();
      
      res.json({
        system: {
          status: 'operational',
          version: '1.0.0',
          uptime: process.uptime(),
        },
        queues: queueStats,
        strategies: {
          total: this.activeFSMs.size,
          byState: strategiesByState,
          active: strategiesByState[TradingState.EXECUTING] || 0,
          monitoring: strategiesByState[TradingState.MONITORING] || 0,
          errors: strategiesByState[TradingState.ERROR] || 0,
        },
        timestamp: new Date().toISOString(),
      });

    } catch (error) {
      console.error('Get system status failed:', error);
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Internal server error',
        code: 'SYSTEM_STATUS_FAILED'
      });
    }
  }

  /**
   * Emergency stop all strategies
   * POST /v1/trading/emergency-stop
   */
  async emergencyStopAll(req: Request, res: Response): Promise<void> {
    try {
      const { reason = 'Emergency stop activated' } = req.body;
      
      console.log('🚨 EMERGENCY STOP: Stopping all active trading strategies');
      
      const stopResults = await Promise.allSettled(
        Array.from(this.activeFSMs.entries()).map(async ([strategyId, fsm]) => {
          try {
            await fsm.stop(reason);
            return { strategyId, status: 'stopped' };
          } catch (error) {
            console.error(`Failed to stop strategy ${strategyId}:`, error);
            return { 
              strategyId, 
              status: 'failed', 
              error: error instanceof Error ? error.message : String(error) 
            };
          }
        })
      );

      const stoppedCount = stopResults.filter(result => 
        result.status === 'fulfilled' && result.value.status === 'stopped'
      ).length;

      // Publish emergency stop event
      await this.queueManager.publishEvent(EVENT_CHANNELS.TRADING_EVENTS, {
        service: 'trading-svc',
        event: 'emergency_stop_activated',
        data: {
          reason,
          strategiesStopped: stoppedCount,
          totalStrategies: this.activeFSMs.size,
          stoppedBy: req.headers['user-id'] || 'anonymous',
        },
        timestamp: new Date().toISOString(),
      });

      res.json({
        message: 'Emergency stop executed',
        reason,
        strategiesStopped: stoppedCount,
        totalStrategies: this.activeFSMs.size,
        results: stopResults.map(result => 
          result.status === 'fulfilled' ? result.value : { error: result.reason }
        ),
        timestamp: new Date().toISOString(),
      });

    } catch (error) {
      console.error('Emergency stop failed:', error);
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Internal server error',
        code: 'EMERGENCY_STOP_FAILED'
      });
    }
  }

  /**
   * Subscribe to trading events from workers
   */
  private async subscribeToTradingEvents(): Promise<void> {
    await this.queueManager.subscribeToEvents(
      EVENT_CHANNELS.TRADING_EVENTS,
      (event: any) => {
        console.log(`📡 Received trading event: ${event.event} from ${event.service}`);
        
        // Handle specific events that affect FSM state
        switch (event.event) {
          case 'strategy_execution_completed':
            this.handleStrategyExecutionCompleted(event.data);
            break;
          case 'strategy_execution_failed':
            this.handleStrategyExecutionFailed(event.data);
            break;
          case 'arbitrage_opportunity_found':
            this.handleArbitrageOpportunity(event.data);
            break;
          case 'position_alert':
            this.handlePositionAlert(event.data);
            break;
          case 'high_risk_alert':
            this.handleHighRiskAlert(event.data);
            break;
        }
      }
    );
  }

  /**
   * Handle strategy execution completion
   */
  private async handleStrategyExecutionCompleted(data: any): Promise<void> {
    const strategyId = data.strategyId;
    const fsm = this.activeFSMs.get(strategyId);
    
    if (fsm) {
      await fsm.processEvent(TradingEvent.EXECUTE_COMPLETE, data);
    }
  }

  /**
   * Handle strategy execution failure
   */
  private async handleStrategyExecutionFailed(data: any): Promise<void> {
    const strategyId = data.strategyId;
    const fsm = this.activeFSMs.get(strategyId);
    
    if (fsm) {
      await fsm.handleError(data.error);
    }
  }

  /**
   * Handle arbitrage opportunity
   */
  private async handleArbitrageOpportunity(data: any): Promise<void> {
    console.log(`💰 Arbitrage opportunity found: ${data.profitPercentage}% profit`);
    // Could trigger new strategy deployment or alert
  }

  /**
   * Handle position alert
   */
  private async handlePositionAlert(data: any): Promise<void> {
    console.log(`⚠️ Position alert for ${data.positionId}: ${data.severity}`);
    
    // Find strategy managing this position
    for (const [strategyId, fsm] of this.activeFSMs) {
      const stateData = fsm.getStateData();
      if (stateData.metadata.positionId === data.positionId) {
        if (data.severity === 'critical') {
          await fsm.handleError(`Critical position alert: ${JSON.stringify(data.alerts)}`);
        }
        break;
      }
    }
  }

  /**
   * Handle high risk alert
   */
  private async handleHighRiskAlert(data: any): Promise<void> {
    console.log(`🚨 High risk alert: Risk score ${data.riskScore}`);
    
    // Could pause all strategies or trigger risk management
    if (parseFloat(data.riskScore) > 8.5) {
      console.log('🛑 Risk score too high, considering emergency stop');
    }
  }

  /**
   * Get strategies grouped by state
   */
  private getStrategiesByState(): Record<string, number> {
    const byState: Record<string, number> = {};
    
    for (const fsm of this.activeFSMs.values()) {
      const state = fsm.getState();
      byState[state] = (byState[state] || 0) + 1;
    }
    
    return byState;
  }

  /**
   * Get queue status for a specific strategy
   */
  private async getStrategyQueueStatus(strategyId: string): Promise<any> {
    try {
      const allStats = await this.queueManager.getAllQueueStats();
      
      // Look for jobs related to this strategy
      const strategyJobs = allStats.queues.map(queueStat => ({
        queueName: (queueStat as any).queueName,
        relatedJobs: (queueStat as any).jobs.waiting.filter((job: any) => 
          job.data && job.data.strategyId === strategyId
        ).length + (queueStat as any).jobs.active.filter((job: any) => 
          job.data && job.data.strategyId === strategyId
        ).length,
      })).filter((queue: any) => queue.relatedJobs > 0);

      return {
        relatedQueues: strategyJobs,
        totalRelatedJobs: strategyJobs.reduce((sum: number, queue: any) => sum + queue.relatedJobs, 0),
      };
    } catch (error) {
      console.error('Failed to get queue status for strategy:', error);
      return { error: 'Failed to get queue status' };
    }
  }

  /**
   * Cleanup completed strategies
   */
  async cleanupCompletedStrategies(): Promise<void> {
    const toRemove: string[] = [];
    
    for (const [strategyId, fsm] of this.activeFSMs) {
      const state = fsm.getState();
      if (state === TradingState.COMPLETED || state === TradingState.ERROR) {
        const stateData = fsm.getStateData();
        const lastUpdate = new Date(stateData.lastUpdate);
        const now = new Date();
        
        // Remove strategies that have been completed/errored for more than 1 hour
        if (now.getTime() - lastUpdate.getTime() > 60 * 60 * 1000) {
          toRemove.push(strategyId);
        }
      }
    }
    
    for (const strategyId of toRemove) {
      this.activeFSMs.delete(strategyId);
      console.log(`🧹 Cleaned up completed strategy: ${strategyId}`);
    }
  }

  /**
   * Shutdown the trading controller
   */
  async shutdown(): Promise<void> {
    console.log('🛑 Shutting down Trading Controller...');
    
    // Stop all active strategies
    await Promise.all(
      Array.from(this.activeFSMs.values()).map(fsm => fsm.stop('Service shutdown'))
    );
    
    // Shutdown queue manager
    await this.queueManager.shutdown();
    
    console.log('✅ Trading Controller shutdown complete');
  }
}