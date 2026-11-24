import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig, loadEnv } from 'vite'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const backendTarget = env.VITE_BACKEND_URL || 'http://localhost:1116'
  return {
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
          target: backendTarget,
          changeOrigin: true,
        },
        '/api/anomalies': {
          target: backendTarget,
          changeOrigin: true,
        },
        '/api/behavior': {
          target: backendTarget,
          changeOrigin: true,
        },
        '/api/recommendations': {
          target: backendTarget,
          changeOrigin: true,
        },
        '/api': {
          target: backendTarget,
          changeOrigin: true,
        },
      },
    },
  }
})
