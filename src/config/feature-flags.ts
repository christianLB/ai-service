/**
 * Feature Flags Configuration
 * 
 * Controls gradual rollout of new features and migrations
 */

export interface FeatureFlags {
  USE_PRISMA_DASHBOARD: boolean;
  ENABLE_SQL_VALIDATION: boolean;
  LOG_QUERY_PERFORMANCE: boolean;
  ENABLE_PARALLEL_VALIDATION: boolean;
}

export class FeatureFlagService {
  private static instance: FeatureFlagService;
  private flags: FeatureFlags;

  private constructor() {
    this.flags = {
      USE_PRISMA_DASHBOARD: process.env.USE_PRISMA_DASHBOARD === 'true' || false,
      ENABLE_SQL_VALIDATION: process.env.ENABLE_SQL_VALIDATION === 'true' || false,
      LOG_QUERY_PERFORMANCE: process.env.LOG_QUERY_PERFORMANCE === 'true' || true,
      ENABLE_PARALLEL_VALIDATION: process.env.ENABLE_PARALLEL_VALIDATION === 'true' || false
    };
  }

  static getInstance(): FeatureFlagService {
    if (!this.instance) {
      this.instance = new FeatureFlagService();
    }
    return this.instance;
  }

  isEnabled(flag: keyof FeatureFlags): boolean {
    return this.flags[flag];
  }

  // Dynamic toggle for testing
  toggle(flag: keyof FeatureFlags, value: boolean): void {
    this.flags[flag] = value;
  }

  // Get all flags
  getAllFlags(): FeatureFlags {
    return { ...this.flags };
  }

  // Check multiple flags at once
  areEnabled(...flags: (keyof FeatureFlags)[]): boolean {
    return flags.every(flag => this.flags[flag]);
  }

  // Check if any of the flags are enabled
  anyEnabled(...flags: (keyof FeatureFlags)[]): boolean {
    return flags.some(flag => this.flags[flag]);
  }
}

export const featureFlags = FeatureFlagService.getInstance();