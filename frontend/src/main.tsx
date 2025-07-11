import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import 'antd/dist/reset.css'
import './index.css'
import App from './App.tsx'

// Update document title based on environment
if (import.meta.env.DEV) {
  document.title = 'AI Service - Dev';
} else if (import.meta.env.MODE === 'staging') {
  document.title = 'AI Service - Staging';
} else {
  document.title = 'AI Service';
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
