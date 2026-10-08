# REST API Contracts — v1 (OpenAPI file: ../openapi.json)

GET /api/v1/health (public), GET /api/v1/readiness (public, configuration booleans not provider attestations), GET /api/v1/vehicles (public safe catalog), GET /api/v1/agreements (draft template index).

POST /api/v1/quote accepts JSON {vehicle_id,pickup_at,return_at} with timezone offset and returns days, base_rental_cents, provisional_state_tax_cents, provisional_subtotal_cents, currency, exclusions, notices. Does NOT create a reservation or invoice. 7 × $59 and 10% reference state tax = $454.30. An October 7 10:00 to October 13 10:00 period is six billable 24-hour days unless an approved pricing agreement says otherwise.

Protected:
- POST /api/v1/applications — Supabase-authenticated draft, database required. No binding inventory hold.
- POST /api/v1/documents — documents intent record only, no file upload URL until antivirus/private storage is installed.
- POST /api/v1/ai-assist — authenticated owner-scoped missing-evidence rule checks; not a live LLM.
- POST /api/v1/agreements — blocked until legal revision and signing provider are approved.
- POST /api/v1/payments/stripe and /paypal — blocked until a **final** tax/coverage-inclusive invoice and durable ledger exist.
- POST /api/v1/webhooks/stripe — verifies signed Stripe HMAC timestamp. Responds 503 while settlement event inbox unavailable.
- POST /api/v1/webhooks/paypal — verifies through PayPal signature verification endpoint; 503 while event inbox unavailable.
- POST /api/v1/admin/release — always 503 until authenticated human release workflow with evidence.

Statuses: 200 response; 201 DRAFT only; 202 upload metadata intent only; 400 bad payload; 401 bad credentials or webhook signature; 403 forbidden; 405 wrong method; 409 precondition unmet; 415 media type; 422 quote invalid; 503 unavailable/securely gated. IDs and cents are server-owned; frontend may not choose settlement totals.
