# R-Rent | RTPSC Rental Car Division

Independent vehicle-rental application for **Ross Tax Pro Software Company**.

- Production domain (requested): `rtpscrentalcars.com`
- Website alias: `www.rtpscrentalcars.com`
- Hosting: Vercel (project: `r-rent-rental-cars`)
- DNS authority: Cloudflare (existing zone retained)
- Brand: navy `#0c1d34`, burgundy `#631e27`, gold `#bf9b56`, cream `#f5f0e8`, silver `#d9d9d9`

## Scope

This first release is a real, accessible **public product website** with functioning client-side navigation and a seven-day-or-variable-day **rental quote calculator**. It publishes a fleet information page, renter eligibility and insurance prerequisites, fee disclosure framework, agreement package index, support information, and a truthful operational-readiness page.

**The following are deliberately NOT represented as live until connected and audited:** reservations and inventory holds, driver's-license uploads, insurance verification, card processing, PayPal and Stripe settlement, protected accounts, contract execution, e-signature, and automated AI underwriting. Do not treat an estimate as an invoice or a confirmed booking.

### Fleet seed catalog (non-sensitive)

| Fleet item | Model | Pricing | Status |
| --- | --- | --- | --- |
| Trailblazer | 2026 Chevrolet Trailblazer | $59/day *reference quote* | Manual availability confirmation required |
| Bronco Sport | 2026 Ford Bronco Sport Big Bend | No approved published rate | Manual quote required |

Vehicles shown with **concept illustrations**, never presented as verified photographs. No VIN, driver's-license details, customer records, customer addresses, signatures, or payment information are stored in this public repository.

## Information architecture

- `/` — marketing and quote CTA
- `/fleet` — fleet catalog
- `/book` — real local estimate, no binding reservation
- `/requirements` — driver and insurance requirements
- `/agreements` — agreement/addendum index
- `/fees` — pricing/tax/optional fees
- `/security` — security posture and integration gates
- `/portal` and `/admin` — **closed until verified server-side authentication**
- `/privacy`, `/terms`, `/contact` — disclosure and support surfaces

Vercel rewrites page paths to the SPA entrypoint while leaving static assets intact.

## Quick start

There are no runtime dependencies. The application uses plain, inspectable HTML, CSS, and browser JavaScript.

```sh
python3 -m http.server 8080
# Browse http://localhost:8080/
```

Deep links work on Vercel via `vercel.json`. Locally, start at `/` and use client navigation.

## Deployment

1. Create Vercel project linked to `ceortpsc/R-rent-rental-car-company`.
2. Configure static build; no build command and output root `.`.
3. Attach `rtpscrentalcars.com` and `www.rtpscrentalcars.com`.
4. In Cloudflare DNS, create only the exact records prescribed by **Vercel project domain configuration** (do not change existing MX/TXT/email or nameservers).
5. Set Cloudflare proxy **DNS only** while verifying HTTPS and ownership; enable proxy only after SSL mode and routing tests support it.
6. Verify HTTPS, cert issuance, redirects, security headers, page navigation, estimation logic, and no sensitive PII collection.
7. Before activating transactional actions, complete gates in `docs/SECURITY_AND_RELEASE.md`.

## Pricing calculation

The public estimate uses a configurable reference rate of $59/day for the Trailblazer, rounded **up** to the next whole 24-hour rental day, a provisional 10% Texas *state* short-term rental tax, and no unapproved insurance or add-on charges. Local taxes, insurance premiums, deposits, and vehicle-specific contract terms remain unquoted. The calculator does not determine tax applicability under all factual scenarios and does not substitute for checkout calculation or legal/tax review.

## Architecture

```text
Browser (public UI)
   |-- static public assets and page routing
   |-- local-only quote calculator (no sensitive uploads)
   +-- disabled transactional gates
         |-- Auth provider + RBAC (future)
         |-- Booking & inventory/overlap control (future)
         |-- Verified driving credential / insurance (future)
         |-- Consent + e-sign / documents vault (future)
         |-- Stripe/PayPal secure checkout/webhooks (future)
         |-- AI-assist rules / human approval (future)
         +-- Audit ledger / queues / encryption (future)
```

Detailed contracts: [ARCHITECTURE](docs/ARCHITECTURE.md), [API_CONTRACTS](docs/API_CONTRACTS.md), [SECURITY_AND_RELEASE](docs/SECURITY_AND_RELEASE.md), [CLOUDFLARE_DNS](docs/CLOUDFLARE_DNS.md).

