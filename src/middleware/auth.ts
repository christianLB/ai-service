// Re-export from auth.middleware.ts for compatibility with generated routes
export * from './auth.middleware';
export { authMiddleware as authenticate } from './auth.middleware';
export { authMiddleware as requireAuth } from './auth.middleware';