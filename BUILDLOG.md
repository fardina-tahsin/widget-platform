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

## Phase 3

- Built the versioned `/widget.js` bundle (immutable cache), public config endpoint (`max-age=60`, CORS), reproducible demo seed, second-origin customer page on `:5500`, and a bare dashboard table.
- Direction mine: a fixed demo widget id so the test page is reproducible; light DOM instead of shadow DOM so a headless DOM dump can prove the render.
- Drafted with AI help; my corrections: missing or stale `v` falls back to the current bundle with `max-age=300` instead of 404; widget text is HTML-escaped; the honeypot is hidden and excluded from `fields`.
- Verified: smoke 32/32, config headers `200 /*/ max-age=60` and paused `404`, immutable vs fallback bundle caches, headless Chrome shows the rendered form on `:5500`, cross-origin submission `25773486-51b5-4a49-bdae-1fd4167c0d4d` stored with geo.
