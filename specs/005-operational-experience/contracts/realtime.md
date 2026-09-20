# Contract: Tenant-Scoped Realtime Inbox

**Feature**: `005-operational-experience`

## Stream

`GET /events?topics=inbox,notifications`

Authentication comes exclusively from the current secure session. Tenant, role and team scopes are never accepted from query parameters or headers supplied by the caller.

### Request headers

- `Accept: text/event-stream`
- `Last-Event-ID: <sequence>` optional; must be a non-negative integer previously observed by this session/tenant

### Success

`200 text/event-stream`

Required response headers:

- `Cache-Control: no-cache, no-transform`
- `Content-Type: text/event-stream; charset=utf-8`
- `Connection: keep-alive`
- anti-buffering header supported by the deployment proxy

Event frame:

```text
id: 18442
event: inbox.message.created
data: {"eventId":"uuid","aggregate":{"type":"conversation","id":"...","version":17},"occurredAt":"...","data":{...}}
```

Allowed families:

- `inbox.message.created`
- `inbox.conversation.updated`
- `inbox.assignment.changed`
- `inbox.sla.alert`
- `presence.changed` when authorized
- `system.reconcile-required`
- `system.permission-revoked`

A heartbeat comment is emitted often enough to detect broken intermediaries; it carries no data. Authorized presence is maintained separately by tenant/team-scoped heartbeat records with a bounded TTL. Expiration emits `presence.changed` only to sessions authorized for that presence scope and never extends authorization or exposes another tenant.

### Error behavior

- `401`: session absent/expired before stream starts
- `403`: authenticated but realtime capability denied
- `409`: cursor belongs to an invalid state or future position
- `429`: connection quota exceeded; includes bounded retry guidance
- `503`: durable event source unavailable; no fake stream is opened

After headers are sent, fatal authorization/replay conditions produce a final system event and close the connection. No event from another tenant may be emitted even transiently.

## Replay

- Server returns events with `sequence > Last-Event-ID`, ordered ascending.
- Every page is filtered by active tenant and current resource authorization.
- When more than 6,000 events accumulated for the tenant, the server/client replay loop expands through additional authorized pages until all events are recovered; partial replay with a stale-success status is not allowed.
- Duplicate reconnects are safe because sequence and aggregate version are stable.
- If the cursor predates retention, emit `system.reconcile-required` and close; client reloads authorized state and reconnects at the supplied current cursor.

## Backpressure

Each connection has a bounded byte/event queue. A slow client is closed with retry guidance rather than allowing unbounded memory. The durable table remains the source for subsequent replay.

## Client contract

The browser client MUST:

1. apply events idempotently by event ID/aggregate version;
2. show stale/disconnected state after the configured threshold;
3. reconnect with the last fully applied ID;
4. perform full authorized reconciliation when instructed;
5. never treat arrival order alone as proof that an aggregate version is newer.
