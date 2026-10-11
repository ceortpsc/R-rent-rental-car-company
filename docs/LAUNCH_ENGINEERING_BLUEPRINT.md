# R-RENT | Enterprise Launch Engineering Blueprint
**Document ID:** RR-ENG-LAUNCH-001 | **Revision:** 1.0 | **Assessment date:** 2026-10-11
**Company:** Ross Tax Pro Software Company, Texas corporation | **Division:** R-Rent Rental Car Division
**Release classification:** SOURCE IMPLEMENTATION PREPARED; FULL LIVE OPERATION NOT CERTIFIED.
**Controlling references:** [Corporate Policies](corporate/RTPSC_CORPORATE_POLICY_MANUAL.md), [Cybersecurity](security/CYBERSECURITY_PROGRAM.md), [Retention](security/DATA_HANDLING_AND_DISPOSAL.md), [RBAC](security/RBAC_AND_ENCRYPTION.md).

## 1. Launch boundary and product architecture
The product is a self-hosted public website and serverless API hosted on the existing Vercel project. The R-Rent rental brand is independent of Turo. No customer is booked, billed, insured, authenticated or legally signed merely by viewing a webpage, selecting a checkbox or creating a quote. **A working Vercel deployment is not evidence that external account authorization, legal approval or contractual execution succeeded.**

```text
PUBLIC BROWSER
  ├─ marketing / fleet / policies / support-chat / unsigned document guides
  ├─ quote API: provisional amount only
  └─ Launch Control /api/v1/launch: read-only compliance indicators
            |
         VERCEL API ROUTER
            ├─ GET public metadata, vehicle listing, quote computation
            ├─ protected Auth + RBAC + MFA (locked until verified database)
            ├─ private e-sign + immutable artifact store (locked)
            ├─ payment webhook signature, final invoice and reconciliation (locked)
            └─ fleet release / return evidence (locked)
                  |
   APPROVED DEDICATED DATABASE [NOT CONNECTED]
       ├─ tenant RLS, staff roles, applications, vehicles, private records
       ├─ signed evidence ledger and immutable final documents
       └─ retention, legal hold, support and financial ledgers
                  |
  APPROVED EXTERNAL SERVICES [NOT VERIFIED]
     insurer / identity verification / Stripe / PayPal / transactional mail
                  |
  HUMAN ACCOUNTABILITY [NOT REPLACED BY AI]
     company counsel / insurer / corporate approver / finance / security
```

## 2. Engineering principles
- **Fail closed.** If identity, coverage, payment processor, approved contract, audit certificate or provider evidence is missing, refuse every consequential write and release.
- **Least privilege and separation of duties.** 13 explicit corporate/rental roles; tenant and record authorization on each server request; staff MFA; separate initiator and approver for refunds, configuration changes and disposal.
- **Determinism and reproducibility.** Fixed schemas/lockfiles, Node 22 syntax and tests, source-controlled feature flags, reviewer-approved PRs, immutable deployed SHA and reproducible build evidence.
- **Security by design.** No browser-supplied role grants; CSRF/origin constraints; encryption-at-rest and TLS; private signed storage URLs; tamper-evident events; no secrets or PII committed to GitHub; OWASP ASVS-oriented review and dependency scans before production.
- **Idempotency and consistency.** Assign transaction IDs to booking, signature, refund and webhook operations; transaction boundaries, unique reference keys and collision prevention.
- **Privacy and retention.** Data minimization and classification, least-necessary decrypt, private backups and secure disposal respecting a recorded legal hold.
- **Real evidence, no simulation.** Distinguish source prepared, tests executed, vendor configured, provider verified, contract approved and money actually settled.
- **Human-centered accessibility.** Readable legal notices, separate consent and waiver choices, keyboard controls and non-electronic alternatives where applicable.

## 3. Core repository and resource directory
```text
index.html, app.js, styles.css, fleet-specs.js, seo.js     # public frontend
launch.html, launch.css, launch.js                         # release dashboard
support-chat.html, support-chat.js, lib/support-policy.js  # public rule-governed guidance
signing.html, signing-workflow.js, inhouse-signature-pad.js # unsigned review and local pad
operations.html, operations.js                             # public-safe RBAC views
lib/launch-registry.js                                      # 17-module evidence-gate ledger
lib/{identity,rbac,crypto-vault,orchestration,envelopes}.js # backend contracts and guards
api/v1/{health,vehicles,quote,applications,documents,payments,envelopes}.js
api/v1/admin/release.js                                    # unconditional release block
cloudflare/rrent-edge/wrangler.jsonc                       # separate Access Worker
config/feature-registry.json                               # default-off activations
supabase/migrations/*.sql                                  # authored but NOT applied
tests/*.test.js                                             # source and policy regressions
docs/LAUNCH_COMPLIANCE_LOG_2026-10-11.md                    # source-based evidence matrix
```

