# Implementation Plan: Operação Completa sem Configuração Manual

**Branch**: `005-operational-experience` | **Date**: 2026-09-19 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/005-operational-experience/spec.md`

## Summary

Entregar quatro fatias verticais no monólito modular existente: Inbox em tempo real por SSE durável e tenant-scoped; Setup Wizard transacional com gestão segura de credenciais de IA/canais; `crm-cli` compartilhando serviços de domínio; e editores visuais progressivos para automações e campanhas com validação, simulação e versões imutáveis. PostgreSQL permanece como única fonte de verdade e coordenação. Toda implementação começa por testes vermelhos e termina com integração PostgreSQL real, navegador, instalação limpa, upgrade e evidência operacional.

## Technical Context

**Language/Version**: Node.js >=22, JavaScript CommonJS; SQL PostgreSQL

**Primary Dependencies**: `pg` 8.x, `undici` 7.x, módulos nativos `http`, `crypto`, `events`; browser APIs `EventSource`, DOM e Fetch. Nenhuma nova dependência obrigatória no desenho inicial.

**Storage**: PostgreSQL local exclusivamente; ciphertext AES-256-GCM para segredos, com chave raiz fora do banco

**Testing**: `node:test`; integrações contra PostgreSQL real; testes de contrato HTTP/CLI; testes de navegador com Chromium; acceptance gate existente

**Target Platform**: servidor Linux com Node.js 22, PostgreSQL e navegador web moderno; operação self-hosted

**Project Type**: monólito web modular, server-rendered, workers e CLI no mesmo pacote

**Performance Goals**: no host de referência documentado, 100 conexões SSE simultâneas, 20 eventos/s por 10 minutos e payload de até 8 KiB; 95% visível em até 2 s; replay dos primeiros 6.000 eventos/tenant após interrupção de 5 min em até 10 s, com expansão dinâmica do replay até recuperar todos os eventos autorizados quando o acúmulo exceder esse volume; setup moderado em até 15 min; comandos administrativos moderados em até 5 min

**Constraints**: isolamento deny-by-default; nenhum segredo em argv, HTML, JSON, erro ou log; ativação e publicação atômicas; replay idempotente; migrações fresh/upgrade idempotentes; sem Supabase, Redis ou serviço de segredo obrigatório; páginas e mocks não contam como conclusão

**Scale/Scope**: quatro jornadas prioritárias, múltiplos tenants e processos web; perfil mínimo de 100 conexões SSE e 20 eventos/s; seis famílias de comando; editores de automação e campanha; testes moderados com pelo menos 10 administradores, 3 operadores e 10 gestores

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-checked after Phase 1 design.*

| Principle | Pre-design gate | Design evidence | Post-design |
|-----------|-----------------|-----------------|-------------|
| I. Test-First | PASS | Cada fase começa por testes comportamentais vermelhos; integração PostgreSQL real é obrigatória | PASS |
| II. Tenant Isolation | PASS | Chaves, índices, queries, eventos, CLI e versões incluem tenant; autorização é derivada de sessão/contexto, nunca de input confiado | PASS |
| III. Evidence-First | PASS | Quickstart exige código, testes, browser e evidência remota; placeholders e skips falham o aceite | PASS |
| IV. Reversibility & Production Safety | PASS | Migrações aditivas, ativação/publicação transacionais, restore por nova versão e rollout com backup/tmux/log/exit | PASS |
| V. Pure Local Storage | PASS | PostgreSQL é fonte de verdade, coordenação e replay; nenhuma dependência Supabase/Redis | PASS |

Não há violações constitucionais nem decisões de planejamento pendentes.

## Architecture Decisions

1. **SSE durável**: comandos continuam HTTP; `realtime_events` é a fonte de replay e `LISTEN/NOTIFY` apenas acorda leitores. O hub global em memória é substituído por assinaturas tenant-scoped com fila limitada.
2. **Setup como máquina de estados e confiança bootstrap**: rascunho pode ser salvo; toda mutação pré-admin exige credencial bootstrap de uso único, vinculada ao tenant inicial, persistida somente como hash, expirada/rate-limited e consumida atomicamente. A ativação final usa bloqueio, versão otimista e transação única. Após ativação, alterações seguem configurações regulares.
3. **Segredos versionados**: criptografia autenticada, metadados mascarados e promoção de versão só após teste. Plaintext nunca tem rota de leitura.
4. **CLI fina**: parser e renderizadores chamam os mesmos serviços usados pelo web; nenhuma regra crítica ou SQL é duplicada no executável.
5. **Editores progressivos**: HTML server-rendered mais JavaScript modular; grafo/documento canônico independente da visualização; todas as ações gráficas têm alternativa acessível.
6. **Versões imutáveis**: rascunhos usam concorrência otimista; publicação/restauração criam versões; execuções apontam para versão explícita.

Detalhes e alternativas: [research.md](./research.md).

## Project Structure

### Documentation (this feature)

```text
specs/005-operational-experience/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── realtime.md
│   ├── setup-providers.md
│   ├── crm-cli.md
│   └── visual-editors.md
└── tasks.md                 # criado por /speckit-tasks
```

### Source Code (repository root)

```text
bin/
└── crm-cli.js

modules/
├── setup/
│   ├── setup-service.js
│   ├── setup-validation.js
│   └── routes.js
├── realtime/
│   ├── event-store.js
│   ├── sse-hub.js
│   └── routes.js
├── providers/
│   ├── credential-service.js
│   ├── provider-validation.js
│   └── routes.js
├── cli/
│   ├── parser.js
│   ├── output.js
│   └── commands/
├── automation/
│   ├── graph-schema.js
│   ├── compiler.js
│   ├── engine.js
│   ├── routes.js
│   └── workspace.js
└── marketing/
    ├── content-schema.js
    ├── content-compiler.js
    ├── preview-service.js
    └── campaign-service.js

