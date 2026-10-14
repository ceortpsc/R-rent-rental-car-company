# R-Rent: Rental Extension Control, Acceptance, Payment & Settlement (v1 design)

**Release state:** source implementation on review branch. This is **not** evidence of a production-enabled workflow, Stripe billing, Chevy digital key, accepted agreement, deposited funds or delivered receipt. Company: Ross Tax Pro Software Co; division: R-Rent. Operator roles are enforced server-side.

## Trailblazer extension economics

Proposed for the 2026 Chevrolet Trailblazer. No authenticated rental or exact pickup/return timestamp is established merely by the draft number.

| Line | Formula | Amount |
|---|---:|---:|
| Rental | 7 x $59 | $413.00 |
| Separately stated insurance proposal | 7 x $9.50 | $66.50 |
| Extension administration | flat | $50.00 |
| Provisional Texas motor vehicle rental tax | 10% x ($413 + $50) | $46.30 |
| Refundable security deposit | liability | $50.00 |
| **Total proposed to collect** | | **$625.80** |
| Replacement key fob | only if substantiated and authorized | **$1,000 contingent; not billed** |

The Texas Comptroller's published gross rental receipts guidance describes 10% for contracts of 1–30 days and exclusion of separately stated insurance charges. Confirm full underlying agreement duration, tax exemptions, local rental taxes and fee characterization before finalizing. The insurance product is **not bound or approved** by this quote. Refundable deposits must be booked as liability, not revenue, and refunded or lawfully applied only after documented return/reconciliation.

## Business sequence and gates

1. **REQUESTED → REVIEW_REQUIRED:** validate existing *executed* rental, possession, account identity and authorized driver, VIN, insurer, coverage for commercial rental and a no-overlap fleet hold.
2. **REVIEW_REQUIRED → ACCEPTANCE_PENDING:** staff approve exact extension timestamps and effective rate; generate an addendum tied to original agreement revision, and deliver complete fee, tax, coverage, deposit, cancellation and $1,000 **conditional** key replacement disclosure. Do not silently renew.
3. **ACCEPTANCE_PENDING → INVOICE_DRAFT:** obtain verified signer identity, consent and signature certificate (record document hash, version, timestamp, envelope/event ID), carrier approval, customer-recipient verification and tax review. Draft invoice from server-authoritative integer-cent amounts.
4. **INVOICE_DRAFT → INVOICE_OPEN:** require approval evidence + MFA staff action, live merchant configured for R-Rent, idempotency key and durable local invoice journal. Do not use a tax-preparation-only merchant until the company approves the settlement beneficiary and branding. Send via Stripe hosted invoice with unique invoice reference; persist send receipt.
5. **INVOICE_OPEN → PAYMENT_CONFIRMED:** validate raw Stripe signature using the endpoint secret; retain provider event ID; atomically insert an inbox row (unique provider + event), reconcile *exact* Stripe invoice ID, customer ID, currency, amount and status. Return success only after durable storage. Replays are no-ops. Failed payment opens support/billing review, never activates extension.
6. **PAYMENT_CONFIRMED → ACTIVATION_PENDING → ACTIVE:** obtain verified identity, insurance, signed addendum, fleet availability, inspection and authorized **human** approval. Invoice payment proves payment, not payout settlement, e-signature or insurance.
7. **ACTIVE → RETURN_DUE → RETURN_REVIEW → CLOSED:** schedule due reminders and inspection, compare tolls/fuel/damage with agreed policies and evidence, determine the $50 deposit refund/deduction via privileged reviewer and independently reconcile Stripe refund/payout events. Issue itemized receipts and record proof of delivery.

**Final receipt:** after a verified paid invoice, send Stripe payment receipt via configured settings and a separate company extension confirmation only after activation. Track recipient, delivery status and UTC timestamp. A 'sent' HTTP response without confirmed notification delivery is not sufficient evidence of recipient receipt.

**Payout settlement:** invoice.paid means the invoice was paid, not necessarily that a bank payout was deposited. A separate payout/transfer reconciliation process matches gross/fees/net, payout ID, bank posting and accounting period. Refunds, disputes and failed payouts create exceptions; never silently mark as settled.

## Server-side task triggers

