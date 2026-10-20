# Widget Platform — Design

Phase 1 

**Problem.** Any website installs a lead-capture widget (signup, contact, CTA popover) with one line — `<script src="http://localhost:3000/widget.js?id=<id>&v=<version>">` — so our API receives untrusted traffic from origins we do not control. The build is mostly hardening: cached public delivery, boundary validation, abuse resistance, graceful degradation, tenant isolation.

## Data model

One user = one tenant; `owner_id` marks every tenant-owned row. PostgreSQL 16.

```
users(id pk, email unique, password_hash, created_at)

widgets(id pk /* public key */, owner_id fk -> users,
  type signup|cta|popover, title, description,
  fields jsonb /* [{name,label,type,required,maxLength}] */,
  button_text, display jsonb, status active|paused,
  created_at, updated_at)

submissions(id pk, widget_id fk -> widgets, owner_id fk -> users /* copied */,
  payload jsonb /* validated against widgets.fields */,
  ip, user_agent, geo jsonb /* or NULL */,
  is_spam, spam_reason, created_at)

indexes: widgets(owner_id, created_at desc)
         submissions(widget_id, created_at desc), (owner_id, created_at desc), (created_at)
```

## Embed flow

1. `POST /api/widgets` → `201 { widget, snippet }`.
2. Owner pastes the snippet on any site.
3. `/widget.js?id=W&v=v1` loads (immutable cache).
4. Script fetches `/widgets/W/config` (cache 60 s, CORS `*`) and renders the form.
5. Visitor submits → `POST /submissions` → validate → rate limit → spam check → geo A → B → none → store → best-effort email.

## API contracts

Errors: `{ error: { code, message, details? } }`. A foreign tenant's row → `404`, never `403`. Admin uses Bearer JWT; public endpoints are anonymous, CORS `*`, OPTIONS preflight answered.

| Path | Request | Success | Errors |
|---|---|---|---|
| **Admin** POST `/api/auth/register` · `/api/auth/login` | `{email,password}` | 201/200 `{token,user}` | 400,401,409 |
| Admin POST `/api/widgets` | `{type,title,description?,fields?,buttonText?,display?}` | 201 `{widget,snippet}` | 400,401 |
| Admin GET `/api/widgets` · `/:id`; PATCH/DELETE `/:id` | mutable fields | 200 `{widget(s),snippet}` / 204 | 400,401,404 |
| Admin GET `/api/submissions`; GET `/api/stats/overview` | `widgetId?,from?,to?,includeSpam?,page?,limit?` / `from?,to?` | 200 `{data,meta}` / `{totals,perWidget,overTime,geo}` | 400,401 |
| **Public** GET `/widget.js?id&v` | — | 200 JS; immutable when `v` is current, else `max-age=300` | — |
| Public GET `/widgets/:id/config` | — | 200 `{widget,scriptVersion}`, `max-age=60` | 404 unknown/paused |
| Public POST `/submissions` | `{widgetId,fields,hp}` | 201 `{ok,submissionId}` | 400,404,413,429,500 |

Submissions pipeline: 16 KB limit → per-IP limit → shape check → widget lookup → per-widget limit → field validation (unknown keys rejected) → honeypot → geo → insert → email. Bad input is always 4xx; 429 sends `Retry-After`; honeypot hits are stored `is_spam=true` but answered `201`.

## Layer sketch

```
src/  server.js, app.js, config/env.js
      db/ pool, schema.sql, queries · middleware/ auth, cors, rateLimit, validate, errorHandler(last)
      routes/ auth, widgets, dashboard, public · services/ snippet, geo, mail
      lib/ errors, ip, dates, uuid, submissionValidation
public/widget.js · dashboard/ · customer-site/ (:5500) · docker-compose.yml (postgres:16)
```

Order: `cors → json(16KB) → ipLimit → route`, then `shape → lookup → widgetLimit → validation → honeypot → handler`. `geoService` A → B → `null`, never throws; `mailService` runs post-commit, unawaited, logs failures; only DB failure reaches 500.

## Non-goal

**No visual form builder** — widgets are configured as JSON via the API; the only UI is the local test page and a bare stats page.

Stack: Node 20 + Express · PostgreSQL 16 · zod · bcryptjs + JWT · nodemailer + Mailpit · ip-api.com → ipapi.co. Free, no card.