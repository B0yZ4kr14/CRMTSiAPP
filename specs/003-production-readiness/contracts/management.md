# Interface Contracts: Real-Time & Management

**Feature**: `003-production-readiness`

## 1. Real-Time Events (SSE)
- **Endpoint**: `GET /events`
- **Authentication**: Session cookie
- **Payload Format**: `text/event-stream`
- **Events**:
  - `message.received`: New inbound message for tenant
  - `conversation.assigned`: Change in agent ownership
  - `sla.warning`: Imminent SLA breach notification
  - `agent.status`: Change in peer presence/availability

## 2. AI Token Management API
- **Endpoint**: `POST /settings/ai/keys`
- **Body**: `{ provider: string, key: string, model: string }`
- **Action**: Encrypts and persists in `secrets` table; links via `ai_providers`.

## 3. CLI Interface (`crm-cli`)
- `node bin/crm-cli admin:create --login <login> --email <email>`
- `node bin/crm-cli admin:reset-password --login <login>`
- `node bin/crm-cli workers:status`
- `node bin/crm-cli db:verify`
