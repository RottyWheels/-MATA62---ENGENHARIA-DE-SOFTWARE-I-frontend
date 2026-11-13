# Veridt — Frontend

Plataforma web para capturar e gravar o conteúdo de páginas da internet, produzindo **evidências digitais rastreáveis**. Advogados e usuários comuns compram créditos (Mercado Pago ou Pix) e os usam para registrar capturas de tela ou vídeos de navegação. Depois, consultam os registros, geram relatórios e exportam ZIP.

Este repositório contém **a base do frontend**: ambiente, ferramentas e infraestrutura compartilhada. O backend (monólito modular em Java 25 + Spring Boot 4.1 + Spring Modulith) fica em [`igor377/MATA62---ENGENHARIA-DE-SOFTWARE-I`](https://github.com/igor377/MATA62---ENGENHARIA-DE-SOFTWARE-I).

Requisitos, ADRs e táticas arquiteturais estão em [`iuryyxd/MATA62-Veridt`](https://github.com/iuryyxd/MATA62-Veridt). As telas finais vêm do [Figma do Veridt](https://www.figma.com/design/D4vDhuk1DBAJY9knexl7Hs/Veridt?node-id=0-1); o tema foi centralizado em `src/index.css` para facilitar a troca.

> **Estado atual:** ambiente configurado, rotas e layouts prontos e o fluxo de autenticação (cadastro, login, recuperação e redefinição de senha, logout) ligado ao backend real (branch `desenv`, ver [Integração com o backend](#integração-com-o-backend)) e também aos mocks. O visual segue o Figma (cor `#0F7C69`, telas públicas divididas e barra lateral verde). A compra de créditos (pacotes, faturamento, Pix e Mercado Pago) e a lista dos registros (filtros, detalhes com os hashes, relatório e download) funcionam contra os mocks. Na captura, o formulário de Novo Registro (com custo e saldo) abre o navegador remoto simulado (abrindo, site fora do ar e pronto), com captura de tela, gravação com cronômetro, conclusão e cancelamento; os diálogos de conclusão e de falha ainda faltam (ver [Rotas](#rotas) e o [planejamento](docs/planejamento/telas-captura-e-registros.md)).
>
> O que foi entregue em cada sprint está em [`docs/sprints/`](docs/sprints/): [Sprint 1](docs/sprints/sprint-1.md).

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
- **Cadastro**: abas "Usuário Comum | Advogado"; para advogado, a lista "Inscrições na OAB", com o número no formato `000000/UF` do Figma (validado contra as 27 UFs) e o tipo (principal, suplementar ou estagiário). "Adicionar inscrição" inclui mais linhas; a primeira não pode ser removida.
- **Área logada** (`AppLayout`): barra lateral verde sem cabeçalho, com "Novo Registro", "Lista dos Registros" e "Comprar Créditos"; no rodapé, inicial do nome, nome, "Créditos: N" e "Sair da conta". No celular, a barra vira um `sheet` aberto por uma faixa verde no topo.
- **Páginas**: título grande e subtítulo verde (`PageHeader`); a listagem usa as colunas do Figma (Status, Data/hora início, Data/hora fim, Ações).

**Limitação:** o conector do Figma exige acesso de edição ao arquivo, e a conta conectada só tem visualização. Por isso cores, tamanhos e textos foram lidos de capturas de tela, não das variáveis do arquivo, e a fonte continua a Geist (a do Figma não pôde ser confirmada). Com acesso de edição, confira os tokens de `src/index.css` com as variáveis do Figma.

## Compra de créditos (REQ 05–07)

Segue o Figma "Compra Créditos" numa única tela (`PurchasePage`), em vez das três etapas separadas da especificação; `/creditos/checkout/:pacoteId` abre a mesma tela com o pacote escolhido.

1. **Escolha do pacote:** Básico, Médio ou Premium, com preço, créditos, valor por crédito e benefícios (Apêndice A), vindos de `GET /api/credits/packages`.
2. **Dados de faturamento** (Apêndice A): nome e e-mail vêm da conta (bloqueados, como no Figma); o CPF é digitado, porque o backend não o devolve em `GET /api/me`; telefone, CEP, endereço, número, complemento, bairro, cidade e estado são validados com os validadores de `shared/lib/validators`. Telefone, CPF e CEP vão à API só com dígitos.
3. **Pagamento:**
   - **Pix:** `POST /api/credits/purchases` devolve o QR Code e o código "copia e cola", mostrados no modal "PIX Gerado". O app consulta `GET /api/credits/payments/{id}` a cada 3 s até o status sair de `PENDING`; ao aprovar, atualiza o saldo (query `['me']`).
   - **Mercado Pago:** a resposta traz `checkoutUrl` (o `init_point` do Checkout Pro) e o usuário é levado para lá; o retorno cai em `/creditos/pagamento/{id}`, que acompanha o status.
4. **Idempotência:** cada tentativa de compra envia um cabeçalho `Idempotency-Key` (UUID). Repetir a mesma requisição não gera um segundo pagamento, como pede a tática de confiabilidade da arquitetura.

### Contrato provisório de créditos

| Método | Caminho                      | Corpo                                 | Resposta                            |
| ------ | ---------------------------- | ------------------------------------- | ----------------------------------- |
| `GET`  | `/api/credits/packages`      | —                                     | 200 `CreditPackage[]`               |
| `POST` | `/api/credits/purchases`     | `PurchaseRequest` + `Idempotency-Key` | 201 `Payment` / 400 `ErrorResponse` |
| `GET`  | `/api/credits/payments/{id}` | —                                     | 200 `Payment` / 404                 |

Os tipos estão em `src/features/credits/api/types.ts`. Erros de campo do faturamento podem vir como `billing.<campo>` (ex.: `billing.cep`) e aparecem no campo correspondente.

Nos mocks, o pagamento é aprovado sozinho 6 s depois de criado e os créditos entram no saldo do usuário simulado. O QR Code dos mocks é só ilustrativo, não é um Pix válido.

## Captura (REQ 08 a 11)

- **Novo Registro** (`/capturas/nova`): título e URL do site (com `http://` ou `https://`), o custo do registro e o saldo. Sem saldo, um aviso leva para "Comprar créditos" e o botão "Iniciar Registro" fica desativado; quando o backend não informa o saldo, a resposta 402 `SALDO_INSUFICIENTE` mostra o mesmo aviso. Ao iniciar, o app abre `/capturas/{id}/sessao`.
- **Sessão ao vivo** (`/capturas/{id}/sessao`): a mesma tela do Figma, com o título e a URL bloqueados e o navegador remoto (`RemoteBrowserView`) ligado ao WebSocket. Enquanto o site abre, uma cobertura avisa e os botões ficam desativados; se o site não abrir, o aviso diz que nada foi cobrado e oferece "Tentar novamente" (nova sessão, no lugar da que falhou) ou "Alterar endereço" (volta ao formulário preenchido). Com o site aberto, o canvas repassa mouse, rolagem e teclado. Se a conexão cair, o app avisa e reconecta sozinho. O endereço retoma a sessão ao recarregar a página (com o backend real; nos mocks, recarregar apaga a sessão).
- **Gravação e capturas** (Figma "Criar Novo Registro" e o canvas): "Capturar Tela" avisa e acrescenta a captura à faixa "Capturas desta sessão", com uma miniatura do quadro na tela. "Iniciar Gravação" vira "Concluir gravação", com o selo "Gravando", o cronômetro e uma moldura azul no navegador; dá para capturar a tela durante a gravação. "Concluir registro" fica disponível com ao menos uma captura ou gravação (se estiver gravando, conclui a gravação junto) e desconta o crédito. "Cancelar registro" pede confirmação e não cobra nada. Os diálogos de conclusão e de falha são a task C5.

### Contrato provisório de captura

| Método | Caminho                                        | Corpo            | Resposta                                       |
| ------ | ---------------------------------------------- | ---------------- | ---------------------------------------------- |
| `GET`  | `/api/captures/price`                          | —                | 200 `{ creditsPerRecord }`                     |
| `POST` | `/api/captures`                                | `{ title, url }` | 201 `Capture` / 400 / 402 `SALDO_INSUFICIENTE` |
| `GET`  | `/api/captures/{id}`                           | —                | 200 `Capture` / 404                            |
| `POST` | `/api/captures/{id}/screenshots`               | —                | 201 `{ name, capturedAt }` / 409               |
| `POST` | `/api/captures/{id}/recording/start` e `/stop` | —                | 200 `Capture` / 409                            |
| `POST` | `/api/captures/{id}/finish`                    | —                | 200 `{ recordId }` / 409 / 402                 |
| `POST` | `/api/captures/{id}/cancel`                    | —                | 204 / 409                                      |

O WebSocket `/ws/capture/{id}` manda `{ type: 'status', status }` e `{ type: 'frame', data, width, height }` (JPEG em base64). Status da sessão: `LOADING` (abrindo o site), `READY`, `RECORDING`, `LOAD_FAILED`, `FINISHED`, `FAILED` e `CANCELED`; os quatro últimos encerram a sessão e o socket não reconecta. O crédito só é descontado em `/finish`, que cria o registro em `PROCESSANDO`; falha, site fora do ar ou cancelamento não cobram nada.

Nos mocks, o site "abre" em 0,8 s e os quadros são desenhados com `OffscreenCanvas` (no jsdom, um JPEG de 1×1); cliques, rolagem e teclado geram um quadro novo, no máximo a cada 250 ms (movimento do mouse não gera). Uma URL com `nao-abre` simula um site fora do ar.

## Registros (REQ 12 a 15)

Seguem o Figma "Lista dos Registros" e "Lista dos Registros - Detalhes", mais os estados do [canvas de propostas](https://claude.ai/artifact/SKFcazv49CfXqTM6x7FoyN) (busca, filtros, vazio, processando, relatório).

- **Lista** (`/registros`): título com o domínio do site, status com palavra e cor, horários de início e fim. Busca (título ou URL, com espera de 300 ms), filtros de status e período e paginação ficam na URL (`?q=&status=&periodo=&pagina=`), então o link e o botão voltar funcionam. Estados de carregando, vazio ("Fazer o primeiro registro"), sem resultado ("Limpar filtros") e erro ("Tentar novamente").
- **Detalhes** (`/registros/:id`): painel lateral sobre a lista, como no Figma. Mostra os campos do Figma, o site e o SHA-256 completo de cada arquivo, com "Copiar". Em processamento, consulta o registro a cada 5 s até concluir. Fechar volta para a lista com os mesmos filtros.
- **Relatório e ZIP**: "Gerar relatório" abre uma prévia do conteúdo do PDF (montada com os dados do registro, porque a CSP não permite exibir um PDF dentro da página) e "Baixar PDF" baixa o arquivo do backend. "Fazer download (.zip)" baixa o pacote. Os dois só ficam disponíveis com o registro concluído.

### Contrato provisório de registros

| Método | Caminho                    | Parâmetros                                                 | Resposta                                     |
| ------ | -------------------------- | ---------------------------------------------------------- | -------------------------------------------- |
| `GET`  | `/api/records`             | `page` (desde 0), `size`, `status`, `q`, `from` (ISO 8601) | 200 `Page<RecordSummary>`                    |
| `GET`  | `/api/records/{id}`        | —                                                          | 200 `RecordDetails` / 404                    |
| `GET`  | `/api/records/{id}/report` | —                                                          | 200 `application/pdf` / 409 se não concluído |
| `GET`  | `/api/records/{id}/export` | —                                                          | 200 `application/zip` / 409 se não concluído |

Os tipos estão em `src/features/records/api/types.ts`. Status: `EM_ANDAMENTO`, `PROCESSANDO`, `CONCLUIDO` e `FALHOU`; um registro cancelado não é criado. Nos mocks, só o usuário de demonstração tem registros (25, com um processando que conclui sozinho em 20 s e dois que falharam); contas novas veem a lista vazia.

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

Resumo (detalhes em [Integração com o backend](#integração-com-o-backend)):

1. No repositório do backend, use a branch `feature/identity-me` (ou o `desenv`, quando ela for integrada), crie o `.env` a partir do `.env.example` com `RESET_URL=http://localhost:5173/redefinir-senha` e suba tudo com `docker compose up --build`.
2. No `.env` deste repositório, deixe `VITE_ENABLE_MOCKS=false` e rode:

```bash
pnpm dev
```

O Vite (porta 5173) faz proxy de `/api`, `/ws` (WebSocket) e `/v3/api-docs` para `VITE_BACKEND_URL`. Frontend e API ficam **na mesma origem** por causa do cookie de sessão e do CSRF, por isso **não há CORS**.

### Sem o backend (mocks)

No `.env`, defina `VITE_ENABLE_MOCKS=true` e rode `pnpm dev`. O MSW intercepta as chamadas no navegador. Os handlers ficam em `src/mocks/handlers/` e são os mesmos usados pelo Vitest. Os de autenticação imitam o backend real (respostas, códigos de erro e o formato `ErrorResponse`); os de créditos seguem o contrato provisório. Para testar a tela `/redefinir-senha` nos mocks, use `?token=token-de-teste`.

Há um usuário de demonstração já cadastrado (definido em `src/mocks/handlers/auth.ts`):

| E-mail             | Senha            |
| ------------------ | ---------------- |
| `demo@veridt.test` | `senha-demo-123` |

Os dados dos mocks ficam só na memória da página: ao recarregar, os cadastros feitos somem e volta apenas o usuário de demonstração.

## Integração com o backend

O frontend segue o backend da branch `desenv` (sprint 1: módulo `identity`, REQ 01–04).

### Como subir

Pré-requisito: Docker Desktop. Não é preciso instalar Java: o `Dockerfile` do backend compila com Maven dentro do container.

```bash
cd ../MATA62---ENGENHARIA-DE-SOFTWARE-I
git switch feature/identity-me
cp .env.example .env
```

No `.env` do backend, defina `POSTGRES_PASSWORD`, `S3_SECRET_KEY` e `RESET_URL=http://localhost:5173/redefinir-senha`. Depois:

```bash
docker compose up --build
```

Com o backend em `http://localhost:8080` e `VITE_ENABLE_MOCKS=false`, rode `pnpm dev` aqui e abra `http://localhost:5173`. Os e-mails de recuperação de senha aparecem no Mailpit, em `http://localhost:8025`.

### Contrato de autenticação

| Método | Caminho                            | Corpo                                                              | Resposta                                   |
| ------ | ---------------------------------- | ------------------------------------------------------------------ | ------------------------------------------ |
| `GET`  | `/api/auth/csrf`                   | —                                                                  | 204 + cookie `XSRF-TOKEN`                  |
| `POST` | `/api/auth/register`               | `fullName`, `email`, `password`, `cpf`, `type`, `oabRegistrations` | 201 `UserResponse` / 400 / 409             |
| `POST` | `/api/auth/login`                  | `email`, `password`                                                | 204 / 401 `CREDENCIAIS_INVALIDAS`          |
| `POST` | `/api/auth/logout`                 | —                                                                  | 204                                        |
| `POST` | `/api/auth/password-reset`         | `email`                                                            | 202 (sempre)                               |
| `POST` | `/api/auth/password-reset/confirm` | `token`, `newPassword`                                             | 204 / 422 `TOKEN_INVALIDO`                 |
| `GET`  | `/api/me`                          | —                                                                  | 200 `UserResponse` / 401 `NAO_AUTENTICADO` |

- **`GET /api/me` ainda não está no `desenv`.** Foi escrito na branch `feature/identity-me` do backend (commit local, falta abrir o PR). Sem ele, o app não sabe quem está logado e volta sempre para o login.
- **Login devolve 204 sem corpo.** Depois dele o app renova o token CSRF (o Spring troca o token ao autenticar) e busca o usuário em `GET /api/me`.
- **`UserResponse`** traz `id`, `fullName`, `email`, `type`, `oabRegistrations` e `createdAt`. Não traz CPF nem saldo de créditos: a barra lateral mostra "Créditos: —" até o módulo `credits` existir.
- **OAB:** cada linha da lista vira uma inscrição `{ number, state, type }` em `oabRegistrations`. A tela aplica as regras do `OabValidator` do backend: ao menos uma para advogado, no máximo 30, sem repetidas (zeros à esquerda contam como o mesmo número) e só uma principal.
- **Senha:** de 8 a 128 caracteres, com letra, número e símbolo (`PasswordPolicy` do backend). O cadastro e a redefinição validam a mesma regra antes de enviar.
- **Erros:** o backend responde com `ErrorResponse` (`{ timestamp, status, code, message, errors[{ field, message }] }`), não com `ProblemDetail`. O `applyProblemDetailToForm` aceita os dois formatos. Erros de uma inscrição (`oabRegistrations[1].number`) vão para a linha certa, pelo `resolveField`, e erros sem `errors[]` (409 `EMAIL_JA_CADASTRADO`, `CPF_JA_CADASTRADO`, `OAB_JA_CADASTRADA`) vão para o campo certo pelo `code`.
- **Créditos, captura e registros** ainda não existem no backend. Com `VITE_ENABLE_MOCKS=false`, a tela de compra mostra erro ao carregar os pacotes e a lista dos registros mostra "Não foi possível carregar os registros".

## Rotas

| Rota                               | Tela                                               | Acesso      | Estado                         |
| ---------------------------------- | -------------------------------------------------- | ----------- | ------------------------------ |
| `/login`                           | Login                                              | pública     | pronta                         |
| `/cadastro`                        | Cadastro (advogado ou usuário comum)               | pública     | pronta                         |
| `/recuperar-senha`                 | Solicitar recuperação de senha                     | pública     | pronta                         |
| `/redefinir-senha?token=`          | Nova senha (link do e-mail do backend)             | pública¹    | pronta                         |
| `/`                                | Redireciona para `/registros`                      | autenticada | pronta                         |
| `/creditos`                        | Compra: pacotes, faturamento e pagamento           | autenticada | pronta (mocks)                 |
| `/creditos/checkout/:pacoteId`     | A mesma tela, com o pacote já escolhido            | autenticada | pronta (mocks)                 |
| `/creditos/pagamento/:pagamentoId` | Status do pagamento (retorno do Mercado Pago, Pix) | autenticada | pronta (mocks)                 |
| `/capturas/nova`                   | Novo registro: título, URL, custo e saldo          | autenticada | pronta (mocks)                 |
| `/capturas/:id/sessao`             | Navegador remoto ao vivo                           | autenticada | abrindo, erro e pronto (mocks) |
| `/registros`                       | Lista: busca, filtros e paginação na URL           | autenticada | pronta (mocks)                 |
| `/registros/:id`                   | A lista com o painel de detalhes, relatório e ZIP  | autenticada | pronta (mocks)                 |
| `*`                                | 404                                                | —           | pronta                         |

- ¹ `/redefinir-senha` abre mesmo com sessão ativa, porque o link chega por e-mail. Redefinir a senha encerra todas as sessões do usuário no backend.
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

- **Vitest** (`jsdom`): setup em `src/test/setup.ts` com `@testing-library/jest-dom` e o servidor MSW (`onUnhandledFrame: 'error'`). Cobre os validadores (CPF, CEP, telefone, OAB/UF), a formatação, o `applyProblemDetailToForm`, o interceptor HTTP, o formulário de cadastro (a OAB só aparece e só é exigida para advogado; o formato `número/UF`; várias inscrições com tipo, repetidas, duas principais e remoção; a política de senha; o corpo enviado à API; erros de campo e conflitos 409 do backend), a redefinição de senha pelo link do e-mail, o login (incluindo o bloqueio de _open redirect_), o `RequireAuth`, a captura (contrato contra os mocks, `useCaptureSocket` com o WebSocket simulado, o formulário de Novo Registro com custo, saldo, 402 e erros do backend), os registros (API, lista, filtros, paginação, painel, relatório e download) e a compra de créditos (schema de faturamento, pacote pré-escolhido pela URL, Pix com `Idempotency-Key` e aprovação, Mercado Pago, erros do backend e a tela de status). Como o jsdom não implementa `ResizeObserver` nem as APIs de ponteiro usadas pelo Radix, o setup define stubs mínimos.
- **Playwright** (sobe o app com `VITE_ENABLE_MOCKS=true`): `e2e/smoke.spec.ts` testa rota protegida sem sessão → login com `redirect`, e cadastrar → entrar → layout autenticado (com o saldo e o storage vazio) → sair; `e2e/credits.spec.ts` compra o Pacote Médio com Pix e confere o saldo atualizado.

## Docker

Os arquivos ficam em `docker/`; o build roda a partir da raiz do repositório:

```bash
docker build -f docker/Dockerfile -t veridt-frontend .
```

`docker/Dockerfile` multi-stage: build com Node + pnpm e execução com `nginx:alpine`. O `docker/Dockerfile.dockerignore` tira `node_modules`, `.env` e afins do contexto (o Docker o lê por estar ao lado do `Dockerfile`). O `docker/nginx.conf`:

- serve o `dist/` com fallback de SPA (`try_files $uri /index.html`);
- faz proxy de `/api/` e `/ws/` (com `Upgrade`/`Connection`) para `http://backend:8080`, repassando `Host`, `X-Forwarded-For` e `X-Forwarded-Proto`;
- aplica cache longo em `/assets/` e `no-cache` no `index.html`;
- envia `X-Content-Type-Options`, `Referrer-Policy`, `X-Frame-Options: DENY` e uma CSP que permite o SDK do Mercado Pago;
- expõe `GET /healthz` para o healthcheck.

Para testar a imagem com o backend já rodando no Docker, sem mexer no `compose.yaml`, ligue o container na rede do backend (o Compose prefixa o nome da rede com o nome da pasta):

```bash
docker run -d --name veridt_frontend --network mata62---engenharia-de-software-i_veridt-net -p 8081:80 veridt-frontend
```

O app fica em `http://localhost:8081`, com a API pelo nginx. Testado com o backend do `desenv` + `GET /api/me`: telas, fallback da SPA, cabeçalhos de segurança, cadastro, login, `/api/me` e logout.

### Trecho para o `compose.yaml` do backend

Adicione no repositório do backend. O serviço do Spring já se chama `backend` e está na rede `veridt-net`, que é o que o `nginx.conf` espera. O `context` considera os dois repositórios clonados lado a lado na mesma pasta; repare no hífen no início do nome deste repositório:

```yaml
services:
  frontend:
    build:
      context: ../-MATA62---ENGENHARIA-DE-SOFTWARE-I-frontend # caminho deste repositório
      dockerfile: docker/Dockerfile
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
      components/         # RequireAuth, RedirectIfAuthenticated, AuthCard, OabRegistrationsField
      lib/                # safeRedirect
      pages/              # Login, Cadastro, Recuperar e Redefinir senha (+ testes)
      schemas/            # schemas Zod
      index.ts            # API pública da feature
    credits/              # módulo credits (REQ 05–07)
      api/                # endpoints.ts, types.ts, credits.ts (hooks, polling do pagamento)
      components/         # PackageCards, PixDialog, PixDetails, PaymentStatusBadge
      pages/              # PurchasePage, PaymentStatusPage (+ testes)
      schemas/            # faturamento (Zod)
    capture/              # módulo capture (REQ 08–11)
      api/                # endpoints.ts, types.ts, capture.ts (preço, sessão, captura de tela, gravação)
      components/         # CaptureCostNotice, RemoteBrowserView, CaptureToolbar, RecordingBadge, ScreenshotStrip, CancelCaptureDialog
      hooks/              # useCaptureSocket (WebSocket da sessão, com reconexão)
      pages/              # NewCapturePage, CaptureSessionPage (+ testes)
      schemas/            # título e URL (Zod)
      types.ts            # protocolo do WebSocket
    records/              # módulo records (REQ 12–15)
      api/                # endpoints.ts, types.ts, records.ts (hooks, consulta do registro em processamento)
      components/         # RecordsTable, RecordsFilters, RecordsPagination, RecordDetailsSheet, RecordReportDialog
      lib/                # filtros na URL, status, paginação, formatação dos detalhes
      pages/              # RecordsPage (lista + painel)
  shared/
    api/
      http.ts             # instância Axios, interceptores, customInstance (orval)
      query-client.ts     # QueryClient da aplicação
      problem-detail.ts   # erros da API (ErrorResponse do backend e RFC 9457)
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
e2e/                    # testes Playwright e playwright.config.ts
docker/                 # Dockerfile, Dockerfile.dockerignore, nginx.conf
docs/sprints/           # o que foi entregue em cada sprint
public/                 # arquivos servidos como estão (service worker do MSW)
```

Na raiz ficam só os arquivos que as ferramentas procuram lá: `package.json` (com a configuração do Prettier), `pnpm-lock.yaml`, `pnpm-workspace.yaml`, `index.html` (entrada do Vite), `vite.config.ts` (também a do Vitest, na chave `test`), os `tsconfig*.json`, `eslint.config.js`, `orval.config.ts`, `components.json` (shadcn) e os arquivos de editor e Git (`.editorconfig`, `.gitattributes`, `.gitignore`, `.nvmrc`, `.prettierignore`, `.env.example`).

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
15. **Várias inscrições na OAB:** o Figma desenha um único campo `000000/UF`, mas o backend aceita várias inscrições, de três tipos. A tela mantém o campo do Figma em cada linha, acrescenta o tipo e o botão "Adicionar inscrição". Com uma só inscrição principal, fica igual ao Figma, só com o seletor de tipo a mais.
16. **Falha do MSW não deixa a tela em branco:** se o Service Worker dos mocks não registrar, o app abre mesmo assim e mostra o aviso "Mocks desligados" (detalhes no console). Isso foi observado no navegador embutido do app Claude; em Chrome, Edge ou Firefox normais os mocks funcionam.
17. **Compra numa tela só:** a especificação previa `/creditos` → `/creditos/checkout/:pacoteId` → `/creditos/pagamento/:pagamentoId`; o Figma junta pacotes, faturamento e pagamento numa tela, com o Pix num modal. Segue o Figma; as três rotas continuam existindo.
18. **CPF digitado no faturamento:** o Figma mostra o CPF já preenchido, mas o backend não devolve o CPF em nenhuma resposta, de propósito. O campo fica editável.
19. **Estado como seletor:** o Figma desenha "Estado" como campo de texto; o app usa um seletor com as 27 UFs, para garantir uma sigla válida.
20. **Formato de erro do backend:** o tipo `ProblemDetail` do frontend ganhou `code` e `message`, e a mensagem geral passou a ser `message ?? detail ?? title`. O nome do tipo ficou, para não espalhar a mudança; ele descreve o erro da API, seja `ErrorResponse` ou RFC 9457.

## Pendências a combinar com o backend

Já resolvidas no `desenv`: prefixo `/api`, CSRF para SPA (`csrf.spa()` + `GET /api/auth/csrf`), login em JSON com 401 em JSON, erros de validação com `errors[{ field, message }]` e o formato da OAB (`oabRegistrations`).

1. **`GET /api/me`:** integrar a branch `feature/identity-me` (PR a abrir).
2. Adicionar `springdoc-openapi` (linha 3.x, compatível com Spring Boot 4) e expor `/v3/api-docs`, para gerar o cliente com o orval.
3. `RESET_URL` apontando para o frontend: o padrão do `compose.yaml` e do `application.properties` é `http://localhost:8080/redefinir-senha`, mas a tela fica no frontend (`http://localhost:5173/redefinir-senha` em dev; em produção, o endereço do nginx).
4. O cookie `SESSION` com `HttpOnly`, `SameSite=Lax` e `Secure` em produção.
5. Endpoint WebSocket `/ws/capture/{sessionId}` autenticado pela sessão.
6. `server.forward-headers-strategy=native` (ou `framework`) no `application.properties`, para o Spring respeitar o `X-Forwarded-Proto`/`X-Forwarded-For` enviados pelo nginx. Sem isso, o cookie `Secure`, os redirects e o IP registrado na trilha de auditoria saem errados atrás do proxy.
7. **Créditos:** os endpoints e tipos de "Contrato provisório de créditos"; `creditBalance` em `GET /api/me`; o pacote e o valor vêm sempre do backend (o frontend não envia preço); suporte a `Idempotency-Key` em `POST /api/credits/purchases`; integração Pix/Checkout Pro do Mercado Pago com `back_urls` apontando para `/creditos/pagamento/{id}`; webhook do Mercado Pago com assinatura verificada e fora do CSRF.

## Próximos passos

- Abrir o PR do `GET /api/me` no backend e, quando houver OpenAPI, trocar `features/auth/api/` pelo cliente gerado pelo orval.
- Créditos: ligar ao backend real quando os endpoints existirem e, se o time quiser, preencher o endereço pelo CEP (via backend, para não abrir o `connect-src` da CSP).
- Captura (REQ 09–11): a sessão ao vivo na mesma página do formulário, gravação, capturas de tela, conclusão e falha (tasks C3 a C5 do planejamento).
- Registros: ligar ao backend quando o módulo `records` existir.
- Conferir os tokens de `src/index.css` com as variáveis do Figma quando houver acesso de edição.
