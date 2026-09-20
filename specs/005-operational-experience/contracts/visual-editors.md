# Contract: Visual Automation and Campaign Editors

**Feature**: `005-operational-experience`

## Shared rules

- Every route derives tenant and actor from the authenticated session.
- Draft writes use `If-Match`/version and return `409` on stale edit.
- Publish validates and compiles server-side; client validation is advisory only.
- Published versions are immutable. Restore creates a new version.
- Errors use stable codes and field/node/block locations.

## Automation editor

Base: `/automations/:id`

### Draft

- `GET /automations/:id/draft`
- `PUT /automations/:id/draft` with canonical document and `If-Match`
- `POST /automations/:id/validate`
- `POST /automations/:id/simulate`
- `POST /automations/:id/publish`
- `POST /automations/:id/restore/:version`
- `GET /automations/:id/versions`

Canonical document:

```json
{
  "schemaVersion": 1,
  "nodes": [
    {"id":"n1","type":"trigger","config":{"event":"conversation.created"},"position":{"x":0,"y":0}}
  ],
  "edges": []
}
```

Position is optional presentation metadata. Execution is derived from node/edge semantics only.

Validation response:

```json
{"valid":false,"errors":[{"code":"UNREACHABLE_NODE","location":{"nodeId":"n3"},"message":"..."}]}
```

Simulation accepts bounded fixture data and returns an ordered trace of node decisions and `would_execute` actions. It cannot invoke live side effects.

Publish atomically creates immutable source/compiled versions and moves the active pointer only when validation and optimistic concurrency succeed. The successful validation fingerprint MUST match the normalized content hash of the exact version being published; any edit invalidates it.

## Campaign editor

Base: `/campaigns/:id/content`

- `GET /campaigns/:id/content/draft`
- `PUT /campaigns/:id/content/draft`
- `POST /campaigns/:id/content/validate`
- `POST /campaigns/:id/content/preview` with channel profile and sample variables
- `POST /campaigns/:id/content/publish`
- `POST /campaigns/:id/content/restore/:version`
- `GET /campaigns/:id/content/versions`

Canonical block document:

```json
{
  "schemaVersion": 1,
  "blocks": [
    {"id":"b1","type":"paragraph","content":[{"type":"text","text":"Olá "},{"type":"variable","name":"contact.name"}]}
  ]
}
```

Only registered block/mark/variable types are accepted. Arbitrary HTML, scripts, event attributes, unsafe URLs and unknown variables are rejected. Preview uses the same compiler and channel capability profile as dispatch, renders in a sandboxed isolated context with restrictive content policy and no same-origin capability, and is labeled as an approximation where provider rendering cannot be reproduced exactly.

## Accessibility contract

- Node/block creation, connection, ordering, editing, deletion, validation and publication are usable by keyboard.
- A structured list/form view exposes every graphical operation.
- Focus returns predictably after dialogs or mutations.
- Errors are programmatically associated with their node/block and announced.
- Color is never the sole state indicator.

## Authorization and audit

Read, edit, simulate, publish and restore are distinct capabilities. Every mutation records actor, tenant, resource, source version, target version and result; draft content is not copied wholesale into audit metadata.
