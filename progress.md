
## 2026-09-20 — US8 relatórios e observabilidade em produção
- T127/T129/T131/T132 concluídas. Relatórios usam `metric_events` tenant-scoped, catálogo versionado, filtros por período/canal, percentis e export CSV com a mesma definição; `/reports` permanece protegido por sessão e `/reports/export.csv` é `no-store`.
- Foram entregues `/live` (liveness do processo), `/ready` (readiness com PostgreSQL/fila/workers), status operacional autenticado e alertas persistidos/deduplicados/reconhecíveis tenant-scoped com correlação.
- Deploy em `vpstsiapp` pela sessão tmux `tsi-crmtsiapp-us8-status-fix`: migração `MIGRATION_OK`, backup `/opt/tsi-stack/backups/crmtsiapp-before-us8-20260920T111823Z`, três serviços ativos. Validação independente `tsi-crmtsiapp-us8-final-validate` confirmou HTTPS `/live` e `/ready`, `db=1` e `NRestarts=0`.
- Correção adicional aplicada após validação browser: queries de status agora são compatíveis com PostgreSQL real e a migração reconcilia esquemas legados de `worker_heartbeats` (`worker_name`, `worker_id`, `status`, `metadata`).
- T048 concluída: suíte OE02 realtime executada com PostgreSQL real e Chromium: 20 testes, 20 pass, 0 fail, 0 skipped. Evidência em `evidence/005-operational-experience/OE02-realtime.json` e TAP em `/tmp/crmtsiapp-oe02-realtime-pg.tap`.
- T058 concluída: teste Chromium do Setup Wizard e painel de provedores passou; credencial bootstrap não é reexibida quando fornecida no estado e o painel mostra apenas hint mascarado, mantendo campo de rotação write-only.


- T138–T151 já concluídas; `npm run test` local executado novamente após as correções de compatibilidade de migração: 456 testes, 411 pass, 45 skipped, 0 fail.
- T152 concluída: release implantada no caminho real `/opt/tsi-stack/apps/crm/crmtsiapp/` no `vpstsiapp`, com `/etc/crmtsiapp/crmtsiapp.env` preservado, backup timestamped, migração `MIGRATION_OK` e serviços reiniciados.
- T153 concluída: rollback real

## 2026-09-20 — Reconciliação C1–C7 e US3
- C1 corrigida sem declarar fechamento: `specs/005-operational-experience/spec.md` agora está `In Progress`; a constituição continua exigindo evidência real antes de fechamento.
- C2–C4 corrigidas para a cadeia US3: T081–T087, T098, T102 e T103 foram executadas/marcadas; a duplicação de T087 foi removida. T048/T049 foram sincronizadas com evidência existente.
- US3: 40 testes locais passaram, incluindo idempotência/colisão, confirmações destrutivas, admin, workers tenant-scoped, drain sem exclusão/leases, privacidade export/anonymize/delete/legal hold/retenção e segurança de processo.
- Evidência criada em `evidence/005-operational-experience/us3-crm-cli.json`; rastreabilidade agora mapeia FR-001–FR-032 e SC-001–SC-012 individualmente em `specs/005-operational-experience/traceability.json`.
- Acceptance gate inicial falhou corretamente por evidências OE01/OE02/OE03 com skips/stale; a evidência final foi rerodada depois com PostgreSQL real/Chromium e o PASS está registrado na seção “Acceptance gate PASS”.
 `/opt/tsi-stack/backups/crmtsiapp-before-operational-experience-20260920T052038Z` provado em `tsi-crmtsiapp-operational-rollback-validate`; os três serviços e o health em `172.20.0.1:3101` foram validados no backup e, em seguida, a release atual foi restaurada e revalidada.
- Validação final independente em `tsi-crmtsiapp-operational-final`: `crmtsiapp.service`, `crmtsiapp-outbox-worker.service` e `crmtsiapp-webhook-worker.service` active; `NRestarts=0`; health privado e HTTPS (`https://crm.tsiapp.io/health`) com `ok` e `db=1`.
- Evidências sanitizadas: `evidence/005-operational-experience/remote-deploy.json` e `evidence/005-operational-experience/final-validation.json`. Inventário VPS atualizado em `VPS/README.md`.

