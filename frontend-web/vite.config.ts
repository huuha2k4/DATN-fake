import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    host: true,
    allowedHosts: true,
    hmr: false,
    proxy: {
      '/api/chat': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
      '/api/forecast': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
      '/api/anomalies': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
      '/api/behavior': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
      '/api/recommendations': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
      '/api': {
        target: process.env.VITE_BACKEND_URL || 'http://localhost:1116',
        changeOrigin: true,
      },
    },
  },
})