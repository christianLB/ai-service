import { logger } from "../utils/log";
import { db } from "./database";
import { metricsService } from "./metrics";

// Taxonomía oficial del sistema neuronal
export enum ComponentType {
  CORE = "core",
  HEMISPHERE = "hemisphere",
  EXTREMITY = "extremity",
  RAMIFICATION = "ramification",
}

export enum HealthStatus {
  OPTIMAL = "optimal", // 🟢 100% funcional
  DEGRADED = "degraded", // 🟡 Funcional con limitaciones
  CRITICAL = "critical", // 🟠 Barely functional
  OFFLINE = "offline", // 🔴 No funcional
}

export enum OperationMode {
  COMPLETE = "complete", // Todos los sistemas activos
  ESSENTIAL = "essential", // Solo core + hemisferios básicos
  CRITICAL = "critical", // Solo funciones vitales
  EMERGENCY = "emergency", // Modo supervivencia
}

export interface NeuralComponent {
  id: string;
  name: string;
  type: ComponentType;
  status: HealthStatus;
  dependencies: string[];
  healthCheckFn?: () => Promise<boolean>;
  lastCheck: Date;
  errorCount: number;
  isEssential: boolean;
}

export interface SystemState {
  mode: OperationMode;
  overallHealth: HealthStatus;
  components: Map<string, NeuralComponent>;
  activeHemispheres: string[];
  offlineExtremities: string[];
  lastEvaluation: Date;
  adaptationHistory: AdaptationEvent[];
}

export interface AdaptationEvent {
  timestamp: Date;
  trigger: string;
  fromMode: OperationMode;
  toMode: OperationMode;
  affectedComponents: string[];
  description: string;
}

export class NeuralOrchestrator {
  private systemState: SystemState;
  private components: Map<string, NeuralComponent>;
  private monitoringInterval: NodeJS.Timeout | null = null;
  private readonly MONITORING_INTERVAL = 30000; // 30 seconds
  private readonly MAX_ERROR_COUNT = 3;

  constructor() {
    this.components = new Map();
    this.systemState = {
      mode: OperationMode.COMPLETE,
      overallHealth: HealthStatus.OPTIMAL,
      components: this.components,
      activeHemispheres: [],
      offlineExtremities: [],
      lastEvaluation: new Date(),
      adaptationHistory: [],
    };

    this.initializeComponents();
  }

  private initializeComponents(): void {
    // CORE COMPONENTS
    this.registerComponent({
      id: "database",
      name: "PostgreSQL Database",
      type: ComponentType.CORE,
      status: HealthStatus.OPTIMAL,
      dependencies: [],
      healthCheckFn: this.checkDatabaseHealth.bind(this),
      lastCheck: new Date(),
      errorCount: 0,
      isEssential: true,
    });

    this.registerComponent({
      id: "express-server",
      name: "Express HTTP Server",
      type: ComponentType.CORE,
      status: HealthStatus.OPTIMAL,
      dependencies: [],
      healthCheckFn: this.checkExpressHealth.bind(this),
      lastCheck: new Date(),
      errorCount: 0,
      isEssential: true,
    });

    // HEMISPHERES
    this.registerComponent({
      id: "financial-hemisphere",
      name: "Financial Intelligence Hemisphere",
      type: ComponentType.HEMISPHERE,
      status: HealthStatus.OPTIMAL,
      dependencies: ["database", "openai-api", "gocardless-api"],
      healthCheckFn: this.checkFinancialHemisphere.bind(this),
      lastCheck: new Date(),
      errorCount: 0,
      isEssential: true,
    });

    this.registerComponent({
      id: "document-hemisphere",
      name: "Document Intelligence Hemisphere",
      type: ComponentType.HEMISPHERE,
      status: HealthStatus.OPTIMAL,
      dependencies: ["database", "openai-api", "filesystem"],
      healthCheckFn: this.checkDocumentHemisphere.bind(this),
      lastCheck: new Date(),
      errorCount: 0,
      isEssential: true,
    });

    this.registerComponent({
      id: "workflow-hemisphere",
      name: "Workflow Automation Hemisphere",
      type: ComponentType.HEMISPHERE,
      status: HealthStatus.OPTIMAL,
      dependencies: ["database", "n8n-api"],
      healthCheckFn: this.checkWorkflowHemisphere.bind(this),
      lastCheck: new Date(),
      errorCount: 0,
      isEssential: false,
    });

    // EXTREMITIES
    this.registerComponent({
      id: "communication-extremity",
      name: "Communication Extremity (Telegram)",
      type: ComponentType.EXTREMITY,
      status: HealthStatus.OPTIMAL,
      dependencies: ["telegram-api"],
      healthCheckFn: this.checkCommunicationExtremity.bind(this),
      lastCheck: new Date(),
      errorCount: 0,
      isEssential: false,
    });

    this.registerComponent({
      id: "metrics-extremity",
      name: "Metrics & Monitoring Extremity",
      type: ComponentType.EXTREMITY,
      status: HealthStatus.OPTIMAL,
      dependencies: [],
      healthCheckFn: this.checkMetricsExtremity.bind(this),
      lastCheck: new Date(),
      errorCount: 0,
      isEssential: false,
    });

    // EXTERNAL DEPENDENCIES
    this.registerComponent({
      id: "openai-api",
      name: "OpenAI API",
      type: ComponentType.RAMIFICATION,
      status: HealthStatus.OPTIMAL,
      dependencies: [],
      healthCheckFn: this.checkOpenAIAPI.bind(this),
      lastCheck: new Date(),
      errorCount: 0,
      isEssential: false,
    });

    this.registerComponent({
      id: "gocardless-api",
      name: "GoCardless API",
      type: ComponentType.RAMIFICATION,
      status: HealthStatus.OPTIMAL,
      dependencies: [],
      healthCheckFn: this.checkGoCardlessAPI.bind(this),
      lastCheck: new Date(),
      errorCount: 0,
      isEssential: false,
    });
  }

