import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    host: true,
    allowedHosts: true,
    // Bật HMR để hot reload hoạt động
    hmr: true,
    // Polling cần thiết khi chạy Docker trên Windows (NTFS không gửi inotify events)
    watch: {
      usePolling: true,
      interval: 300,
    },
    proxy: {
      '/api': {
        target: 'http://localhost:1116',
        changeOrigin: true,
      },
    },
  },
})
