# R-Rent Sign — Proprietary Signing Suite (v0.3.0)

R-Rent Sign is an RTPSC-owned envelope/signature interface designed to compete on usability and deep rental workflows with services such as DocuSign. **Not affiliated with or licensed by DocuSign**; no parity certification is asserted.

## Current deliverables
- Branded signing workspace at \`/sign\`.
- An internal envelope composer (document bundle selection, role order, expiration and consent checklist).
- Responsive drawing signature pad using pointer events, optional typed preview and dedicated initials surface.
- A locally generated review summary and cryptographic digest; the public preview stores **nothing**.
- A versioned, public-safe template manifest available via GET \`/api/v1/envelopes\`.
- Authenticated staff-only DRAFT endpoint behind \`RR_ENABLE_ENVELOPES=false\` and dedicated DB migration.
- No live signature collection, email invitation, executable envelope, identity upload or signing certificate.

## Future execution architecture
1. Staff prepares document bundle and exact approved legal revision; contract hash computed server-side.
2. Approval queue verifies all mandatory Texas rental disclosures, identities and prices, including optional waiver **separate elections**.
3. Identity-scoped recipient list with routing order, email/SMS token delivery via approved transactional provider. Tokens must be high entropy, hashed in storage, short-lived, single use where appropriate, and rate limited.
4. Each signer reviews PDF, explicitly accepts E-SIGN disclosure, confirms access/retention, chooses signature or initials, and agrees to the precise SHA-256 revision. User must be able to decline.
5. Server records signer identity verification method, consent revision, envelope template digest, timestamp in UTC, evidence trail, and verified request metadata subject to retention and privacy policy.
6. Generate signed PDF/A where appropriate, document integrity hash and tamper-evident completion certificate; deliver individual renter and company copies via secure access-controlled endpoints.
7. Renewal/void/expiry/reassignment must be auditable. A document modification resets affected signers' acceptance as legally appropriate.
8. Avoid storing raw signatures/IDs in browser localStorage, general server logs, analytics, AI prompts or public GitHub.

## Native provider vs external DocuSign
Native first-party service is the goal; Docusign may be used as an optional recipient/envelope adapter if separately connected. Every adapter implements:
\`createDraft\`, \`assignRecipients\`, \`issue\`, \`requestSignature\`, \`getStatus\`, \`void\`, \`downloadSignedArtifact\`, \`getAuditCertificate\`, \`processSignedWebhook\`.
Provider transitions are governed by idempotency keys, verified webhooks, RLS, human approvals and immutable state changes. No service may report SENT/SIGNED based on a client click.

## Security & law
Texas Business & Commerce Code Chapter 322 and federal E-SIGN govern electronically signed documents and the conditions for consumer electronic records. Exact content, recipient consent, identity attestation, electronic record preservation and delivery require Texas attorney approval. Signatures cannot confirm insurance coverage or replace driver-license verification. Do not send government ID images by ordinary email.

## Release checklist
- [x] Public UX, editable field controls, local preview, no signature exfiltration.
- [x] Server-side draft validation, state allowlist and content fingerprint code.
- [x] Automated unit tests for role/document/expiry rules.
- [ ] Dedicated Supabase project with migration/RLS/backup.
- [ ] MFA, tenant isolation, authenticated reviewer and signer sessions.
- [ ] Encrypted, scanned document vault and strict retention.
- [ ] Authorized email/SMS transactional delivery and verifiable recipient invitation.
- [ ] Signing service, immutable completed artifact, tamper certificate.
- [ ] Expiry/reminder/decline/void state transitions with webhook validation.
- [ ] Qualified counsel and insurer approval, end-to-end compliance/security testing.

**Only after every required gate passes should the R-Rent server accept real electronic signatures.**
