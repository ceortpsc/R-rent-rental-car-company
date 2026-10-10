# R-Rent Sensitive Data Handling, Retention and Secure Disposal Policy
**Document:** RR-SEC-RET-001 | **Revision:** 1.0 | **Policy status:** proposed, subject to counsel/regulatory and provider-retention review.

## Purpose and ownership
Apply data minimization, lawful collection, tenant isolation, restricted access, encryption, retention and accountable deletion throughout personal data's lifecycle. The Security Administrator operates technical safeguards; Compliance/records staff set lawful retention; independent approver authorizes destruction; Corporate Owner owns resources. This policy covers rentals only, not other RTPSC entities or their tax records.

## Classification and permitted contents
| Class | Examples | Handling |
|---|---|---|
| PUBLIC | listings, published rates, approved policies | public CDN, version history |
| INTERNAL | sanitized workflow definitions, aggregate stats | staff MFA and change audit |
| CONFIDENTIAL | renter contact, rental ID, support messages, receipts | scoped access, encryption and retention |
| RESTRICTED | driver-license scan, DOB, policy declarations, identity verification, signed agreement, signatures, incident images | authenticated upload to private scanned vault, AEAD, access events, least privilege |
| PAYMENT_TOKEN | processor tokens, settlement references, dispute metadata | provider vault, never PAN/CVV in R-Rent forms, strict billing scope |
Do not put sensitive data in repo, issue descriptions, AI prompts, browser localStorage, webhook logs, analytics, chat exports, or public URLs.

## Data lifecycle
1. **Collect:** purpose recorded, lawful basis and notice validated, collect minimum fields; no public unrestricted file uploads. Credit card fields only via hosted compliant provider.
2. **Transport:** HTTPS; deny mixed content; authenticated short-lived presigned URLs constrained to upload object, file type and size.
3. **Inspect:** quarantine, malware scanner, document type sniff, duplicate detection and abuse controls; do not serve unscanned files.
4. **Encrypt:** application-restricted values through versioned AES-256-GCM, AAD bound to tenant+record+field; private encrypted object storage; TLS. Keep encryption keys in a vault separate from ciphertext and backups.
5. **Access:** server verifies subject, tenant, role, assignee/owner and business purpose on each read; audit; redact by default. Staff MFA and dual review for bulk exports.
6. **Use:** fit for declared purpose only, human-reviewed adverse decisions; provider minimum necessary disclosure with DPA.
7. **Retain:** defined business/legal/insurer/chargeback timeframes; category-specific schedule approved before operational intake.
8. **Hold:** freeze deletion when litigation, legal preservation or regulator/insurer hold, with owner/reason/date and periodic review.
9. **Dispose:** queue objects when eligible, require legal-hold clearance, independent approval, delete primary encrypted objects and index references, issue certificate, propagate to backups according to retention schedule and key-management policy.

## Retention schedule (PROPOSAL, not active)
| Category | Recommended planning rule | Final determination |
|---|---|---|
| Abandoned draft/unfinished application | minimum operational need, then purge | legal/privacy review required |
| Rejected identity verification media | minimize storage; favor provider verification token over retained raw image | insurer/privacy review required |
| Active rental agreement and signed audit certificate | retain for contract, tax, claims and dispute limitation requirements | counsel sets exact years |
| Financial transactions and tax-related invoices | applicable books/tax/payment processor obligations | accountant and counsel set exact years |
| Charge disputes and insurer claims | preserve while open and required post-closure | provider agreement + counsel |
| Security access and processing logs | shortest effective security period with redaction | security lead approves |
| CCTV/vehicle condition/incident photos | retain to support justified claims; avoid indefinite storage | counsel/insurer approval |
| Backups | scheduled lifecycle plus restore requirement; documented deletion lag | operator verifies |

Never represent a specific retention number as final unless approved. The law may require longer preservation, and a valid legal hold overrides routine deletion.

## Secure disposal procedure
1. Automated *eligibility check only*: category, verified retention rule, closed case, valid owner, no unpaid balance hold or dispute.
2. Legal-hold query across disputes, civil/regulatory holds, claims, attorney preservation.
3. Duly authorized approver reviews proposed items with minimum metadata (not raw contents).
4. Second approver different from initiator validates legal hold and scope.
5. Worker uses scoped credentials; idempotency; delete private object, database references and derived cache/search entries; log provider delete receipts.
6. Backups/persistent replicas: follow approved expiry and crypto-shredding plan; do not falsely claim instant erasure from all snapshots.
7. Generate immutable disposal manifest/certificate with object identifiers hashed/redacted, policy revision, approval IDs, timestamps, provider acknowledgment and errors.
8. Verify completion; failures go to private dead-letter queue and are never marked deleted.
9. Respond to individual access/deletion requests and appeals as required by applicable privacy law.

## DSAR and exceptions
Request via verified support/privacy channel, do not solicit ID scans through plain email. Verify subject proportionately. Assess scope, exemptions, valid legal hold and statutory response/appeal windows with legal staff. Provide plain-language result, not unverified deletion certificate. Third-party processor deletion requests are tracked independently and confirmed by provider.

## Safeguard checklist
[ ] Data inventory with assigned category and purpose.
[ ] Dedicated encryption key/rotation and recovery strategy configured.
[ ] Private object storage and malware scanner live.
[ ] Tenant-aware RLS, least privilege and immutable audit.
[ ] Final retention matrix formally approved.
[ ] Backup expiration and legal-hold controls verified.
[ ] Two-person disposition, purging worker, deletion receipts and recovery tests.
[ ] Secure breach/privacy request escalation.
[ ] Vendor DPAs and cross-entity purpose separation.
Current status: policy documented; production execution/automated purging **disabled pending verification**.
