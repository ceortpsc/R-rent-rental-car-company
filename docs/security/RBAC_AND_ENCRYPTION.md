# R-Rent RBAC / Cryptographic Safeguards Design
**Document:** RR-SEC-RBAC-001 | **Status:** source-code implementation with unverified live backends.

## Roles (13 total)
| Role | Primary view(s) | Authorized business scope |
|---|---|---|
| RENTER | personal account, own rentals/files/cases | own records only |
| ADDITIONAL_DRIVER | assigned documents | explicitly assigned agreement only |
| CORPORATE_OWNER | executive, fleet, risk, governance, audits | company tenant; still subject to MFA and dual approval |
| DIVISION_ADMIN | rental operations, agreements, support | company tenant |
| RENTAL_MANAGER | applications, fleet, dispatch review | company tenant |
| FLEET_MANAGER | vehicle management, inspections | tenant fleet |
| FLEET_AGENT | assigned pickup/return, pre-trip checks | assigned fleet tasks |
| VERIFICATION_ANALYST | driver identity, coverage verification | assigned restricted cases |
| COMPLIANCE_OFFICER | laws, contracts, evidence audits | approved compliance purpose |
| BILLING_SPECIALIST | invoices, reconciliation, refunds/disputes | restricted financial metadata |
| CUSTOMER_SUPPORT | service tickets and safe status | assigned cases only |
| AUDITOR | read-only evidence, compliance reports | tenant-scoped read-only |
| SECURITY_ADMIN | IAM, incident response, keys/config review | no unilateral financial action |

## Permission invariants
\`lib/rbac.js\` is the canonical matrix. Default deny, no implicit wildcards, no inherited "superuser" bypass. Every request must verify identity, tenant and resource owner/assignment at the backend, independent of the client UI. Sensitive routes require AAL2 MFA. Renter roles must **never** be granted privileged staff operations. Financial refund, contract issue, vehicle handoff, privileged access change and disposal require independent evidence. Authorization decisions are logged without raw sensitive payload.

## AAD encrypted field envelope
\`lib/crypto-vault.js\` exposes \`encryptRestricted(value,{tenant,recordId,field})\` and \`decryptRestricted(record,{tenant,recordId,field})\`. It uses a fresh random 12-byte IV, AES-256-GCM, 128-bit authentication tag, 32-byte base64 server key, versioned key ID and authenticated additional data binding tenant+record+field.
Stored representation: \`{v,alg,kid,iv,ct,tag}\`. Decrypt fails on wrong key, tenant, record or modified ciphertext. Never commit or transmit encryption keys. Key ID rotation requires envelope re-encryption and approval; historical keys, if needed, reside only in private key management.
\`encryptionReady()\` merely reports **configuration validity**, not certified vault security. The module is not evidence that every legacy record, backup or remote provider copy is encrypted.

## Required secured service lifecycle
1. Identity provider authenticates and verifies access token on every request; staff AAL2.
2. Server validates role, assigned scope, tenant and business purpose before any read or write.
3. Restriction field is parsed and normalized; avoid raw PII in logs.
4. Encrypt before private DB storage; object files also need provider encryption-at-rest and private presigned access.
5. Decrypt only for authorized use, never for analytics or generic AI context.
6. Audit record describes access and reason without sensitive material.
7. Retention and legal hold process governs deletion.

## Additional controls
Production must include database row-level security, deny by default table privileges, explicit object bucket policies, anti-IDOR testing, token revocation, brute force limiting, CSRF/CORS validation, CSP, secure dependency/secret scanning, key rotation/backup recovery and incident runbooks. All private field integration is blocked until verified infrastructure exists.

## Environment registry
- RR_ENABLE_RBAC=false (default)
- RR_ENABLE_PRIVATE_VAULT=false
- RR_ENABLE_MALWARE_SCAN=false
- RR_ENABLE_SECURE_UPLOADS=false
- RR_ENABLE_SIGNING=false
- RR_ENABLE_PAYMENTS=false
- RR_ENABLE_RELEASE=false
- RR_ENCRYPTION_KEY_ID=v1 (non-secret, approved vault key version)
- RR_ENCRYPTION_KEY_B64: externally provisioned secret; **never record here**
- SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY: restricted production secret registry (service role server only).

No new flag should be set true solely because its source file exists.
