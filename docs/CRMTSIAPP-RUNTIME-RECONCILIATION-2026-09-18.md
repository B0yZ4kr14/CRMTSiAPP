# CRMTSiAPP — correção de identidade de runtime na vpstsiapp

Data: 2026-09-18

## Estado observado antes da correção

O deployment em `/opt/tsi-stack/apps/crm/crmtsiapp/` era o projeto Next.js `deskcomm-crm`, enquanto o serviço systemd histórico apontava para `local-crm/server.js` (a aplicação PostgreSQL local). Um `start.js` criado localmente redirecionou o serviço para o Next.js, que exige Supabase; como a VPS só tinha PostgreSQL, foram inseridos placeholders, quebrando autenticação e tornando o runtime inconsistente.

Não declarar o sistema pronto: a matriz de paridade local registra 1 requisito completo, 40 parciais e 67 ausentes. O plano prévio que marcou fases 37–47 como concluídas foi incorreto e foi invalidado.

## Correção aplicada no artefato local

- Criado `bootstrap-admin.js`: criação idempotente do administrador somente se ele não existir; senha vem exclusivamente de `ADMIN_PASSWORD_FILE`, recebe salt randômico e hash `scrypt`.
- Atualizado `migrate.js`: executa o bootstrap dentro da transação antes da associação tenant. Não sobrescreve uma senha existente.
- Criados testes comportamentais para criação, não sobrescrita e recusa de senha ausente/insegura.

## Gate local

`npm test`: 136 aprovados, 0 falhas, 4 PostgreSQL-real omitidos sem `TEST_DATABASE_URL`.

## Próximos gates obrigatórios

1. Fazer backup e restaurar o runtime PostgreSQL local como serviço em `/opt/tsi-stack/apps/crm/crmtsiapp/`; remover o caminho Next.js/placeholder como processo de produção.
2. Executar migração real com `ADMIN_PASSWORD_FILE` montado, confirmar a linha do admin e realizar login HTTP end-to-end sem revelar senha.
3. Integrar, por fases verificáveis, o que estiver realmente implementado localmente; não substituir o projeto do VPS com tarballs nem alegar paridade total.
4. Reabrir e trabalhar a matriz de 107 requisitos, só mudando estado com evidência executável, teste e validação no runtime.

## Atualização desta execução (2026-09-18)

- A execução local adicionou lifecycle de sessão e observabilidade: TTL bounded, rotação, revogação persistida/auditada, health/readiness com backlog e heartbeat, request/trace ID e tabelas de health checks.
- Entidades CRM principais e tabelas de jobs receberam tenant_id, backfill, índices e gates de não-nulidade para outbox/delivery/falhas.
- `npm test`: 163 testes, 159 aprovados, 0 falhas, 4 skips.
- O deploy vivo ainda não foi reexecutado após estas alterações. Portanto, a tarefa solicitada continua aberta e não há declaração de 100% de paridade.
