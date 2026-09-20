# CRMTSiAPP Constitution

## Core Principles

### I. Test-First (NON-NEGOTIABLE)
Behavioral red tests and PostgreSQL-real integration tests must be written and executed before marking any feature or migration complete.

### II. Tenant Isolation
Every database read, write, query, and service operation must explicitly predicate active tenant identity and enforce authorization checks (deny-by-default).

### III. Evidence-First
No capability claim is valid without source code, passing automated tests, live runtime validation, and timestamped remote tmux evidence. Placeholders and static mock screens are strictly prohibited as completion proofs.

### IV. Reversibility & Production Safety
All remote deployments require timestamped backups, named idempotent tmux sessions, private logs, and separate exit files. Fail-closed error handling is mandatory.

### V. Pure Local Storage
CRMTSiAPP runs exclusively on local PostgreSQL without Supabase dependencies. All database migrations must be fully idempotent and compatible with both fresh installs and upgraded databases.
