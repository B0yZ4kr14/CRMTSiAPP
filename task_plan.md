# CRMTSiAPP Production-Ready Orchestrated Plan

## Goal
Refactor, harden, and fully validate CRMTSiAPP on `vpstsiapp` under `/opt/tsi-stack/apps/crm/crmtsiapp/local-crm`, backed by pure local PostgreSQL without Supabase services, available at `https://crm.tsiapp.io`, fully adhering to `CRMTSiAPP_Self-Hosted.md` and `CRMTSiAPP_PROFESSIONAL.MD`.

## Documentation Inventory (`~/Projects/TSiHomeLab/Projects/CRMTSiAPP`)
1. `README.md` — Project overview, architecture summary, and getting started.
2. `AGENTS.md` — Agent and operational instructions.
3. `CRMTSiAPP_PROFESSIONAL.MD` — Autonomous professional playbook (Socratic/Popperian rigor, P0-P3 gates).
4. `CRMTSiAPP_Self-Hosted.md` — Comprehensive architectural specification (multitenancy, WhatsApp Cloud API, security, LLM/RAG, LGPD).
5. `docs/api-docs/API.md` — REST and Webhook API reference.
6. `docs/architecture/ARCHITECTURE.md` — System architecture, event-driven outbox, webhook processing, and DB schema overview.
7. `docs/guides/GETTING_STARTED.md` — Local setup, migration, and test instructions.
8. `task_plan.md` — Orchestrated operational Kanban and phases.

## Phases
- [x] 1-30. Baseline, non-Supabase PostgreSQL migration, security hardening, P1 webhook/RBAC/SSRF/template remissions, and initial test suite (121/121).
- [x] 31-32. Inbox enhancements, cursors, keyset pagination, and initial VPS deployment.
- [x] 33. Refactoring and Production Hardening (P2/P3 items: strict role checks on read routes, atomic audit logging, migration locking/checksums, health/readiness worker checks, and least-privilege systemd sandboxing).
- [x] 34. Production Replication, Backup/Restore Proof, and Final Acceptance Gate on `vpstsiapp` via deterministic tmux sessions.

## Delivery Gates
- Zero Supabase components or libraries.
- All webhook events processed idempotently via durable queues.
- Outbox worker fenced with lease tokens (`SKIP LOCKED`).
- Full compliance with OWASP API Security Top 10 and ANPD/LGPD requirements as specified in `CRMTSiAPP_Self-Hosted.md`.
