# Sprint 2: Telas de captura e de registros

|                           |                                                                                                                      |
| ------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| **Período**               | 12/11/2026 a 13/11/2026                                                                                              |
| **Branch**                | `main` (commits `a808d44` a `725c2b4`, 20 commits)                                                                   |
| **Backend de referência** | `desenv` do repositório do time (`dd157c3`), com o `GET /api/me` (PR #13) e o frontend no `compose.yaml` (PR #14)    |
| **Requisitos atendidos**  | REQ 08 a 15 no frontend, só com mocks: o backend ainda não tem os módulos `capture` e `records`                      |
| **Testes**                | 141 unitários e de componentes (Vitest, 20 arquivos) e 7 de ponta a ponta (Playwright), todos passando em 13/11/2026 |

## Objetivo

Desenhar os estados que faltavam no Figma e construir as telas de captura e de registros sobre contratos provisórios, para o backend implementar os módulos `capture` e `records` a partir deles.

## Entregas

### Design dos estados que faltavam

O Figma tinha três quadros de "Criar Novo Registro", a lista e o painel de detalhes, mas não mostrava o que acontece entre eles: erros, saldo, processamento e relatório. Os estados que faltavam foram desenhados no Claude Design, no visual do Figma (verde `#0F7C69`, Geist e barra lateral verde), no canvas [Veridt — Captura e Registros](https://claude.ai/artifact/SKFcazv49CfXqTM6x7FoyN).

| Grupo         | Quadros                                                                                                                                                     |
| ------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Novo Registro | início com custo e saldo, campos inválidos, saldo insuficiente, site abrindo, site fora do ar, gravando, tela capturada, enviado para processamento, falhou |
| Registros     | lista com busca, filtros e paginação; lista vazia; detalhes com hash; detalhes processando; prévia do relatório                                             |
| Componentes   | barra lateral e navegador remoto, reaproveitados nos quadros                                                                                                |

São propostas e precisam ser validadas por quem cuida do design. O canvas é privado até ser compartilhado.

### Planejamento

As telas que faltavam viraram 10 tarefas em [`docs/planejamento/telas-captura-e-registros.md`](../planejamento/telas-captura-e-registros.md), cada uma com o quadro de referência e o que precisa estar pronto para ser dada como concluída. O plano foi revisado antes do desenvolvimento, e a revisão trouxe seis ajustes, entre eles o status "Processando" e o painel lateral no lugar de uma página de detalhes. As 10 tarefas foram concluídas.

### Registros (REQ 12 a 15)

| Tarefa | Entrega                                                                                                                                                                                                                       |
| ------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| R1     | Contrato provisório (`GET /api/records` paginado e filtrado, detalhes, relatório em PDF, pacote ZIP), hooks e mocks com 25 registros de exemplo. Cada registro tem dono; uma conta nova começa sem nenhum.                    |
| R2     | Lista com título e domínio do site, status com palavra e cor, busca, filtros de status e período e paginação. Os filtros ficam na URL, então o link e o voltar funcionam. Estados de carregando, vazio, sem resultado e erro. |
| R3     | Painel lateral de detalhes, como no Figma, com o SHA-256 de cada arquivo e o botão "Copiar". Em processamento, se atualiza sozinho até concluir. Se falhou, mostra o motivo.                                                  |
| R4     | Prévia do relatório e download do PDF e do ZIP, disponíveis com o registro concluído.                                                                                                                                         |

### Captura (REQ 08 a 11)

| Tarefa | Entrega                                                                                                                                                                                                                                       |
| ------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| C1     | Contrato provisório da sessão (preço, criar, capturar tela, gravar, concluir, cancelar) e mocks, inclusive do WebSocket do navegador remoto, com quadros desenhados de verdade. Novos status: `LOADING`, `READY`, `LOAD_FAILED` e `CANCELED`. |
| C2     | Formulário de Novo Registro, com título, URL, o custo do registro e o saldo. Sem saldo, o aviso leva à compra e o botão fica desativado; com o backend real, o mesmo aviso aparece pela resposta 402.                                         |
| C3     | Navegador remoto na mesma página, como no Figma, com os estados de abrindo, site fora do ar ("Tentar novamente" ou "Alterar endereço") e pronto. O endereço `/capturas/{id}/sessao` retoma a sessão ao recarregar.                            |
| C4     | Capturar Tela (aviso e miniatura na faixa da sessão), gravação com cronômetro e moldura azul, concluir e cancelar com confirmação.                                                                                                            |
| C5     | Diálogo de conclusão, com o número do registro, os arquivos, o crédito e o link para o registro, e diálogo de falha com "Tentar novamente".                                                                                                   |
| X1     | Testes de ponta a ponta do registro completo, do celular e do teclado, e a documentação.                                                                                                                                                      |

O fluxo completo funciona com os mocks: criar o registro, abrir o site, capturar e gravar, concluir, ver o registro em processamento e acompanhá-lo até concluído. O saldo é atualizado sem recarregar a página.

### Organização do repositório

A raiz caiu de 24 para 18 arquivos:

- os arquivos do Docker foram para `docker/`;
- a configuração do Vitest entrou no `vite.config.ts`;
- a do Prettier entrou no `package.json`;
- a do Playwright foi para `e2e/`.

Os scripts (`pnpm dev`, `pnpm test`, `pnpm e2e`…) continuaram iguais; o build da imagem passou a ser `docker build -f docker/Dockerfile .`.

## Integração com o backend

- **`GET /api/me`:** escrito na sprint 1, foi integrado ao `desenv` pelo PR #13. Com isso, o login funciona contra o `desenv`.
- **Frontend no `compose.yaml` do backend (PR #14):** o link de redefinição de senha passou a apontar para o frontend (`http://localhost:3000/redefinir-senha`), resolvendo uma pendência da sprint 1.
- **Contratos propostos:** créditos, captura e registros estão no README, com os tipos em `src/features/*/api/types.ts`. São a base para o backend implementar os módulos que faltam.

## Qualidade

- **Testes unitários e de componentes (Vitest):** de 90 para 141. Cobrem os contratos contra os mocks, o WebSocket da sessão, o formulário de Novo Registro, a sessão (abrir, falhar, gravar, capturar, concluir, cancelar, tentar de novo) e a lista e o painel dos registros.
- **Testes de ponta a ponta (Playwright):** de 3 para 7. Os novos são o registro completo, o site fora do ar, o celular em 375 px (nenhuma tela rola para o lado) e o teclado (o foco entra e sai do painel de detalhes).
- **Problemas encontrados e corrigidos durante os testes:**

| Problema                                                                                 | Correção                                                                                                    |
| ---------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| Uma cobertura vazia apagava o navegador remoto mesmo com o site aberto.                  | A cobertura só existe quando há algo a mostrar; um teste impede a volta do problema.                        |
| "Tentar novamente" podia herdar o status e as miniaturas da sessão anterior.             | A sessão é recriada do zero a cada novo id.                                                                 |
| No celular, o aviso de "Tela capturada" cobria o botão do menu.                          | Os avisos aparecem abaixo da faixa do topo no celular.                                                      |
| O foco do teclado se perdia ao fechar o painel de detalhes.                              | Lista e detalhes numa rota só; o foco volta ao link de origem.                                              |
| O rodapé da lista mostrava a faixa da próxima página antes das linhas chegarem.          | O rodapé descreve os dados recebidos.                                                                       |
| Fechar o painel criava uma entrada no histórico e o voltar o reabria.                    | Fechar volta no histórico quando o painel foi aberto pela lista.                                            |
| Os leitores de tela liam "Close" em inglês.                                              | Botões de fechar em português.                                                                              |
| O navegador simulado gerava uma imagem por movimento do mouse (mais de 800 requisições). | Mock limitado a uma imagem a cada 250 ms, sem o movimento do mouse.                                         |
| A suíte falhava de vez em quando com todos os arquivos em paralelo.                      | Mocks zerados antes de cada teste e esperas maiores; o teste do site abrindo controla quando o site "abre". |

- **Acessibilidade:** os estados da sessão são anunciados aos leitores de tela; o foco volta ao botão de origem ao fechar o relatório e o painel; os diálogos de falha e de cancelamento são `alertdialog`.

## Decisões tomadas na sprint

| Assunto                | Decisão                                                                                                                                         |
| ---------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| Visual das telas novas | Seguir o Figma e o app atual. O design system "Veridit" (azul-petróleo, IBM Plex) não foi usado; adotá-lo no app inteiro é uma decisão do time. |
| Detalhes do registro   | Painel lateral sobre a lista, como no Figma, mantendo o endereço `/registros/:id`.                                                              |
| Sessão de captura      | Na mesma página do formulário, como no Figma; `/capturas/:id/sessao` serve para retomar.                                                        |
| Cobrança               | O crédito só é descontado ao concluir o registro. Site fora do ar, falha e cancelamento não cobram nada.                                        |
| Status dos registros   | `EM_ANDAMENTO`, `PROCESSANDO`, `CONCLUIDO` e `FALHOU`; "Interrompido" saiu. Um cancelamento não gera registro.                                  |
| Prévia do relatório    | Montada com os dados do registro, porque a CSP não permite exibir um PDF dentro da página; "Baixar PDF" baixa o arquivo do backend.             |
| Lista e detalhes       | Uma rota só (`registros/:id?`), para não remontar a lista ao abrir e fechar o painel.                                                           |

A lista completa, com os motivos, está no README, em "Decisões técnicas".

## Pendências para a próxima sprint

1. **Backend, urgente:** acrescentar `dockerfile: docker/Dockerfile` ao serviço `frontend` do `compose.yaml`. Nesta sprint o `Dockerfile` do frontend foi para `docker/`; quando estes commits forem para o GitHub, o `docker compose up --build` do backend falha sem essa linha.
2. Backend: módulo `records` com os endpoints do "Contrato provisório de registros".
3. Backend: módulo `capture` com os endpoints e o WebSocket do "Contrato provisório de captura". Antes de implementar, validar o protocolo do navegador remoto (mensagens e tamanho dos quadros).
4. Backend: módulo `credits` (pendência da sprint 1), com `creditBalance` em `GET /api/me`, que a captura usa para avisar a falta de saldo antes do 402.
5. Backend: `springdoc-openapi`, para gerar o cliente da API com o orval e substituir os tipos escritos à mão.
6. Design: validar o canvas, levar os estados aprovados para o Figma e decidir entre o visual do Figma e o design system "Veridit".
7. Frontend: enviar ao GitHub os commits desta sprint (do `a808d44` ao `725c2b4`), junto com a correção do item 1.
