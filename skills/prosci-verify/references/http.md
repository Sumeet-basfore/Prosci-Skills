# Verifying HTTP

## 1. Checks worth writing

```
POST /invoices {valid}          → 201, body has id, Location header
POST /invoices {}               → 400, error body names the field
GET  /invoices/<missing>        → 404, not 500
POST /invoices (same key twice) → one record (idempotency)
GET  /invoices without auth     → 401, no data leaked
GET  /invoices as other tenant  → 403/404, never 200
```

## 2. What to look at

- Status code — the contract. A 200 with `{error: ...}` breaks every client.
- Headers that matter: `Location`, `Content-Type`, `Cache-Control`, `Retry-After`, rate-limit headers.
- Body shape: field names, null vs absent, number vs string, time format.
- Errors: machine-readable code plus a human message; no stack traces, no internal ids.
- Latency for the slowest realistic call, and behaviour at the timeout boundary.

## 3. Auth and tenancy

Every endpoint that reads a record must be tested with another tenant's id. This is the check that catches
most real breaches, and it is cheap. If the fixture has no second tenant, say so — that is a gap in
verifiability, not a pass.

## 4. Idempotency and retries

Send the same write twice with the same idempotency key; assert one effect. Then send it twice without a
key and record what happens — duplicates are often the intended behaviour, but they must be *known*.

## 5. Contract drift

Compare the actual response to the documented schema, not to your memory of it. A field that is present in
docs and absent in the response is a finding even when everything "works".

## Checklist

- [ ] happy, invalid, missing, unauthorised, cross-tenant
- [ ] idempotency behaviour observed and recorded
- [ ] response shape compared to the documented contract
- [ ] error bodies safe (no stack, no secrets)
