# BUILDLOG

What I built, where AI helped, where it was wrong, what I changed.

## Phase 1 - Design 

- Built the design doc, README, `.env.example`, `.gitignore`, and evidence/log skeletons. 
- Direction mine: Node.js track; free stack (Express, PostgreSQL via Docker, zod, Mailpit, ip-api.com → ipapi.co) 
- Drafted the doc structure, SQL sketch and contract tables; AI also helped. The corrections I made: public CORS uses `*` not origin reflection; UUID is the public key (no separate `public_id`); honeypot hits stored with `is_spam = true` instead of dropped; `type` immutable after create.
- Verified every contract and all required indexes.

## Phase 2 

- Built schema, auth (bcrypt + JWT), tenant-scoped widget CRUD, public submission pipeline, CORS, 16 KB limit, per-IP and per-widget limits, honeypot, geo fallback with mock toggles, best-effort email, dashboard list and stats.
- Direction mine: mock geo for deterministic fallback proofs; no Mailpit during proof runs so email failure is real.
- Drafted the implementation with the help of AI; my corrections: per-IP limiter runs before shape validation, honeypot rows skip geo and email, mail fires after insert without being awaited, mock providers bypass the private-IP guard for localhost proofs.
- Verified: `node scripts/smoke.js` 32/32, all-geo-down run 29/29, cross-origin curl stored an enriched row, email failure logged while the submission returned 201.
