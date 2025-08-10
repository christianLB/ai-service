import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

/**
 * ⚠️ CRITICAL CONFIGURATION - DO NOT CHANGE WITHOUT UNDERSTANDING ⚠️
 * 
 * This config is used INSIDE Docker containers where:
 * - The Vite dev server runs in the frontend container
 * - It needs to proxy API requests to the backend container
 * - Container names (ai-service-api) are used for Docker networking
 * 
 * FOR LOCAL DEVELOPMENT (without Docker):
 * - Use vite.config.ts with target: 'http://localhost:3001'
 * 
 * FOR DOCKER DEVELOPMENT:
 * - This file MUST use 'http://ai-service-api:3001'
 * - The browser accesses http://localhost:3030 (mapped port)
 * - Vite inside Docker proxies to the API container
 * 
 * DO NOT CONFUSE:
 * - Browser → Vite: http://localhost:3030 (port mapping)
 * - Vite → API: http://ai-service-api:3001 (container networking)
 */
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: '0.0.0.0', // Listen on all interfaces for Docker
    proxy: {
      '/api': {
        target: 'http://ai-service-api-dev:3001', // Container-to-container communication
        changeOrigin: true,
        secure: false,
      }
    }
  }
})