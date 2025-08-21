/**
 * Feature flags for gradual migration from axios to OpenAPI generated hooks
 * Set to true to use the new OpenAPI-based implementation
 */
export const FEATURE_FLAGS = {
  // Financial Module
  USE_OPENAPI_CLIENT_HOOKS: false,
  USE_OPENAPI_INVOICE_TEMPLATE_HOOKS: false,
  USE_OPENAPI_ACCOUNTS_HOOKS: false,
  USE_OPENAPI_INVOICE_ATTACHMENT_HOOKS: false,
  USE_OPENAPI_INVOICE_HOOKS: false,
  USE_OPENAPI_TRANSACTION_HOOKS: false,
  USE_OPENAPI_GOCARDLESS_HOOKS: false,

  // Dashboard Module
  USE_OPENAPI_DASHBOARD_HOOKS: false,
  USE_OPENAPI_METRICS_HOOKS: false,
  USE_OPENAPI_REPORTS_HOOKS: false,

  // Document Management
  USE_OPENAPI_DOCUMENT_HOOKS: false,

  // Trading Module
  USE_OPENAPI_TRADING_HOOKS: false,
  USE_OPENAPI_STRATEGY_HOOKS: false,
  USE_OPENAPI_POSITION_HOOKS: false,

  // Tagging System
  USE_OPENAPI_TAG_HOOKS: false,
  USE_OPENAPI_ENTITY_TAG_HOOKS: false,

  // External Integrations
  USE_OPENAPI_NOTIFICATION_HOOKS: false,
  USE_OPENAPI_ALERT_HOOKS: false,

  // Global flag to enable all OpenAPI hooks
  USE_ALL_OPENAPI_HOOKS: false,
};

/**
 * Helper function to check if a feature is enabled
 */
export function isFeatureEnabled(flag: keyof typeof FEATURE_FLAGS): boolean {
  return FEATURE_FLAGS.USE_ALL_OPENAPI_HOOKS || FEATURE_FLAGS[flag];
}

/**
 * Environment-based feature flag overrides
 * These can be set via environment variables
 */
if (typeof window !== 'undefined') {
  // Check for environment variable overrides in the browser
  const searchParams = new URLSearchParams(window.location.search);
  
  // Allow enabling features via URL params for testing
  // e.g., ?openapi_client=true&openapi_invoice=true
  Object.keys(FEATURE_FLAGS).forEach((key) => {
    const paramName = key.toLowerCase().replace(/_/g, '-');
    const paramValue = searchParams.get(paramName);
    if (paramValue === 'true') {
      (FEATURE_FLAGS as any)[key] = true;
    } else if (paramValue === 'false') {
      (FEATURE_FLAGS as any)[key] = false;
    }
  });

  // Check for localStorage overrides (persisted settings)
  const storedFlags = localStorage.getItem('featureFlags');
  if (storedFlags) {
    try {
      const parsedFlags = JSON.parse(storedFlags);
      Object.assign(FEATURE_FLAGS, parsedFlags);
    } catch (e) {
      console.error('Failed to parse stored feature flags:', e);
    }
  }
}

/**
 * Function to persist feature flag changes
 */
export function setFeatureFlag(flag: keyof typeof FEATURE_FLAGS, value: boolean): void {
  FEATURE_FLAGS[flag] = value;
  
  if (typeof window !== 'undefined') {
    // Persist to localStorage
    localStorage.setItem('featureFlags', JSON.stringify(FEATURE_FLAGS));
  }
}

/**
 * Function to enable all OpenAPI hooks at once
 */
export function enableAllOpenAPIHooks(): void {
  setFeatureFlag('USE_ALL_OPENAPI_HOOKS', true);
}

/**
 * Function to disable all OpenAPI hooks at once
 */
export function disableAllOpenAPIHooks(): void {
  Object.keys(FEATURE_FLAGS).forEach((key) => {
    setFeatureFlag(key as keyof typeof FEATURE_FLAGS, false);
  });
}