- Fase 2 e US1 validadas com 318 testes passando sem falhas (`npm run test`).
- T032 bloqueada devido à ausência do pacote Playwright para automação de browser (Chromium do sistema existe, mas Playwright não está no package.json).
- Pronto para prosseguir com US2 ou deploy em produção na `vpstsiapp` conforme instrução do usuário.

## 2026-09-20 — Preparação de release e revisão independente
- Branch de release criada: `feature/005-operational-experience-release`.
- Revisão independente encontrou e corrigiu: inicialização incorreta de rotas/services assíncronos, bootstrap sem validação do segredo, contagem de versão de credenciais, script PostgreSQL com URL inválida e setup routes executadas antes da autenticação.
- Artefatos locais gerados (`graphify-out/`, `findings.md`, `evidence_temp.json`, `ORCHESTRATION_PLAN.md`, `REMediation-STATUS-*`) foram excluídos do candidato por `.gitignore`.
- Verificação local atual: `npm test` 493 testes, 443 pass, 0 fail, 50 skipped; syntax checks e `git diff --check` passam.
- Commit realizado em `73625ad` e release publicada em `main`.
- Deploy remoto concluído via tmux `tsi-crmtsiapp-ui-shell-deploy`; backup `/opt/tsi-stack/backups/crmtsiapp-before-ui-shell-20260920T185411Z`, `MIGRATION_OK` e três serviços ativos.
- Validação independente via tmux `tsi-crmtsiapp-ui-shell-final`: HTTPS `/live`, `/ready`, login shell e `NRestarts=0` passaram.

## 2026-09-20 — Frontend operacional sincronizado com os módulos atuais
- A navegação principal agora inclui `Status operacional` e aponta `Configurações` para `/settings/start`.
- Relatórios e status usam o mesmo shell visual autenticado do restante do sistema, incluindo sidebar, navegação mobile e destaque de rota ativa.
- `/settings/start` foi convertido em painel de atalhos executáveis para canais, equipe, filas, templates, automações, privacidade, segurança e aparência; o formulário real continua em `/settings/channels`.
- Testes de rota e renderização foram ampliados para proteger shell, destaque de rota e atalhos. Verificação local atual: 493 testes, 443 pass, 0 fail, 50 skipped; `git diff --check` passa.
- A alteração ainda não foi commitada nem implantada no `vpstsiapp`; o próximo passo é commit, deploy tmux idempotente e validação independente HTTPS/Chromium.

## 2026-09-19 — US2 concluída
- T050–T078 concluídas com RED/GREEN: state machine de setup (8 testes), contratos HTTP `/setup/*` (13 testes), schemas de provedores (11 testes), envelope criptográfico de segredos (15 testes), credenciais PostgreSQL (5 testes), validação de segurança (15 testes), upgrade idempotente (3 testes), schema `installation_setup` + `provider_configs` (domain-schema.js), setup-validation, setup-service, bootstrap-admin refactor, rotas HTTP `/setup/*`, credential-service AES-256-GCM, provider-registry/validation/service/migration, provider routes, Wizard UI, provider panel, setup-wizard.js, provider-settings.js, route-capabilities, evidência us2-setup-providers.json, traceability.json.
- Testes PostgreSQL usam skip condicional — suíte completa: 345 pass, 45 skip, 0 fail (`npm run test`).
- US2 checkpoint: instalação limpa ativa atomicamente, credencial bootstrap hash-only/tenant-bound/expirável/rate-limited, rascunho sem segredos, schemas allowlisted (WAHA/Meta), envelope AES-256-GCM + PBKDF2, SSRF protection, rate limit, CRUD tenant-scoped, rotação, importação idempotente, Wizard acessível, painel tenant-scoped, cliente JS, capacidades RBAC, evidência e traceability.
- Próximo: US3 (CLI unificada), US4 (editores visuais), deployment vpstsiapp.

