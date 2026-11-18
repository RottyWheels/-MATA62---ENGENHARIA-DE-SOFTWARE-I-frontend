import { fileURLToPath } from 'node:url'

import { defineConfig, devices } from '@playwright/test'

// Esta configuração fica em e2e/; o dev server precisa rodar na raiz do repositório.
const repoRoot = fileURLToPath(new URL('..', import.meta.url))

const PORT = 5173
const baseURL = `http://localhost:${PORT}`

export default defineConfig({
  testDir: '.',
  // Os testes contra o backend real têm config própria (playwright.real.config.ts).
  testIgnore: 'real-backend/**',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL,
    locale: 'pt-BR',
    trace: 'on-first-retry',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'pnpm dev --port 5173 --strictPort',
    cwd: repoRoot,
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    env: { VITE_ENABLE_MOCKS: 'true', VITE_ENABLE_PAYMENT_SIMULATION: 'true' },
    timeout: 120_000,
  },
})
