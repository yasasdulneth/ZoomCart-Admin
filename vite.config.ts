import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const apiPort = String(env.PORT || '5000').replace(/\D/g, '') || '5000'
  const apiTarget = `http://127.0.0.1:${apiPort}`

  return {
    plugins: [react(), tailwindcss()],
    server: {
      host: 'localhost',
      port: 5173,
      strictPort: true,
      open: true,
      proxy: {
        // Same-origin /api → Express (PORT in .env). MongoDB is not an HTTP server; it connects via MONGO_URI.
        '/api': {
          target: apiTarget,
          changeOrigin: true,
        },
      },
    },
  }
})
