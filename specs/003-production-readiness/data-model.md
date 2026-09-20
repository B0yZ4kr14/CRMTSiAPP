# Data Model: Production Readiness

**Feature**: `003-production-readiness`

## Entities

### 1. System Setup State (`settings`)
- `key` (text, primary key): e.g., `setup_completed`, `organization_name`, `default_channel`.
- `value` (text, not null)
- `updated_at` (timestamptz)

### 2. AI Provider Configurations (`ai_providers`)
- `id` (uuid, primary key)
- `tenant_id` (uuid, references tenants)
- `provider_name` (text, not null): e.g., `omniroute`, `openai`, `anthropic`.
- `secret_version_id` (uuid, references secret_versions)
- `model_name` (text, not null)
- `enabled` (boolean, default false)
- `created_at` (timestamptz)

### 3. Real-Time Subscriptions / SSE Clients
- Managed in-memory connection registry in `modules/realtime/sse-hub.js` broadcasting tenant-scoped events (message, status, sla).
