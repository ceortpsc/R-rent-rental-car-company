# R-Rent Written Information Security and Cybersecurity Program (WISP)
**Document:** RR-SEC-WISP-001 | **Revision:** 1.0 | **Owner:** Corporate Owner + Security Administrator | **Approval:** PENDING qualified security/legal review.

## Governance and accountability
The Corporate Owner sponsors the program, the Security Administrator administers security controls, the Compliance Officer monitors obligations, and staff and vendors are accountable for least-privilege compliance. Designate a named CISO/security owner and backup; security duties cannot be delegated solely to an AI. Require onboarding/annual training and documented acceptance of policies. Keep evidence of risk assessment, exceptions, vulnerability handling, contract/vendor reviews and access recertification.

## Information and threat inventory
Assets: Vercel project, Cloudflare DNS, repositories, private database, confidential document vault, keys, CI/CD, Stripe/PayPal integration, insurer/ID providers, e-sign vendor, customer and staff accounts, audit logs, backup, incident and case records.
Threats: account takeover, credential stuffing, OAuth token misuse, phishing, malware-infected license uploads, privilege escalation, cross-tenant leakage, insecure direct-object access, forged webhook signatures, double capture/refund, replay, refund fraud, signature replay, prompt injection, SSRF, secrets exposure, ransomware, data loss and insider misuse.
Risk process: annually and after material change, inventory assets, score likelihood/impact, assign mitigation owner and deadline, verify residual risk approval. Unremediated critical risks block the sensitive workflow.

## Identity and access
OIDC/OAuth2 with authorization-code + PKCE where supported; provider token validation and session expiry; secure cookies (HttpOnly/Secure/SameSite) once sessions are provisioned; challenge MFA for staff and high-risk actions; password manager and hardware security keys where available. **No public username/password field connected to an unverified backend.**
13-role catalog and unique immutable user IDs; review tenant role, current employment, AAL and resource ownership at each request. Deny by default. Split initiate/approve roles for refund, permission change, key rotation and disposal; log approvals and prevent self-approval. Rotate/revoke access immediately at termination or incident. Quarterly access reviews.

## Perimeter and application security
TLS 1.2+, HTTPS only, appropriate HSTS, limited CORS, strict CSP, CSRF defense, same-site cookies, no sensitive URLs or access tokens in logs/referrers. CDN/WAF plus rate limiting and bot controls. API schemas, server-side validation, parameterized DB filters, no server-side trust in supplied role, tenant or approval status. Restrict file upload to authenticated users with private signed upload URLs, size/MIME signatures, magic-byte checks, malware scanning, content disarm where appropriate, no public object ACL, quarantine until approved. No document download without current resource authorization.

## Crypto and keys
Use AES-256-GCM for designated application-level restricted values with unique 96-bit nonces and authenticated AAD binding tenant+record+field; independent TLS and provider encryption-at-rest. Key generated and stored only in externally approved secret management; no secrets in Git, frontend bundles, logs, test fixtures, or analytics. Separate dev/stage/prod keys. Restrict decrypt privileges and audit each controlled decrypt. Support versioned key IDs, staged rotation/re-encryption with dual approval and validation. Encrypted backups and verified restore. **The committed crypto module is implemented, but key provisioning and field-by-field live storage integration are not certified.**

## Payment and contractual controls
Hosted checkout and tokenized payment only; never accept PAN/CVV in normal application code. Provider-verified webhook signatures, timestamp/replay detection, idempotency and accounting ledger. Risk checks and human review for disputed charges. Envelopes require counsel-approved exact revisions, E-SIGN consent, verified signer access, provider completion proof, tamper-evident signed artifacts and controlled delivery. Do not treat local previews as executed or let AI autonomously approve.

## Secure SDLC
Trunk protections/PR review, secret scanning, dependency scanning/SBOM, package pinning, static analysis, unit/integration/DAST tests and API penetration testing before public sensitive-data intake. Sandbox test accounts must not be copied into production. CI jobs use ephemeral scoped credentials, code-owner approval, reproducible artifacts and signed deployment evidence. Emergency changes require break-glass ticket and retrospective review.

## Monitoring, logging and alerts
Central append-only logs for auth decisions, denied access, config modifications, PII access, payment events, contract revisions, access reviews, provider webhook receipts and disposal actions. Scrub secrets and PII before ingestion. Monitor unusual privilege changes, upload malware detections, suspicious payment attempts, key access, WAF anomalies, DNS changes, return/booking conflicts and unexplained export volumes. Limit raw log retention per schedule. Correlate by random event IDs; no complete card number, license ID, document body or signature in telemetry.

## Incident handling
1. **Prepare:** severity matrix, legal/insurer contacts, evidence stores, backup and on-call staffing, drills.
2. **Identify:** validate alert, open incident ID, triage affected data categories, preserve evidence with timestamps/hash.
3. **Contain:** suspend sessions/tokens, temporarily disable affected flags, quarantine uploads, revoke/rotate keys, stop outbound jobs while preserving evidence.
4. **Eradicate:** correct vulnerability, remove malicious objects, reconcile provider events and verify least privilege.
5. **Recover:** restore clean backup, validate hash and records, security review, staged reopen.
6. **Notify:** assess Texas and other applicable breach-notification duties, provider contracts and consumer notices with counsel; record decision basis and deadlines.
7. **Review:** root-cause, lessons, access review, remediation and evidence of closure.
Do not promise specific notification timing absent verified applicable law and incident facts.

## Operational checkpoints
Daily: alerts, failed authentication, queue/dead-letter, backup job state, webhook failures.
Weekly: patch advisories, evidence exceptions, malware events, access exceptions, change log.
Monthly: restore sample, vuln scans, incident runbook rehearsal, vendor SLA exceptions.
Quarterly: role recertification, DPA and vendor reviews, key-rotation review, retention/disposal and configuration baseline drift.
Annual: formal risk assessment, third-party penetration testing, disaster recovery exercise, program review and approvals.

## Production release gates
[ ] Security owner assigned; signed policy.
[ ] Inventory and threat model accepted; high findings remediated.
[ ] Auth + MFA + RBAC authorization independently tested including tenant-isolation.
[ ] Real private vault, malware scanner and key vault integrated and audited.
[ ] Insurance/identity/payment/e-sign vendors approved.
[ ] Incident channel and response staffing; external contact points.
[ ] Backups, recovery proof, log redaction and lawful retention.
[ ] Pen test, vulnerability and dependency scans passing.
[ ] Live monitoring, incident response and insurer/legal sign-offs.
Current status: CODE/POLICY PREPARED; operational verification PENDING. References: NIST Cybersecurity Framework 2.0; NIST SP 800-53; NIST SP 800-61; IRS Publication 4557 where taxpayer data is handled by a separately scoped RTPSC tax business.
