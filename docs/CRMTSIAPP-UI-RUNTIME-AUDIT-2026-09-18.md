# CRMTSiAPP UI Runtime Audit & Route Matrix

Date: 2026-09-18
Target: `vpstsiapp:/opt/tsi-stack/apps/crm/crmtsiapp/`
Reference: `CRMTSiAPP_Self-Hosted.md`

## 1. Executive Summary

This document consolidates the route-level audit, root-cause fixes, runtime capabilities, and remaining parity gaps across CRMTSiAPP.

## 2. Authenticated Route Matrix

| Route | Method | Required Capability | Status | Evidence / Verification |
|-------|--------|---------------------|--------|--------------------------|
| `/inbox` | GET | `conversation:read` | Operational | Tenant-scoped list, search & filters (`test/browser-route-sweep.test.js`) |
| `/inbox` | POST | `conversation:write` | Operational | Manual conversation creation (`test/server-route-capabilities-regression.test.js`) |
| `/inbox/:id` | GET | `conversation:read` | Operational | Thread view with customer service window validation |
| `/inbox/:id/messages` | POST | `conversation:write` | Operational | Message outbox dispatch with 24h Meta window / template enforcement |
| `/inbox/:id/status` | POST | `conversation:write` | Operational | Open / Closed conversation status update |
| `/inbox/:id/assignment` | POST | `conversation:write` | Operational | Agent/manager assignment with tenant validation |
| `/inbox/:id/templates` | POST | `conversation:write` | Operational | WhatsApp approved template dispatch |
| `/connections` | GET | `channel:read` | Operational | Channel card statuses (`valid`, `pending`, `error`) |
| `/contacts` | GET / POST | `contact:read` / `contact:write` | Operational | Tenant-scoped contacts list & creation |
| `/leads` | GET / POST | `contact:read` / `routing:manage` | Operational | Tenant-scoped leads pipeline |
| `/dashboard` | GET | `settings:read` | Operational | Live SQL aggregations (`backlog`, `opened24h`, `closed24h`, `failedJobs`) |
| `/segments` | GET | `settings:read` | Documented Gap | Unbuilt module clearly marked in UI |
| `/campaigns` | GET | `settings:read` | Documented Gap | Unbuilt module clearly marked in UI |
| `/automation` | GET | `settings:read` | Documented Gap | Unbuilt module clearly marked in UI |
| `/ia` | GET | `settings:read` | Documented Gap | Unbuilt module clearly marked in UI |
| `/reports` | GET | `settings:read` | Documented Gap | Unbuilt module clearly marked in UI |
| `/settings/start` | GET | `settings:read` | Operational | Implementation checklist |
| `/settings/channels` | GET / POST | `settings:read` / `settings:write` | Operational | Channel secrets encryption & creation |
| `/settings/team` | GET / POST | `settings:read` / `team:manage` | Operational | Team list and creation |
| `/settings/queues` | GET / POST | `settings:read` / `queue:manage` | Operational | Tenant-scoped queue creation and list; strategy validation and audit event |
| `/settings/templates` | GET / POST | `settings:read` / `template:manage` | Operational | Tenant-scoped draft creation with immutable version-1 body, variable slots, validation and audit event |
| `/settings/automation` | GET / POST | `settings:read` / `automation:manage` | Operational | Rule creation & tenant-scoped list |
| `/settings/privacy` | GET / POST | `privacy:read` & `audit:read` / `privacy:manage` | Partial | Admin-only registration and audit trail for LGPD requests; execution/fulfillment processor is not implemented |
| `/settings/security` | GET | `settings:read` | Operational | Active session inspect & revocation view |
| `/settings/appearance` | GET | `settings:read` | Documented Gap | Read-only design-system status; appearance persistence/control is not implemented |

## 3. Root Causes & Remediations Applied

1. **Settings Navigation 500 / 404 Errors**:
   - *Cause*: `renderSettings` performed monolithic queries referencing unmigrated columns (`validation_state` directly on `channels`).
   - *Fix*: Section-specific queries using canonical relations (`channel_credentials`), and unified `/settings/:section` route handler.

2. **Unmigrated Domain Tables**:
   - *Cause*: `automation_rules` and `privacy_requests` were missing from the active database.
   - *Fix*: Added canonical migrations in `domain-schema.js` and `migrate.js` with foreign keys to `tenants(id)`.

3. **Privacy & Audit Authorization Leak**:
   - *Cause*: Privacy identifiers were viewable by non-admin roles.
   - *Fix*: Enforced `privacy:read` and `audit:read` check in `server.js` for `/settings/privacy`.

## 4. Verification Evidence

- **Automated Tests**: `npm test` -> 176 tests (169 passed, 7 skipped due to env, 0 failed).
- **Targeted Suite**: 16 tests (13 passed, 3 skipped, 0 failed).
- **Security / Vulnerabilities**: `npm audit --audit-level=high` -> 0 vulnerabilities.
- **Remote Validation**: Deployed via `tsi-crm-ui-parity-deploy` and independently verified via `tsi-crm-ui-parity-validate` on `vpstsiapp`.
