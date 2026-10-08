# Proposed API contracts (not active in initial release)

Base \`/api/v1\`; authenticated scopes; versioned JSON schemas; ISO 8601 UTC instants, monetary amounts as integer minor units and ISO currency codes. Every mutating request requires idempotency key.

| Method & route | Responsibility | Required controls |
|---|---|---|
| GET /vehicles | Public filtered vehicle listing | Safe redacted fields; no VIN |
| GET /vehicles/:id/availability | Live availability calendar | Holds + overlap lock |
| POST /quotes | Server-side authoritative tax/price | Effective price version, tax provenance |
| POST /applications | Start protected rental application | Auth, consent, rate limit |
| POST /uploads/presign | Short-lived document upload | Auth, MIME/size controls, malware scan |
| POST /drivers/verify | Provider-backed ID and credential check | Consent, reviewer fallback |
| POST /insurance/verify | Carrier/underwriter verification evidence | Human approval |
| POST /rental-documents/issue | Issue immutable document packet | Snapshot, hash, e-sign identity |
| POST /payments/session | Provider-hosted checkout session | Merchant and fee validation |
| POST /webhooks/stripe | Verify Stripe signature & update ledger | Replay protection, durable queue |
| POST /webhooks/paypal | Verify PayPal signature & update ledger | Replay protection, durable queue |
| POST /rentals/:id/release | Human-authorized handoff | Gate all prior evidence |
| POST /rentals/:id/return | Condition and closeout | Evidence and receipts |
| GET /rentals/:id/audit | Scoped event history | RBAC & retention |

No route above is secretly live or implied functional by the static UI. Required future services: identity verification vendor, rental insurer, e-sign service, encrypted DB/storage, background queue, Stripe/PayPal merchant approval and fraud tooling.
