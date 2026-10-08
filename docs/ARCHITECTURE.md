# Application architecture

The first version is a static application with deterministic local quoting. It has **no customer data store** and **no live identity, insurance, agreement, or merchant adapters**.

## Transaction boundaries

1. **Inventory**: canonical vehicle ID, real fleet title/registration evidence, blackout, overlap and lock atomicity.
2. **Applicant**: authenticated account, least-privilege uploads to encrypted object storage, provider-side driving credential checks. Browser upload alone is not verification.
3. **Insurance**: coverages, exclusions, effective dates, insurer/underwriter attestation, approved company-sponsored policy options and price quote, reviewer override with evidence.
4. **Pricing**: rental-day policy, taxes incl local applicability, complete ancillary charges and required notice; quote hash pinned into immutable documents.
5. **Contract**: content-addressed signed rental agreement, opt-in waiver addenda, E-SIGN consent, signer identity, timestamps, evidence certificate, delivery.
6. **Payments**: R-Rent verified merchant accounts for Stripe and/or PayPal, hosted or provider-tokenized checkout, asynchronous webhooks, idempotency, refunds, dispute evidence, reconciliation. No raw card collection or CVV retention.
7. **Handoff**: approved human dispatch after ALL earlier gates; condition checklist, before/after photographs, return timestamp, signed release.
8. **AI Assist**: doc extraction and fraud heuristics suggest review tasks only; explicit reviewer identity and reasons recorded; no autonomous acceptance of legal/financial responsibility.

## Authorization

Roles: Public, Renter, Additional Driver, Fleet Agent, Verification Analyst, Compliance Officer, Billing Specialist, Fleet Manager, Customer Support, Auditor (read-only), Division Administrator, Corporate Owner, Service Worker.

Every non-public API must authorize tenant + role + ownership using backend policy. Never rely on browser-visible role switches or client-only logic.

## States

\`\`\`text
draft -> quoted -> application_submitted -> verification_pending
      -> needs_review | approved | declined
approved -> agreement_issued -> signed -> payment_pending
        -> payment_verified -> release_authorized -> active
        -> returned -> closed
\`\`\`

No "approved", "signed", "paid" or "released" state is valid without its source event and human evidence. Event IDs must be idempotent, timezone-aware and traceable.
