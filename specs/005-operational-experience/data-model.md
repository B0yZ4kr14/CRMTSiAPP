# Data Model: Operação Completa sem Configuração Manual

**Feature**: `005-operational-experience`

Todas as entidades tenant-owned exigem `tenant_id NOT NULL`, chave estrangeira para `tenants`, índices iniciados por `tenant_id` e acesso sempre predicado pelo tenant ativo. Datas são `timestamptz`. Identificadores são UUID salvo legado explicitamente preservado.

## 1. Installation Setup

### `installation_setup`

Representa a única ativação inicial da instalação.

- `id`: UUID, PK
- `state`: `pending | validating | active | failed`
- `version`: inteiro >= 1 para concorrência otimista
- `draft`: JSONB não secreto com etapas e valores normalizados
- `validation_summary`: JSONB sanitizado
- `bootstrap_credential_hash`: hash da credencial bootstrap de uso único; nunca plaintext
- `bootstrap_expires_at`: expiração obrigatória
- `bootstrap_failed_attempts`: inteiro não negativo
- `bootstrap_locked_until`: bloqueio temporário após limite de tentativas
- `bootstrap_consumed_at`: preenchido atomicamente na ativação
- `bootstrap_tenant_id`: FK do tenant inicial, imutável durante o setup
- `started_by`: FK `users`, anulável antes da criação do primeiro admin
- `activated_by`: FK `users`, anulável
- `activated_at`: timestamp anulável
- `last_error_code`: texto seguro, anulável
- `created_at`, `updated_at`

**Rules**:
- No máximo um registro pode estar `active`.
- `active` é terminal; alterações posteriores usam configurações regulares.
- `version` deve coincidir no update (`If-Match`); conflito não sobrescreve rascunho.
- `draft` nunca contém senha, token ou ciphertext.
- Toda mutação anterior ao primeiro administrador exige a credencial bootstrap válida, não expirada, não consumida e vinculada a `bootstrap_tenant_id`.
- Somente o hash da credencial bootstrap é persistido; falhas incrementam contador e podem acionar bloqueio/rate limit.
- A ativação consome a credencial bootstrap na mesma transação que cria o primeiro administrador e muda o estado para `active`.

**Transitions**:

```text
pending -> validating -> active
pending -> validating -> failed -> pending
```

### `tenant_settings`

- `tenant_id`: FK, parte da PK
- `key`: texto allowlisted, parte da PK
- `value`: JSONB validado, não secreto
- `version`: inteiro
- `updated_by`, `updated_at`

## 2. Provider and Channel Credentials

### `provider_configs`

- `id`: UUID, PK
- `tenant_id`: FK
- `kind`: `ai | channel`
- `provider`: identificador allowlisted
- `name`: rótulo humano
- `status`: `draft | validating | active | degraded | disabled`
- `settings`: JSONB não secreto validado por provedor
- `active_secret_version_id`: FK `secret_versions`, anulável
- `validation_state`: `untested | valid | invalid | unavailable`
- `validated_at`, `last_error_code`
- `version`, `created_by`, `updated_by`, `created_at`, `updated_at`

**Constraints**: unique `(tenant_id, kind, provider, name)`; configurações e modelos devem pertencer à allowlist do adaptador.

### Evolução de `secrets` e `secret_versions`

- Acrescentar `tenant_id` e `provider_config_id` ao escopo do segredo.
- `purpose` deixa de ser global e passa a ser único com tenant.
- `secret_versions` mantém `ciphertext`, `key_version`, `created_by`, `created_at`, `retired_at`.
- Acrescentar `fingerprint`/`masked_hint` não reversível para identificação visual.

**Rules**:
- Plaintext existe somente na memória durante gravação/uso autorizado.
- Nova versão só se torna ativa após validação bem-sucedida ou promoção administrativa explicitamente auditada.
- Rotação não altera nem apaga versões anteriores; aposentadoria impede novos usos.

## 3. Durable Realtime Events

### `realtime_events`

- `sequence`: bigint identity, PK e cursor de replay
- `id`: UUID, unique
- `tenant_id`: FK
- `event_type`: texto allowlisted
- `aggregate_type`, `aggregate_id`
- `aggregate_version`: bigint
- `payload`: JSONB mínimo e não secreto
- `audience`: JSONB com escopos necessários, nunca substitui autorização
- `occurred_at`, `expires_at`

**Indexes**:
- `(tenant_id, sequence)` para replay
- `(tenant_id, aggregate_type, aggregate_id, aggregate_version)` unique quando aplicável
- `expires_at` para retenção

**Rules**:
- Inserido na mesma transação da mudança de domínio.
- `NOTIFY` contém somente tenant e sequence; o payload vem da tabela.
- Replay exige `sequence > cursor`, tenant e autorização atual.
- Quando o replay acumulado excede 6.000 eventos por tenant, a leitura deve paginar/expandir dinamicamente até recuperar todos os eventos autorizados, sem trocar para replay parcial ou reconciliar por aproximação.
- Eventos expirados resultam em instrução de reconciliação completa, não replay parcial silencioso.

