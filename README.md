# Widget Platform

Embeddable lead-capture widgets — signup forms, contact forms, CTA popovers — installed on any website with one `<script>` tag. Submissions are validated, rate-limited, spam-checked, geo-enriched with a fallback chain, stored, and exposed to the owner through a dashboard API.

## Architecture

```
           Widget Owner (authenticated)                       Customer Website (any origin)
       +----------------------------------+              +------------------------------------+
       |  Admin API  (Bearer JWT)         |              |  <script src=".../widget.js?id=.."> |
       |  widgets CRUD, snippet, stats    |              +----------------+-------------------+
       +---------------+------------------+                               |
                       |                              GET /widgets/:id/config   (public, cached, CORS)
                       v                                                  |
              +------------------+                                         v
              |    PostgreSQL    |                                 render widget on the page
              |  users           |                                         |
              |  widgets         |                                         v
              |  submissions     |                       POST /submissions   (public, CORS)
              +--------^---------+                                         |
                       |              +------------------------------------+
                       |              v
                       |    validate -> rate limit (IP, widget) -> spam check
                       |              |
                       |              v
                       |    geo: provider A -> provider B -> none   (degrade, never fail)
                       |              |
                       |              v
                       |    store submission
                       |              |
                       |              v
                       |    email / webhook side effect   (failure never blocks success)
                       |              |
                       +--------------+
```

## Setup

Nothing runs yet (Phase 1). Phase 2:

```bash
docker compose up -d        # PostgreSQL 16
npm install
cp .env.example .env        # fill in values; never commit .env
npm run dev
```

## API

Admin (Bearer JWT): `POST /api/auth/register`, `POST /api/auth/login`, `GET /api/auth/me`, `POST|GET /api/widgets`, `GET|PATCH|DELETE /api/widgets/:id`, `GET /api/submissions`, `GET /api/stats/overview`.

Public (anonymous, CORS): `GET /widget.js?id&v`, `GET /widgets/:id/config`, `POST /submissions`.

Full contracts, status codes, and error shapes: `docs/DESIGN.md` (API contracts).
