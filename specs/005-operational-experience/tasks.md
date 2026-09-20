# Tasks: Operação Completa sem Configuração Manual

**Input**: Design documents from `specs/005-operational-experience/`

**Prerequisites**: `plan.md`, `spec.md`, `research.md`, `data-model.md`, `contracts/`, `quickstart.md`, `.specify/memory/constitution.md`

**Tests**: Obrigatórios. A constituição exige testes comportamentais vermelhos e integração PostgreSQL real antes de implementar ou concluir cada capacidade.

**Organization**: As tarefas são agrupadas por história de usuário e seguem testes → modelo/migração → serviço → contrato/rotas → interface → integração/evidência. Cada história deve terminar em um incremento testável de forma independente.

**Generation status**: Tasks T001–T153 plus T046A are the complete implementation task set for this feature. Revalidation against the current plan/spec/design artifacts preserved completed evidence; all 154 tasks are explicitly marked complete.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Pode executar em paralelo por atuar em arquivos distintos e não depender de tarefa incompleta na mesma fase.
- **[Story]**: História de usuário correspondente (`US1`–`US4`).
- Todos os itens incluem caminhos exatos.

---

## Phase 1: Setup e baseline verificável

**Purpose**: Preparar fixtures, gates e rastreabilidade antes de alterar comportamento.

- [X] T001 Registrar os requisitos FR-001–FR-032 e SC-001–SC-012 no manifesto de aceite em `test/acceptance-manifest.json`
- [X] T002 [P] Criar helper de banco PostgreSQL isolado por teste e limpeza tenant-aware em `test/helpers/operational-experience-database.js`
- [X] T003 [P] Criar helper de sessões, papéis e tenants para testes HTTP em `test/helpers/operational-experience-auth.js`
- [X] T004 [P] Criar fixture Chromium para jornadas autenticadas, dois tenants e coleta de métricas em `test/helpers/operational-experience-browser.js`
- [X] T005 [P] Criar scanner canário para segredo em HTML, JSON, stdout, stderr, auditoria e logs em `test/helpers/secret-leak-assertions.js`
- [X] T006 Adicionar scripts que agreguem todas as suítes da feature e todas as integrações PostgreSQL reais, falhando para banco ausente, suíte vazia, skip, todo, cancelamento ou timeout, sem substituir scripts existentes em `package.json`
- [X] T007 Atualizar o gate estático para incluir os novos módulos, assets e binário em `scripts/acceptance-gate.mjs`
- [X] T008 Executar o baseline e registrar somente resultados observados e limitações em `evidence/005-operational-experience/baseline.json`

---

## Phase 2: Fundação compartilhada e bloqueante

**Purpose**: Estabelecer tenant, autorização, erros, auditoria, transações e migração idempotente usados por todas as histórias.

**Critical**: Nenhuma fase de história começa antes de T009–T025 passar.

### Testes fundamentais

- [X] T009 [P] Escrever testes vermelhos para contexto operacional deny-by-default e rejeição de tenant vindo do payload em `test/operation-context-v2.test.js`
- [X] T010 [P] Escrever testes vermelhos para catálogo de erros seguros e mapeamento HTTP/CLI determinístico em `test/operational-error-contract.test.js`
- [X] T011 [P] Escrever testes vermelhos para redaction recursiva de senha, token, autorização e ciphertext em `test/secret-redaction-v2.test.js`
- [X] T012 [P] Escrever testes PostgreSQL vermelhos para auditoria append-only tenant-scoped sem dados secretos em `test/postgres-operational-audit.test.js`
- [X] T013 [P] Escrever testes de migração repetida em banco vazio e snapshot atualizado em `test/postgres-operational-experience-upgrade.test.js`

### Implementação fundamental

