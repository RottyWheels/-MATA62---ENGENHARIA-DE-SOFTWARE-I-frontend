import { fileURLToPath, URL } from 'node:url'

import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const backendUrl = env.VITE_BACKEND_URL || 'http://localhost:8080'
  const wsUrl = backendUrl.replace(/^http/, 'ws')

  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
    server: {
      port: 5173,
      // Frontend e API na mesma origem: cookie de sessão + CSRF sem CORS.
      proxy: {
        '/api': { target: backendUrl, changeOrigin: false },
        '/ws': { target: wsUrl, ws: true, changeOrigin: false },
        '/v3/api-docs': { target: backendUrl, changeOrigin: false },
      },
    },
  }
})
