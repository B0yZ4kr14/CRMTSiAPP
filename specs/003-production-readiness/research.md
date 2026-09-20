# Research: Production Readiness & User-Facing Gaps

**Feature**: `003-production-readiness`  
**Date**: 2026-09-19  

## Purpose
Resolve architectural and implementation decisions for closing production readiness gaps: Setup Wizard, Real-time WebSockets/SSE, AI Token Management UI, Unified CLI (`crm-cli`), and Visual Low-Code Editors (WYSIWYG) for automations and campaigns.

## Technical Decisions

### 1. Real-Time Updates (WebSockets / SSE)
- **Decision**: Implement Server-Sent Events (SSE) via a lightweight, zero-dependency streaming endpoint (`/events`) authenticated with session cookies.
- **Rationale**: Avoids the complexity and maintenance overhead of upgrading Node's HTTP/HTTPS server to handle persistent WebSocket handshake protocols while providing instantaneous push notifications for Inbox messages, SLA breaches, and agent status changes.
- **Alternatives considered**: Full WebSockets (rejected due to proxy/firewall friction and added connection state management).

### 2. Setup Wizard (First-Run Onboarding)
- **Decision**: Implement an unauthenticated or bootstrap-guarded route `/setup` that verifies database connectivity, runs pending migrations via `migrate.js`, creates the initial administrator account, and records system metadata in `settings`.
- **Rationale**: Empowers operators to initialize the system cleanly without manual database queries or environment file editing.

### 3. AI Token Management & Provider UI
- **Decision**: Add an administrative settings workspace (`/settings/ai`) backed by the encrypted `settings` and `secrets` tables to store and test API keys for OmniRoute, OpenAI, and Anthropic dynamically.
- **Rationale**: Leverages existing robust cryptography (`channel-secrets.js`) and PII redaction policy engine without exposing raw keys in configuration files.

### 4. Unified CLI (`crm-cli`)
- **Decision**: Create a dedicated executable CLI wrapper at `bin/crm-cli.js` (linked in `package.json` under `bin`) supporting commands: `admin:create`, `admin:reset-password`, `queues:drain`, `privacy:purge`, `workers:status`, and `db:verify`.
- **Rationale**: Centralizes operational scripts into a single, documented, and user-friendly interface for infrastructure operators.

### 5. Visual Low-Code / WYSIWYG Editors
- **Decision**: Provide an interactive visual block/flow builder interface within the automation and campaign workspaces (`/settings/automation`, `/campaigns`), serializing visual nodes into valid allowlisted segment ASTs and automation JSON conditions/actions.
- **Rationale**: Lowers the barrier of entry for non-technical managers while preserving the secure AST compiler (`segment-compiler.js`) and rule engine execution guarantees.
