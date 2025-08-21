import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

/**
 * ⚠️ CRITICAL: See vite.config.dev.ts for proxy configuration rules ⚠️
 * The proxy target MUST be localhost, NOT Docker container names.
 */
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      // Auth microservice
      '/api/auth': {
        target: 'http://localhost:3004',
        changeOrigin: true,
        secure: false,
      },
      // Financial microservice  
      '/api/financial': {
        target: 'http://localhost:3002',
        changeOrigin: true,
        secure: false,
      },
      // Monolith for dashboard, tagging, users, etc
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        secure: false,
      }
    }
  }
})
