import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: '0.0.0.0', // Listen on all interfaces for Docker
    proxy: {
      '/api': {
        target: 'http://ai-service-api:3001', // Proxy to API container
        changeOrigin: true,
        secure: false,
      }
    }
  }
})