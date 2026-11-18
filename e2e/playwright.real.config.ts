import { fileURLToPath } from 'node:url'

import { defineConfig, devices } from '@playwright/test'

/**
 * E2E contra o backend real (Docker Compose do backend, branch `feature/credits`), sem mocks.
 * Pré-requisitos: `docker compose up --build` no backend (API em :8080, Mailpit em :8025,
 * `PAYMENT_SIMULATION_ENABLED=true`, que já é o padrão do Compose). Rode com `pnpm e2e:real`.
 * Cria contas e pedidos de verdade no banco de desenvolvimento.
 */
const repoRoot = fileURLToPath(new URL('..', import.meta.url))

// Porta própria: não reaproveita um `pnpm dev` com mocks na 5173.
const PORT = 5174
const baseURL = `http://localhost:${PORT}`

export default defineConfig({
  testDir: './real-backend',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  reporter: process.env.CI ? 'github' : 'list',
  timeout: 90_000,
  // Backend real (Argon2, e-mail) e o Vite recém-iniciado são mais lentos que os mocks.
  expect: { timeout: 15_000 },
  use: {
    baseURL,
    locale: 'pt-BR',
    trace: 'retain-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: `pnpm dev --port ${PORT} --strictPort`,
    cwd: repoRoot,
    url: baseURL,
    reuseExistingServer: false,
    env: {
      VITE_ENABLE_MOCKS: 'false',
      VITE_ENABLE_PAYMENT_SIMULATION: 'true',
      VITE_BACKEND_URL: process.env.VITE_BACKEND_URL ?? 'http://localhost:8080',
    },
    timeout: 120_000,
  },
})
