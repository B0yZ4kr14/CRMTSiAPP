# CRMTSiAPP Full Specification Implementation Plan (CRMTSiAPP_Self-Hosted.md Parity)

## Goal
Transform the existing CRMTSiAPP application and its live deployment at `/opt/tsi-stack/apps/crm/crmtsiapp/` on `vpstsiapp` into a complete, executable implementation of the full `CRMTSiAPP_Self-Hosted.md` contract. Every described capability must be traceable to persisted domain behavior, authorization, tests, operational evidence and documentation; navigation-only or placeholder pages do not count as parity.

## Documentation Inventory (`~/Projects/TSiHomeLab/Projects/CRMTSiAPP`)
1. `README.md` — Project overview, architecture summary, and getting started.
2. `AGENTS.md` — Agent and operational instructions.
3. `CRMTSiAPP_PROFESSIONAL.MD` — Autonomous professional playbook.
4. `CRMTSiAPP_Self-Hosted.md` — Comprehensive architectural specification.
5. `docs/api-docs/API.md` — REST and Webhook API reference.
6. `docs/architecture/ARCHITECTURE.md` — System architecture and DB schema.
7. `docs/guides/GETTING_STARTED.md` — Local setup and test instructions.
8. `task_plan.md` — Orchestrated operational Kanban and phases.

## Phases
- [x] 1-34. Secure Backend Core, Outbox, Deduplication, and VPS Baseline.
- [x] 35. Restore fail-closed production-safety gates and close P1-01 through P1-04 with behavioral RED/GREEN tests, real PostgreSQL coverage and deterministic authorization/SSRF/provider contracts.
- [x] 36. Build the authoritative requirement/parity matrix for every functional, non-functional, security, LGPD, observability, testing and deployment capability in `CRMTSiAPP_Self-Hosted.md`.
- [x] 37-47. Reconciled local PostgreSQL runtime with `vpstsiapp`, closed tenant isolation across inbox/outbox/webhooks/workers, fixed all UI settings navigation routes, passed 162/162 automated tests, deployed via named tmux (`tsi-crm-deploy`), and validated via second tmux session (`tsi-crm-validate`) and live `/health` check.
- [x] 48. Runtime UI parity remediation: canonical settings tables, admin-only privacy/audit reads, authenticated route sweep, fresh migration and independent live validation (2026-09-18).
- [x] 49. Phase 4 truthfulness and governance: live tenant-scoped dashboard KPIs, unbuilt UI modules explicitly labelled, runtime route audit published, and project constitution populated (2026-09-18).
- [x] 50. Independent code review remediation: corrected upgrade migration ordering, tenant-scoped roles/settings/audits/channels, dashboard actionable failure KPI, and audited documentation claims; redeployed and independently validated via tmux (2026-09-19).
- [x] 51. Specify full-system completion as feature `002-complete-ui-modules`, covering every open normative parity row with fail-closed user journeys, requirements, edge cases, dependencies, and measurable acceptance outcomes (2026-09-19).
- [x] 52. Plan and decompose feature `002-complete-ui-modules`: research, data model, HTTP/job/provider/acceptance contracts, quickstart, and 150 sequential story-oriented tasks are complete and pass structural validation (2026-09-19).
- [x] 53. Implement feature `005-operational-experience` from T001–T153 plus T046A. All 154 tasks are marked complete; final local suite, PostgreSQL/Chromium acceptance evidence and acceptance gate passed for OE01–OE05 (2026-09-20).

## Delivery Gates
- Pure local PostgreSQL without Supabase.
- No feature is marked complete based on schema-only, navigation-only, static prose or hardcoded UI metrics.
- Every requirement has a stable ID, implementation evidence, behavioral tests and live acceptance evidence, or remains explicitly open.
- All remote mutation and validation runs through deterministic named tmux sessions with private logs and separate exit files.
- The live target is the existing project tree `/opt/tsi-stack/apps/crm/crmtsiapp/`; do not create a parallel replacement deployment.
- Verified local suite, PostgreSQL-real concurrency/isolation tests, clean-database replication and VPS synchronization are mandatory.
- [x] 48. Sessões e observabilidade locais: TTL bounded, rotação/revogação auditável, health/readiness live SQL, trace/request ID e heartbeats persistidos; 163 testes locais (159 pass, 0 fail, 4 skips).
- [x] 49. Deploy remoto via tmux em vpstsiapp e validação live concluídos; paridade funcional total permanece aberta para requisitos ainda parciais/externos.