- [X] T014 Implementar contexto imutável `{tenantId, actorId, capabilities, requestId}` e validação fail-closed em `modules/shared/operation-context.js`
- [X] T015 [P] Implementar erros tipados, códigos estáveis e serialização sanitizada em `modules/shared/operational-errors.js`
- [X] T016 [P] Implementar redaction recursiva central para objetos, erros e metadados em `modules/shared/redaction.js`
- [X] T017 Implementar guardas de capacidade e escopo sobre o contexto operacional em `modules/identity/authorization-service.js`
- [X] T018 Implementar serviço append-only de auditoria que exige tenant e ator em `modules/shared/audit-service.js`
- [X] T019 [P] Implementar helper de transação com commit/rollback explícitos e preservação de causa segura em `modules/shared/transaction.js`
- [X] T020 [P] Implementar comparação de versão/ETag e conflito otimista reutilizável em `modules/shared/optimistic-lock.js`
- [X] T021 [P] Implementar registro e resolução de chaves de idempotência tenant-scoped em `modules/shared/idempotency-service.js`
- [X] T022 Adicionar versão de schema `005-operational-experience` e migrações aditivas idempotentes em `domain-schema.js`
- [X] T023 Integrar a nova versão de schema ao caminho fresh/upgrade sem remover compatibilidade em `migrate.js`
- [X] T024 Atualizar capacidades de rota para negar por padrão os novos domínios em `route-capabilities.js`
- [X] T025 Executar T009–T013 contra a implementação e registrar resultado fundamental em `evidence/005-operational-experience/foundation.json`

**Checkpoint**: Contexto, autorização, auditoria, redaction, transação, optimistic locking, idempotência e migração passam em PostgreSQL real.

---

## Phase 3: User Story 1 — Atender conversas em tempo real (Priority: P1) — MVP

**Goal**: Atualizar mensagens, conversas, atribuições, presença autorizada e alertas no Inbox sem recarga, com replay, ordem, deduplicação e isolamento.

**Independent Test**: Duas sessões autorizadas no mesmo tenant recebem mensagem e atribuição em até 2 segundos; uma sessão de outro tenant não recebe dados; após desconexão, o cursor recupera eventos sem duplicação.

### Testes da User Story 1

- [X] T026 [P] [US1] Escrever testes vermelhos do contrato SSE, headers, heartbeat e códigos 401/403/409/429/503 em `test/realtime-sse-contract.test.js`
- [X] T027 [P] [US1] Escrever testes vermelhos do cliente para deduplicação, aggregate version e reconciliação em `test/realtime-inbox-client.test.js`
- [X] T028 [P] [US1] Escrever testes PostgreSQL vermelhos para append/replay ordenado e retenção em `test/postgres-realtime-event-store.test.js`
- [X] T029 [P] [US1] Escrever testes PostgreSQL vermelhos que provem zero vazamento entre tenants/equipes e presença com heartbeat, TTL e expiração em `test/postgres-realtime-tenant-isolation.test.js`
- [X] T030 [P] [US1] Escrever testes vermelhos para backpressure, quota, heartbeat e fechamento de cliente lento em `test/realtime-sse-backpressure.test.js`
- [X] T031 [P] [US1] Escrever teste de múltiplas instâncias usando tabela durável e sinalização PostgreSQL em `test/postgres-realtime-multiprocess.test.js`
- [x] T032 [P] [US1] Escrever e executar teste Chromium para mensagem, atribuição, presença/expiração, stale-state e reconnect em `test/browser-realtime-inbox.test.js`

### Modelo e serviços da User Story 1

- [X] T033 [US1] Adicionar `realtime_events`, índices tenant/cursor, retenção e constraints de versão em `domain-schema.js`
- [X] T034 [US1] Implementar append transacional, paginação de replay e detecção de cursor expirado em `modules/realtime/event-store.js`
- [X] T035 [P] [US1] Implementar codificação segura de frames SSE e heartbeat sem dados em `modules/realtime/sse-protocol.js`
- [X] T036 [P] [US1] Implementar quota por usuário/tenant, fila limitada e política de backpressure em `modules/realtime/connection-registry.js`
- [X] T037 [US1] Substituir o broadcaster global por hub tenant-scoped com replay e revalidação de sessão em `modules/realtime/sse-hub.js`
- [X] T038 [US1] Implementar listener `LISTEN/NOTIFY` que usa notificação somente como wake-up e relê a tabela em `modules/realtime/postgres-listener.js`
- [X] T039 [US1] Implementar rota `GET /events` com sessão, capacidade, cursor e lifecycle em `modules/realtime/routes.js`
- [X] T040 [US1] Integrar a rota SSE e shutdown gracioso ao servidor em `server.js`