## 2026-09-19 — US3 iniciada
- T079, T080 e T087 concluídas em RED/GREEN: parser declarativo CLI, gramática de comandos, help/version/json, tenant/idempotency/confirmation, proibição de segredos em argv; envelope text/json, redaction recursiva, códigos 0/1/2/3/4/5/6/130; entrada secreta segura via stdin/fd e limites de tamanho.
- Suíte completa: 366 pass, 45 skip, 0 fail (`npm run test`).
- Próximo: T081–T086 PostgreSQL (operações/admin/workers/drain/privacy), T088+ núcleo CLI e dispatch executável.
- T041–T042 concluídas com RED/GREEN: mensagem inbound, status e atribuição persistem `realtime_events` na mesma transação do efeito de domínio; incluído método tenant-scoped de atribuição e auditoria.
- Corrigidos fixtures PostgreSQL e doubles legados para o novo outbox realtime obrigatório.
- Validação focal: 9/9; suíte completa: 316/316, 0 falhas/skips/todo/cancelamentos (`npm run test`, 11,24s).
- Próximo: fechar T032 e T044–T049, incluindo integração runtime LISTEN/NOTIFY→hub, browser Chromium e evidência SC-001–SC-003.

## 2026-09-19 — US4 concluída
- T104–T137 concluídas, exceto gates dependentes de ambiente: graph schema/validator/compiler, simulation sem efeitos, drafts/CAS/versions/restore/pinning automation e campaign, conteúdo allowlisted/XSS-safe, compiler/preview/profile, dispatch pinado, rotas, UI progressiva com lista/teclado/aria-live, preview frame CSP/sandbox, RBAC/assets/server, evidência `us4-visual-editors.json`.
- Verificação fresca: 442 testes, 397 pass, 45 skip, 0 fail (`npm run test`). T107/T112 requerem PostgreSQL real; T114/T115 requerem Playwright/Chromium.
- Próximo: Phase 7 (T138–T153): gates transversais, evidências finais, documentação, deploy tmux e validação/rollback na vpstsiapp.

## 2026-09-19 — US3 avançada
- T079–T080, T087–T097 e T099–T101 concluídas: parser declarativo, output text/json e exit codes, secret input seguro, operation runner idempotente, schema admin_operations/queue_controls, admin/health/workers/queues/privacy commands, dispatch real em `bin/crm-cli.js` com SIGINT e cleanup.
- Validação real: `crm-cli --help`, `--version`, recusa segredo argv e envelope JSON; suíte completa: 372 pass, 45 skip, 0 fail (`npm run test`).
- Pendente: T081–T086 PostgreSQL real, T098 privacy-service, T102 evidência CLI, T103 traceability; segue US4 e deployment.
- Concluídas T026–T031, T033–T040, T043 e T047 em RED/GREEN: contrato/frames SSE; cliente; event store; isolamento/presença; quotas/backpressure; multiprocess; hub tenant-scoped; rota `/events` autenticada, autorizada e integrada ao servidor; autorização revalidada durante publish com encerramento após revogação.
- Validação fresca após integração: testes focados RBAC/SSE/hub/rotas 15/15 e suíte geral 313/313, zero falhas/skips/todos/cancelamentos. Gate PostgreSQL permanece 40/40.
- Permanecem Chromium, emissão transacional, bootstrap/workspace/asset e evidências em T032/T041–T042/T044–T046/T048–T049.

