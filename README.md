# Veridt — Frontend

Plataforma web para capturar e gravar o conteúdo de páginas da internet, produzindo **evidências digitais rastreáveis**. Advogados e usuários comuns compram créditos (Mercado Pago ou Pix) e os usam para registrar capturas de tela ou vídeos de navegação. Depois, consultam os registros, geram relatórios e exportam ZIP.

Este repositório contém **a base do frontend**: ambiente, ferramentas e infraestrutura compartilhada. O backend (monólito modular em Java 25 + Spring Boot 4.1 + Spring Modulith) fica em [`igor377/MATA62---ENGENHARIA-DE-SOFTWARE-I`](https://github.com/igor377/MATA62---ENGENHARIA-DE-SOFTWARE-I).

Requisitos, ADRs e táticas arquiteturais estão em [`iuryyxd/MATA62-Veridt`](https://github.com/iuryyxd/MATA62-Veridt). As telas finais vêm do [Figma do Veridt](https://www.figma.com/design/D4vDhuk1DBAJY9knexl7Hs/Veridt?node-id=0-1); o tema foi centralizado em `src/index.css` para facilitar a troca.

> **Estado atual:** ambiente configurado, rotas e layouts prontos e o fluxo de autenticação (cadastro, login, recuperação de senha e logout) funcionando contra os mocks. O visual segue o Figma (cor `#0F7C69`, telas públicas divididas e barra lateral verde). A compra de créditos (pacotes, faturamento, Pix e Mercado Pago) também funciona contra os mocks. As telas de captura e registros ainda são placeholders (ver [Rotas](#rotas) e [Próximos passos](#próximos-passos)).

## Stack

| Área                    | Tecnologia                                                              |
| ----------------------- | ----------------------------------------------------------------------- |
| Runtime / gerenciador   | Node 24 LTS, pnpm 12 (via Corepack)                                     |
| Build                   | Vite 8 + React 19 + TypeScript 6 (`strict`, `noUncheckedIndexedAccess`) |
| Rotas                   | React Router 8 (modo data, `createBrowserRouter`, `lazy`)               |
| Estado do servidor      | TanStack Query 5 (+ Devtools em dev)                                    |
| HTTP                    | Axios                                                                   |
| Cliente da API          | orval (Axios + hooks TanStack Query)                                    |
| Formulários / validação | React Hook Form + Zod 4 + `@hookform/resolvers`                         |
| Máscaras                | react-imask                                                             |
| UI                      | Tailwind CSS 4 + shadcn/ui (Radix, preset Nova) + lucide-react          |
| Tabelas                 | TanStack Table 9                                                        |
| Datas                   | date-fns (locale `ptBR`)                                                |
| Notificações            | sonner (via shadcn)                                                     |
| Mocks                   | MSW 3                                                                   |
| Testes                  | Vitest 5 + Testing Library + jsdom · Playwright                         |
| Qualidade               | ESLint 10 (flat config, `typescript-eslint`, `react-hooks`) + Prettier  |

## Design (Figma)

O visual foi aplicado a partir da visualização do [Figma do Veridt](https://www.figma.com/design/D4vDhuk1DBAJY9knexl7Hs/Veridt?node-id=0-1):

- **Tokens** em `src/index.css`: cor principal `#0F7C69` (`--brand`), barra lateral verde, raio `0.5rem`. O Figma só define o modo claro, que é o padrão; o modo escuro continua suportado pela classe `dark` no `<html>`, com tokens derivados da marca.
- **Telas públicas** (`PublicLayout`): painel verde com logo e ilustração à esquerda e formulário à direita; no celular, só o formulário.
- **Login**: "Acesse sua conta", senha com botão de mostrar/ocultar, "Esqueci a senha". Foi acrescentado o link "Criar conta", que não aparece no Figma, para a tela de cadastro continuar acessível.
- **Cadastro**: abas "Usuário Comum | Advogado", CPF e "Número da OAB" lado a lado, OAB num campo único no formato `000000/UF` (validado contra as 27 UFs).
- **Área logada** (`AppLayout`): barra lateral verde sem cabeçalho, com "Novo Registro", "Lista dos Registros" e "Comprar Créditos"; no rodapé, inicial do nome, nome, "Créditos: N" e "Sair da conta". No celular, a barra vira um `sheet` aberto por uma faixa verde no topo.
- **Páginas**: título grande e subtítulo verde (`PageHeader`); a listagem usa as colunas do Figma (Status, Data/hora início, Data/hora fim, Ações).

**Limitação:** o conector do Figma exige acesso de edição ao arquivo, e a conta conectada só tem visualização. Por isso cores, tamanhos e textos foram lidos de capturas de tela, não das variáveis do arquivo, e a fonte continua a Geist (a do Figma não pôde ser confirmada). Com acesso de edição, confira os tokens de `src/index.css` com as variáveis do Figma.

## Compra de créditos (REQ 05–07)

Segue o Figma "Compra Créditos" numa única tela (`PurchasePage`), em vez das três etapas separadas da especificação; `/creditos/checkout/:pacoteId` abre a mesma tela com o pacote escolhido.

1. **Escolha do pacote:** Básico, Médio ou Premium, com preço, créditos, valor por crédito e benefícios (Apêndice A), vindos de `GET /api/credits/packages`.
2. **Dados de faturamento** (Apêndice A): nome, e-mail e CPF vêm da conta (bloqueados, como no Figma); telefone, CEP, endereço, número, complemento, bairro, cidade e estado são validados com os validadores de `shared/lib/validators`. Telefone, CPF e CEP vão à API só com dígitos.
3. **Pagamento:**
   - **Pix:** `POST /api/credits/purchases` devolve o QR Code e o código "copia e cola", mostrados no modal "PIX Gerado". O app consulta `GET /api/credits/payments/{id}` a cada 3 s até o status sair de `PENDING`; ao aprovar, atualiza o saldo (query `['me']`).
   - **Mercado Pago:** a resposta traz `checkoutUrl` (o `init_point` do Checkout Pro) e o usuário é levado para lá; o retorno cai em `/creditos/pagamento/{id}`, que acompanha o status.
4. **Idempotência:** cada tentativa de compra envia um cabeçalho `Idempotency-Key` (UUID). Repetir a mesma requisição não gera um segundo pagamento, como pede a tática de confiabilidade da arquitetura.

### Contrato provisório de créditos

| Método | Caminho                      | Corpo                                 | Resposta                          |
| ------ | ---------------------------- | ------------------------------------- | --------------------------------- |
| `GET`  | `/api/credits/packages`      | —                                     | 200 `CreditPackage[]`             |
| `POST` | `/api/credits/purchases`     | `PurchaseRequest` + `Idempotency-Key` | 201 `Payment` / 400 ProblemDetail |
| `GET`  | `/api/credits/payments/{id}` | —                                     | 200 `Payment` / 404               |

Os tipos estão em `src/features/credits/api/types.ts`. Erros de campo do faturamento podem vir como `billing.<campo>` (ex.: `billing.cep`) e aparecem no campo correspondente.

Nos mocks, o pagamento é aprovado sozinho 6 s depois de criado e os créditos entram no saldo do usuário simulado. O QR Code dos mocks é só ilustrativo, não é um Pix válido.

## Pré-requisitos

- **Node 24** (veja `.nvmrc`).
- **pnpm 12**, habilitado pelo Corepack (a versão está fixada em `packageManager` no `package.json`):

  ```bash
  corepack enable pnpm
  ```

  Sem permissão para o `corepack enable`, use `corepack pnpm <comando>` no lugar de `pnpm <comando>`.

- Docker (opcional, para a imagem de produção).

## Como rodar

```bash
pnpm install
cp .env.example .env
```

### Com o backend

Suba o backend em `http://localhost:8080` e rode:

```bash
pnpm dev
```

O Vite (porta 5173) faz proxy de `/api`, `/ws` (WebSocket) e `/v3/api-docs` para `VITE_BACKEND_URL`. Frontend e API ficam **na mesma origem** por causa do cookie de sessão e do CSRF, por isso **não há CORS**.

### Sem o backend (mocks)

No `.env`, defina `VITE_ENABLE_MOCKS=true` e rode `pnpm dev`. O MSW intercepta as chamadas no navegador. Os handlers ficam em `src/mocks/handlers/` e são os mesmos usados pelo Vitest. Hoje cobrem todos os endpoints de autenticação, com usuários em memória: cadastrar → entrar → `/me` → sair funciona sem backend.

Há um usuário de demonstração já cadastrado (definido em `src/mocks/handlers/auth.ts`):

| E-mail             | Senha            |
| ------------------ | ---------------- |
| `demo@veridt.test` | `senha-demo-123` |

Os dados dos mocks ficam só na memória da página: ao recarregar, os cadastros feitos somem e volta apenas o usuário de demonstração.

## Rotas

| Rota                               | Tela                                               | Acesso      | Estado                          |
| ---------------------------------- | -------------------------------------------------- | ----------- | ------------------------------- |
| `/login`                           | Login                                              | pública     | pronta                          |
| `/cadastro`                        | Cadastro (advogado ou usuário comum)               | pública     | pronta                          |
| `/recuperar-senha`                 | Solicitar recuperação de senha                     | pública     | pronta                          |
| `/`                                | Redireciona para `/registros`                      | autenticada | pronta                          |
| `/creditos`                        | Compra: pacotes, faturamento e pagamento           | autenticada | pronta (mocks)                  |
| `/creditos/checkout/:pacoteId`     | A mesma tela, com o pacote já escolhido            | autenticada | pronta (mocks)                  |
| `/creditos/pagamento/:pagamentoId` | Status do pagamento (retorno do Mercado Pago, Pix) | autenticada | pronta (mocks)                  |
| `/capturas/nova`                   | Novo registro                                      | autenticada | placeholder                     |
| `/capturas/:id/sessao`             | Navegador remoto ao vivo                           | autenticada | esqueleto (`RemoteBrowserView`) |
| `/registros`                       | Lista de registros                                 | autenticada | placeholder com tabela vazia    |
| `/registros/:id`                   | Detalhes, relatório e ZIP                          | autenticada | placeholder                     |
| `*`                                | 404                                                | —           | pronta                          |

- As rotas autenticadas ficam sob o `RequireAuth`, que consulta `GET /api/me`. Sem sessão (401), ele redireciona para `/login?redirect=<rota>`.
- As rotas públicas ficam sob o `RedirectIfAuthenticated`: quem já está logado vai para `/` (ou para o `?redirect=`, aceito só se for um caminho interno).
- Layouts e páginas são carregados sob demanda (`lazy`), um chunk por tela.
- Ao iniciar, o app chama `GET /api/auth/csrf`, e repete após login e logout, porque o Spring troca o token.

### Variáveis de ambiente

| Variável            | Padrão                  | Descrição                                    |
| ------------------- | ----------------------- | -------------------------------------------- |
| `VITE_BACKEND_URL`  | `http://localhost:8080` | Alvo do proxy do Vite em desenvolvimento     |
| `VITE_ENABLE_MOCKS` | `false`                 | `true` liga o MSW no navegador (só em `dev`) |

## Scripts

| Script              | O que faz                                         |
| ------------------- | ------------------------------------------------- |
| `pnpm dev`          | Servidor de desenvolvimento                       |
| `pnpm build`        | `tsc -b && vite build`                            |
| `pnpm preview`      | Serve o `dist/`                                   |
| `pnpm lint`         | ESLint                                            |
| `pnpm format`       | Prettier (escreve) · `pnpm format:check` só checa |
| `pnpm typecheck`    | Checagem de tipos                                 |
| `pnpm test`         | Vitest (uma execução) · `pnpm test:watch`         |
| `pnpm e2e`          | Playwright (sobe o `pnpm dev` com mocks)          |
| `pnpm api:generate` | Gera o cliente da API com o orval                 |

## Gerar o cliente da API

```bash
pnpm api:generate
```

Lê `http://localhost:8080/v3/api-docs` (ou `ORVAL_INPUT=<url ou arquivo>`) e gera, em `src/shared/api/generated/`, os modelos e os hooks do TanStack Query por tag (`tags-split`), usando o mutator `customInstance` de `src/shared/api/http.ts`.

- **O backend ainda não expõe OpenAPI** (pendência 1). Até lá, os endpoints são escritos à mão em `features/*/api/`, no mesmo formato que o orval geraria.
- **Commite a pasta `generated/`** depois de gerar: o build não depende do orval nem do backend rodando.
- Os caminhos do OpenAPI vêm com `/api`. O `customInstance` remove esse prefixo, porque a instância Axios já usa `baseURL: '/api'`.

## Testes

```bash
pnpm test
pnpm exec playwright install chromium   # só na primeira vez
pnpm e2e
```

- **Vitest** (`jsdom`): setup em `src/test/setup.ts` com `@testing-library/jest-dom` e o servidor MSW (`onUnhandledFrame: 'error'`). Cobre os validadores (CPF, CEP, telefone, OAB/UF), a formatação, o `applyProblemDetailToForm`, o interceptor HTTP, o formulário de cadastro (a OAB só aparece e só é exigida para advogado; o formato `número/UF`; o corpo enviado à API), o login (incluindo o bloqueio de _open redirect_), o `RequireAuth`, o parser do protocolo da captura e a compra de créditos (schema de faturamento, pacote pré-escolhido pela URL, Pix com `Idempotency-Key` e aprovação, Mercado Pago, erros do backend e a tela de status). Como o jsdom não implementa `ResizeObserver` nem as APIs de ponteiro usadas pelo Radix, o setup define stubs mínimos.
- **Playwright** (sobe o app com `VITE_ENABLE_MOCKS=true`): `e2e/smoke.spec.ts` testa rota protegida sem sessão → login com `redirect`, e cadastrar → entrar → layout autenticado (com o saldo e o storage vazio) → sair; `e2e/credits.spec.ts` compra o Pacote Médio com Pix e confere o saldo atualizado.

## Docker

```bash
docker build -t veridt-frontend .
```

`Dockerfile` multi-stage: build com Node + pnpm e execução com `nginx:alpine`. O `nginx.conf`:

- serve o `dist/` com fallback de SPA (`try_files $uri /index.html`);
- faz proxy de `/api/` e `/ws/` (com `Upgrade`/`Connection`) para `http://backend:8080`, repassando `Host`, `X-Forwarded-For` e `X-Forwarded-Proto`;
- aplica cache longo em `/assets/` e `no-cache` no `index.html`;
- envia `X-Content-Type-Options`, `Referrer-Policy`, `X-Frame-Options: DENY` e uma CSP que permite o SDK do Mercado Pago;
- expõe `GET /healthz` para o healthcheck.

### Trecho para o `compose.yaml` do backend

Adicione no repositório do backend. O serviço do Spring já se chama `backend` e está na rede `veridt-net`, que é o que o `nginx.conf` espera. O `context` considera os dois repositórios clonados lado a lado na mesma pasta; repare no hífen no início do nome deste repositório:

```yaml
services:
  frontend:
    build:
      context: ../-MATA62---ENGENHARIA-DE-SOFTWARE-I-frontend # caminho deste repositório
    # ou: image: veridt-frontend:latest
    ports:
      - '80:80' # ou "3000:80"
    depends_on:
      - backend
    networks:
      - veridt-net
    restart: unless-stopped

networks:
  veridt-net:
    driver: bridge
```

## Estrutura de pastas

```
src/
  app/
    main.tsx              # bootstrap: MSW (opcional em dev), CSRF, providers, router
    providers.tsx         # Theme, QueryClientProvider, Toaster, Devtools
    routes.tsx            # definição das rotas (lazy por feature)
    router.tsx            # createBrowserRouter + redirecionamento em 401
    layouts/              # PublicLayout, AppLayout (sidebar + saldo + menu)
    pages/                # 404 e erro de rota
  features/
    auth/                 # módulo identity (REQ 01–04)
      api/                # endpoints.ts, types.ts, auth.ts (hooks no formato do orval)
      components/         # RequireAuth, RedirectIfAuthenticated, AuthCard
      lib/                # safeRedirect
      pages/              # Login, Cadastro, Recuperar senha (+ testes)
      schemas/            # schemas Zod
      index.ts            # API pública da feature
    credits/              # módulo credits (REQ 05–07)
      api/                # endpoints.ts, types.ts, credits.ts (hooks, polling do pagamento)
      components/         # PackageCards, PixDialog, PixDetails, PaymentStatusBadge
      pages/              # PurchasePage, PaymentStatusPage (+ testes)
      schemas/            # faturamento (Zod)
    capture/              # módulo capture (REQ 08–11): RemoteBrowserView, useCaptureSocket, types
    records/              # módulo records (REQ 12–15): tabela (TanStack Table) e placeholders
  shared/
    api/
      http.ts             # instância Axios, interceptores, customInstance (orval)
      query-client.ts     # QueryClient da aplicação
      problem-detail.ts   # tipos e utilitários de erro RFC 9457
      generated/          # saída do orval (commitada)
    components/
      ui/                 # componentes shadcn/ui
      form/               # FormTextField, MaskedInput (react-imask), PasswordInput, FormError
      page/               # PageHeader, PagePlaceholder
      theme/              # ThemeProvider (classe `dark` no <html>)
    lib/
      utils.ts            # cn()
      format.ts           # data, moeda (BRL), tamanho de arquivo
      validators/         # cpf, cep, phone, oab, uf (+ testes)
  mocks/
    browser.ts            # setupWorker
    server.ts             # setupServer (Vitest)
    handlers/             # handlers MSW por feature
  test/
    setup.ts              # jest-dom, MSW, stubs do jsdom
    render.tsx            # renderRoutes(): memory router + QueryClient
    session.ts            # loginAsDemo(): abre a sessão simulada
e2e/                    # smoke.spec.ts, credits.spec.ts
```

Use o alias `@/` → `src/`. Uma feature não importa os arquivos internos de outra: dentro dela use imports relativos e, entre features, a API pública `@/features/<nome>`. O ESLint impõe essa regra. O que for comum vai para `shared/`.

## Decisões técnicas

Registradas porque a especificação original conflitava com as versões atuais das bibliotecas:

1. **TypeScript 6.0, não 7.** O template atual do Vite usa TS 7, mas o `typescript-eslint` (8.72) só suporta TypeScript até `<6.1`. Atualize quando o `typescript-eslint` passar a suportar o 7.
2. **ESLint em vez de oxlint.** O template do Vite 8 vem com oxlint; a especificação pede ESLint com `typescript-eslint` e `react-hooks`.
3. **shadcn `field` em vez de `form`.** No registry atual (estilo `radix-nova`), o componente `form` foi descontinuado e substituído por `field`, que também se integra ao React Hook Form.
4. **Pacote `cn`.** O shadcn atual usa o pacote `cn` (substituto de `clsx` + `tailwind-merge`); `src/shared/lib/utils.ts` o reexporta.
5. **Sem `next-themes`.** O `sonner` do shadcn o importa; foi trocado por um `ThemeProvider` próprio e mínimo (`src/shared/components/theme/`), para não adicionar biblioteca fora da stack. A preferência de tema (claro/escuro/sistema) fica no `localStorage`; isso é preferência visual, não dado de sessão.
6. **Fonte Geist** (`@fontsource-variable/geist`): instalada pelo preset Nova do shadcn. Para trocar a tipografia, altere `--font-sans` em `src/index.css`.
7. **MSW 3:** a opção `onUnhandledRequest` virou `onUnhandledFrame`.
8. **TanStack Table 9:** a API mudou para `useTable({ features, columns, data })` com `tableFeatures()` (a `useReactTable` da v8 está em `@tanstack/react-table/legacy`).
9. **CSP:** além de `'self'`, o `connect-src`, o `img-src` e o `frame-src` liberam os domínios do Mercado Pago. O SDK carregado de `sdk.mercadopago.com` faz chamadas para `api.mercadopago.com` e abre iframes; só com `'self'` o checkout não funcionaria.
10. **Interceptor 401:** ignora `/api/me` e `/api/auth/*`, onde o 401 é esperado e tratado pela tela (sem sessão ou credenciais inválidas). Nos demais endpoints, limpa o cache e redireciona para `/login?redirect=<rota>`.
11. **pnpm:** os scripts de instalação só rodam para os pacotes liberados em `pnpm-workspace.yaml` (`allowBuilds`).
12. **Redirecionamento após o login:** quem navega é só o `RedirectIfAuthenticated`, ao ver o usuário na query `['me']`. A tela de login não navega por conta própria: duas navegações concorrentes faziam o app parar em `/` sem conteúdo. Pelo mesmo motivo, `/` → `/registros` é um `loader` com `redirect()`, e não um `<Navigate>`.
13. **Zod 4 e a OAB:** o `superRefine` do cadastro usa `when: () => true`. Sem isso, o Zod 4 só roda a validação condicional (OAB, confirmação de senha) depois que todos os outros campos estão válidos.
14. **Cookie CSRF nos mocks:** o handler de `/api/auth/csrf` grava o cookie direto em `document.cookie`. Com um `Set-Cookie` na resposta simulada, o MSW guardaria o cookie no `localStorage`.
15. **OAB em campo único:** a especificação previa número + seletor de UF; o Figma usa um campo `000000/UF`. Segue o Figma; o valor é validado (até 6 dígitos + uma das 27 UFs) e enviado como `"<numero>/<UF>"`, como antes.
16. **Falha do MSW não deixa a tela em branco:** se o Service Worker dos mocks não registrar, o app abre mesmo assim e mostra o aviso "Mocks desligados" (detalhes no console). Isso foi observado no navegador embutido do app Claude; em Chrome, Edge ou Firefox normais os mocks funcionam.
17. **Compra numa tela só:** a especificação previa `/creditos` → `/creditos/checkout/:pacoteId` → `/creditos/pagamento/:pagamentoId`; o Figma junta pacotes, faturamento e pagamento numa tela, com o Pix num modal. Segue o Figma; as três rotas continuam existindo.
18. **`cpf` no `User`:** o Figma mostra o CPF já preenchido no faturamento, então o contrato provisório de `GET /api/me` ganhou `cpf` (opcional). Sem ele, o campo fica editável.
19. **Estado como seletor:** o Figma desenha "Estado" como campo de texto; o app usa um seletor com as 27 UFs, para garantir uma sigla válida.

## Pendências a combinar com o backend

1. Adicionar `springdoc-openapi` (linha 3.x, compatível com Spring Boot 4) e expor `/v3/api-docs`.
2. Prefixar todos os controllers com `/api`.
3. CSRF para SPA com `http.csrf(csrf -> csrf.spa())`, que configura o `CookieCsrfTokenRepository.withHttpOnlyFalse()` junto com o tratador de token próprio para SPA, e o endpoint `GET /api/auth/csrf`, que força a gravação do cookie `XSRF-TOKEN`. **Atenção:** usar só o `CookieCsrfTokenRepository.withHttpOnlyFalse()` com o tratador padrão (proteção BREACH) faz todo POST do frontend receber 403, porque o Axios envia o valor bruto do cookie. A rota do webhook do Mercado Pago deve ficar fora do CSRF e ter a autenticidade verificada por assinatura.
4. Login via JSON (`POST /api/auth/login`), retornando 401 em JSON, sem `formLogin`/redirect. Também `GET /api/me` e o _entry point_ retornando 401 em vez de redirect.
5. Erros de validação em `ProblemDetail` com a lista `errors[{ field, message }]`.
6. O cookie `SESSION` com `HttpOnly`, `SameSite=Lax` e `Secure` em produção.
7. Endpoint WebSocket `/ws/capture/{sessionId}` autenticado pela sessão.
8. O formato do número da OAB (proposta: `"<numero>/<UF>"`).
9. `server.forward-headers-strategy=native` (ou `framework`) no `application.properties`, para o Spring respeitar o `X-Forwarded-Proto`/`X-Forwarded-For` enviados pelo nginx. Sem isso, o cookie `Secure`, os redirects e o IP registrado na trilha de auditoria saem errados atrás do proxy.
10. **Créditos:** os endpoints e tipos de "Contrato provisório de créditos"; o pacote e o valor vêm sempre do backend (o frontend não envia preço); suporte a `Idempotency-Key` em `POST /api/credits/purchases`; integração Pix/Checkout Pro do Mercado Pago com `back_urls` apontando para `/creditos/pagamento/{id}`; webhook do Mercado Pago com assinatura verificada e fora do CSRF; `cpf` em `GET /api/me`.

## Próximos passos

- Confirmar o contrato de autenticação com o backend (pendências acima) e, quando houver OpenAPI, trocar `features/auth/api/` pelo cliente gerado pelo orval.
- Créditos: ligar ao backend real quando os endpoints existirem e, se o time quiser, preencher o endereço pelo CEP (via backend, para não abrir o `connect-src` da CSP).
- Telas de captura (REQ 08–11): formulário de novo registro e ligação do `RemoteBrowserView` ao protocolo definitivo.
- Telas de registros (REQ 12–15): listagem real, detalhes, relatório e download do ZIP.
- Conferir os tokens de `src/index.css` com as variáveis do Figma quando houver acesso de edição.