### Emissão e interface da User Story 1

- [X] T041 [P] [US1] Emitir evento na mesma transação de criação/recebimento de mensagem em `webhook-processor.js`
- [X] T042 [P] [US1] Emitir eventos transacionais de status e atribuição em `tenant-inbox-store.js`
- [X] T043 [P] [US1] Implementar presença tenant-scoped com heartbeat/TTL e emitir eventos de presença e SLA no serviço responsável em `modules/inbox/presence-service.js`
- [X] T044 [US1] Adicionar bootstrap do cursor e estado de conectividade ao HTML do Inbox em `workspace.js`
- [X] T045 [US1] Implementar cliente EventSource idempotente, stale-state e reconciliação em `public/js/realtime-inbox.js`
- [X] T046 [US1] Servir o asset do Inbox com CSP e cache apropriados em `server.js`
- [X] T047 [US1] Revalidar autorização durante stream e encerrar imediatamente após revogação em `modules/realtime/sse-hub.js`
- [X] T046A [US1] Estender o replay paginado em `modules/realtime/event-store.js` e o cliente em `public/js/realtime-inbox.js` para expandir dinamicamente além de 6.000 eventos por tenant até recuperar todos os eventos autorizados, preservando cursor, ordenação, deduplicação e isolamento; cobrir em `test/postgres-realtime-event-store.test.js` e `test/realtime-inbox-client.test.js`
- [X] T048 [US1] Executar T026–T032 e medir SC-001–SC-003 em `evidence/005-operational-experience/us1-realtime.json`
- [X] T049 [US1] Mapear FR-001–FR-005 para testes e evidência reais em `specs/005-operational-experience/traceability.json`

**Checkpoint**: US1 funciona isoladamente e constitui o MVP operacional.

---

## Phase 4: User Story 2 — Configurar instalação e provedores pela interface (Priority: P1)

**Goal**: Ativar uma instalação limpa atomicamente e administrar credenciais de IA/canais por tenant sem editar banco/arquivos nem reexibir segredos.

**Independent Test**: Um administrador conclui setup em instalação limpa, perde uma corrida concorrente sem estado parcial, cadastra/testa/rotaciona credencial e jamais recebe plaintext em qualquer saída.

### Testes da User Story 2

- [X] T050 [P] [US2] Escrever testes vermelhos de estado, versão, rascunho não secreto e confiança bootstrap: hash-only, tenant binding, expiração, rate limit, rotação, consumo e fechamento pós-ativação em `test/setup-state-machine.test.js`
- [X] T051 [P] [US2] Escrever testes PostgreSQL vermelhos para ativação atômica, corrida e rollback injetado em `test/postgres-setup-activation.test.js`
- [X] T052 [P] [US2] Escrever testes vermelhos dos contratos `/setup/status|draft|validate|activate`, incluindo credencial bootstrap ausente, inválida, expirada, bloqueada, consumida e vinculada a outro tenant, em `test/setup-http-contract.test.js`
- [X] T053 [P] [US2] Escrever testes vermelhos para schemas allowlisted de provedores, modelos, canais e prompts em `test/provider-config-schema.test.js`
- [X] T054 [P] [US2] Escrever testes criptográficos vermelhos para envelope, rotação, masked hint e chave inválida em `test/provider-secret-envelope.test.js`
- [X] T055 [P] [US2] Escrever testes PostgreSQL vermelhos de isolamento, versão ativa e promoção concorrente em `test/postgres-provider-credentials.test.js`
- [X] T056 [P] [US2] Escrever testes vermelhos para timeout, SSRF, redaction e erro sanitizado de validação em `test/provider-validation-safety.test.js`
- [X] T057 [P] [US2] Escrever teste de upgrade/importação idempotente das configurações existentes em `test/postgres-provider-config-upgrade.test.js`
- [x] T058 [P] [US2] Escrever e executar teste Chromium do Wizard e painel de provedores sem exposição de segredos em `test/browser-setup-providers.test.js`

