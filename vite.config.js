import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api/easykash': {
        target: 'https://easykash.net', // Changed from api.easykash.net
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/easykash/, '/api') // Maps /api/easykash/v1 -> /api/v1
      }
    }
  }
})
