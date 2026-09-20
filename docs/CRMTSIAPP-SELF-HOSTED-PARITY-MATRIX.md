# CRMTSiAPP Self-Hosted — matriz normativa de paridade

Fonte normativa: `CRMTSiAPP_Self-Hosted.md`

Alvo vivo: `vpstsiapp:/opt/tsi-stack/apps/crm/crmtsiapp/`

Esta matriz é fail-closed. “Completo” exige comportamento executável, persistência, autorização, teste automatizado e evidência no runtime vivo. Tabela sem fluxo, item de menu, texto estático, métrica hardcoded ou documentação sem implementação é “Parcial” ou “Ausente”.

Estados: `Completo`, `Parcial`, `Ausente`, `Bloqueado externo`.

## Plataforma, tenancy e identidade

| ID | Requisito verificável | Estado inicial | Evidência/lacuna atual | Gate de aceite |
|---|---|---|---|---|
| PLAT-001 | PostgreSQL local canônico, sem Supabase | Completo | `migrate.js`, runtime validado | réplica limpa e scan sem Supabase |
| PLAT-002 | Tenant/workspace explícito em toda entidade e operação | Parcial | kernel, entidades CRM e jobs receberam tenant_id/backfill; mídia e IA ainda abertos | testes cross-tenant em reads, writes, busca, jobs, mídia e IA |
| PLAT-003 | Isolamento tenant-safe no banco e serviço | Parcial | consultas Inbox/outbox/webhooks e CRM principal usam tenant; cobertura total de mídia/IA pendente | matriz BOLA e consultas com tenant obrigatório |
| PLAT-004 | Sessão segura e identidade ativa | Completo | TTL bounded, rotação, revogação auditável, tela de sessões e testes `session-lifecycle` | rotação/revogação, TTL configurável e testes de sessão |
| PLAT-005 | MFA obrigatório para administradores | Ausente | sem segundo fator | enrollment, challenge, recovery e política testados |
| PLAT-006 | SSO OIDC e opção SAML conforme tier | Ausente | sem provedor de identidade externo | contrato OIDC executável; SAML explicitamente por tier |
| PLAT-007 | RBAC `resource + action + scope` deny-by-default | Parcial | capacidades globais existem; escopo de objeto está aberto | matriz automatizada por papel/objeto/tenant |
| PLAT-008 | Usuários, equipes, capacidade e status | Parcial | tabelas e criação básica de equipe | CRUD, associação, capacidade, ativação e auditoria |
| PLAT-009 | Papéis operacionais granulares | Ausente | apenas admin/manager/agent/viewer | Atendente, Supervisor, Gestor, Marketing, Admin, Auditor/DPO e Developer |

## WhatsApp, webhooks e mensageria

| ID | Requisito verificável | Estado inicial | Evidência/lacuna atual | Gate de aceite |
|---|---|---|---|---|
| MSG-001 | Meta Cloud API inbound/outbound/status | Parcial | adapter, webhook e delivery existem | canário real ou fake contratual completo com retries |
| MSG-002 | WAHA opcional com sessão, QR, health e webhook assinado | Parcial | Extensão de implementação útil, mas não requisito normativo da especificação-base | QR/health/reconnect e inbound/outbound E2E; não bloqueia paridade normativa |
| MSG-003 | Webhook responde rápido após persistência durável | Parcial | fila PostgreSQL e worker separados; sem prova p95 | p95 de ingestão < 500 ms sob carga definida |
| MSG-004 | Idempotência transacional dos efeitos inbound | Parcial | tentativa local sem constraint canônica/prova concorrente | crash/retry/concurrency em PostgreSQL real sem duplicação |
| MSG-005 | Outbox transacional, retry, backoff, DLQ e lease cercado | Parcial | núcleo existe | recuperação operacional, alerta e reconciliação executáveis |
| MSG-006 | Janela Meta de 24h e template aprovado fora dela | Parcial | política e fluxo de recuperação testados localmente; sem E2E vivo | E2E vivo preservado |
| MSG-007 | Templates estruturados, status, categoria, versão e botões | Parcial | nome/idioma/body/status simples | sync Meta, componentes, categoria, botões, qualidade e analytics |
| MSG-008 | Sincronização e reconciliação de templates Meta | Ausente | sem job de sync | import/update/status idempotentes |
| MSG-009 | Modelo abstrato de mensagem e mídia | Ausente | texto é o modelo principal | texto, imagem, áudio, vídeo, documento, localização e referência segura |
| MSG-010 | Object storage com retenção e autorização | Ausente | sem armazenamento de mídia | upload/download tenant-safe, malware/size/type gates e lifecycle |
| MSG-011 | Read/unread e cursores por usuário | Ausente | sem cursor persistido | leitura concorrente e contadores consistentes |
| MSG-012 | Paginação keyset de conversas/mensagens | Ausente | limites fixos | cursores estáveis, sem duplicação/omissão |
| MSG-013 | Recovery console para retry/DLQ/reconciliação | Ausente | tabelas sem console operacional | ações autorizadas, auditadas e idempotentes |