### Modelo e serviços da User Story 2

- [X] T059 [US2] Adicionar `installation_setup` com bootstrap hash-only/tenant-bound/expirável/rate-limited, `tenant_settings`, `provider_configs` e evolução tenant-scoped de segredos em `domain-schema.js`
- [X] T060 [US2] Implementar validação de etapas, normalização e rejeição de campos secretos no draft em `modules/setup/setup-validation.js`
- [X] T061 [US2] Implementar máquina de estados, verificação/rotação/rate limit da credencial bootstrap, optimistic locking e persistência de rascunho em `modules/setup/setup-service.js`
- [X] T062 [US2] Refatorar criação do primeiro administrador para aceitar transação e impedir corrida em `bootstrap-admin.js`
- [X] T063 [US2] Implementar ativação atômica com advisory/row lock, auditoria, idempotência e consumo da credencial bootstrap na mesma transação em `modules/setup/setup-service.js`
- [X] T064 [P] [US2] Generalizar AES-256-GCM para serviço versionado sem API de leitura plaintext em `modules/providers/credential-service.js`
- [X] T065 [P] [US2] Implementar schemas allowlisted e adaptadores de configuração de IA/canais em `modules/providers/provider-registry.js`
- [X] T066 [US2] Implementar validação allowlisted com timeout, destino fixo e resposta sanitizada em `modules/providers/provider-validation.js`
- [X] T067 [US2] Implementar CRUD tenant-scoped, rotação, promoção e desativação em `modules/providers/provider-service.js`
- [X] T068 [US2] Implementar importação idempotente de canais/credenciais legados sem sobrescrita em `modules/providers/provider-migration.js`

### Rotas e interface da User Story 2

- [X] T069 [US2] Implementar rotas de status, draft, validate e activate com bootstrap trust, CSRF e encerramento pós-ativação conforme contrato em `modules/setup/routes.js`
- [X] T070 [US2] Implementar rotas de listar/criar/alterar/testar/promover/desativar provedores em `modules/providers/routes.js`
- [X] T071 [US2] Integrar gate pré-ativação, verificação bootstrap tenant-bound, rotas e CSRF ao servidor em `server.js`
- [X] T072 [P] [US2] Renderizar Wizard acessível com resumo, erros por etapa e sem repopular segredo em `modules/setup/workspace.js`
- [X] T073 [P] [US2] Renderizar painel tenant-scoped com masked hint, versão e estado em `modules/providers/workspace.js`
- [X] T074 [US2] Implementar progressão, conflito e preservação segura do Wizard em `public/js/setup-wizard.js`
- [X] T075 [US2] Implementar teste/rotação de credencial sem reexibição no cliente em `public/js/provider-settings.js`
- [X] T076 [US2] Aplicar capacidades administrativas e navegação do setup/provedores em `route-capabilities.js`
- [X] T077 [US2] Executar T050–T058 e scanner canário em `evidence/005-operational-experience/us2-setup-providers.json`
- [X] T078 [US2] Mapear FR-006–FR-014 para testes e evidência reais em `specs/005-operational-experience/traceability.json`

**Checkpoint**: US2 ativa instalação e administra provedores de ponta a ponta sem configuração manual ou vazamento.

---

## Phase 5: User Story 3 — Administrar a instância pelo terminal (Priority: P2)

**Goal**: Oferecer CLI unificada, segura e automatizável para admins, saúde, workers, drain e privacidade.

