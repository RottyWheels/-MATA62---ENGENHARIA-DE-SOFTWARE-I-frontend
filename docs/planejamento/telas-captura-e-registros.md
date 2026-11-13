# Planejamento: telas de captura e registros

Telas que faltam no frontend depois da sprint 1. O backend ainda não tem os módulos `capture` e `records`, então cada tela é feita contra mocks (MSW) e um contrato provisório, como foi feito com créditos.

**Referências de design**

- Figma do Veridt: frames "Criar Novo Registro" (3 estados), "Lista dos Registros" e "Lista dos Registros - Detalhes".
- Canvas com os estados que faltam no Figma (proposta, a validar com quem cuida do design): [Veridt — Captura e Registros](https://claude.ai/artifact/SKFcazv49CfXqTM6x7FoyN). Cada task cita o quadro (board) correspondente.

**Andamento:** R1 a R4 e C1 a C5 concluídas, com testes. Falta X1 (documentação final e E2E do fluxo completo). Na C5, o diálogo de falha diz que nada foi cobrado, e não que o crédito foi devolvido: pelo contrato, o crédito só é descontado ao concluir. O contrato do navegador remoto (C1) continua provisório: validar com o backend.

**Ordem:** registros primeiro (R1 a R4), porque têm o desenho mais completo e não dependem do navegador remoto; depois captura (C1 a C5); por fim a documentação e o teste de ponta a ponta (X1).

## Registros (REQ 12 a 15)

### R1. Contrato provisório e mocks de registros ✅

- Tipos em `features/records/api/types.ts`: `RecordStatus` (`EM_ANDAMENTO`, `PROCESSANDO`, `CONCLUIDO`, `FALHOU`), `RecordSummary`, `RecordDetails` (com a lista de arquivos e o SHA-256 de cada um) e `Page<T>`.
- Endpoints em `features/records/api/endpoints.ts`:
  - `GET /api/records?page&size&status&q&from&to` → `Page<RecordSummary>`;
  - `GET /api/records/{id}` → `RecordDetails`;
  - `GET /api/records/{id}/report` → PDF;
  - `GET /api/records/{id}/export` → ZIP.
- Hooks com TanStack Query no formato do orval.
- Handlers MSW com uns 25 registros de exemplo, nos quatro status, com filtro, busca e paginação feitos no mock.
- **Pronto quando:** os hooks têm testes que passam contra o mock, e o contrato está no README.

### R2. Lista dos registros ✅

- Quadros: `Registros-Lista`, `Registros-Vazio`.
- Coluna "Título" (com o domínio do site embaixo), além das colunas do Figma.
- Busca por título ou URL, filtros de status e período, e paginação. O estado fica na URL (`?q=&status=&periodo=&pagina=`), para o link e o botão voltar funcionarem.
- Estados de carregando (skeleton), vazio ("Fazer o primeiro registro"), sem resultado no filtro ("Limpar filtros") e erro ("Tentar novamente").
- Selos de status com palavra e cor, nunca só a cor.
- **Pronto quando:** a lista funciona com o mock, com testes de filtro, paginação, vazio e erro.

### R3. Painel de detalhes ✅

- Quadros: `Registros-Detalhes`, `Registros-DetalhesProcessando`.
- Painel lateral (`Sheet`) aberto sobre a lista, como no Figma. A rota `/registros/:id` abre a lista com o painel aberto, e fechar o painel volta para `/registros` sem perder os filtros.
- Mostra os campos do Figma e mais o site (em fonte mono) e os hashes SHA-256 completos, cada um com o botão "Copiar".
- **Processando:** um aviso, os hashes pendentes e os botões desativados. Consulta o status a cada poucos segundos até concluir.
- **Falhou:** o motivo e a informação de que o crédito foi devolvido.
- **Pronto quando:** os três estados aparecem com os dados do mock, com foco preso no painel e fechamento por Esc.

### R4. Relatório e download ✅

- Quadro: `Registros-Relatorio`.
- "Gerar relatório" abre uma prévia do PDF num diálogo, com o botão "Baixar PDF".
- "Fazer download (.zip)" baixa o arquivo, com o nome do registro.
- Os mocks devolvem um PDF e um ZIP pequenos de exemplo.
- **Pronto quando:** os dois downloads funcionam com o mock e mostram um erro legível se falharem.

## Captura (REQ 08 a 11)

### C1. Contrato provisório e mocks de captura ✅

- Endpoints:
  - `POST /api/captures { title, url }` → `{ id, cost }` (402 se não houver crédito);
  - `POST /api/captures/{id}/screenshots`;
  - `POST /api/captures/{id}/recording/start` e `/stop`;
  - `POST /api/captures/{id}/finish`;
  - `POST /api/captures/{id}/cancel`.
- WebSocket `/ws/capture/{id}`, com o protocolo que já existe em `features/capture/types.ts`, mais as mensagens de status `LOADING` e `LOAD_FAILED`.
- Mock do WebSocket no MSW (`ws.link`), mandando quadros de uma página de exemplo.
- **Pronto quando:** o hook `useCaptureSocket` funciona contra o mock nos testes.

### C2. Novo Registro: formulário ✅

- Quadros: `Main`, `Captura-Validacao`, `Captura-SemSaldo`; Figma "Criar Novo Registro" (estado inicial).
- Campos "Título do Registro" e "URL do site", com Zod: título obrigatório e URL `http(s)://` válida.
- Um aviso com o custo do registro e o saldo.
- Sem saldo: um aviso com "Comprar créditos" e o botão "Iniciar Registro" desativado.
- **Pronto quando:** a validação e o caso sem saldo têm testes.

### C3. Navegador remoto na mesma página ✅

- Quadros: `Captura-Carregando`, `Captura-ErroSite`; Figma "Criar Novo Registro" com o navegador.
- Depois de "Iniciar Registro", a mesma página mostra os campos bloqueados, os botões e o `RemoteBrowserView` ligado ao socket.
- A URL muda para `/capturas/:id/sessao`, para que recarregar a página retome a sessão.
- Estados de abrindo o site, erro ("Tentar novamente" ou "Alterar endereço") e pronto.
- **Pronto quando:** os três estados funcionam com o mock.

### C4. Gravação e capturas de tela ✅

- Quadros: `Captura-Gravando`, `Captura-TelaCapturada`; Figma "Criar Novo Registro" (gravando).
- "Iniciar Gravação" vira "Concluir gravação", com o selo "Gravando" e o cronômetro.
- "Capturar Tela" mostra um aviso e acrescenta a captura à faixa "Capturas desta sessão".
- "Concluir registro" fica disponível quando houver ao menos uma captura ou gravação.
- "Cancelar registro" pede confirmação.
- **Pronto quando:** o fluxo de gravar, capturar e concluir funciona com o mock.

### C5. Conclusão e falha ✅

- Quadros: `Captura-Concluida`, `Captura-Falhou`.
- **Conclusão:** um diálogo com o número do registro, a quantidade de arquivos e o crédito usado, e os botões "Ver registro" (abre o painel de R3) e "Novo registro".
- **Falha:** um diálogo que diz que o crédito foi devolvido, com "Tentar novamente" e "Voltar para a lista".
- Nos dois casos o saldo (`['me']`) e a lista são atualizados.
- **Pronto quando:** os dois diálogos aparecem conforme o status vindo do socket.

## Fechamento

### X1. Documentação e teste de ponta a ponta

- README: os contratos de registros e captura, e as decisões tomadas.
- E2E: entrar → novo registro → capturar tela → concluir → ver o registro na lista → abrir os detalhes.
- Acessibilidade conferida no celular (375 px) e com teclado.

## Revisão do planejamento

Revisei o plano contra o código atual, o Figma e o canvas. Ajustes feitos:

1. **Status dos registros.** O tipo atual (`EM_ANDAMENTO`, `CONCLUIDO`, `INTERROMPIDO`, `FALHOU`) não tem "Processando", que aparece no Figma, e tem "Interrompido", que não aparece em lugar nenhum. R1 troca `INTERROMPIDO` por `PROCESSANDO`. Um registro cancelado não chega à lista: o cancelamento não gera registro.
2. **Rota de detalhes.** O plano original tinha uma página `/registros/:id`; o Figma usa um painel sobre a lista. R3 mantém a rota e abre o painel, para os links dos e-mails e do diálogo "Ver registro" continuarem funcionando.
3. **Rota da sessão.** `/capturas/:id/sessao` existia como página separada. Pelo Figma, a sessão acontece na mesma página do formulário. C3 mantém a rota só para retomar a sessão ao recarregar.
4. **Dependência escondida.** O botão "Ver registro" de C5 depende do painel de R3. A ordem de registros antes de captura já resolve isso.
5. **Saldo.** O backend ainda não devolve `creditBalance`. C2 usa o saldo de `['me']` quando existir. Sem ele, mostra só o custo e deixa a validação do saldo para a resposta 402 do `POST /api/captures`.
6. **Escopo da sprint.** R1 a R4 cabem numa sprint e entregam valor sozinhos. C3 e C4 dependem de decisões do backend sobre o navegador remoto (protocolo e tamanho dos quadros), então convém validar o contrato de C1 com o Igor antes de começar C3.