## 2026-09-19 — feature 005 Phase 2 concluída
- Fechadas T009–T025 com contexto operacional imutável/fail-closed, autorização por capacidade e tenant, catálogo de erros sanitizado, redaction recursiva, auditoria append-only, transações, optimistic locking, idempotência tenant-scoped, schema `005-operational-experience`, integração fresh/upgrade e capacidades de rota deny-by-default.
- O agregador PostgreSQL passou a capturar TAP e rejeitar suíte vazia, falha, cancelamento, skip ou todo. Fixtures legadas que só aceitavam `TEST_DATABASE_URL` agora usam banco isolado provisionado por `TEST_DATABASE_ADMIN_URL`.
- Validação observada: testes focados fundamentais 9/9; primitivos/rotas 14/14; gate PostgreSQL completo 33/33, zero fail/skip/todo/cancelled.
- Verificação geral fresca após as alterações: `npm run test` 285/285 aprovados, zero falhas/skips/todos/cancelamentos (2026-09-19).
- Evidência: `evidence/005-operational-experience/foundation.json`. Próximo bloqueio sequencial: US1 realtime T026–T049; nenhuma implantação remota foi iniciada.
- Continued from the runtime-parity phase by creating feature `002-complete-ui-modules` for the user's expanded scope: finish every module and capability in `CRMTSiAPP_Self-Hosted.md`, not only navigation/settings remediation.
- Wrote `specs/002-complete-ui-modules/spec.md` with nine independently testable user journeys, 36 functional requirements, full edge cases/entities/dependencies, and 12 measurable fail-closed outcomes covering all categories in the normative parity matrix.
- Validated `specs/002-complete-ui-modules/checklists/requirements.md`: 18/18 quality items pass, no clarification markers remain, and provider-dependent evidence has an explicit `Bloqueado externo` rule rather than a false completion claim.
- Created `specs/002-complete-ui-modules/plan.md` with nine delivery waves, incremental domain boundaries, migration/test/evidence strategy, constitution re-check, and risk controls.
- The delegated planning tasks all exhausted retries on transient HTTP 503 admission failures; completed `research.md`, `data-model.md`, all four `contracts/*.md`, and `quickstart.md` locally instead. These resolve aggregate/state/migration design, HTTP/workspace and durable-job behavior, reuse/sequencing, provider-disabled behavior, tenant/security risks, no-skip evidence architecture, and canonical remote tmux validation.
- Generated `specs/002-complete-ui-modules/tasks.md` with T001–T150 in strict sequence across setup, shared foundation, nine independently testable user stories, and final release/recovery closure. Structural validation passed: all planning artifacts exist, no clarification markers remain, prerequisites resolve the active feature, task IDs are sequential, and `git diff --check` is clean.
- Started implementation and completed T001–T009 except T010: generated full FR/SC/parity traceability; added the fail-closed acceptance manifest/runner and RED tests; implemented lock/audit/syntax/diff/secret/Supabase static checks; and created evidence, PostgreSQL, authenticated app, Chromium, and colliding dual-tenant fixtures. `npm run test:static` is GREEN and its seven focused tests pass.
- Restored omitted tenant migration exports/SQL in `domain-schema.js` after the baseline exposed `tenantMigration is not a function`; focused tenant, settings/RBAC, observability, browser-route and outbox regressions are GREEN.
- T011 and T012 complete: added governed migration lock, checksum/hash, and schema version metadata tests and implementation in `migrate.js` and `domain-schema.js`. All 3 governance tests pass. Implementation proceeds to T013/T014.
- `.specify/feature.json` selects `specs/002-complete-ui-modules`; implementation continues at T011. The earlier accidentally created `specs/002-ui-ux-functional-parity/spec.md` remains untracked and should be removed or reconciled during cleanup.