**Independent Test**: Operador executa cada família de comando em texto e JSON; ausência de tenant/autorização/confirmação falha sem efeito; repetição com mesma chave não duplica operação.

### Testes da User Story 3

- [X] T079 [P] [US3] Escrever testes vermelhos de gramática, help, version e rejeição de segredo em argv em `test/crm-cli-parser.test.js`
- [X] T080 [P] [US3] Escrever testes vermelhos do envelope JSON, redaction e códigos 0/1/2/3/4/5/6/130 em `test/crm-cli-output-contract.test.js`
- [X] T081 [P] [US3] Escrever testes PostgreSQL vermelhos de idempotência e colisão com input divergente em `test/postgres-admin-operations.test.js`
- [X] T082 [P] [US3] Escrever testes vermelhos de confirmação interativa e `--yes --idempotency-key` em `test/crm-cli-destructive-guard.test.js`
- [X] T083 [P] [US3] Escrever testes PostgreSQL vermelhos para criação/reset seguro de administrador em `test/postgres-crm-cli-admin.test.js`
- [X] T084 [P] [US3] Escrever testes PostgreSQL vermelhos para saúde e inspeção tenant-scoped de workers em `test/postgres-crm-cli-health-workers.test.js`
- [X] T085 [P] [US3] Escrever testes PostgreSQL vermelhos para drain sem exclusão, leases e timeout seguro em `test/postgres-crm-cli-queue-drain.test.js`
- [X] T086 [P] [US3] Escrever testes PostgreSQL vermelhos para export/anonymize/delete e retenção legal em `test/postgres-crm-cli-privacy.test.js`
- [X] T087 [P] [US3] Escrever teste de processo para SIGINT, stdin secreto e ausência no process list em `test/crm-cli-process-safety.test.js`

### Modelo e núcleo da User Story 3

- [X] T088 [US3] Adicionar `admin_operations`, `queue_controls` e evolução de `privacy_requests` em `domain-schema.js`
- [X] T089 [P] [US3] Implementar parser declarativo e validação de opções globais/subcomandos em `modules/cli/parser.js`
- [X] T090 [P] [US3] Implementar renderizadores text/json e mapeamento estável de exit codes em `modules/cli/output.js`
- [X] T091 [P] [US3] Implementar entrada secreta por TTY/stdin/fd restrito e proibir argv em `modules/cli/secret-input.js`
- [X] T092 [US3] Implementar lifecycle idempotente e auditado de operações administrativas em `modules/cli/operation-runner.js`
- [X] T093 [P] [US3] Implementar comandos `admin create` e `admin reset-password` usando serviço compartilhado em `modules/cli/commands/admin.js`
- [X] T094 [P] [US3] Implementar `health check` com modo profundo, timeout e resultado sanitizado em `modules/cli/commands/health.js`
- [X] T095 [P] [US3] Implementar `workers list` com heartbeat, staleness e filtro de tenant em `modules/cli/commands/workers.js`
- [X] T096 [US3] Implementar pausa de claims, espera de leases e retomada explícita no runtime em `modules/operations/job-store.js`
- [X] T097 [US3] Implementar `queues drain` sem apagar jobs e com timeout fail-closed em `modules/cli/commands/queues.js`
- [X] T098 [US3] Implementar workflow de privacidade, retenções e saída restrita em `modules/security/privacy-service.js`
- [X] T099 [US3] Implementar `privacy request` sobre o serviço tenant-scoped em `modules/cli/commands/privacy.js`

### Executável e aceite da User Story 3

- [X] T100 [US3] Substituir respostas hardcoded por dispatch real, sinais e cleanup em `bin/crm-cli.js`
- [X] T101 [US3] Validar e manter o mapeamento executável `crm-cli` do pacote em `package.json`
- [X] T102 [US3] Executar T079–T087 em modo interativo e não interativo em `evidence/005-operational-experience/us3-crm-cli.json`
- [X] T103 [US3] Mapear FR-015–FR-021 para comandos, testes e evidência reais em `specs/005-operational-experience/traceability.json`