## 4. Administrative CLI Executions

### `admin_operations`

- `id`: UUID, PK
- `tenant_id`: FK
- `operation`: texto allowlisted
- `idempotency_key`: texto
- `actor_user_id`: FK ou identidade operacional autenticada
- `request`: JSONB sanitizado
- `state`: `pending | running | succeeded | refused | failed`
- `result`: JSONB sanitizado
- `started_at`, `finished_at`

**Constraints**: unique `(tenant_id, operation, idempotency_key)`.

### Queue drain state

Acrescentar estado de claim por tenant/fila, por exemplo `queue_controls`:

- `tenant_id`, `queue_id`: PK composta
- `accepting_claims`: boolean
- `drain_started_at`, `drain_deadline_at`
- `updated_by`, `version`

Drain impede novos claims no escopo e aguarda jobs com lease; não exclui jobs.

### Privacy requests

A tabela existente deve receber/confirmar:

- `tenant_id`, `idempotency_key`, `requested_by`
- `kind`: `export | anonymize | delete`
- `subject_selector`: JSONB validado
- `state`: `pending | approved | running | completed | partially_retained | failed`
- `retention_exceptions`, `result_summary`, timestamps

## 5. Automation Visual Documents

### `automation_drafts`

- `id`: UUID, PK
- `tenant_id`: FK
- `automation_id`: referência lógica
- `name`, `description`
- `schema_version`: inteiro
- `document`: JSONB canônico
- `version`: inteiro para optimistic concurrency
- `updated_by`, `updated_at`

**Document shape**:

```text
nodes[]: { id, type, config, position? }
edges[]: { id, from, output?, to, input? }
```

Tipos iniciais: `trigger`, `condition`, `branch`, `action`. IDs são únicos; posições não afetam execução.

### `automation_versions`

- `id`: UUID, PK
- `tenant_id`, `automation_id`
- `version`: inteiro monotônico
- `source_document`: JSONB imutável
- `compiled_plan`: JSONB imutável
- `content_hash`: texto
- `validation_fingerprint`: texto anulável; deve coincidir com `content_hash` no publish
- `published_by`, `published_at`
- `restored_from_version_id`: FK anulável

**Constraints**: unique `(tenant_id, automation_id, version)` e proteção contra update/delete.

### `automation_runs`

Deve referenciar `automation_version_id`, nunca “latest”. Trace registra nós avaliados e resultados sanitizados.

## 6. Campaign Visual Documents

### `campaign_drafts`

- `id`: UUID, PK
- `tenant_id`: FK
- `campaign_id`: referência lógica
- `name`, `channel_profile`
- `schema_version`
- `document`: JSONB com blocos allowlisted
- `version`, `updated_by`, `updated_at`

Blocos iniciais: texto, título, imagem referenciada, botão/link permitido, separador e variável tipada. HTML arbitrário não é entidade canônica.

### `campaign_versions`

- `id`: UUID, PK
- `tenant_id`, `campaign_id`, `version`
- `source_document`: JSONB imutável
- `compiled_by_channel`: JSONB sanitizado
- `content_hash`
- `validation_fingerprint`: anulável; invalidada por qualquer alteração do documento
- `published_by`, `published_at`
- `restored_from_version_id`

**Constraints**: unique `(tenant_id, campaign_id, version)` e imutabilidade.

### `channel_capability_profiles`

- `channel`: PK lógica
- `version`
- `allowed_blocks`, `variable_rules`, `size_limits`: JSONB validado
- `updated_at`

## 7. Audit

A tabela `audit_events` existente permanece append-only. Novos eventos mínimos:

- `setup.draft_saved`, `setup.validation_failed`, `setup.activated`
- `provider.created`, `provider.validated`, `provider.secret_rotated`, `provider.disabled`
- `admin.operation_started|completed|failed|refused`
- `automation.draft_saved|simulated|published|restored`
- `campaign.draft_saved|previewed|published|restored`

Metadata nunca inclui plaintext secreto, senha, token, conteúdo pessoal desnecessário ou payload bruto de provedor.

## 8. Migration and Compatibility

1. Criar estruturas novas de forma aditiva e idempotente.
2. Adicionar tenant a tabelas legadas usando backfill determinístico antes de `NOT NULL`.
3. Mapear `channels`/`channel_credentials` para `provider_configs` sem copiar plaintext nem substituir versão ativa.
4. Converter `automation_rules` e `template_versions` existentes em versões iniciais somente quando válidos; itens inválidos permanecem legados e recebem relatório acionável.
5. Manter leitura compatível durante a janela de migração; escrita nova usa apenas o modelo novo após promoção.
6. Executar a mesma suíte em banco vazio e snapshot atualizado.
