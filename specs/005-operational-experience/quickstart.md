# Quickstart Validation: Operação Completa sem Configuração Manual

**Feature**: `005-operational-experience`

Este guia define os cenários executáveis de aceite. Ele não substitui tarefas nem implementação.

## Prerequisites

- Node.js conforme `package.json`
- PostgreSQL de teste real acessível por variável de conexão de teste
- Chromium disponível para os fluxos de navegador
- chave de teste de 32 bytes fornecida de modo seguro para criptografia de credenciais
- banco limpo e snapshot representativo de upgrade

Nunca use credenciais de produção. Não passe senha/token em argv nem grave em evidência.

## 1. Static and baseline gates

```text
npm ci
npm run test:static
npm test
```

Expected:

- nenhum segredo ou dependência Supabase detectado;
- zero falhas, skips, todos ou suites vazias nos gates mandatórios;
- testes existentes continuam verdes.

## 2. Fresh-install and upgrade migrations

Execute as migrações primeiro em banco vazio e depois em cópia sanitizada do schema anterior. Em ambos:

```text
npm run migrate
npm run migrate
npm run test:postgres
```

Expected:

- segunda migração não altera indevidamente o estado;
- constraints/índices de tenant existem;
- dados legados permanecem acessíveis;
- configurações inválidas são reportadas sem ativação silenciosa.

Referência: [data-model.md](./data-model.md).

## 3. Setup Wizard

1. Inicie com banco vazio e configuração pendente.
2. Obtenha a credencial bootstrap de uso único pelo canal local fora de banda; confirme que apenas o hash, a expiração, o contador/bloqueio e o tenant inicial são persistidos.
3. Confirme que rotas regulares ficam indisponíveis e `/setup` é exibido.
4. Tente mutações sem credencial, com credencial inválida, expirada, bloqueada e vinculada a outro tenant; todas devem falhar sem alterar o estado e sem registrar o valor apresentado.
5. Rotacione a credencial e confirme que a anterior deixa de funcionar; valide também rate limit e auditoria sanitizada.
6. Salve rascunho, recarregue e confirme preservação de campos não secretos.
7. Envie versão antiga e espere conflito sem sobrescrita.
8. Tente duas ativações concorrentes; exatamente uma deve ativar.
9. Injete falha antes do commit; confirme ausência de admin/configuração parcial e credencial ainda utilizável conforme política.
10. Conclua validamente e confirme auditoria, consumo atômico e fechamento definitivo do bootstrap.

Expected: SC-004 e fluxo FR-006–FR-009 comprovados.

## 4. Provider/channel secrets

1. Cadastre configuração e nova credencial pela UI.
2. Inspecione HTML, respostas, logs, auditoria e banco: plaintext deve estar ausente.
3. Valide credencial válida, inválida, timeout e resposta malformada.
4. Tente destino arbitrário e usuário sem permissão; ambos devem ser recusados.
5. Rotacione, promova e desative; confirme que uso novo aponta somente à versão ativa.

Expected: contratos de [setup-providers.md](./contracts/setup-providers.md), SC-005 e isolamento negativo.

## 5. Realtime Inbox

1. Abra duas sessões autorizadas no mesmo tenant e uma em tenant distinto.
2. Gere mensagem, atribuição, mudança de estado, alerta de prazo e heartbeat de presença.
3. Meça confirmação→visualização sob 100 conexões simultâneas, 20 eventos/s por 10 minutos e payload de até 8 KiB no host de referência documentado; confirme p95 ≤ 2 s e atualização sem recarga.
4. Pare heartbeats de presença e confirme expiração por TTL sem vazamento entre tenant/equipe.
5. Desconecte uma sessão por até 5 minutos, acumule 6.000 eventos no tenant e reconecte com cursor; confirme reconciliação em até 10 segundos.
6. Repita com mais de 6.000 eventos acumulados; confirme que o replay pagina/expande até recuperar todos os eventos autorizados, sem duplicação, perda ou vazamento entre tenants.
7. Reenvie evento/versão e confirme deduplicação.
8. Revogue permissão durante conexão; confirme fechamento e ausência de eventos posteriores.
9. Simule cliente lento até o limite; confirme encerramento e replay posterior.

Expected: [realtime.md](./contracts/realtime.md), SC-001–SC-003.

## 6. `crm-cli`

```text
crm-cli --help
crm-cli --format json health check --deep
crm-cli admin create --tenant <tenant> --email <email> --login <login> --name <name>
crm-cli workers list --tenant <tenant> --format json
crm-cli queues drain --tenant <tenant> --timeout 30 --yes --idempotency-key <key>
```

For destructive/privacy tests, use disposable data and safe secret input. Repeat mutable commands with the same idempotency key and then with the same key plus changed input.

Expected:

- output and exit codes match [crm-cli.md](./contracts/crm-cli.md);
- repeat does not duplicate effects;
- changed input conflicts;
- missing tenant/confirmation/authorization has no effect;
- no secret appears in process list, stdout, stderr or audit.

## 7. Automation editor

1. Via keyboard-only list/form mode, create trigger→condition→action.
2. Save and then submit stale version from a second session; expect conflict.
3. Create unreachable node/cycle/invalid action; publication must fail at location.
4. Simulate valid and invalid fixtures; verify trace and zero side effects.
5. Publish v1, alter draft, execute event and confirm v1 remains active.
6. Publish v2 and restore v1; confirm a new immutable version is created.

Expected: automation portion of [visual-editors.md](./contracts/visual-editors.md), SC-009/SC-010.

## 8. Campaign editor

1. Create content with approved blocks and typed variables.
2. Preview each supported channel in the isolated sandbox and compare output with dispatch compiler.
3. Attempt script, unsafe URL, event attribute, unknown block and missing variable; confirm the preview cannot escape its sandbox or gain same-origin access.
4. Verify all unsafe cases fail before publish and render inertly in preview.
5. Exercise keyboard ordering, focus return and announced validation errors.
6. Publish and restore; inspect immutable history.

Expected: campaign portion of [visual-editors.md](./contracts/visual-editors.md), SC-009/SC-010.

## 9. Full acceptance and evidence

```text
npm test
npm run test:postgres
npm run test:acceptance
```

Then run the browser acceptance suite in Chromium against both fresh and upgraded databases. Browser automation proves only SC-001–SC-003, SC-005, SC-007–SC-008 and SC-010–SC-012. Execute SC-004, SC-006 and SC-009 as moderated studies using the participant counts, time limits and success thresholds in `spec.md`; retain anonymized scenario results and consent without credentials or production data.

Remote production-like validation targets `vpstsiapp` as `root` at `/opt/tsi-stack/apps/crm/crmtsiapp/local-crm/` while preserving `/etc/crmtsiapp/crmtsiapp.env`, and must use:

- timestamped release/backup before change plus a proved rollback path;
- deployment session `tsi-crmtsiapp-operational-deploy`;
- private log (`0600`) and separate `.exit` file;
- sanitized retrieval of evidence;
- final validation in `tsi-crmtsiapp-operational-validate`, checking PostgreSQL, `crmtsiapp.service`, workers, private health and HTTPS;
- update of the consolidated host inventory in `VPS/README.md`.

Completion requires requirement→test→evidence traceability for SC-001–SC-012. SC-004, SC-006 and SC-009 remain `pending-human-validation` until their moderated sample and threshold are met. Mock screens, hardcoded success, skipped tests or documentation-only evidence fail closed.