**Checkpoint**: US3 oferece as seis famílias de operação sem SQL/scripts manuais e com automação determinística.

---

## Phase 6: User Story 4 — Criar automações e campanhas visualmente (Priority: P2)

**Goal**: Permitir criação, validação, simulação, publicação e restauração visual, segura, versionada e acessível.

**Independent Test**: Gestor cria por teclado uma automação e campanha, recebe erros localizados, simula sem efeitos, publica versão imutável, enfrenta conflito sem perda e restaura criando nova versão.

### Testes da User Story 4

- [X] T104 [P] [US4] Escrever testes vermelhos de schema, normalização e hash canônico de grafo em `test/automation-graph-schema.test.js`
- [X] T105 [P] [US4] Escrever testes vermelhos de ciclos, alcance, portas, referências e localização de erros em `test/automation-graph-validation.test.js`
- [X] T106 [P] [US4] Escrever testes vermelhos de simulação determinística, relógio fixo e zero efeitos em `test/automation-simulation-v2.test.js`
- [X] T107 [P] [US4] Escrever testes PostgreSQL vermelhos de CAS, versões append-only e pinning de execução em `test/postgres-automation-versions.test.js`
- [X] T108 [P] [US4] Escrever testes vermelhos dos contratos draft/validate/simulate/publish/restore em `test/automation-editor-http-contract.test.js`
- [X] T109 [P] [US4] Escrever testes vermelhos do schema de blocos, variáveis e capability profiles em `test/campaign-content-schema.test.js`
- [X] T110 [P] [US4] Escrever regressões XSS para scripts, handlers, CSS, SVG, embeds e URLs inseguras em `test/campaign-content-security.test.js`
- [X] T111 [P] [US4] Escrever testes de compilador único para preview e dispatch por canal em `test/campaign-preview-parity.test.js`
- [X] T112 [P] [US4] Escrever testes PostgreSQL vermelhos de CAS, fingerprint e versões de campanha em `test/postgres-campaign-versions.test.js`
- [X] T113 [P] [US4] Escrever testes vermelhos dos contratos draft/preview/publish/restore de campanha em `test/campaign-editor-http-contract.test.js`
- [X] T114 [P] [US4] Escrever teste Chromium vermelho de fluxo visual, lista equivalente, teclado, foco e aria-live em `test/browser-visual-editors.test.js`
- [X] T115 [P] [US4] Escrever teste Chromium vermelho que prove sandbox sem same-origin e CSP restritiva em `test/browser-campaign-preview-sandbox.test.js`

### Modelo e serviços de automação da User Story 4

- [X] T116 [US4] Adicionar drafts/versions de automação e campanha, capability profiles e FKs de versão em `domain-schema.js`
- [X] T117 [P] [US4] Implementar normalização, tipos registrados e hash canônico do grafo em `modules/automation/graph-schema.js`
- [X] T118 [P] [US4] Implementar validação estrutural, semântica, tenant e referências em `modules/automation/graph-validator.js`
- [X] T119 [US4] Implementar compilação determinística do grafo validado em `modules/automation/compiler.js`
- [X] T120 [US4] Estender dry-run com relógio/fixtures/adaptadores sem efeitos e trace por nó em `modules/automation/engine.js`
- [X] T121 [US4] Implementar drafts, CAS, versões imutáveis, fingerprint, publish e restore em `modules/automation/editor-service.js`
- [X] T122 [US4] Fixar cada execução à versão publicada exata em `modules/automation/engine.js`
- [X] T123 [US4] Implementar rotas de draft, validate, simulate, versions, publish e restore em `modules/automation/routes.js`

### Modelo e serviços de campanha da User Story 4

