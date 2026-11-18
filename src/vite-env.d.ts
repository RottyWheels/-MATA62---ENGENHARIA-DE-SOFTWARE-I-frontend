/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Alvo do proxy do Vite em dev (padrão: http://localhost:8080). */
  readonly VITE_BACKEND_URL?: string
  /** `'true'` liga o MSW no navegador (rodar sem backend). */
  readonly VITE_ENABLE_MOCKS?: string
  /** `'true'` mostra "Simular pagamento" (só em `pnpm dev`; nunca no build de produção). */
  readonly VITE_ENABLE_PAYMENT_SIMULATION?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
