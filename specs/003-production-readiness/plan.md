# Implementation Plan: Production Readiness

**Branch**: `003-production-readiness` | **Date**: 2026-09-19 | **Spec**: `specs/003-production-readiness/spec.md`

**Input**: Product parity for production (SSE, Onboarding, AI UI, CLI, Visual Builders, 100% Config).

## Summary

Deliver a production-ready CRMTSiAPP by moving from manual config to UI-managed wizards, implementing real-time updates via SSE, and providing operational tools (CLI + Dashboard) that allow non-technical administrators to manage the platform without SQL.

## Technical Context

**Language/Version**: Node.js >=22

**Primary Dependencies**: `pg`, `undici`, `sse` (new), `commander` (for CLI)

**Storage**: PostgreSQL 17.x

**Testing**: `node:test`, `playwright`/`chromium` for UI sweeps, `node:assert`

**Target Platform**: Debian 13 (vpstsiapp)

**Project Type**: Server-rendered Web Service with CLI utilities

**Performance Goals**: Sub-500ms latency for real-time Inbox updates; instant UI response for admin configurations.

**Constraints**: Pure PostgreSQL foundation, tenant-scoped operations, fail-closed design.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- [x] Principle: Test-First (RED/GREEN validation enforced)
- [x] Principle: Tenant Isolation (explicit tenant_id in queries)
- [x] Principle: Evidence-First (live runtime validation required)
- [x] Principle: Reversibility & Production Safety (tmux idempotency enforced)
- [x] Principle: Pure Local Storage (Supabase-less architecture maintained)

## Project Structure

### Documentation

```text
specs/003-production-readiness/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Entities
├── contracts/           # API/UI interfaces
└── quickstart.md        # Validation guide
```

## Phases

### Phase 0: Research (Resolve unknowns)
- Resolve architecture for SSE/WebSockets fallback strategy.
- Select CLI framework for node-based administration tools.

### Phase 1: Foundation (Wizards & Admin Tools)
- Build Setup Wizard (first-run detector).
- Implement `crm-cli` binary.

### Phase 2: Core (Real-time & UI-Config)
- Implement SSE notification layer.
- Expand UI for settings/tokens.

### Phase 3: Polish (Visual Builders & Dashboard)
- Build Dashboard KPIs.
- Prototype Visual Workflow/Campaign Editors.
