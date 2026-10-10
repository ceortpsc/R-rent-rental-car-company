# R-Rent Enterprise Architecture & Operating Framework
**Document:** RR-ENG-ARCH-001 | **Revision:** 1.0 | **Status:** Code blueprint; not an assertion of completed vendor integrations.

## 1. System boundary
**Organization:** Ross Tax Pro Software Company → R-Rent Rental Car Division, isolated from other RTPSC tax, education, payroll, and third-party-host operations.
**Public origin:** https://rtpscrentalcars.com (DNS verification remains a separate deployment gate).
**Architecture:** static public SPA; Vercel serverless APIs; possible dedicated Supabase Auth/Postgres; private encrypted object storage; approved mail, payment, insurance, identity and e-sign providers only after onboarding.
**Tenancy:** all records scoped by a verified tenant and owner/assignee; never trust tenant, role or approval status from a browser field.
**Environment:** developer, staging and production separation, independent secrets, non-production synthetic data only, protected deployment branch and immutable artifact manifest.
**Non-goal:** simulated payments, unverified insurance coverage, fake identities or provider-attested signing.

## 2. Repository map
\`\`\`text
/
├── app.js, care.js, fleet-specs.js, seo.js, theme.js     # public UI
├── sign.html, sign.js, sign.css                         # local envelope composer
├── signing.html, signing-workflow.js, signing.css       # ten-document unsigned review
├── signing-rules.js                                     # consent, initials and evidence model
├── operations.html, operations.js, operations.css       # roles/governance preview only
├── lib/
│   ├── identity.js, rbac.js                             # verified JWT, MFA, role matrix
│   ├── crypto-vault.js                                  # AES-256-GCM encryption
│   ├── orchestration.js                                 # transitions, job contracts, approval gates
│   ├── envelopes.js, pricing.js, providers.js, http.js  # contracts and integrations
├── api/v1/
│   ├── health.js                                        # public roles + gated operations descriptor
│   ├── envelopes.js                                     # staff-authenticated DRAFT, no execution
│   ├── documents.js                                     # restricted, fail-closed
│   ├── payments.js                                      # settlement gates, no live checkout
│   ├── applications.js                                  # gated draft application flow
│   ├── admin/release.js                                 # unconditional no-release gate
│   └── webhooks/stripe.js, webhooks/paypal.js            # independent provider proof
├── supabase/migrations/20261010_003_enterprise_security.sql # migration, NOT APPLIED
└── docs/security/{CYBERSECURITY_PROGRAM,DATA_HANDLING_AND_DISPOSAL,RBAC_AND_ENCRYPTION}.md
\`\`\`

## 3. Layered architecture
**Layer 0: Governance / policy.** Corporate control, segregation of duties, reviewed pricing, law/insurer approvals, risk acceptance, signed policies and compliance evidence.
**Layer 1: Edge.** TLS, CDN, HSTS, CSP, rate limiting, WAF/bot controls, allowed origins, no public directory listing, static assets, OAuth/OIDC PKCE.
**Layer 2: Identity.** Provider-backed identity verification, revoked/expired JWT rejection, staff AAL2 MFA, session revocation, role membership revalidation.
**Layer 3: Application.** Explicit route-to-permission map, scope and ownership checks, validation, idempotency, evidence preconditions and CSRF controls.
**Layer 4: Workflow.** Durable transactional outbox, job queues, lease/lock, retry with jitter, dead-letter queue, agent/human tasks, no auto approvals.
**Layer 5: Data.** Dedicated tenant-scoped Postgres RLS, deny anon/auth table grants, key-encrypted sensitive fields, private object vault, audit/retention ledger.
**Layer 6: External services.** Verified commercial insurance, driver's license screening, verified e-sign service, Stripe/PayPal accounts, email; signed webhooks and reconciliation only.
**Layer 7: Assurance.** Unit/integration/browser/regression tests, security checks, runtime monitoring, incident response, immutable evidence, backups and restore drills.

## 4. Application pages (navigation and data boundary)
| Path | Intended users | Access gate | Page intent |
|---|---|---|---|
| /, /fleet, /book, /requirements, /agreements, /fees | PUBLIC | open, nonbinding | browse and preliminary quote |
| /signing, /sign | PUBLIC preview | unsigned local-only | document review interface |
| /operations | PUBLIC architecture preview | no customer data/actions | demonstrate roles and governance |
| /api/v1/roles | PUBLIC | safe registry only | role labels, screens, privileges |
| /api/v1/operations | STAFF | valid auth, tenant staff record and MFA | permission descriptor only |
| /portal | RENTER | pending secure identity provider | own application, documents, receipts |
| /admin | STAFF | pending auth + RBAC | protected dashboard only |
| Future /portal/rentals/:id | RENTER | verified owner and tenant | own rental records |
| Future /admin/verification/:id | VERIFICATION | verified assignment + MFA | limited sensitive verification |
| Future /admin/settlements | BILLING | scoped financial permission + MFA | provider-confirmed settlement |
| Future /admin/incidents | SECURITY | incident permission + MFA | case evidence vault |
| Future /admin/retention | RECORDS | separate approval + legal hold | disposal queue |
Permanent public SEO redirects must never authorize private pages.

## 5. Action and state machine
DRAFT → SUBMITTED → AWAITING_IDENTITY → AWAITING_INSURANCE → AWAITING_CONTRACT → AWAITING_PAYMENT → AWAITING_HUMAN_APPROVAL → AUTHORIZED_FOR_RELEASE → ACTIVE → RETURNED → CLOSED. DECLINED, EXPIRED and VOID are terminal.
Sign completion requires an actual authenticated provider record and immutable signed artifact, not a button click. Funding requires verified invoice/hash, payment processor event and ledger reconciliation. Final release requires authenticated human decision, coverage and vehicle inspection. Every transition appends audit events and enforces idempotency.

## 6. API interface and workflow rules
- Requests are JSON with schema validation and request-size bounds; secure writes require auth, origin/CSRF control, idempotency key and resource scope.
- Every response has a request ID. Errors do not echo PAN, license data, provider tokens, signatures or secrets.
- No role from client state, QR/link query or request header is authoritative.
- Owner roles are not exempt from required human evidence, second approver or legal hold.
- AI may propose explanations and draft work items. Never allow AI to sign contracts, charge cards, approve insurance, grant privileges, release vehicles or dispose records.
- Metrics must distinguish "system available" from "configured", "verified live", "pending" and "blocked".

## 7. Configuration management
Source-controlled flag registry: \`RR_ENABLE_RBAC\`, \`RR_ENABLE_APPLICATIONS\`, \`RR_ENABLE_ENVELOPES\`, \`RR_ENABLE_SECURE_UPLOADS\`, \`RR_ENABLE_PRIVATE_VAULT\`, \`RR_ENABLE_MALWARE_SCAN\`, \`RR_ENABLE_PAYMENTS\`, \`RR_ENABLE_SIGNING\`, \`RR_ENABLE_RELEASE\`, \`RR_ENABLE_CASES\`, \`RR_ENABLE_OAUTH\`; default false.
Sensitive encryption variables: \`RR_ENCRYPTION_KEY_B64\` (32-byte random key, base64, external vault only) and \`RR_ENCRYPTION_KEY_ID\` (version).
Config lifecycle: request → security impact assessment → change peer review → test → approval distinct from author → staged deployment → evidence gates → production deploy → smoke checks → monitor → rollback when needed.
Unknown or expired configurations **fail closed**, never silently fall back to simulated results.

## 8. Production acceptance criteria
Business insurance, licensing, tax, rental contracts and payment disclosures approved by qualified professionals. Dedicated private datastore with RLS, backups and encrypted vault; secure data retention; real MFA/sessions; independent verification vendors; real provider-signed e-sign and immutable PDF/certificate; Stripe/PayPal verified merchant accounts; zero unauthorized record access; third-party security assessment and incident response drill. No production activation should be represented as complete until verified evidence exists.