## Inbox e operação humana

| ID | Requisito verificável | Estado inicial | Evidência/lacuna atual | Gate de aceite |
|---|---|---|---|---|
| INBOX-001 | Visões fila/não atribuídas/minhas/todas/fechadas | Parcial | filtros all/open/closed/mine | filas e não atribuídas com escopo obrigatório |
| INBOX-002 | Busca por contato, telefone e texto tenant-safe | Parcial | contato/telefone; sem texto de mensagem | FTS/paginação e testes BOLA |
| INBOX-003 | Atribuição, transferência e histórico | Parcial | atribuição manual e ledger | transferência, motivo, escopo e concorrência |
| INBOX-004 | Auto-distribuição por round-robin/menor carga | Ausente | strategy persistida sem engine | worker transacional e canários de concorrência |
| INBOX-005 | SLA, horários, feriados e escalonamento | Parcial | tabelas SLA sem fluxo completo | calendário/timezone, alertas e breach testados |
| INBOX-006 | Collision detection/presença | Ausente | sem presença/lock otimista | aviso multiagente e resolução de conflito |
| INBOX-007 | Notas internas, macros e ações auditadas | Parcial | tabela de notas sem fluxo; sem macros | CRUD/escopo/auditoria e composer executável |
| INBOX-008 | Composer com texto, templates, anexos e estados | Parcial | texto/template | mídia, falhas, retries e acessibilidade |
| INBOX-009 | Fechar, reabrir, acompanhar e snooze | Parcial | fechar/reabrir | snooze/follow-up com jobs e filtros |
| INBOX-010 | URL/filtros compartilháveis | Parcial | query/filter em URL | todos filtros operacionais persistem na URL |

## Contato 360 e CRM

| ID | Requisito verificável | Estado inicial | Evidência/lacuna atual | Gate de aceite |
|---|---|---|---|---|
| CRM-001 | Identidade com telefone normalizado, e-mail, empresa, idioma e timezone | Parcial | contato básico | validação, normalização, edição e auditoria |
| CRM-002 | Proprietário, equipe, lifecycle stage e lead source | Parcial | lead/owner básicos | modelo e UI 360 executáveis |
| CRM-003 | Consentimentos/opt-in com finalidade, origem, texto, data e evidência | Ausente | sem ledger de consentimento | prova auditável e elegibilidade integrada |
| CRM-004 | Opt-out e suppression imediata | Ausente | sem suppression gate | inbound opt-out + bloqueio de campanhas/envios |
| CRM-005 | Custom fields tipados e validados | Ausente | sem definição/valores | schema, UI, filtros e autorização |
| CRM-006 | Merge/deduplicação de contatos | Ausente | sem identidade canônica completa | preview, merge transacional e trilha |
| CRM-007 | Tags criar/aplicar/remover com cor/escopo | Parcial | tabelas existem | CRUD/UI/analytics/automação |
| CRM-008 | Timeline unificada de mensagens, eventos, auditoria e integrações | Ausente | thread de mensagens apenas | timeline ordenada, paginada e tenant-safe |
| CRM-009 | Oportunidades/deals e estágio/valor | Parcial | leads básicos | pipeline configurável e vínculo ao contato |
| CRM-010 | Pedidos, tickets, pagamentos e referências externas | Ausente | sem objetos canônicos | adapters e contexto 360 read-only inicial |
| CRM-011 | Importação CSV com mapeamento, preview e job | Ausente | sem fluxo | arquivo limitado, dedup, erros por linha e auditoria |
| CRM-012 | Exportação privilegiada por job e link expirável | Ausente | privacy table não executa export | RBAC, expiração, criptografia e auditoria |
| CRM-013 | Bulk actions autorizadas | Ausente | sem operação em lote | seleção, limites, idempotência e auditoria |

