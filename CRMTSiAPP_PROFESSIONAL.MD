# CRMTSiAPP Professional — playbook autônomo de excelência e prontidão para produção

## 1. Missão

Evoluir e consolidar o CRMTSiAPP em `vpstsiapp` para um CRM WhatsApp profissional, seguro, acessível, resistente a falhas e intuitivo para usuários leigos. O produto final prioriza a operação diária: atender, priorizar, encaminhar, configurar canais e acompanhar a saúde da operação sem expor detalhes de infraestrutura ou dependências de Supabase.

Escopo de produção revalidado:
- Aplicação: `https://crm.tsiapp.io`
- Host: `vpstsiapp`
- Diretório remoto: `/opt/tsi-stack/apps/crm/crmtsiapp/local-crm`
- Persistência canônica: PostgreSQL local 17.11 (zero Supabase)
- Marca: CRMTSiAPP / TSi Telecom
- Acesso administrativo visível: `admin` (identidade interna: `admin@tsiapp.io`)

## 2. Resultado esperado e portfólio documentado

O repositório local e remoto (`https://github.com/B0yZ4kr14/CRMTSiAPP`) possui documentação completa inventariada:
1. `README.md` — Visão geral e guia de acesso rápido.
2. `AGENTS.md` — Diretrizes operacionais para agentes.
3. `CRMTSiAPP_PROFESSIONAL.MD` — Playbook autônomo e de governança.
4. `CRMTSiAPP_Self-Hosted.md` — Especificação arquitetural e de produto (multitenancy, Cloud API, segurança, LGPD, IA/RAG).
5. `docs/api-docs/API.md` — Referência de endpoints REST e webhooks.
6. `docs/architecture/ARCHITECTURE.md` — Arquitetura orientada a eventos, outbox transacional e schema.
7. `docs/guides/GETTING_STARTED.md` — Instalação e execução de testes.
8. `task_plan.md` — Kanban e controle de fases.

## 3. Princípios inegociáveis

1. **Verdad operacional:** Nenhuma afirmação de status (“conectado”, “enviado”, “ativo”) sem evidência persistida.
2. **Simplicidade progressiva:** Experiência leiga na interface e robustez técnica no backend.
3. **Segurança silenciosa:** Segredos confinados ao cofre/arquivos restritos (`0600`), nunca expostos em logs, URLs ou chat.
4. **Resiliência Transacional:** Deduplicação inbound estrita por `provider_message_id`, outbox com leasing fenced (`SKIP LOCKED`) e retry com backoff limitado.
5. **Reversibilidade e TDD:** Nenhuma alteração sem teste RED/GREEN prévio, migrações idempotentes e rollback documentado.

## 4. Plano Orquestrado de Prontidão para Produção (Fases 33 e 34)

### Fase 33 — Refatoração e Hardening de Produção
- [ ] Refinar rotas de leitura sensíveis para garantir checks explícitos de capability e escopo por objeto/fila.
- [ ] Consolidar logging de auditoria em transações atômicas com os recursos mutados.
- [ ] Adicionar checagens de liveness/readiness cobrindo workers e latência da base de dados no endpoint `/health`.
- [ ] Endurecer as units systemd com isolamento adicional e least privilege.

### Fase 34 — Canário, Réplica e Validação Externa na VPS
- [ ] Executar deploy automatizado via sessões `tmux` canônicas em `vpstsiapp`.
- [ ] Validar canário de dados e conectividade HTTPS estrita em `https://crm.tsiapp.io`.
- [ ] Executar suíte completa de testes remotos (121+ testes).
- [ ] Gerar prova de restore do backup automático diário.
- [ ] Consolidar evidências em `/root/tsi-crmtsiapp-evidence/`.

## 5. Validação Popperiana e Falsificabilidade
- **Hipótese:** O sistema refatorado mantém operação estável e segura sob concorrência, sem regressões de segurança ou falhas de outbox.
- **Falsificador:** Falha em qualquer teste unitário/regressão, reinicialização indesejada de serviço systemd, ou falha de TLS público.
- **Decisão:** Só declarar prontidão para produção após portfólio verde em ambas as sessões tmux de validação.
