/// <reference types="vitest/config" />
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
    // Vitest usa esta mesma configuração (aliases, plugins) com a chave `test`.
    test: {
      environment: 'jsdom',
      setupFiles: ['./src/test/setup.ts'],
      include: ['src/**/*.test.{ts,tsx}'],
      css: false,
      restoreMocks: true,
      // Testes de formulário simulam muita digitação; com todos os arquivos em
      // paralelo, 5 s (o padrão) é pouco. Uma asserção errada continua falhando.
      testTimeout: 15_000,
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
