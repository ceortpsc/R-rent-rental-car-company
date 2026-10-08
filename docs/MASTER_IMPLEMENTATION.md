# R-Rent — Full Implementation Blueprint (Engineering v0.2.0)

Parent: Ross Tax Pro Software Company · Division: R-Rent · Texas. Requested domain: rtpscrentalcars.com.

## System boundaries
Cloudflare DNS → Vercel static website / Node API functions → dedicated private auth/database (planned) → approved rental services. Public website, catalog, local/remote reference estimator and versioned API are implemented. A provisioned application database, signed carrier coverage, live merchant funds, real contract signatures and rental release are **not** completed.

## End-to-end rental state machine
DRAFT → SUBMITTED → DRIVER_REVIEW → COVERAGE_REVIEW → FEE_FINALIZATION → CONTRACT_ISSUED → CONSENT_SIGNED → PAYMENT_AUTHORIZED → HUMAN_DISPATCH_APPROVED → ACTIVE → RETURNED → RECONCILED → CLOSED.
Any missing evidence → HOLD. Declined/cancelled branches retain auditable reasons. Never treat an uploaded policy card as real coverage, an AI suggestion as a legal decision, a browser checkout return as captured payment or an unsigned PDF as an executed agreement.

## Nine operational services
1. Fleet catalog, verified registration, ownership/lease terms, maintenance, collision-safe booking inventory.
2. Server price ledger with duration, seasonal rates, mandatory charges, approved add-ons, local + state tax, deposits.
3. Customer auth and onboarding with renters/additional drivers, age/license criteria under insurer rules.
4. Driver ID, license, personal insurance coverage or company-sponsored bound coverage through authorized providers.
5. E-sign contracts with E-SIGN/UETA disclosure, separately elected damage waiver and tamper-evident copies.
6. Stripe and PayPal tokenized checkout, 3DS where appropriate, provider webhook signature/replay verification.
7. Staff review, evidence, fleet inspection, key handoff, return, fuel/toll/damage documents and disputes.
8. AI Assist rules with traceable rationale, consent and human approval.
9. Reporting, tax reporting/ledger, reminders, customer support, records retention and incident response.

## Domain routes
/ home, /fleet, /book, /requirements, /fees, /agreements, /security, /privacy, /terms, /contact;
/portal and /admin remain CLOSED until authenticated RBAC backend is available.
/api/v1/{health,readiness,vehicles,quote,applications,documents,agreements,ai-assist}, /api/v1/payments/{stripe,paypal}, /api/v1/webhooks/{stripe,paypal}, /api/v1/admin/release.

## Scope of "implementation"
A source code route is not the same as an integrated and operational provider service. This codebase deliberately uses explicit HTTP 503 and HOLD statuses for missing integrations. Live activation requires the signed external contracts, environment secrets, deployment evidence, vendor testing and human approvals recorded in the release checklist.
