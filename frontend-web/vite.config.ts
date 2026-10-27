import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    host: true,
    allowedHosts: true,
    hmr: false,
    proxy: {
      '/api': {
        target: 'http://localhost:1116',
        changeOrigin: true,
      },
    },
  },
})