- [X] T124 [P] [US4] Implementar blocos/marks/variáveis allowlisted e limites de tamanho em `modules/marketing/content-schema.js`
- [X] T125 [P] [US4] Implementar capability profiles versionados por canal em `modules/marketing/channel-capabilities.js`
- [X] T126 [US4] Implementar compilador com escaping contextual, URL segura e saída por canal em `modules/marketing/content-compiler.js`
- [X] T127 [US4] Implementar preview a partir do mesmo compilador e view-model sanitizado em `modules/marketing/preview-service.js`
- [X] T128 [US4] Implementar drafts, CAS, versões imutáveis, fingerprint, publish e restore em `modules/marketing/campaign-service.js`
- [X] T129 [US4] Fixar dispatch à versão de conteúdo publicada e capability profile em `modules/marketing/campaign-dispatch.js`
- [X] T130 [US4] Implementar rotas de draft, validate, preview, versions, publish e restore em `modules/marketing/routes.js`

### Interfaces da User Story 4

- [X] T131 [P] [US4] Renderizar editor de automação com canvas progressivo e lista/formulário equivalente em `modules/automation/workspace.js`
- [X] T132 [P] [US4] Renderizar editor de campanha por blocos, limites e resumo de erros em `modules/marketing/workspace.js`
- [X] T133 [US4] Implementar criação/conexão/ordenação por mouse e teclado sem lógica de execução no DOM em `public/js/automation-editor.js`
- [X] T134 [US4] Implementar blocos, variáveis e foco previsível no editor de campanha em `public/js/campaign-editor.js`
- [X] T135 [US4] Implementar documento de preview isolado com sandbox/CSP e sem same-origin em `modules/marketing/preview-frame.js`
- [X] T136 [US4] Integrar rotas, assets, capacidades distintas de edit/simulate/publish/restore e CSP em `server.js`
- [X] T137 [US4] Executar T104–T115 e mapear FR-022–FR-028 em `evidence/005-operational-experience/us4-visual-editors.json`

**Checkpoint**: US4 entrega automações e campanhas visuais reais, não placeholders, com publicação segura e acessibilidade equivalente.

---

## Phase 7: Polish, integração transversal e fechamento de produção

**Purpose**: Fechar FR-029–FR-032, SC-001–SC-012, fresh/upgrade, documentação e evidência operacional.

- [X] T138 [P] Criar matriz negativa de autorização para SSE, setup, providers, CLI e editores em `test/operational-experience-authorization-matrix.test.js`
- [X] T139 [P] Criar regressão transversal que injeta canários secretos em todos os quatro domínios em `test/operational-experience-secret-regression.test.js`
- [X] T140 [P] Criar teste de falhas/rollback para ativação, publish, drain e replay em `test/operational-experience-fail-closed.test.js`
- [X] T141 Criar sweep Chromium das quatro jornadas sem páginas estáticas, dados mockados ou controles inertes em `test/browser-operational-experience.test.js`
- [X] T142 Criar suíte de performance com perfil fixo de 100 conexões, 20 eventos/s por 10 minutos, payload de até 8 KiB, replay de 6.000 eventos/tenant e manifesto do host de referência em `test/operational-experience-performance.test.js`
- [X] T143 Atualizar o manifesto para exigir todas as novas suítes, proibir skips/todo e vincular release em `test/acceptance-manifest.json`
- [X] T144 Atualizar o acceptance gate para emitir evidência por requisito e falhar com suíte vazia/stale em `scripts/acceptance-gate.mjs`
- [X] T145 Executar migração e suíte completa em banco vazio em `evidence/005-operational-experience/fresh-install.json`
- [X] T146 Executar migração e suíte completa em snapshot atualizado em `evidence/005-operational-experience/upgrade-install.json`
- [X] T147 Executar Chromium e métricas automatizadas SC-001–SC-003, SC-005, SC-007–SC-008 e SC-010–SC-012 contra fresh e upgrade em `evidence/005-operational-experience/browser-acceptance.json`
- [X] T148 Consolidar FR/SC → suíte → caso → evidência sem lacunas em `specs/005-operational-experience/traceability.json`
- [X] T149 Atualizar arquitetura observada e remover afirmações React/Nest/Redis incompatíveis em `docs/architecture/ARCHITECTURE.md`
- [X] T150 Documentar setup, providers, SSE, CLI, editores, protocolos moderados SC-004/SC-006/SC-009, rollback e troubleshooting em `docs/CRMTSIAPP-OPERATIONAL-EXPERIENCE.md`
- [X] T151 Atualizar matriz de paridade somente com capacidades comprovadas e registrar SC-004/SC-006/SC-009 como `pending-human-validation` até os protocolos moderados atingirem amostra e limiar em `docs/CRMTSIAPP-SELF-HOSTED-PARITY-MATRIX.md`
- [X] T152 Implantar no host `vpstsiapp` como `root` em `/opt/tsi-stack/apps/crm/crmtsiapp/`, preservando `/etc/crmtsiapp/crmtsiapp.env`, com release/backup timestamped, tmux `tsi-crmtsiapp-operational-deploy`, log 0600 e `.exit`; validar serviços, PostgreSQL, health privado e HTTPS e registrar em `evidence/005-operational-experience/remote-deploy.json`
- [X] T153 Executar validação final em segunda sessão tmux `tsi-crmtsiapp-operational-final`, provar rollback para release/backup anterior e recuperação de `crmtsiapp.service`/workers/health, atualizar `VPS/README.md` e consolidar resultado sanitizado em `evidence/005-operational-experience/final-validation.json`