## 2026-09-18 — settings schema/auth remediation
- Added canonical tenant-aware `automation_rules` and `privacy_requests` migration definitions and indexes.
- Restricted privacy and audit settings reads to admin-only `privacy:read` and `audit:read`; managers/viewers are denied.
- Added bounded authenticated route sweep covering primary/settings routes.
- Local evidence: `npm test` => 176 tests, 169 pass, 7 skipped, 0 fail; targeted settings suite => 16 tests, 13 pass, 3 PostgreSQL-env-gated skips, 0 fail; `npm audit --audit-level=high` => 0 vulnerabilities.
- Remote evidence: `tsi-crm-deploy` exit 0 with backup `/opt/tsi-stack/backups/crmtsiapp-before-postgres-runtime-20260918T210630Z`; independent `tsi-crm-validate` exit 0, all three services active, health HTTP 200, canonical settings queries and columns verified.
- Phase 4 completion: dashboard KPIs are live tenant-scoped calculations; IA, reports, campaigns, segments and primary automation views remain explicitly documented as unbuilt modules; route audit recorded in `docs/CRMTSIAPP-UI-RUNTIME-AUDIT-2026-09-18.md`.
- Governance: populated `.specify/memory/constitution.md` with Test-First, Tenant Isolation, Evidence-First, Reversibility, and Pure Local Storage principles.
- Independent review found tenant-isolation and upgrade-migration defects; remediation now scopes audit writes, channel listing, persisted roles, and settings catalog to the active tenant; delivery table backfill occurs before `SET NOT NULL`; dashboard failure KPI includes `failed`, `dead_letter`, and `delivery_unknown`; privacy/appearance route claims were corrected.
- Completed T024: queue and template management now provide CSRF-protected, role-gated, tenant-scoped creation workflows. Queue names are unique per tenant; template drafts include an immutable version-1 body and parsed variable slots. Both workflows emit tenant-scoped audit events and have behavioral/contract coverage.
- Final local verification: `npm test` => 183 tests, 176 pass, 7 PostgreSQL-env-gated skips, 0 fail; targeted review/remediation suite => 34 tests, 31 pass, 3 skips, 0 fail; `git diff --check` clean; `npm audit --audit-level=high` => 0 vulnerabilities.
- Independent post-remediation deployment/validation: `tsi-crm-review-remediation-deploy` exit 0 (backup `/opt/tsi-stack/backups/crmtsiapp-before-postgres-runtime-20260919T000850Z`), then `tsi-crm-review-remediation-validate` exit 0; all three services active, health HTTP 200, role/settings tenant columns present, no null delivery tenant IDs, and tenant-scoped settings/channels/audit rows observed.
- Remaining: PostgreSQL-real local suites remain environment-gated; their remote production-schema evidence must be repeated against an isolated disposable database before being counted as a full integration gate.
- Mirrored system from vpstsiapp to local `~/Projects/TSiHomeLab/Projects/CRMTSiAPP/`.
- Created professional `README.md` with official licensing and philosophy section.
- Initialized local Git repository and published to `https://github.com/B0yZ4kr14/CRMTSiAPP`.
- Performed detailed inventory of project documentation.
- Updated `task_plan.md` and `CRMTSiAPP_PROFESSIONAL.MD` with Phase 33 (Hardening) and Phase 34 (Acceptance).
- Persistent memory updated with project status and paths.
- Scope correction: the existing deployment at `/opt/tsi-stack/apps/crm/crmtsiapp/` must be evolved in place until every capability in `CRMTSiAPP_Self-Hosted.md` is executable and evidenced. The implementation plan now treats placeholders and hardcoded dashboards as open work.

## 2026-09-18 (Runtime reconciliation — false-completion correction)
- The prior claim that phases 37–47 and the VPS deployment were complete was false. The local parity matrix remains `1 Completo`, `40 Parcial`, `67 Ausente`; no completion claim is valid until its executable gates pass on the live target.
- Observed a deployment identity split: `/opt/tsi-stack/apps/crm/crmtsiapp/` contains the upstream Next.js/Supabase project, while the PostgreSQL-local runtime lives under `local-crm/`. A temporary systemd switch to Next.js made the live login fail because no real Supabase identity backend exists.
- Added `bootstrap-admin.js` and migration integration so the PostgreSQL-local runtime creates the configured administrator idempotently from `ADMIN_PASSWORD_FILE` with salted scrypt hashing, without overwriting existing credentials.
- Added behavioral coverage for bootstrap creation, credential preservation and unsafe-password rejection. Local `npm test` result: `136 pass, 0 fail, 4 skipped` (PostgreSQL-real tests require explicit test database environment).
- Reconciliation evidence: `docs/CRMTSIAPP-RUNTIME-RECONCILIATION-2026-09-18.md`.
- Replaced the accidental Next.js/Supabase runtime on `vpstsiapp:/opt/tsi-stack/apps/crm/crmtsiapp/` with the existing PostgreSQL-local runtime in place, after a timestamped backup under `/opt/tsi-stack/backups/`.
- Live validation through HTTPS: service `active`, `/health` returned `{"ok":true,"db":1,"brand":"CRMTSiAPP"}`, and a credential-preserving end-to-end login returned `303` followed by authenticated `/app` `200`.
- PostgreSQL-real phase-37 evidence executed on `vpstsiapp` in an ephemeral createdb role and isolated databases: `4 pass, 0 fail` (webhook retry/concurrency and tenant inbox backfill/direct-ID/mutation/audit isolation). Suites run serially to prevent cross-suite `DROP DATABASE ... WITH (FORCE)` termination.
- Closed the remaining runtime tenant gap in Inbox reads: authentication now binds the session to an active tenant membership, every Inbox list/detail query predicates `tenant_id`, and message reads are tenant-scoped. Verified local `npm test`: `138 pass, 0 fail, 4 skipped`; live HTTPS login remains `303 → authenticated /app 200`, with service health green.
- Extended tenant propagation across the durable async path: channels and queued webhook events now have mandatory tenant identities, webhook ingestion persists the owning channel tenant, and the worker passes it to inbound processing. Channel creation/listing is tenant-scoped. Local `npm test`: `140 pass, 0 fail, 4 skipped`; all three runtime services (`crmtsiapp`, webhook worker, outbox worker) were revalidated active after migration.
- Closed outbound async tenant isolation: outbox jobs, delivery events and failed jobs now carry mandatory `tenant_id`; enqueue requires tenant context; workers load credentials only from the job tenant; delivery/failure updates mutate linked messages only inside the same tenant. Manual/status/assignment/outbound message mutations now write or update by active tenant and audit with the active tenant. Local `npm test`: `145 pass, 0 fail, 4 skipped`.
- Deployed the outbound tenant-isolation changes into `/opt/tsi-stack/apps/crm/crmtsiapp/` using the existing PostgreSQL runtime, preserving a timestamped rollback backup. Migration returned `MIGRATION_OK`; a missing runtime dependency was detected and restored (`configuration-contract.js`), then all three units recovered. Independent second tmux validation: `crmtsiapp`, webhook worker and outbox worker `active`; `/health` returned `{"ok":true,"db":1,"brand":"CRMTSiAPP"}`; HTTPS `/login` returned `303`.

