# Sprint 1: Fundação do frontend, autenticação e compra de créditos

|                           |                                                                                                        |
| ------------------------- | ------------------------------------------------------------------------------------------------------ |
| **Período**               | 09/11/2026 a 11/11/2026                                                                                |
| **Branch**                | `main` (commits `94b1672` a `dbad69f`)                                                                 |
| **Backend de referência** | `desenv` do backend (`83d29f1`) + branch `feature/identity-me`                                         |
| **Requisitos atendidos**  | REQ 01, 02, 03 e 04, ligados ao backend real; REQ 05, 06 e 07 só com mocks                             |
| **Testes**                | 90 unitários e de componentes (Vitest) e 3 de ponta a ponta (Playwright), todos passando em 11/11/2026 |

## Objetivo

Montar a base técnica do frontend e entregar o primeiro módulo completo, o de autenticação, ligado ao backend real. A sprint também adiantou a tela de compra de créditos sobre um contrato provisório, para o backend implementar o módulo `credits` a partir dela.

## Entregas

### Fundação

| Entrega               | Conteúdo                                                                                                                                                                    |
| --------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Ambiente              | Vite 8, React 19 e TypeScript 6 no modo estrito, com pnpm via Corepack, ESLint, Prettier, `.editorconfig` e `.env.example`.                                                 |
| Interface             | Tailwind CSS 4 e shadcn/ui (Radix), com o visual do Figma: cor `#0F7C69`, telas públicas divididas e barra lateral verde.                                                   |
| Rotas                 | React Router no modo data, com cada tela carregada sob demanda. `RequireAuth` protege a área logada e `RedirectIfAuthenticated` tira quem já entrou das telas públicas.     |
| Comunicação com a API | Axios com cookie de sessão e token CSRF (`XSRF-TOKEN`), proxy do Vite para `/api` e `/ws` e tratamento global do 401.                                                       |
| Formulários           | React Hook Form + Zod, máscaras com react-imask e validadores próprios de CPF, CEP, telefone, OAB e UF.                                                                     |
| Mocks                 | MSW com o mesmo comportamento do backend, para desenvolver e testar sem ele.                                                                                                |
| Testes                | Vitest com Testing Library e Playwright.                                                                                                                                    |
| Entrega               | Imagem Docker em duas etapas (build com Node, execução com nginx). O nginx serve o app, encaminha `/api` e `/ws` ao backend e envia cabeçalhos de segurança, incluindo CSP. |

### Autenticação (REQ 01 a 04)

| Tela            | Rota                      | O que faz                                                                                                                                                                                    |
| --------------- | ------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Cadastro        | `/cadastro`               | Usuário comum ou advogado. CPF com máscara e dígitos verificadores. Advogado informa uma ou mais inscrições na OAB (`000000/UF`), cada uma com o tipo: principal, suplementar ou estagiário. |
| Login           | `/login`                  | Leva para a página pedida antes do login (`?redirect=`), aceitando só caminhos internos.                                                                                                     |
| Esqueci a senha | `/recuperar-senha`        | Pede o link por e-mail. A resposta é a mesma com ou sem conta, como no backend.                                                                                                              |
| Redefinir senha | `/redefinir-senha?token=` | Destino do link do e-mail. Avisa que todas as sessões foram encerradas.                                                                                                                      |
| Sair da conta   | barra lateral             | Encerra a sessão e limpa os dados em memória.                                                                                                                                                |

As regras de validação são as mesmas do backend:

- **Senha:** de 8 a 128 caracteres, com letra, número e símbolo.
- **Limites:** nome com até 150 caracteres e e-mail com até 254.
- **Inscrições na OAB:** ao menos uma para advogado, no máximo 30, sem repetidas e só uma principal.

Os erros do backend aparecem no campo certo. Isso vale também para os conflitos 409 (e-mail, CPF e OAB já cadastrados) e para o erro de uma inscrição específica.

### Compra de créditos (REQ 05 a 07, só com mocks)

| Tela               | Rota                                         | O que faz                                                                                                     |
| ------------------ | -------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| Compra de Créditos | `/creditos` e `/creditos/checkout/:pacoteId` | Pacotes Básico, Médio e Premium, dados de faturamento e pagamento numa tela só, como no Figma.                |
| Pix                | modal "PIX Gerado"                           | QR Code e código copia e cola. Consulta o status a cada 3 s e atualiza o saldo quando o pagamento é aprovado. |
| Mercado Pago       | `/creditos/pagamento/:pagamentoId`           | Retorno do Checkout Pro, que acompanha o status do pagamento.                                                 |

Cada compra envia o cabeçalho `Idempotency-Key`, para uma repetição não gerar um segundo pagamento. Os endpoints de créditos ainda não existem no backend; o contrato proposto está no README, em "Contrato provisório de créditos".

### Captura e registros (esqueleto)

- **`/capturas/:id/sessao`:** o componente `RemoteBrowserView` e o hook `useCaptureSocket` estão prontos para o WebSocket `/ws/capture/{sessionId}`, com um protocolo provisório.
- **`/registros`:** a listagem tem as colunas do Figma.
- **`/capturas/nova` e `/registros/:id`:** ainda são placeholders.

