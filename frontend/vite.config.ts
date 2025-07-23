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
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        secure: false,
      }
    }
  }
})