## 2026-09-18 (Historical invalid claim — superseded)
- This section is superseded by the runtime reconciliation above and must not be used as deployment evidence.

## 2026-09-18 (sessões, observabilidade e tenancy)
- Implementado localmente: tenant_id canônico adicional em entidades CRM/operacionais, backfill do tenant padrão, índices e gates NOT NULL para outbox/delivery/falhas.
- Implementado lifecycle de sessão: TTL bounded via `SESSION_TTL_SECONDS`, rotação no login, revogação auditável no logout/admin, consulta fail-closed com `revoked_at`, tela de sessões.
- Implementado `/health` com readiness real de DB/outbox/webhooks/workers, persistência em `health_checks` e `X-Request-Id` derivado de request-id/traceparent.
- Validação local: `npm test` = 163 testes, 159 pass, 0 fail, 4 skipped; `git diff --check` sem saída.
- Deploy remoto e confirmação de runtime ainda não executados nesta etapa; não declarar paridade total antes desse gate.

## 2026-09-18 (deploy remoto e validação)
- Empacotamento local enviado para `vpstsiapp` e aplicado em sessão tmux nomeada `tsi-crm-deploy-20260918`, com backup timestampado, `npm ci`, migração e reinício dos três serviços.
- Primeira migração falhou porque bancos existentes não tinham colunas `sessions.revoked_*`; corrigido com `alter table ... add column if not exists` idempotente e reaplicado com `MIGRATION_OK`.
- Health inicialmente expôs incompatibilidade de schema em `webhook_events.created_at`; corrigido para `received_at`, reaplicado e validado em segunda sessão tmux `tsi-crm-validate-20260918`.
- Evidência remota final: `crmtsiapp`, `crmtsiapp-webhook-worker` e `crmtsiapp-outbox-worker` ativos; `/health` respondeu `ok:true`, `db:1`, trace ID e readiness; `/login` HTTP 200; `health_checks` persistiu 4 registros; coluna `sessions.revoked_at` presente.
## 2026-09-20 — Reconciliação C1–C7 e US3
- C1 corrigida sem declarar fechamento: `specs/005-operational-experience/spec.md` agora está `In Progress`; a constituição continua exigindo evidência real antes de fechamento.
- C2–C4 corrigidas para a cadeia US3: T081–T087, T098, T102 e T103 foram executadas/marcadas; a duplicação de T087 foi removida. T048/T049 foram sincronizadas com evidência existente.
- US3: 40 testes locais passaram, incluindo idempotência/colisão, confirmações destrutivas, admin, workers tenant-scoped, drain sem exclusão/leases, privacidade export/anonymize/delete/legal hold/retenção e segurança de processo.
- Evidência criada em `evidence/005-operational-experience/us3-crm-cli.json`; rastreabilidade agora mapeia FR-001–FR-032 e SC-001–SC-012 individualmente em `specs/005-operational-experience/traceability.json`.
- Acceptance gate inicial falhou corretamente por evidências OE01/OE02/OE03 com skips/stale; a evidência final foi rerodada depois com PostgreSQL real/Chromium e o PASS está registrado na seção “Acceptance gate PASS”.
## 2026-09-20 — Verificação pós-reconciliação
- `npm run test`: 487 testes, 442 pass, 0 fail, 45 skipped.
- `hermes verify --json`: exit 0; bootstrap `npm install` e fase de testes passaram.
- `git diff --check`: OK.
## 2026-09-20 — PostgreSQL gate diagnostic
- Próximo passo executado com `TEST_DATABASE_URL=postgresql:///postgres?host=/run/postgresql npm run test:postgres`. O gate falhou em 32 testes por causa ambiental observada: o usuário local `b0yz4kr14` não possui `CREATE`/`USAGE` no schema `public` (`permission denied for schema public`), não por falha funcional isolada da US3.
- Não foi alterado privilégio do banco nem usado segredo; o acceptance gate continua FAIL e o fechamento permanece bloqueado até executar com `TEST_DATABASE_ADMIN_URL`/usuário de teste autorizado e sem skips.
## 2026-09-20 — Acceptance evidence runner e gate atualizado
- Corrigido o manifesto para usar apenas testes existentes e executáveis: OE01, OE03, OE04 e OE05; removidos nomes obsoletos que causavam falsa leitura de cobertura.
- Criado `scripts/record-acceptance-evidence.mjs` e `npm run test:acceptance:evidence`, que executam cada suíte real, capturam contagens e sobrescrevem evidências com timestamp/saída observados.
- Execução observada: OE01 28/29 (1 skipped), OE02 13/20 (7 skipped), OE03 49/70 (21 skipped), OE04 40/40, OE05 26/26. O gate continua FAIL por skips reais; nenhum resultado foi fabricado.
- `npm run test`: 487 testes, 442 pass, 0 fail, 45 skipped.
- Próximo bloqueio técnico: corrigir a suíte OE03/ambiente PostgreSQL real e decidir explicitamente como fornecer evidência PostgreSQL/Chromium para OE01/OE02 sem skips.
## 2026-09-20 — Correção de invariantes PostgreSQL da US2
- A migração operacional agora habilita `pgcrypto`, garante índice único parcial por `(tenant_id, provider)` para configs ativas e protege transições concorrentes/revogações com advisory lock e trigger.
- Teste focado real: `TEST_DATABASE_ADMIN_URL=postgresql:///postgres?host=/run/postgresql node --test test/postgres-provider-credentials.test.js test/postgres-setup-activation.test.js`: 9/9 pass, 0 fail, 0 skipped.
- Evidência mostrou e corrigiu também o retorno incompleto de `secrets_hash` no teste de ativação.
## 2026-09-20 — OE03 PostgreSQL/Chromium verde
- Corrigidos os invariantes de provider/setup e o contrato HTTP de bootstrap/validação: segredo inválido, crypto ausente no fixture, rate-limit após 10 tentativas e retorno de campos persistidos.
- Execução real com PostgreSQL admin e Chromium: suíte OE03 completa, 70 testes, 70 pass, 0 fail, 0 skipped.
## 2026-09-20 — Acceptance gate PASS
- Com `TEST_DATABASE_ADMIN_URL=postgresql:///postgres?host=/run/postgresql` e `BROWSER_EXECUTABLE_PATH=/usr/bin/chromium`, `npm run test:acceptance:evidence` passou todas as suítes: OE01 29/29, OE02 20/20, OE03 70/70, OE04 40/40, OE05 26/26, sem skips.
- `node scripts/acceptance-gate.mjs`: PASS, exit 0, todos os requisitos do manifesto individualmente mapeados e evidências atualizadas.
- `npm run test`: 487 testes, 442 pass, 0 fail, 45 skipped; `git diff --check`: OK.
## 2026-09-20 — Clarificação Speckit pós-aceite
- `/speckit-clarify` executado para `005-operational-experience`; não havia `.specify/extensions.yml`, então hooks pre/post foram ignorados.
- Uma clarificação foi integrada em `specs/005-operational-experience/spec.md`: reconciliação do Inbox deve aumentar dinamicamente o replay quando exceder 6.000 eventos por tenant até recuperar todos os eventos autorizados.
- Seções tocadas: `Clarifications`, `Functional Requirements` (`FR-003`) e `Success Criteria` (`SC-002`). Checklist de qualidade permaneceu 16/16.
## 2026-09-20 — Speckit plan revalidado
- `/speckit-plan` executado para `005-operational-experience`; `.specify/extensions.yml` ausente, então hooks before/after foram ignorados.
- Artefatos Phase 0/1 revalidados: `plan.md`, `research.md`, `data-model.md`, `quickstart.md` e `contracts/{realtime,setup-providers,crm-cli,visual-editors}.md`.
- Clarificação de replay >6.000 eventos propagada para plano, pesquisa, modelo, contrato realtime e quickstart; não há `NEEDS CLARIFICATION`; `git diff --check` OK.

