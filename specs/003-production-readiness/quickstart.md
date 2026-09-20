# Quickstart Validation Guide: Production Readiness

**Feature**: `003-production-readiness`

## Validation Scenarios

### 1. Setup Wizard Verification
1. Access `/setup` on a fresh database instance.
2. Complete the onboarding form (admin credentials, database name, brand name).
3. Verify that the application redirects to `/dashboard` and creates the administrator account successfully.

### 2. Real-Time SSE Verification
1. Open `/inbox` in two browser tabs as an authenticated agent.
2. Send a test message or simulate an inbound event.
3. Verify that the second tab updates instantly without manual page refresh.

### 3. CLI Administration Verification
1. Run `node bin/crm-cli workers:status` to verify worker heartbeat inspection.
2. Run `node bin/crm-cli db:verify` to confirm schema and migration integrity.
