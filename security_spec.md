# BeamCraft Firebase Security Specification

## 1. Data Invariants
- **Identity Isolation**: All data is strictly sandboxed by `userId`. A user can only access paths under `/users/{auth.uid}/`.
- **Integrity**: Fields like `userId` in document data must match the authenticated user's ID.
- **Temporality**: `createdAt` is set once on creation to server time. `updatedAt` is refreshed on every update to server time.
- **Shape Validation**: All documents must strictly match the schema defined in `firebase-blueprint.json`. Excess fields are rejected.

## 2. The "Dirty Dozen" Payloads (Security TDD)

| # | Vector | Payload (JSON) | Target Path | Expected |
|---|---|---|---|---|
| 1 | Identity Spoofing | `{"userId": "attacker", "name": "Fake"}` | `/users/victim/projects/p1` | DENIED |
| 2 | Omission Attack | `{"name": "No User ID"}` | `/users/user1/projects/p1` | DENIED |
| 3 | Immutability Breach | `{"createdAt": "2000-01-01T00:00:00Z"}` | Update `/users/user1/projects/p1` | DENIED |
| 4 | Cross-User Read | N/A (GET request) | `/users/victim/projects/p1` | DENIED |
| 5 | Cross-User Delete | N/A (DELETE request) | `/users/victim/projects/p1` | DENIED |
| 6 | Ghost Field Injection | `{"name": "P1", "userId": "u1", "isAdmin": true}` | `/users/u1/projects/p1` | DENIED |
| 7 | Temporal Spoofing | `{"updatedAt": "2100-01-01T00:00:00Z"}` | Update `/users/u1/projects/p1` | DENIED |
| 8 | Resource Poisoning | `{"name": "A".repeat(2000), ...}` | `/users/u1/projects/p1` | DENIED (size limit) |
| 9 | Unauthenticated Write | `{"name": "Evil"}` | `/users/u1/projects/p1` | DENIED |
| 10 | Profile Hijacking | `{"email": "evil@evil.com", "userId": "u1"}` | `/users/u1/profile` | DENIED (if auth.uid != u1) |
| 11 | Malformed ID | N/A (Path injection) | `/users/u1/projects/invalid%%ID` | DENIED (regex guard) |
| 12 | State Shortcutting | `{"isProcessed": true}` (if state existed) | `/users/u1/projects/p1` | DENIED |

## 3. Implementation Checklist
- [ ] Global deny catch-all.
- [ ] `isValidId()` regex check on all document IDs.
- [ ] `isValidProject()` schema validation.
- [ ] `isOwner()` helper for path-based security.
- [ ] Atomic relational checks (if ever needed).