## 2026-09-20 — Speckit tasks revalidadas
- `/speckit-tasks` executado para `005-operational-experience`; `.specify/extensions.yml` ausente, então hooks before/after foram ignorados.
- `tasks.md` revalidado com 154 tarefas: US1 25, US2 29, US3 25, US4 34; setup/fundação/polish completam o restante.
- Adicionada T046A, explicitamente unchecked, para implementar a nova política de replay dinâmico acima de 6.000 eventos e cobri-la com testes PostgreSQL/cliente.
- O trabalho existente permanece preservado; nenhuma tarefa concluída foi artificialmente reaberta.
## 2026-09-20 — T046A implementada
- Replay PostgreSQL agora aceita expansão explícita além do limite padrão, preservando tenant, cursor, ordenação, autorização e deduplicação.
- Cliente realtime ganhou `replayBeyondLimit`, que pagina até recuperar todos os eventos autorizados sem marcar replay parcial como sucesso.
- Testes reais: cliente 4/4 pass; PostgreSQL admin 4/4 pass, incluindo 6.005 eventos do tenant A sem vazamento do tenant B.
- T046A marcada `[X]` em `specs/005-operational-experience/tasks.md`.
## 2026-09-20 — T107/T112 PostgreSQL visual editor versions
- T107 concluída com `test/postgres-automation-versions.test.js`: CAS tenant-scoped, stale write sem overwrite, versões append-only e execução fixada em `automation_version_id`.
- T112 concluída com `test/postgres-campaign-versions.test.js`: CAS tenant-scoped, fingerprint canônico, versões append-only e dispatch fixado em `campaign_version_id`.
- `domain-schema.js` agora cria triggers `automation_versions_immutable` e `campaign_versions_immutable` para bloquear UPDATE/DELETE em versões publicadas.
- Validação focal real com PostgreSQL: 5 testes, 5 pass, 0 fail.
## 2026-09-20 — speckit-implement fechamento 005-operational-experience
- Checklist `requirements.md`: 16/16 itens concluídos. `tasks.md`: 154/154 tarefas marcadas `[X]`, sem pendências.
- Project setup verificado: repositório Git com `.gitignore`; não há Dockerfile, ESLint, Prettier, Terraform ou Helm detectados. `.gitignore` consolidado para artefatos Node e Python (`__pycache__`, `.pyc`, venvs).
- Feature 005 validada contra plano/spec/design: Inbox realtime com replay expandido, Setup/Providers, `crm-cli`, editores visuais, rastreabilidade e evidências OE01–OE05.
- Hooks before/after implement: `.specify/extensions.yml` ausente; nada a executar.
## 2026-09-20 — speckit-analyze low findings remediated
- A1/I2 resolvidos: `specs/005-operational-experience/spec.md` agora está `Complete` e `tasks.md` registra corretamente `T001–T153 plus T046A`, 154 tarefas completas.
- Nenhuma alteração comportamental aplicada; somente reconciliação de metadados dos artefatos Speckit.
