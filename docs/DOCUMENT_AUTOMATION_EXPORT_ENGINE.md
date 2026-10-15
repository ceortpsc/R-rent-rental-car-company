# R-RENT Document Automation and Export Engine — Integration Contract

**Scope:** Corporate letterhead, rental/extension agreements, invoices and payment receipts. This repository ships a branded public catalog and a **protected gateway only**. The separate deployable Python renderer and canonical October 15, 2026 Word template package are supplied as a reviewed downloadable artifact in the originating ChatGPT task. No renderer container, template binary, invoice issuer, e-signature adapter, email transport or payment-settlement worker is deployed by this GitHub change.

## Routes and protections

| Route | Method | Result | Authentication |
|---|---|---|---|
| `/documents/studio` | GET | Branded template catalog, synthetic sample-schema downloader | Public; no customer data |
| `/api/v1/documents?mode=studio` | GET | Template/types/formats/readiness only | Public, non-sensitive |
| `/api/v1/documents?mode=generate` | POST | Private ZIP document package from approved renderer | Supabase staff membership, MFA `aal2`, allowed operator roles, CORS origin gate, feature gate, dedicated renderer |
| `/api/v1/documents` | POST | Existing secure-document upload metadata workflow | Original protected document gates unchanged |

`RR_ENABLE_DOCUMENT_ENGINE` defaults disabled. The `generate` route forwards a maximum 30kB validated JSON envelope to `RR_DOCUMENT_ENGINE_ORIGIN` over HTTPS, using a server-only `RR_DOCUMENT_SERVICE_TOKEN`, and permits only invoice, receipt, extension, agreement and letterhead requests. It expects ZIP output under a 12MiB limit, never accepts payment card data or browser-provided role headers, and rejects failure closed.

## Output types

- **DOCX:** fills original branded Word templates, preserving logo, navy-and-gold tables, headers/footers and signature blocks; generated status remains DRAFT.
- **PDF:** server-rendered using LibreOffice, with per-document print pagination tests.
- **HTML:** standalone branded review markup with embedded logo and escaped content.
- **CSV:** invoice/receipt/extension itemization with formula-injection neutralization.
- **JSON:** canonical normalized data with integer-cent fields.
- **ZIP:** all requested outputs, SHA-256 manifest with filename/hash/bytes and document state.

## Automation and deduplication

The separate local private worker accepts only whitelisted tenant/event pairs. Event-to-document examples: `rental.extension_requested → extension + invoice`; `receipt.review_requested → receipt`; `rental.agreement_requested → agreement`; `correspondence.requested → letterhead`. A stable SHA-256 key is derived from tenant + event name + provider event ID. Duplicate jobs return the existing result, while mutated payloads reusing an event ID fail with an idempotency conflict.

Reference SQLite job storage is only for a controlled single-worker environment. Production requires a transactionally written PostgreSQL outbox, worker leases, at-rest encryption, tenant RLS, bounded retries and a dead-letter queue.

## Financial/contract truth boundaries

1. **Invoice:** itemization generated does not create a Stripe invoice number or hosted payment URL; real issuance occurs only through a separately authorized merchant, after finalized terms and signed invoice journal.
2. **Receipt:** public JSON, form data, or arbitrary status fields must not authorize `PAID`. The standalone generator produces a review copy until upstream verified Stripe charge, matching customer, amount, refund state, and authorized company receipt issuance are recorded. Stripe capture differs from Stripe balance availability and bank payout.
3. **Agreement:** an exported PDF/DOCX is never an executed signature. The existing branded signing-pad preview is not an authenticated document execution system; identity consent, version hash, signer session, immutable event and signed PDF delivery must be proven by the separate signing service.
4. **Deposit:** a $50 authorization hold is not a captured/settled deposit; refundable deposit liabilities must be separately tracked and reconciled. The conditional $1,000 fob policy is never auto-added without incident evidence and human review.
5. **Delivery:** no automatic email is sent by document export; outbox mail requires verified recipient, delivery status and duplicate suppression.

## Production activation

- Approve designated Word master revisions and their SHA-256 digests, preserve originals and roll back by immutable version.
- Deploy the private Python renderer with pinned dependencies, LibreOffice, health checks, TLS and authenticated network.
- Configure Vercel runtime secrets in the encrypted provider settings, not GitHub source: `RR_ENABLE_DOCUMENT_ENGINE=true`, `RR_DOCUMENT_ENGINE_ORIGIN=https://APPROVED-HOST/`, `RR_DOCUMENT_SERVICE_TOKEN`. Do not expose token in `NEXT_PUBLIC_` or a static page.
- Confirm dedicated Supabase tenant and staff MFA identities; ensure the service is private, rate-limited and production-monitored.
- Integrate server-side reviewed Stripe/e-sign provider records and separately approved email delivery/receipt event processing.
- Run CLI document tests, route/role/tenant tests, invalid PDF/ZIP and mixed-template injection tests, failover, load and accessibility/PDF review.
- Sign off via Finance + Fleet + Legal/Insurance + Security with release rollback evidence.

**Current state:** source and UI in a feature branch; private renderer provided as a local package. This does not establish production issuance, an executed agreement, settled funds, nor a deployed PDF/DOCX backend.