## Segmentos e campanhas

| ID | Requisito verificável | Estado inicial | Evidência/lacuna atual | Gate de aceite |
|---|---|---|---|---|
| MKT-001 | Segmentos AND/OR com preview, tamanho e atualização | Ausente | página placeholder | modelo, builder, query segura e preview real |
| MKT-002 | Segmentos dinâmicos, exclusões e critérios estruturados | Ausente | sem engine | recomputação e testes de elegibilidade |
| MKT-003 | Campanha por segmento + template + agenda | Ausente | página placeholder | criação, aprovação, schedule e dispatch |
| MKT-004 | Opt-in/opt-out, suppression e janela como gates | Ausente | sem campanha executável | nenhum destinatário inelegível em E2E |
| MKT-005 | Throttling, quotas, cancelamento e kill switch | Ausente | sem worker | rate/tenant e parada comprovada |
| MKT-006 | Métricas de campanha, categoria e attribution | Ausente | sem eventos | enviados/entregues/lidos/falhos/opt-out por campanha |

## Automação e integrações

| ID | Requisito verificável | Estado inicial | Evidência/lacuna atual | Gate de aceite |
|---|---|---|---|---|
| AUTO-001 | Regras trigger→condition→action persistidas | Parcial | tabelas sem engine/UI | execução determinística testada |
| AUTO-002 | Versionamento, dry-run, histórico e kill switch | Ausente | sem runtime | simulação, ativação e rollback auditados |
| AUTO-003 | Builder de fluxo com fallback e handoff | Ausente | sem fluxo | nós/transições validados e teste visual |
| AUTO-004 | Horários, timeout e ações idempotentes | Ausente | sem engine | retries não duplicam efeitos |
| INT-001 | Hub com interfaces canônicas de providers | Ausente | integração genérica só persiste configuração | Customer/Order/Ticket/Payment/Catalog/Calendar/Identity adapters |
| INT-002 | Sync assíncrono com external_id/version/status/error | Ausente | sem modelo de sync | retry, conflito e reconciliação |
| INT-003 | API e webhooks externos assinados, escopados e observáveis | Ausente | apenas webhooks de provedores WhatsApp | keys/scopes/events/retry/DLQ e docs reais |
| INT-004 | Timeouts, circuit breaker, retry e idempotência | Parcial | timeout em parte dos adapters | contratos uniformes e fault injection |
| INT-005 | Links de pagamento sem guardar credenciais financeiras | Ausente | sem provider | token/link e política de dados |

## IA e conhecimento

| ID | Requisito verificável | Estado inicial | Evidência/lacuna atual | Gate de aceite |
|---|---|---|---|---|
| AI-001 | Feature flags por tenant/equipe/percentual | Ausente | sem flags | rollout/rollback determinísticos |
| AI-002 | Intenção, entidades, idioma, prioridade e sentimento como sinais | Ausente | página placeholder | dataset pt-BR versionado e métricas |
| AI-003 | Resumo de conversa com aprovação/feedback | Ausente | sem inferência | provider opcional, timeout e audit |
| AI-004 | Sugestão de resposta/copiloto com decisão humana | Ausente | sem fluxo | aceitar/editar/rejeitar e métricas |
| AI-005 | Base de conhecimento versionada, owner, validade e ACL | Ausente | sem modelo | ingestão, atualização e autorização |
| AI-006 | RAG tenant-safe com referências e freshness | Ausente | sem retrieval | adversarial cross-tenant e groundedness |
| AI-007 | Handoff com resumo, ações e evidências | Ausente | sem orquestração | pacote de handoff persistido |
| AI-008 | Tools allowlisted, tipadas e autorizadas pelo domínio | Ausente | sem tools | schemas, negative tests e nenhuma URL/SQL genérica |
| AI-009 | Confirmação para ações irreversíveis | Ausente | sem actions | confirmação e reason codes auditados |
| AI-010 | Auditoria de modelo/prompt/policy/evidências/custo sem chain-of-thought | Ausente | sem AI audit | registro observável e retenção |
| AI-011 | Avaliação offline/adversarial pt-BR e red team | Ausente | sem harness | métricas de NLU/RAG/safety/performance |
| AI-012 | Minimização/redaction de PII antes do provedor | Ausente | sem provider | dataset negativo e contrato de fornecedor |

