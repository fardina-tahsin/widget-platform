# BUILDLOG

What I built, where AI helped, where it was wrong, what I changed.

## Phase 1 - Design 

- Built the design doc, README, `.env.example`, `.gitignore`, and evidence/log skeletons. 
- Direction mine: Node.js track; free stack (Express, PostgreSQL via Docker, zod, Mailpit, ip-api.com → ipapi.co) 
- Drafted the doc structure, SQL sketch and contract tables; AI also helped. The corrections I made: public CORS uses `*` not origin reflection; UUID is the public key (no separate `public_id`); honeypot hits stored with `is_spam = true` instead of dropped; `type` immutable after create.
- Verified every contract and all required indexes.