The catalog in `lib/extension-control.js` defines 11 event triggers with concrete work orders:
- request: contract validation, inventory collision check, quote;
- staff review: coverage, addendum;
- acceptance: draft invoice, evidence archive;
- invoice open: delivery, due-date monitoring;
- payment failure: manual retry review + customer contact;
- signed invoice paid: reconciliation, receipt, activation request;
- activation: return schedule, confirmation, Chevrolet authorization review;
- return due/returned: reminders, inspection, incidental/deposit review;
- deposit disposition: deposit receipt + retention closing;
- key loss: incident documentation and independent charge review.

Task records should include `tenant_id, rental_id, extension_id, event_id, type, status, assignee_role, due_at, attempts, lease_until, idempotency_key, evidence_id, created_at, completed_at`. Use transactionally written outbox messages. Workers take leases; bounded exponential retries + dead-letter queue; attempt IDs and approval evidence go into append-only audit. No card data, driver license images, or unredacted signature artifacts in queues, URLs, or client storage.

## Access/approval matrix

| Activity | Required operator | Non-bypassable evidence |
|---|---|---|
| Review quote / confirm fleet | Rental Manager / Fleet Manager | vehicle assignment, timestamps, nonoverlap |
| Verify driver/insurance | Verification Analyst / Compliance | independent provider or human-reviewed evidence |
| Accept extension | Authenticated renter (signed) | versioned signature and consent |
| Publish invoice | Billing Specialist / owner with MFA | approved total, signer, merchant, tax |
| Reconcile payment | Service webhook + Billing Specialist | verified Stripe signature, exact ID/amount |
| Activate extension | Authorized human Rental Manager | all verified release gates |
| Provision Chevy app access | Authorized vehicle account owner | vehicle features, active plan, authorized invite |
| Assess key-fob replacement | Fleet Manager + Billing reviewer | incident, agreement, substantiated expense |
| Refund/apply deposit | Billing reviewer, separate approval where required | return inspection, permitted deductions |
| Close rental | Operations + audit | receipts, settlement, deposit disposition |

The `myChevrolet` consumer app's remote functions depend on vehicle equipment and an active supported subscription; family-sharing features are not a verified rental-fleet API, and remote lock/unlock is **not equivalent** to a transferable digital ignition key. Do not automate key issuance, remote unlock or physical key management without OEM approval, owner authorization and full fleet security assessment.

## Production activation checklist

1. Verify R-Rent approved Stripe live merchant, beneficiary, MCC, payment statement descriptor and invoice branding. Configure secret keys and signed webhook endpoint via environment secrets, not in Git.
2. Apply versioned SQL schema **in a separately authorized R-Rent project** with RLS/privileged service-layer authorization; store invoices, signed acceptances, durable provider inbox, payment journal, deposit liabilities and task outbox. Not applied by this PR.
3. Implement authenticated API operations with MFA, tenant ownership checks, transactional compare-and-swap state transitions, idempotency, cross-account isolation, request throttling, actor audit and reconciliation.
4. Obtain approved addendum template, signature vendor, insurance carrier's approval for the $9.50/day offer, tax/legal approval and final contractual period.
5. Enable `RR_ENABLE_PAYMENTS` only after staging and production separate environment QA. The existing `api/v1/payments.js` and `api/v1/webhooks/stripe.js` intentionally remain fail-closed and are not overridden by this branch.
6. Verify email deliverability, receipt settings, payment failure tasks, dispute/refund/deposit workflow, payout matching, staff rotations and 2-person exception review.
7. Verify OEM supported vehicle access separately; no Chevrolet credentials, PINs, VINs or API tokens in browser bundles.
8. Execute representative tests: unauthorized renter, rejected signature, insurance expiration, 30/31-day tax boundary, date overlap, duplicate invoice, webhook replay, wrong amount, wrong currency, reversal, unconfirmed payout, failed receipt, lost key/conditional $1,000 and deposit partial refund.
9. Require production change review, signed commit, preview deployment evidence, tests, rollback and manual release signoff.

## Source inventory
- `lib/extension-control.js`: pricing, allowed transitions, strict evidence gates, signed payment reconciliation contract, task catalog and replacement-key guard.
- `api/v1/quote.js?mode=extension`: safe preview API consolidated into the existing serverless function. Mutating actions deliberately return HTTP 503.
- `extension-operations.html` and `extension-operations.js`: branded interactive calculation, workflow/evidence cards, task register.
- `tests/extension-control.test.js`: pure logic assertions.

**Owner approval remains a prerequisite for production billing, not a browser toggle.**