## 4. 17 module classes
1. Public website and fleet → implemented source, runtime requires independent browser smoke test.
2. Preliminary quote → deterministic and nonbinding, subject to amount/tax review.
3. How-to signing and return guides → browser education; not legal acceptance.
4. Andreaa support → published curated FAQ model only; no private account or LLM key active.
5. Identity/MFA/13-role RBAC → requires real dedicated provider, tested tenant isolation and staff assignments.
6. Renter application → requires auth, fleet availability and exclusive double-booking locks.
7. Encrypted vault and uploads → requires private buckets, malware scanning, key vault and retention rules.
8. Commercial insurance / driver verification → actual carrier and licensed review, not a proposed $9/day line.
9. In-house signing → approved final agreement hash, attributed signer, separate E-SIGN consent, independent final signed PDF/certificate and delivery.
10. Stripe → approved merchant, hosted checkout, confirmed webhook and reconciled ledger.
11. PayPal → approved merchant, confirmed transaction and independent verification.
12. Receipts/disputes/refunds → cash/processor evidence, reviewer decision, cardholder rights.
13. Vehicle pickup/release and return → physical inspection, coverage, contract, valid payment and human handoff.
14. Audit/disposal → immutable event log, privacy/legal holds and verified deletion.
15. Cloudflare Access → audited account ID and AUD, staff allowlist, all-traffic worker policy and online staging validation.
16. Corporate governance → actual board/legal adoption of relevant written policies and delegated approvals.
17. CI/CD → runner online, independent PR review, actual passing checks, production deployment status and rollback.

## 5. API boundary and contract matrix
Public safe:
- `GET /api/v1/health` and `GET /api/v1/readiness` — service/configuration only.
- `GET /api/v1/launch` — all 17 modules with configured flags, missing independent evidence and **no release authority**.
- `GET /api/v1/vehicles` — public catalog only.
- `POST /api/v1/quote` — preliminary calculation, no booking or payment.
- `GET /api/v1/envelopes` — public draft template manifest, not a signing invitation.
- `GET/POST /api/v1/support/chat` — public curated non-personalized policy replies, no stored customer records.

Privileged, currently unverified/locked:
- `GET /api/v1/operations` — real staff AAL2 + RLS tenant; default disabled.
- `POST /api/v1/applications` — authenticated customer draft and availability checks.
- `POST /api/v1/documents` — private storage/vault/malware verified; not public upload.
- `POST /api/v1/envelopes?action=draft` — authorized corporate staff draft, encrypted recipients.
- `GET /api/v1/envelopes?action=inhouse-session`, `POST?action=inhouse-sign` — verified signer, exact PDF, consent and audit.
- `POST /api/v1/payments?provider=stripe|paypal` — idempotent approved invoice and payment processing.
- `POST /api/v1/admin/release` — server denies pending operator/coverage/contract/inspection proof.
- `POST /api/v1/support-cases` — authenticated, encryption-required cases where enabled.

Do not mark a module as deployed because an OpenAPI schema describes it. Implemented handlers and live upstream credentials are separate acceptance gates.

## 6. Deployment workflow and release-stage state model
```text
DRAFT_REQUIREMENTS → SOURCE_READY → TEST_PENDING → TEST_PASS_VERIFIED
→ SECURITY_APPROVED → PROVIDER_INTEGRATED → STAGING_VERIFIED
→ LEGAL_BUSINESS_APPROVED → PROD_RELEASED → PROD_SMOKE_VERIFIED
→ OPERATIONAL_MONITORING
```
Any missing link is BLOCKED. A PR or deployment can never self-approve high-risk identity, insurance, legal signing or monetary actions. Main receives verified reviewed merges only; preview/staging used for regression. Protect production runtime configuration with approvals, distinct keys, rotation, outbound logging and rollback.

## 7. Production acceptance and proof
Each control requires: named owner, exact source or provider, affected tenant, artifact/reference ID, UTC time, independently authorized reviewer, execution result and immutable evidence hash where applicable. Retain raw confidential IDs only in approved restricted storage. Do not put tokens or raw card/driver-license/signature material in CI logs.

**Gate 1:** Dedicated database ACTIVE, applied and validated migrations, backups, tenant RLS, staff MFA/SSO.
**Gate 2:** Cloudflare DNS/HTTPS and signed deployment build, realistic browser/network smoke tests.
**Gate 3:** Verified carrier/driver eligibility and fleet commercial-use permissions.
**Gate 4:** Final Texas rental terms, pricing, tax and any consumer disclosure approved by professionals.
**Gate 5:** Authenticated E-SIGN vendor-independent native signing, signed immutable PDF and both copies delivered.
**Gate 6:** Live Stripe/PayPal with hosted tokenization and verified webhook and ledger.
**Gate 7:** Verified release, inspection and anti-double-booking tests.
**Gate 8:** Security scans, privacy retention, access review, incident drill, PR checks, change records and approvals.

## 8. Rollback, risk and observation
Maintain independent feature flags default OFF. If an upstream fails, disable its feature and preserve ledgers; do not silently fall back to a simulated payment/signature/coverage response. Rollback an application deployment only after assessing data migration compatibility. Automated testing must not use actual customer payment, insurer or government credential records.

## 9. Operational status
Current authoritative source observations are recorded in `docs/LAUNCH_COMPLIANCE_LOG_2026-10-11.md`. Source code is not an executed vendor contract, applied SQL migration, completed signer event, carrier policy, verified payment, or released vehicle. **Do not activate restricted features from this blueprint alone.**
