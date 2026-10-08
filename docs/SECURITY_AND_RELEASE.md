# Security and production release gates

## Current site (static public launch)
- [x] Does not collect renter personal data, government documents or payment credentials.
- [x] Disclosure that fleet graphics are illustrations, not evidence of exact vehicles.
- [x] Quote estimator handles positive date ranges; discloses insurance, local taxes and exclusions.
- [x] Privileged /admin and /portal routes are informational closed pages, not unsecured dashboards.
- [x] Security headers and restrictive CSP in vercel.json.
- [ ] Confirm DNS authority, A/CNAME target matches project-specific Vercel instructions.
- [ ] Verify TLS issuance and Cloudflare SSL Full (strict).
- [ ] Run production live URL smoke checks for routes, copy estimate, no-console-errors and mobile viewport.
- [ ] Confirm policy content with Texas rental legal and tax counsel.

## Transactional launch blocker checklist
- [ ] Production encrypted tenant-separated datastore + automated backups.
- [ ] Auth/RBAC server checks, MFA for staff, audit trails.
- [ ] Secure credentials + declarations page intake (malware detection, encryption, scoped URLs).
- [ ] Provider-backed driver/license verification and policy carrier verification.
- [ ] Insurance compliance/underwriting and applicable rental licensing/registration review.
- [ ] Approved priced disclosures incl local tax/fees, company coverage, deposits and cancellation policies.
- [ ] PCI scope reduction via provider-hosted fields; verified Stripe/PayPal business accounts.
- [ ] Idempotent webhook processing, payment disputes, capture/void/refund and reconciliation.
- [ ] E-SIGN and UETA consent, signed PDF and audit evidence with immutable hashes.
- [ ] Fleet reservation double-booking prevention and owner-authorized dispatch.
- [ ] AI explainability, human-review controls, privacy protections and incident reporting.
- [ ] Staging/prod integration and penetration testing; secrets not in source.
- [ ] Records policy, breach-response plan, DPA/vendor obligations and customer assistance.

Blocked transactional controls should be visibly disabled until **every** applicable gate passes. No fake success screens or handoff confirmations.
