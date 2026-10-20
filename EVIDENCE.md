# EVIDENCE

One proof per capstone requirement: exact command + trimmed output, dated. A box is ticked only when the proof below it exists.

## Widget management

- [ ] Authenticated CRUD; requests without valid auth rejected.

Date:
Command:
Output:

- [ ] Tenant A cannot read or modify tenant B's widgets or submissions.

Date:
Command:
Output:

## Widget delivery

- [ ] Embed snippet generated per widget.

Date:
Command:
Output:

- [ ] Public config endpoint with correct cache headers.

Date:
Command:
Output:

- [ ] Widget JS served as a versioned bundle.

Date:
Command:
Output:

- [ ] Widget renders on a page from a different origin than the API.

Date:
Command:
Output:

## Public submission API

- [ ] CORS headers correct; preflight (OPTIONS) handled.

Date:
Command:
Output:

- [ ] Malformed and oversized payloads rejected with 4xx and JSON error.

Date:
Command:
Output:

- [ ] Valid submissions stored and linked to the right widget and tenant.

Date:
Command:
Output:

## Abuse protection

- [ ] Rate limit per IP and/or per widget returns 429 under a burst; legitimate traffic keeps flowing.

Date:
Command:
Output:

- [ ] Spam control demonstrably blocks a spam submission.

Date:
Command:
Output:

## Enrichment and safe side effects

- [ ] Provider A down → provider B answers → submission enriched.

Date:
Command:
Output:

- [ ] All providers down → submission still succeeds, without geo.

Date:
Command:
Output:

- [ ] Failing confirmation email does not prevent storage.

Date:
Command:
Output:

## Documentation

- [ ] README with architecture diagram, setup instructions, API documentation.
- [ ] Required files present: `README.md`, `docs/DESIGN.md`, `EVIDENCE.md`, `BUILDLOG.md`, `.env.example` (committed), `.env` (git-ignored).