  registerComponent(component: NeuralComponent): void {
    this.components.set(component.id, component);
    logger.info(
      `🧠 Neural component registered: ${component.name} (${component.type})`
    );
  }

  async startMonitoring(): Promise<void> {
    logger.info("🧠 Neural Orchestrator starting continuous monitoring...");

    // Initial evaluation
    await this.evaluateSystemHealth();

    // Set up continuous monitoring
    this.monitoringInterval = setInterval(async () => {
      try {
        await this.evaluateSystemHealth();
      } catch (error: any) {
        logger.error("🚨 Neural Orchestrator monitoring error:", error);
      }
    }, this.MONITORING_INTERVAL);
  }

  stopMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
      logger.info("🧠 Neural Orchestrator monitoring stopped");
    }
  }

  async evaluateSystemHealth(): Promise<SystemState> {
    const startTime = Date.now();
    let hasChanges = false;

    try {
      // Check each component
      for (const [id, component] of this.components) {
        const previousStatus = component.status;
        await this.checkComponentHealth(component);

        if (component.status !== previousStatus) {
          hasChanges = true;
          logger.info(
            `🔄 Component status changed: ${component.name} ${previousStatus} → ${component.status}`
          );
        }
      }

      // Determine overall system state
      const newMode = this.determineOperationMode();
      const newHealth = this.determineOverallHealth();

      // Check if adaptation is needed
      if (newMode !== this.systemState.mode || hasChanges) {
        await this.adaptToConditions(newMode, newHealth);
      }

      this.systemState.lastEvaluation = new Date();

      const duration = Date.now() - startTime;
      logger.debug(`🧠 Neural evaluation completed in ${duration}ms`);

      return this.systemState;
    } catch (error: any) {
      logger.error("🚨 Neural system evaluation failed:", error);
      throw error;
    }
  }

  private async checkComponentHealth(
    component: NeuralComponent
  ): Promise<void> {
    try {
      if (component.healthCheckFn) {
        const isHealthy = await component.healthCheckFn();

        if (isHealthy) {
          component.status = HealthStatus.OPTIMAL;
          component.errorCount = 0;
        } else {
          component.errorCount++;

          if (component.errorCount >= this.MAX_ERROR_COUNT) {
            component.status = HealthStatus.OFFLINE;
          } else if (component.errorCount >= 2) {
            component.status = HealthStatus.CRITICAL;
          } else {
            component.status = HealthStatus.DEGRADED;
          }
        }
      }

      component.lastCheck = new Date();
    } catch (error: any) {
      component.errorCount++;
      component.status =
        component.errorCount >= this.MAX_ERROR_COUNT
          ? HealthStatus.OFFLINE
          : HealthStatus.CRITICAL;

      logger.warn(
        `⚠️ Health check failed for ${component.name}:`,
        error.message
      );
    }
  }

  private determineOperationMode(): OperationMode {
    const coreComponents = Array.from(this.components.values()).filter(
      (c) => c.type === ComponentType.CORE
    );

    const hemispheres = Array.from(this.components.values()).filter(
      (c) => c.type === ComponentType.HEMISPHERE
    );

    // Check if any core component is offline
    const coreOffline = coreComponents.some(
      (c) => c.status === HealthStatus.OFFLINE
    );
    if (coreOffline) {
      return OperationMode.EMERGENCY;
    }

    // Check if any core component is critical
    const coreCritical = coreComponents.some(
      (c) => c.status === HealthStatus.CRITICAL
    );
    if (coreCritical) {
      return OperationMode.CRITICAL;
    }

    // Check hemisphere health
    const essentialHemispheresDown = hemispheres
      .filter((h) => h.isEssential)
      .some((h) => h.status === HealthStatus.OFFLINE);

    if (essentialHemispheresDown) {
      return OperationMode.ESSENTIAL;
    }

    // Check external dependencies
    const externalDepsDown = Array.from(this.components.values())
      .filter((c) => c.type === ComponentType.RAMIFICATION)
      .some((c) => c.status === HealthStatus.OFFLINE);

    if (externalDepsDown) {
      return OperationMode.ESSENTIAL;
    }

    return OperationMode.COMPLETE;
  }

  private determineOverallHealth(): HealthStatus {
    const components = Array.from(this.components.values());

    const offlineCount = components.filter(
      (c) => c.status === HealthStatus.OFFLINE
    ).length;
    const criticalCount = components.filter(
      (c) => c.status === HealthStatus.CRITICAL
    ).length;
    const degradedCount = components.filter(
      (c) => c.status === HealthStatus.DEGRADED
    ).length;

    if (offlineCount > 0) return HealthStatus.CRITICAL;
    if (criticalCount > 0) return HealthStatus.DEGRADED;
    if (degradedCount > 0) return HealthStatus.DEGRADED;

    return HealthStatus.OPTIMAL;
  }

  private async adaptToConditions(
    newMode: OperationMode,
    newHealth: HealthStatus
  ): Promise<void> {
    const previousMode = this.systemState.mode;

    // Record adaptation event
    const adaptationEvent: AdaptationEvent = {
      timestamp: new Date(),
      trigger: this.identifyAdaptationTrigger(),
      fromMode: previousMode,
      toMode: newMode,
      affectedComponents: this.getAffectedComponents(),
      description: this.generateAdaptationDescription(previousMode, newMode),
    };

    this.systemState.adaptationHistory.push(adaptationEvent);
    this.systemState.mode = newMode;
    this.systemState.overallHealth = newHealth;

    // Update active/inactive lists
    this.updateComponentLists();

    // Log the adaptation
    logger.warn(`🔄 NEURAL ADAPTATION: ${adaptationEvent.description}`);

    // Send alerts if necessary
    if (newMode !== OperationMode.COMPLETE) {
      await this.sendNeuralAlert(adaptationEvent);
    }
  }

  private identifyAdaptationTrigger(): string {
    const failures = Array.from(this.components.values())
      .filter((c) => c.status !== HealthStatus.OPTIMAL)
      .map((c) => c.name);

    return failures.length > 0 ? failures.join(", ") : "Unknown trigger";
  }

  private getAffectedComponents(): string[] {
    return Array.from(this.components.values())
      .filter((c) => c.status !== HealthStatus.OPTIMAL)
      .map((c) => c.id);
  }

  private generateAdaptationDescription(
    from: OperationMode,
    to: OperationMode
  ): string {
    const descriptions = {
      [OperationMode.COMPLETE]: "Sistema neuronal en capacidad completa",
      [OperationMode.ESSENTIAL]:
        "Sistema neuronal en modo esencial - funcionalidades básicas",
      [OperationMode.CRITICAL]:
        "Sistema neuronal en modo crítico - solo funciones vitales",
      [OperationMode.EMERGENCY]:
        "Sistema neuronal en emergencia - modo supervivencia",
    };

    return `${descriptions[from]} → ${descriptions[to]}`;
  }

  private updateComponentLists(): void {
    this.systemState.activeHemispheres = Array.from(this.components.values())
      .filter(
        (c) =>
          c.type === ComponentType.HEMISPHERE &&
          c.status !== HealthStatus.OFFLINE
      )
      .map((c) => c.id);

    this.systemState.offlineExtremities = Array.from(this.components.values())
      .filter(
        (c) =>
          c.type === ComponentType.EXTREMITY &&
          c.status === HealthStatus.OFFLINE
      )
      .map((c) => c.id);
  }

  private async sendNeuralAlert(event: AdaptationEvent): Promise<void> {
    // This would integrate with communication extremity if available
    const alertLevel = this.getAlertLevel(event.toMode);
    const message = `🧠 ${alertLevel}: ${event.description}`;

    logger.warn(message);

    // Could send to Telegram, Slack, email, etc. if communication extremity is healthy
  }

  private getAlertLevel(mode: OperationMode): string {
    const levels = {
      [OperationMode.COMPLETE]: "🟢 NEURAL OPTIMAL",
      [OperationMode.ESSENTIAL]: "🟡 NEURAL DEGRADED",
      [OperationMode.CRITICAL]: "🟠 NEURAL CRITICAL",
      [OperationMode.EMERGENCY]: "🔴 NEURAL EMERGENCY",
    };

    return levels[mode];
  }

  // Health check implementations
  private async checkDatabaseHealth(): Promise<boolean> {
    try {
      return await db.healthCheck();
    } catch {
      return false;
    }
  }

  private async checkExpressHealth(): Promise<boolean> {
    // Express server health - if we're running this code, server is up
    return true;
  }

  private async checkFinancialHemisphere(): Promise<boolean> {
    try {
      // Check if financial routes are accessible and DB schema exists
      const client = await db.pool.connect();
      await client.query(
        "SELECT 1 FROM information_schema.schemata WHERE schema_name = 'financial'"
      );
      client.release();
      return true;
    } catch {
      return false;
    }
  }

  private async checkDocumentHemisphere(): Promise<boolean> {
    try {
      // Check if documents routes are accessible and storage is available
      const client = await db.pool.connect();
      await client.query(
        "SELECT 1 FROM information_schema.schemata WHERE schema_name = 'documents'"
      );
      client.release();
      return true;
    } catch {
      return false;
    }
  }

  private async checkWorkflowHemisphere(): Promise<boolean> {
    try {
      // Check if workflow tables exist
      const client = await db.pool.connect();
      await client.query(
        "SELECT 1 FROM information_schema.tables WHERE table_name = 'workflows'"
      );
      client.release();
      return true;
    } catch {
      return false;
    }
  }

  private async checkCommunicationExtremity(): Promise<boolean> {
    // Check if Telegram bot token is configured
    const token = process.env.TELEGRAM_BOT_TOKEN;
    return !!token;
  }

  private async checkMetricsExtremity(): Promise<boolean> {
    try {
      // Check if metrics service is responding
      await metricsService.getMetrics();
      return true;
    } catch {
      return false;
    }
  }

  private async checkOpenAIAPI(): Promise<boolean> {
    const apiKey = process.env.OPENAI_API_KEY;
    return !!apiKey;
  }

  private async checkGoCardlessAPI(): Promise<boolean> {
    // Check if GoCardless credentials are configured in the database
    try {
      const { integrationConfigService } = await import('./integrations');
      const secretId = await integrationConfigService.getConfig({
        integrationType: 'gocardless',
        configKey: 'secret_id'
      });
      const secretKey = await integrationConfigService.getConfig({
        integrationType: 'gocardless',
        configKey: 'secret_key'
      });
      return !!(secretId && secretKey);
    } catch (error) {
      return false;
    }
  }

  // Public API for system status
  getSystemState(): SystemState {
    return { ...this.systemState };
  }

  getComponentStatus(componentId: string): NeuralComponent | undefined {
    return this.components.get(componentId);
  }

  getNeuralReport(): object {
    return {
      timestamp: new Date().toISOString(),
      mode: this.systemState.mode,
      overallHealth: this.systemState.overallHealth,
      components: Object.fromEntries(
        Array.from(this.components.entries()).map(([id, comp]) => [
          id,
          {
            name: comp.name,
            type: comp.type,
            status: comp.status,
            lastCheck: comp.lastCheck,
            errorCount: comp.errorCount,
          },
        ])
      ),
      activeHemispheres: this.systemState.activeHemispheres,
      offlineExtremities: this.systemState.offlineExtremities,
      recentAdaptations: this.systemState.adaptationHistory.slice(-5),
    };
  }
}

// Singleton instance
export const neuralOrchestrator = new NeuralOrchestrator();