## Integração com o backend

O cadastro, o login, a recuperação de senha e a saída foram testados no navegador contra o backend real, rodando no Docker. Também foi testado o caminho pela imagem do frontend com nginx.

| Rota do backend                         | Usada em                           | Situação                              |
| --------------------------------------- | ---------------------------------- | ------------------------------------- |
| `GET /api/auth/csrf`                    | início do app, após login e logout | ✅                                    |
| `POST /api/auth/register`               | `/cadastro`                        | ✅                                    |
| `POST /api/auth/login`                  | `/login`                           | ✅                                    |
| `POST /api/auth/logout`                 | "Sair da conta"                    | ✅                                    |
| `POST /api/auth/password-reset`         | `/recuperar-senha`                 | ✅                                    |
| `POST /api/auth/password-reset/confirm` | `/redefinir-senha`                 | ✅                                    |
| `GET /api/me`                           | sessão em todas as telas logadas   | ⚠️ só na branch `feature/identity-me` |

Ajustes feitos para seguir o backend real:

- **Formato de erro:** o frontend passou a ler o `ErrorResponse` (`code`, `message`, `errors`).
- **Login:** responde 204 sem corpo, e o usuário logado vem de `GET /api/me`.
- **OAB:** é enviada como a lista `oabRegistrations`.
- **CPF:** o backend nunca o devolve, então o CPF do faturamento é digitado.

### `GET /api/me` no backend

O backend não tinha uma rota que dissesse quem está logado, e sem ela o frontend não consegue manter a sessão ao recarregar a página. A rota foi criada na branch `feature/identity-me` do backend, com dois testes. Ela devolve o mesmo `UserResponse` do cadastro, sem CPF, e 401 sem sessão. A branch já está no GitHub e falta integrá-la ao `desenv`.

## Qualidade

- **Testes unitários e de componentes (Vitest), 90 testes em 13 arquivos:**
  - validadores (CPF, CEP, telefone, OAB e UF) e formatação;
  - cliente HTTP e leitura de erros;
  - cadastro, incluindo várias inscrições na OAB, repetidas, duas principais, remoção e erros do backend por linha;
  - login, com o bloqueio de redirecionamento externo, e `RequireAuth`;
  - redefinição de senha;
  - compra de créditos e status do pagamento;
  - protocolo da captura.
- **Testes de ponta a ponta (Playwright), 3 testes:**
  - rota protegida leva ao login;
  - cadastrar, entrar e sair;
  - comprar créditos com Pix e conferir o saldo.
- **Verificações:** lint, typecheck, formatação e build passam. A imagem Docker foi construída e testada com o backend.
- **Segurança:**
  - a sessão fica só no cookie `HttpOnly`, e nada vai para `localStorage` ou `sessionStorage`;
  - o token CSRF é renovado após login e logout;
  - o login não redireciona para fora do site;
  - o nginx envia CSP e cabeçalhos de segurança.
- **Acessibilidade:**
  - todo campo tem rótulo, inclusive os de cada inscrição na OAB, lidos por leitores de tela;
  - os erros ficam ligados aos campos (`aria-invalid` e `aria-describedby`);
  - o foco vai para o lugar certo ao adicionar e remover inscrições.

## Decisões tomadas na sprint

| Assunto               | Decisão                                                                                                                                                       |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Fluxo da compra       | Uma tela só, como no Figma, em vez das três etapas da especificação. As três rotas continuam existindo.                                                       |
| Inscrições na OAB     | O Figma mostra um campo único. A tela mantém esse campo em cada linha e acrescenta o tipo e "Adicionar inscrição", porque o backend aceita várias inscrições. |
| CPF no faturamento    | Digitado, porque o backend não devolve o CPF por segurança.                                                                                                   |
| Estado no faturamento | Seletor com as 27 UFs, em vez de texto livre.                                                                                                                 |
| Saldo de créditos     | Aparece como "—" enquanto o backend não informar o saldo.                                                                                                     |
| Formato de erro       | O frontend lê o `ErrorResponse` do backend e também o `ProblemDetail` (RFC 9457).                                                                             |

A lista completa, com os motivos, está no README, em "Decisões técnicas".

## Pendências para a próxima sprint

1. Integrar a branch `feature/identity-me` (`GET /api/me`) ao `desenv` do backend.
2. Backend: módulo `credits` com os endpoints do contrato provisório, `creditBalance` em `GET /api/me`, Mercado Pago (Pix e Checkout Pro) e webhook.
3. Backend: `springdoc-openapi`, para gerar o cliente da API com o orval e substituir os tipos escritos à mão.
4. Backend: `RESET_URL` apontando para o frontend por padrão no `compose.yaml`.
5. Frontend e backend: telas e endpoints de captura (REQ 08 a 11), com o WebSocket da sessão ao vivo.
6. Frontend e backend: listagem, detalhes, relatório e exportação em ZIP dos registros (REQ 12 a 15).
7. Design: atualizar o Figma com a lista de inscrições na OAB e conferir os tokens de cor com as variáveis do arquivo.