## LGPD, segurança e governança

| ID | Requisito verificável | Estado inicial | Evidência/lacuna atual | Gate de aceite |
|---|---|---|---|---|
| GOV-001 | Privacy center por titular | Parcial | `privacy_requests` sem workspace completo | pesquisa, finalidades, evidências, sistemas e histórico |
| GOV-002 | Acesso/exportação/anonymize/delete | Parcial | tabela de workflow | execução E2E, expiração e auditoria |
| GOV-003 | Retenção por classe e purge | Parcial | settings/tabela sem jobs completos | dry-run, purge e prova de preservação legal |
| GOV-004 | Inventário de sistemas, fornecedores e categorias | Ausente | sem registro | revisão e export de compliance |
| GOV-005 | Suboperadores e transferências internacionais | Ausente | sem modelo | país/finalidade/categorias/retenção/mecanismo |
| GOV-006 | Incidentes, severidade, responsáveis e prazo ANPD | Ausente | sem workflow | tabletop e timers/escalonamento |
| GOV-007 | Audit log imutável com antes/depois, IP e resultado | Parcial | eventos básicos fora de várias transações | cobertura integral e integrity test |
| SEC-001 | Secrets cifrados, rotacionáveis e nunca reexibidos | Parcial | AES-GCM local e versões | rotação, key version e auditoria |
| SEC-002 | SSRF DNS/rebinding-safe antes de enviar segredo | Ausente | filtro textual apenas | DNS controlado, pinning e zero credential leak |
| SEC-003 | Rate limits/quota por tenant+conta+rede | Parcial | login limiter em memória por endereço | backend durável e testes distribuídos |
| SEC-004 | Headers/TLS uniformes em HTML e JSON | Parcial | JSON diverge | inventário de todas as rotas públicas |
| SEC-005 | SAST/SCA/SBOM/secret scanning | Parcial | npm audit manual | pipeline e artefatos versionados |
| SEC-006 | DAST e pentest periódico | Ausente | sem evidência | relatório e remediação fail-closed |

## Dashboard, relatórios e observabilidade

| ID | Requisito verificável | Estado inicial | Evidência/lacuna atual | Gate de aceite |
|---|---|---|---|---|
| OBS-001 | Dashboard com período/unidade e KPIs persistidos | Ausente | valores hardcoded | queries reais e definições versionadas |
| OBS-002 | Backlog/sem dono/FRT/TTR/SLA/reabertura/transferência | Ausente | sem cálculo operacional | p50/p90/p95 e fixtures verificáveis |
| OBS-003 | CSAT, opt-out, delivery, bot, handoff, IA e automação | Ausente | sem métricas | eventos e denominadores definidos |
| OBS-004 | Relatórios por fila/equipe/canal/categoria e export | Ausente | página placeholder | dimensões, comparação e job de export |
| OBS-005 | Métricas técnicas de filas/workers/DB/API | Parcial | health verifica DB, backlog, idade e heartbeat | backlog, oldest age, retries, DLQ e heartbeat |
| OBS-006 | Liveness e readiness separadas | Parcial | `/health` executa dependências e retorna degradação explícita; endpoint liveness separado ainda aberto | dependências essenciais e degradação explícita |
| OBS-007 | Trace/correlation ID webhook→outbound | Parcial | request/trace ID implementado no runtime HTTP; propagação completa em workers ainda aberta | OpenTelemetry-compatible IDs e logs redigidos |
| OBS-008 | Alertas e status do sistema | Ausente | sem console | incidentes, filas, Meta e integrações |

