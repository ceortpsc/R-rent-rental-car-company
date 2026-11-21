# Rails alpha: build evidence and parity

Verified November 21, 2026 UTC on Linux using Ruby 3.3.8, Bundler 2.6.7, Rails 8.1.4.1 and the packaged dependency lock. The test dataset is synthetic; no production database, payment processor or applicant system was connected.

| Evidence | Result |
|---|---|
| Rails unit/integration suite | 13 tests, 138 assertions, no failures or skips |
| Database preparation | Fresh SQLite migrations and test schema; alpha does not accept a provider/database URL |
| Actual local HTTP + worker | Booted Rails/Puma on loopback, readiness and Programs page visible, anonymous work queue redirected, synthetic booking accepted. Separate CLI worker processed one event, then zero, with one internal task |
| Autoload and dependencies | Zeitwerk eager load and Bundler check passed |
| Scope guards | Staging and production boot refused. No public Stripe, capture, signing, or release route |
| Fleet and register | Inventory safety block, pretrip validation/uniqueness, role separation, CSV formula neutralization and omission of names/contact data covered |

## Parity decisions

- **Carried over as Rails workflows:** home and program pages, estimates, reservation inquiries, role-based review, availability guard, synthetic fleet changes, maintenance and pre-trip attestation, internal work queue, private audit-linked CSV and readiness. The old FastAPI API shapes are not a compatibility contract for the Rails forms.
- **More restricted in this alpha:** one instance per company, local-only data, synthetic contacts, no real sessions or live account imports. Payment exception mapping can be invoked by a synthetic service test only. There is no ledger, licensed insurance/identity check, agreement signing, attachment upload, refund or deposit adjustment, Stripe linkage, vehicle handover or return workflow. Existing production functionality is not replaced.
- **Still unverified:** remote staging, PostgreSQL contention and backup restore, scale/load, browser cross-device conformance, legal/insurance/rate validation, provider certification, and deployment. The engineering handbook defines the acceptance bar for each.
- **Hosting:** The prior AppDeploy service at `rtpscrentalcars.com` was not changed. The supplied spelling `rtpsccarrentals.com` did not resolve in the earlier DNS check. The new Rails source was not committed to the existing repo, staged remotely, or mapped to either domain.

A fresh extraction can be checked with `bin/check`. Do not substitute statistical test coverage or an HTTP health check for business acceptance.

## Hosted review preparation

The isolated Render configuration adds synthetic-only startup and an outer review authentication gate. The current checks are local; consult the exact commit’s deployment status and live HTTPS smoke before calling the preview deployed. No persistent staging, real customers, live channels, custom domains, or production flags are enabled.
