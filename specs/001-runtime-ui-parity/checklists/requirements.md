# Requirements Quality Checklist: Runtime-aligned UI and parity

## Navigation and authorization

- [x] Are all visible navigation routes enumerated and acceptance-tested?
- [x] Does the specification distinguish intentional authorization denial from server errors?
- [x] Does each advertised settings section map to a renderer and an implemented route contract?
- [x] Is the empty-tenant experience specified separately from a completed capability claim?

## Schema and persistence

- [x] Are all settings queries constrained to migrated, canonical columns?
- [x] Are both fresh-database and upgraded-database migration cases required?
- [x] Are tenant scoping and authorization explicit for every settings read and mutation?
- [x] Is the canonical audit relation defined instead of assuming a table name?

## Evidence and parity

- [x] Is a Complete feature required to have source, behavioral test and live evidence?
- [x] Does the report distinguish Partial, Absent and externally Blocked work?
- [x] Are placeholders explicitly prohibited from being treated as completed features?
- [x] Are remote execution, logs, exit files and independent validation required?

## Scope control

- [x] Are absent MFA/SSO/RAG/analytics capabilities explicitly non-goals for the first remediation slice?
- [x] Is the existing production tree preserved as the only deployment target?