## Governance

- Never commit secrets, identifiers, PII, document images, card data, personal addresses, renter names or live transactions.
- Do not mark a booking, identity, insurance, payment, or electronic signature as verified without evidence from the actual provider and backend.
- AI can flag inconsistencies and recommend next steps but must not autonomously approve driver eligibility, coverage, card risk, or legal contracts.
- This product is independent from Turo. Treat Turo-hosted reservations as a separate channel subject to its own policies.
- All policies and the final rental contract require qualified Texas legal/insurance review before customer signature or vehicle release.


## API & enterprise extension v0.2.0
This release adds functional server-side public API endpoints, security gates for protected operations, payment signature-verification scaffolds, SQL model and a contract/policy documentation library. Protected insurance, identity, e-sign, settlement and release operations remain **UNAVAILABLE** until activated with valid production dependencies and independent verification.

- [Complete blueprint](docs/MASTER_IMPLEMENTATION.md)
- [API reference](docs/API_REFERENCE.md) · [OpenAPI file](openapi.json)
- [Operating and security runbook](docs/OPERATIONS_RUNBOOK.md)
- [Provider and add-on inventory](docs/PROVIDER_AND_ADDONS.md)
- [Texas statutes and tax guidance](docs/LEGAL_TEXAS_REVIEW.md)
- [Company policies — DRAFT](docs/POLICIES_DRAFT.md)
- [AI Agent governance](docs/AI_AGENTS.md)
- [Contracts and addenda — DRAFT ONLY](contracts/README.md)
- [SQL migration — NOT APPLIED](supabase/migrations/20261008_001_rentals.sql)
- Test: `npm run check && npm test`.

No real renter identity records, addresses, card numbers, policy identifiers, signed documents or credentials belong in this public repository.

## R-Rent Sign v0.3

A proprietary signed-document experience now includes a browser-local electronic-signature/initials pad and draft envelope designer at `/sign`, plus a guarded API and database migration. [Architecture](docs/ESIGN_PLATFORM.md) · [API contract](docs/ESIGN_API_CONTRACT.md). Signature collection, send, authentication and legal execution are **not enabled** until external services, review and auditable persistence are complete.

## Approved visual identity integration (2026-10-09)

- Brand expression: **Drive More. Go Further. R-Rent.**
- Design source: approved R-Rent Canva/ChatGPT brand-board concept; color palette navy `#0C1D34`, burgundy `#631E27`, gold `#BF9B56`, cream `#F5F0E8`, silver `#D9D9D9`, tan `#D2B48C`, white `#FFFFFF`, ink `#10151F`.
- Vector monogram: `assets/r-rent-monogram.svg`, original source asset suitable for favicon/app icon; website styling in `styles.css` and customer experience in `app.js`.
- Requested additional subdomain: `r-rent.rosstaxsoftware.com` (DNS and Vercel assignment **not verified**; older apex domains retained until explicitly reconfigured).
- Owner brand ambassador: Andreaa Chan’nel. Owner portrait still needs a rights-cleared image upload, and generated mockup likenesses must **not** be represented as actual owner photographs.
- Fleet: 2026 Chevrolet Trailblazer and 2026 Ford Bronco Sport Big Bend; retain representative-illustration disclosures until authenticated owner vehicle photography is available.
- The design does **not** enable rentals, billing, electronic signing, or automated verification; existing security gates stay in force.

## Fleet media publication corrections (2026-10-10)

- The owner has not approved the original generated vehicle graphics or earlier R-Rent artwork. Their references have been removed from rendered public views.
- A newly regenerated **2026 Chevrolet Trailblazer concept crop** has been added to `assets/trailblazer-2026-concept.svg`. Its embedded low-resolution image is AI-generated and expressly labeled as a concept, **not an actual verified photograph**.
- Dedicated model pages: `/fleet/trailblazer-2026` and `/fleet/bronco-sport-2026`.
- Bronco Sport media is **not published** until the specified approved source photograph is accessible in the repository and can be checked for sensitive plate or personal information.
- No inferred trim, actual VIN, plate, possession, inspection, published Bronco price, instant confirmation or payment acceptance is represented as proven.
- Only the specifically approved source asset for a given vehicle may be published. All subsequent changes to vehicle photographs, composite artwork or owner portraits require explicit approval for that exact asset.