## Não funcionais, testes e implantação

| ID | Requisito verificável | Estado inicial | Evidência/lacuna atual | Gate de aceite |
|---|---|---|---|---|
| NFR-001 | Core com alvo 99,9% e arquitetura compatível | Parcial | uma instância | SLO documentado e teste de recuperação |
| NFR-002 | Webhook e Inbox p95 < 500 ms; busca p95 < 1 s | Ausente | sem carga | cenário/carga/dataset e percentis publicados |
| NFR-003 | Nenhuma perda silenciosa | Parcial | filas duráveis | fault injection, reconciliação e invariantes |
| NFR-004 | RPO 5–15 min e RTO até 1 h | Parcial | backup diário local | backup cifrado off-host e restore cronometrado |
| NFR-005 | Workers independentes e backpressure | Parcial | units separadas; sem carga/recovery/backpressure completos | carga/recovery preservados |
| NFR-006 | Busca PostgreSQL FTS antes de motor externo | Ausente | ILIKE básico | FTS tenant-safe e SLO |
| TEST-001 | Unit, banco, contrato, webhook, fila e E2E | Parcial | suíte unit/mock ampla | PostgreSQL real e E2E completos |
| TEST-002 | Multi-tenant/BOLA em IDs, busca, export, mídia e vetores | Ausente | tenancy ausente | matriz adversarial |
| TEST-003 | Performance, resiliência e segurança | Ausente | sem harness consolidado | Meta/DB/ERP/LLM faults e scans |
| TEST-004 | LGPD e IA evaluation | Ausente | sem fluxos completos | E2E legal e benchmark IA |
| DEP-001 | Migrações incrementais com lock/checksum/rollback | Parcial | ledger ornamental, DDL rerun | migrador governado e réplica limpa |
| DEP-002 | dev→staging→canary→produção | Ausente | deploy direto | ambientes/gates ou justificativa explícita self-hosted |
| DEP-003 | Artefato reproduzível, versionado e rollback atômico | Ausente | source vivo não rastreado pelo commit pai | release manifest/hash e troca reversível |
| DEP-004 | Atualização in-place do projeto existente | Em andamento | alvo fixado | `/opt/tsi-stack/apps/crm/crmtsiapp/` atualizado sem stack paralela |
| DEP-005 | Backup cifrado, off-host e restore isolado | Parcial | dump local e restore anterior | prova atual com RPO/RTO |
| DEP-006 | Revisão de política Meta antes do go-live | Ausente | documento exige revisão temporal | checklist assinado/data/fonte |

## Ordem de fechamento

1. Restaurar gates P1 fail-closed e baseline verde.
2. Implementar tenancy e autorização por objeto antes de ampliar superfícies, iniciando pelo tracer vertical de conversa manual tenant-safe.
3. Fechar operação e governança P0: mensageria, Inbox, Contato 360, consentimento/suppression, RBAC, import/export, SLA, auditoria, LGPD, segurança e backup.
4. Fechar segmentos/campanhas, automações, integrações e observabilidade sem permitir bypass dos gates de consentimento/LGPD.
5. Implementar IA em ordem de risco, mantendo o CRM operacional quando provedores não estiverem configurados.
6. Executar carga, resiliência, réplica limpa, restore, revisão independente e deploy in-place via tmux.

## Evidência desta execução (2026-09-18)

- PLAT-004: completo localmente; `test/session-lifecycle.test.js` cobre TTL, revogação, rotação e rota administrativa.
- OBS-006: implementado localmente; `/health` usa SQL real, persiste `health_checks`, emite `X-Request-Id` e aceita `traceparent`; `test/observability-health.test.js`.
- Tenancy: backfill/índices/gates NOT NULL para outbox, delivery, failed jobs e entidades CRM; cobertura total permanece aberta para mídia, IA e provedores externos.
- Gate remoto: ainda pendente; nenhuma linha é marcada completa por evidência apenas local até executar a migração e validação em `vpstsiapp`.
