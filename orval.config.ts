import { defineConfig } from 'orval'

/**
 * Gera o cliente da API a partir do OpenAPI do backend (`pnpm api:generate`).
 * Requer o backend rodando com springdoc-openapi (ver pendências no README).
 * A saída em src/shared/api/generated/ deve ser commitada: o build não depende do orval.
 */
export default defineConfig({
  veridt: {
    input: {
      target: process.env.ORVAL_INPUT ?? 'http://localhost:8080/v3/api-docs',
    },
    output: {
      mode: 'tags-split',
      target: 'src/shared/api/generated/endpoints',
      schemas: 'src/shared/api/generated/model',
      client: 'react-query',
      httpClient: 'axios',
      clean: true,
      formatter: 'prettier',
      override: {
        mutator: {
          path: 'src/shared/api/http.ts',
          name: 'customInstance',
        },
        query: {
          useQuery: true,
          signal: true,
        },
      },
    },
  },
})
