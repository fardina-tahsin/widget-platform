# EVIDENCE

## Widget management

- [x] Authenticated CRUD; unauthenticated requests rejected.

Command: `node scripts/smoke.js`
```
PASS unauthenticated widget create rejected (status 401)
PASS register tenant A (status 201)
PASS duplicate email rejected (status 409)
PASS create widget (status 201)
PASS owner can update widget (status 200)
PASS owner can delete widget (status 204)
```

- [x] Multi-tenant isolation: tenant A cannot read or modify tenant B's widgets or submissions.

Command: `node scripts/smoke.js`
```
PASS tenant B cannot read A widget (status 404)
PASS tenant B cannot patch A widget (status 404)
PASS tenant B cannot delete A widget (status 404)
PASS tenant B cannot list A submissions (rows 0)
```

## Widget delivery

- [x] Embed snippet generated per widget.

Command: `node scripts/smoke.js`
```
PASS snippet generated (<script src="http://localhost:3000/widget.js?id=cd0bf485-d7b5-4cea-acc5-e29e3477078b&v=v1" async></script>)
```

- [ ] Public config endpoint with correct cache headers.
- [ ] Widget JS served as a versioned bundle.
- [ ] Widget renders on a page from a different origin than the API.

## Public submission API

- [x] CORS headers correct; OPTIONS preflight handled.

Command: `node scripts/smoke.js`
```
PASS CORS preflight 204 (status 204)
PASS CORS allow-origin header (*)
PASS CORS allow-methods include POST (GET, POST, OPTIONS)
```

Command: `curl.exe -i -X POST http://localhost:3000/submissions -H "Origin: http://localhost:5500" ...`
```
HTTP/1.1 201 Created
Access-Control-Allow-Origin: *
```

- [x] All input validated; malformed and oversized payloads rejected with 4xx JSON errors.

Command: `node scripts/smoke.js`
```
PASS missing required field rejected (status 400)
PASS unknown field rejected (status 400)
PASS oversized payload rejected with 413 (status 413)
```

- [x] Valid submissions stored and linked to the right widget and tenant.

Command: cross-origin curl, then `docker exec widget_platform-db-1 psql -U widgets -d widgets -c "SELECT payload, geo, is_spam FROM submissions ORDER BY created_at DESC LIMIT 1;"`
```
{"ok":true,"submissionId":"2288289d-a0ba-49dd-a33d-0fe489d81216"}

payload | {"name": "CurlProof", "email": "curl@example.com"}
geo     | {"lat":1.23, ..., "provider":"mock-b"}
is_spam | f
```

## Abuse protection

- [x] Rate limiting returns 429 under a burst; the API keeps serving legitimate traffic.

Command: `node scripts/smoke.js`
```
PASS per-widget rate limit returns 429 (last 429)
PASS legitimate traffic still served (status 201)
```

- [x] Spam control blocks a spam submission.

Command: `node scripts/smoke.js`
```
PASS honeypot submission answered 201 (status 201)
PASS honeypot row flagged as spam (honeypot)
```

## Enrichment and safe side effects

- [x] Provider A down → provider B answers → submission enriched.

Command: `node scripts/smoke.js` with `GEO_MODE=mock MOCK_GEO_A=down MOCK_GEO_B=up`
```
PASS geo fallback provider B enriched submission ({"provider":"mock-b","country":"Testland", ...})
PASS stats geo breakdown ([{"country":"Testland","count":1}])
```

- [x] All providers down → submission still succeeds, without geo.

Command: `$env:MOCK_GEO_B='down'` + restart, then `$env:SMOKE_GEO='none'; node scripts/smoke.js`
```
PASS cross-origin submission created (status 201)
PASS all geo providers down leaves geo empty (null)
29 passed, 0 failed
```

- [x] Failing confirmation email does not prevent storage.

Command: `Get-Content server.log -Tail 1; Get-Content server.err.log -Tail 1`
```
POST /submissions 201 8.3ms
email side effect failed: connect ECONNREFUSED 127.0.0.1:1025
```