public/
└── js/
    ├── realtime-inbox.js
    ├── setup-wizard.js
    ├── automation-editor.js
    └── campaign-editor.js

# Existing integration points
server.js
workspace.js
domain-schema.js
migrate.js
authorization.js
channel-secrets.js
tenant-context.js
route-capabilities.js

# Tests remain in the established flat test/ directory
test/
├── realtime-*.test.js
├── postgres-realtime-*.test.js
├── setup-*.test.js
├── postgres-setup-*.test.js
├── provider-credential-*.test.js
├── crm-cli-*.test.js
├── automation-editor-*.test.js
├── campaign-editor-*.test.js
└── browser-operational-experience.test.js
```

**Structure Decision**: preservar o monólito modular e o diretório `test/` existentes. Novos módulos isolam domínio e contratos sem introduzir build de frontend ou uma segunda aplicação. `server.js` atua apenas como composição/roteamento; serviços recebem explicitamente pool/client, tenant e ator.

## Delivery Phases

### Phase A — Gates, schema e serviços compartilhados

- Escrever testes vermelhos de isolamento, migração fresh/upgrade, auditoria e idempotência.
- Adicionar tabelas/índices definidos em [data-model.md](./data-model.md) por migração idempotente.
- Extrair serviços de autorização/auditoria/segredo reutilizáveis e estabelecer contratos de erro.
- Manter compatibilidade com canais, templates, automações e jobs existentes.

### Phase B — Inbox em tempo real (P1)

- Implementar gravação transacional de eventos nos pontos de mutação do Inbox e presença com heartbeat/TTL.
- Implementar replay tenant-scoped, `LISTEN/NOTIFY`, heartbeat, backpressure e revogação.
- Expor contrato SSE e cliente progressivo com reconciliação por cursor.
- Provar ordem, deduplicação, reconnect, múltiplos processos e isolamento negativo.

### Phase C — Setup e provedores (P1)

- Implementar máquina de estados, credencial bootstrap de uso único, rascunho, validações e ativação atômica.
- Refatorar bootstrap admin para execução transacional e concorrente segura.
- Generalizar segredos versionados e validadores allowlisted para canais/IA.
- Criar Wizard e painel regular sem endpoints de leitura de plaintext.
- Provar corrida de ativação, rollback, rotação, redaction e upgrade.

### Phase D — CLI unificada (P2)

- Implementar parser, formatos, códigos de saída e entrada secreta segura.
- Implementar comandos por serviços compartilhados, com execução idempotente e auditoria.
- Definir drain como pausa de claims + espera limitada, nunca exclusão de jobs.
- Provar automação JSON, confirmação destrutiva, sinais, falhas e concorrência.

### Phase E — Editores visuais (P2)

- Definir schemas canônicos e pipeline único de normalização/validação/compilação.
- Implementar rascunho, optimistic concurrency, simulação, publicação e restauração.
- Implementar editor de campanha por blocos, sanitização, preview isolado por sandbox/CSP e perfis de capacidade por canal.
- Adicionar interações progressivas, equivalentes por teclado e persistência segura.
- Provar XSS, conflitos, versões, simulação sem efeitos e execução da versão publicada.

### Phase F — Aceite e operação

- Executar suíte integral, acceptance gate, PostgreSQL fresh/upgrade e Chromium.
- Validar métricas automatizadas SC-001–SC-003, SC-005, SC-007–SC-008 e SC-010–SC-012 com evidência reproduzível; executar SC-004, SC-006 e SC-009 por protocolos moderados com participantes e dados anonimizados.
- Fazer rollout remoto no `vpstsiapp` (`root`) em `/opt/tsi-stack/apps/crm/crmtsiapp/local-crm/`, preservando `/etc/crmtsiapp/crmtsiapp.env`; usar release/backup timestamped, sessão tmux nomeada/idempotente, log 0600 e `.exit`, validar `crmtsiapp.service`, workers, PostgreSQL, `http://172.20.0.1:3101/health` e HTTPS público, e validar novamente em segunda sessão. Rollback restaura release/backup anterior, migração compatível e reinicia os serviços antes de repetir health checks.
- Atualizar documentação operacional e matriz de rastreabilidade requisito→teste→evidência.

## Dependency Order

`A → B` e `A → C`; `C → D` para reutilização de serviços administrativos/segredos; `A → E`. B e C podem avançar em paralelo após A. D e E podem avançar em paralelo após suas dependências. F depende de B–E completos.

## Risks and Controls

| Risk | Control |
|------|---------|
| Vazamento entre tenants no fan-out | SQL tenant-scoped, escopo derivado da sessão, testes negativos e revogação ativa |
| Perda/duplicação em reconnect | evento durável, cursor monotônico, chave/versão estável e cliente idempotente |
| Segredo em observabilidade | redaction central, proibição de argv/plaintext response, scanners e testes canário |
| Setup parcial ou concorrente | transação, bloqueio, versão otimista e constraint de ativação única |
| CLI duplicar regras | serviços compartilhados; binário limitado a parsing, contexto e rendering |
| XSS em campanha | documento estruturado, allowlist, escaping contextual, CSP e testes adversariais |
| Editor visual inacessível | representação lista/formulário equivalente, teclado, foco e testes browser |
| Migração quebrar instalação existente | alterações aditivas, backfill idempotente e mesma suíte em fresh/upgrade |

## Complexity Tracking

Nenhuma exceção constitucional ou complexidade não justificada foi aceita. PostgreSQL assume durabilidade e sinalização para evitar um broker adicional; JavaScript progressivo evita uma segunda aplicação frontend.
