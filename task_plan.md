# CRMTSiAPP self-hosted deployment

## Goal
Deploy CRMTSiAPP on `vpstsiapp` under `/opt/tsi-stack/apps/crm/crmtsiapp`, backed by pure local PostgreSQL without Supabase services, available at `https://crm.tsiapp.io`, with visible `admin` login mapped to `admin@tsiapp.io`.

## Phases
- [x] 1. Inspect upstream application and VPS deployment constraints.
- [x] 2. Inspect full project doctrine/configuration and existing VPS proxy/DNS topology.
- [x] 3. Replace Supabase-bound runtime with a canonical idempotent local-PostgreSQL deployment path.
- [x] 4. Provision local dependencies, configuration, database schema, and administrator through remote tmux.
- [x] 5. Publish domain routing and validate application, login, and persistence end-to-end.
- [x] 6. Update VPS and service-publishing documentation.
- [x] 7. Perform deep runtime/code/database/edge audit, correct findings, and independently revalidate.
- [x] 8. Establish restored backup proof, maintenance automation, client-aware rate limiting, and protected HTTP surface.
- [x] 9. Analyze the upstream Deskcomm WhatsApp CRM information architecture, configuration model, and frontend layout.
- [x] 10. Port the relevant CRM WhatsApp workspace, channels, and settings experience to the local PostgreSQL implementation without Supabase services.
- [x] 11. Validate browser login and the new local UI routes end-to-end; update operational documentation.
- [x] 12. Re-audit the complete upstream configuration contract, including source code, documentation, migrations, runtime environment, and deployment topology.
- [x] 13. Establish a complete local PostgreSQL configuration catalog and secure configuration model that maps every original setting without Supabase.
- [x] 14. Implement the complete CRMTSiAPP configuration workspace and route-level compatibility model, then validate all configured and unconfigured states end-to-end.
- [x] 15. Replace generic configuration writes with typed, per-setting validation and canonical defaults.
- [x] 16. Revalidate persistence, invalid-input rejection, CSRF, and browser rendering of the configuration catalog.
- [x] 17. Render typed controls for typed configuration values and reconcile multi-value boolean submissions.
- [x] 18. Add the local PostgreSQL conversation/message foundation and bind the Central inbox to persisted data.
- [x] 19. Bind connection status to a real bounded adapter health probe, with truthful unavailable state.
- [x] 20. Make the local Inbox operable without a channel adapter by adding authenticated manual conversation creation.
- [x] 21. Add explicit local conversation lifecycle control (close/reopen) with persisted state and CSRF protection.
- [x] 22. Add server-side Inbox search and open/closed filtering over local PostgreSQL conversations.
- [x] 23. Replace the local proof-of-concept with the production domain model and database migration ladder: RBAC, session CSRF, audit, channels, secrets, teams, queues, routing, SLA, templates, media, contact context, events and outbox.
- [x] 24. Implement WAHA and Meta Cloud adapters behind a testable contract, QR lifecycle, signed idempotent inbound webhooks, delivery receipts and PostgreSQL outbox worker.
- [x] 25. Implement the premium accessible operational Inbox and executable configuration workspaces, based only on persisted runtime state.
- [x] 26. Implement metrics, audited automations, LGPD workflows/retention, observability and deterministic backups/restores.
- [x] 27. Produce a clean-VPS installer, deployment manifests, runtime secret-entry flow, upgrade/rollback procedure and independent replication acceptance proof.
- [x] 28. Continue post-audit hardening through direct official-source research.
- [x] 29. Complete operational WhatsApp vertical slices: delivery linkage, Meta 24-hour policy, approved-template recovery, manual assignment/`Minhas` scope, and signed WAHA inbound normalization.
- [x] 30. Remediate independent production-safety audit findings: webhook transactionality/deduplication (P1-01), role/object read scoping (P1-02), SSRF URL validation (P1-03), and Meta template timeouts (P1-04) implemented with TDD and verified via test suite.
- [x] 31. Implement and validate unread/read cursors, keyset pagination, automatic routing, SLA alerts, Meta template synchronization, recovery operations, executable settings, and media handling.
- [x] 32. Run clean-database migration/replication, production deployment through deterministic tmux, E2E browser/API/data-plane canaries, backup/restore proof, independent review, and documentation consolidation.

## Delivery gates
- No Supabase services, libraries, SQL client or runtime contract may be introduced.
- Every user-provided channel/API setting must have an editable configuration path, format validation, a non-secret configured-state indicator and a connection/test action; missing credentials may disable only the dependent integration, never the base CRM.
- All external delivery is asynchronous through a PostgreSQL outbox; inbound external events are signed where the provider supports it and idempotent by provider/event identity.
- Each feature is TDD-first, migration-safe on rerun, verified locally and on `vpstsiapp` through deterministic tmux jobs, and documented under `VPS/`.
- A replication gate provisions a fresh database/runtime from documented artifacts without copying production secrets or data.
