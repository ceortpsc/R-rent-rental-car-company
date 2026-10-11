# R-Rent In-House E-Signature Service — v0.5
**Owner:** Ross Tax Pro Software Company, R-Rent Rental Car Division  
**Integration:** Native first-party; Docusign/Adobe Sign not required  
**Source status:** Implemented signing pad + strict API contracts + SQL migration; backend activation and legal acceptance **not verified**.

## Delivered code
- \`/sign\`: existing mouse/touch/stylus/typed local canvas and internal envelope drafting UI.
- \`/signing\`: ten-document guided rental review, initials, elections, original pointer-drawn signature pad with draw/type modes, local unsigned PDF printing.
- \`inhouse-signature-pad.js\`: normalized pointer strokes, no persistent storage or background upload.
- \`inhouse-signing-ui.js\`: public-safe readiness check; only asks the server for exact approved document after a verified authenticated session exists; requires explicit signer intent and PDF review to enable submission.
- \`lib/inhouse-signing.js\`: first-party signature schema with documented SHA-256 exact revision; E-SIGN disclosure rev/digest, affirmative consent/paper/withdrawal acknowledgments; waiver election; 8 initials; AAL2 authenticated signer and separately attested identity; AES-256-GCM encrypted evidence; keyed HMAC proof, UTC timestamp, per-envelope idempotency.
- \`GET /api/v1/envelopes?action=inhouse-readiness\`: public-safe information on **missing configuration**, not proof of completed contracts.
- \`GET /api/v1/envelopes?action=inhouse-session\`: authenticated signer-only envelope lookup and short-lived secure final-PDF read link. It returns no data unless an approved document is stored privately and accessible.
- \`POST /api/v1/envelopes?action=inhouse-sign\`: reject by default; can record a signer's attributable evidence only after the private ledger and all required business/vendor-independent controls are operational.
- \`supabase/migrations/20261010_005_inhouse_esign.sql\`: not applied. First-party envelope records, identity-verified signer assignments, encrypted append-only events, HMAC, private signed artifacts, and transactional PostgreSQL RPC with row locks.
- \`tests/inhouse-signing.test.js\`: normalization, explicit consent, tamper protection, failure states and no-token controls.

## What "live" means
A **functional signature pad** on the public website is not automatically a legally executed agreement. A valid live in-house system requires authenticated proof tying a signer to the exact agreement plus retention, valid E-SIGN disclosures and copies. In-house signing can meet this without a third-party signing provider, but the completed system must prove every stage.

**Current external facts, observed October 10, 2026:** Connected Supabase project \`trhoddrfhqzoyktofvvc\` was **INACTIVE** and did not identify itself as an approved dedicated R-Rent tenant datastore. Vercel \`r-rent-rental-cars\` returned **0 production environment variables**. Therefore the first-party secure signer session, signing record, live PDF, and delivery process cannot legitimately be activated now. Do not send production invitations, enable R-Rent signing flags, or assert a signed copy exists.

## End-to-end signing route once production resources are configured
1. **Contract issuance:** Qualified human finalizes renter-specific vehicle, rental duration, agreed base price, fee/tax/deposit disclosure, commercial insurance evidence, E-SIGN notice, revisions and page-field anchors. Store the exact PDF in a private bucket. Retain immutable SHA-256 hash.
2. **Identity and assignment:** Active verified Supabase Auth account, MFA (AAL2) and staff-attested identity/authorized renter. Staff issues an envelope linked to \`inhouse_signers\` by stable user ID, not a public name or invitation query parameter.
3. **Recipient opens approved PDF:** Server validates identity, tenant, signer assignment, state, expiry, hash and storage credentials. Deliver a short-lived private read URL only to that signer.
4. **Consent and signature:** Present **the final approved** E-SIGN disclosure and paper withdrawal provisions; separately elect waivers, review ten documents, initial required sections and draw/type a signature. Explicit \`SIGN_THIS_DOCUMENT\` intent.
5. **Server-side evidence:** Reject browser-only authorization. Validate each field, document and disclosure digest, approved agreement, session/AAL2, signer status, identity attestation, expiry and UUID idempotency. Seal sensitive payload under per-field AES-256-GCM and create HMAC event proof.
6. **Atomic ledger:** PostgreSQL \`rr_record_inhouse_signature\` locks envelope and signer records, inserts immutable ledger event, marks signed signer and returns PARTIALLY_SIGNED or SIGNED_PENDING_ARTIFACT. Duplicate, expired, changed or unauthorized requests are refused.
7. **Finalization REQUIRED before saying 'successfully signed':** First-party final PDF renderer anchors actual signature and initials to the immutable approved PDF; hashes and stores a **new** signed artifact, produces a company audit certificate, preserves the original, and verifies customer/company delivery receipts. The renderer, required field anchors, private bucket and finalizer queue have **not** been provisioned yet; the \`RR_ENABLE_INHOUSE_PDF_FINALIZER\` feature must remain disabled.
8. **Completion:** Only an audited server job may transition to COMPLETED upon verified final PDF/certificate and delivery records. No client success screen based solely on clicking Submit. No payment or vehicle release from signing alone.

## Key security requirements
Use protected service-role database connection only on the server; never leak keys or signer data in a static bundle, GitHub, analytics or AI prompts. Confirm database schema with reviewed migrations and backups. Private PDF storage requires no public ACL, time-limited read URLs, malware/format review and retention policy. Consent must identify the approved notice version, available copy format, withdrawal instructions and non-electronic alternatives. No SMS/email notifications until a verified outbox and communications channel is configured.

Required production feature flags (all default false): \`RR_ENABLE_INHOUSE_ESIGN\`, \`RR_ENABLE_RBAC\`, \`RR_ENABLE_OAUTH\`, \`RR_ENABLE_ENCRYPTED_ENVELOPES\`, \`RR_ENABLE_PRIVATE_VAULT\`, \`RR_ENABLE_INHOUSE_PDF_FINALIZER\`, \`RR_ENABLE_INHOUSE_AUDIT_STORE\`, \`RR_ENABLE_PRIVATE_DOC_READER\`, \`RR_CONTRACTS_LEGAL_APPROVED\`, \`RR_ENABLE_SIGNING\`. Secrets must come from a separate trusted secret manager: Supabase server keys, \`RR_ENCRYPTION_KEY_B64\`, \`RR_ENCRYPTION_KEY_ID\`, \`RR_SIGN_EVENT_HMAC_KEY_B64\`, \`RR_PRIVATE_PDF_BUCKET\`.

## Proof checklist
- [x] Original in-house browser signature/initials pad, touch/mouse/stylus, draw/type.
- [x] Guided document review, consent and separate waiver selections.
- [x] API readiness + in-house session/authenticated signing routes.
- [x] Signature proof and atomic SQL transaction modeled, with automated tests.
- [ ] Dedicated Supabase project **ACTIVE**, migration applied and RLS tested.
- [ ] Key vault, encrypted document bucket and hardened auth configured.
- [ ] Approved final PDF contract render/personalization, per-field page anchors.
- [ ] Native signed PDF and certificate builder deployed/tested against authenticated fixtures.
- [ ] Company/customer delivery and event retention verified.
- [ ] Counsel/E-SIGN, underwriter, payments and full production smoke testing.