---

## Dependencies and Execution Order

### Phase dependencies

```text
Phase 1 Setup
    ↓
Phase 2 Foundation
    ├──→ US1 Realtime (MVP)
    ├──→ US2 Setup & Providers
    └──→ US4 Visual Editors

US2 Setup & Providers ──→ US3 CLI

US1 + US2 + US3 + US4 ──→ Phase 7 Closure
```

### Story dependencies

- **US1** depende apenas da Fundação e pode ser entregue como MVP.
- **US2** depende apenas da Fundação e pode avançar em paralelo com US1.
- **US3** depende da Fundação e dos serviços administrativos/segredos consolidados em US2; não depende de US1 ou US4.
- **US4** depende apenas da Fundação e pode avançar em paralelo com US1/US2.
- A validação remota e o fechamento dependem das quatro histórias concluídas localmente.

### Within each story

1. Escrever e executar testes vermelhos.
2. Implementar migração/modelo e repetir testes de schema.
3. Implementar serviços e repetir testes unitários/PostgreSQL.
4. Implementar contratos, rotas e interface.
5. Executar navegador/integração e registrar evidência.
6. Só então marcar a história como concluída.

---

## Parallel Execution Examples

### US1

```text
T026 + T027 + T028 + T029 + T030 + T031 + T032
T035 + T036
T041 + T042 + T043
```

### US2

```text
T050 + T051 + T052 + T053 + T054 + T055 + T056 + T057 + T058
T064 + T065
T072 + T073
```

### US3

```text
T079 + T080 + T081 + T082 + T083 + T084 + T085 + T086 + T087
T089 + T090 + T091
T093 + T094 + T095
```

### US4

```text
T104 + T105 + T106 + T107 + T108 + T109 + T110 + T111 + T112 + T113 + T114 + T115
T117 + T118
T124 + T125
T131 + T132
```

---

## Implementation Strategy

### MVP first

1. Concluir Setup e Fundação (T001–T025).
2. Entregar US1 (T026–T049).
3. Validar latência, reconnect e isolamento antes de expandir o escopo.

### Incremental delivery

1. **MVP**: Inbox em tempo real.
2. **P1 completo**: Setup Wizard e painel de provedores.
3. **Operação P2**: `crm-cli` unificada.
4. **Autonomia P2**: editores visuais de automação e campanha.
5. **Produção**: aceite fresh/upgrade, documentação, rollout tmux e segunda validação.

### Completion rule

Uma tarefa só recebe `[x]` após código real, teste aplicável passando e evidência observada. Mock, texto hardcoded, página estática, teste ignorado ou documentação isolada não satisfazem nenhuma tarefa de capacidade.
