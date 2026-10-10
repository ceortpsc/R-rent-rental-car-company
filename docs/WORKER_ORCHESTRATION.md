# R-Rent Workflow Engine, Jobs, Prompts, Policies & Triggers
**Source contract:** \`lib/orchestration.js\` and \`lib/rbac.js\`. **Status:** deterministic code and requirements; durable queue/workers are NOT running.

## Triggers and resulting tasks
| Trigger | Job / action | Evidence | Human / security gate |
|---|---|---|---|
| customer requests quote | intake.validate, quote.finalize | server quote ID, price version | no booking or charge |
| application submitted | identity.provider_verify | authenticated application, consent | approved identity vendor |
| identity review finished | insurance.carrier_verify | provider status + carrier evidence | independent reviewer |
| coverage verified | contracts.require_counsel_approval | counsel-approved revision/hash | compliance staff |
| ready for e-sign | contracts.prepare_packet, contracts.issue_signed_invitation | recipient verification, opt-in/evidence | staff MFA and signer access |
| provider webhook | signing.record_verified_provider_event | verified signature, event ID, UTC timestamp | webhook replay defense |
| all real signers complete | signing.generate_signed_pdf, signing.generate_certificate | provider artifact, tamper hash | integrity validation |
| artifacts stored | signing.deliver_renter_copy, signing.deliver_company_copy | private delivery receipt IDs | recipient scope |
| payment provider event | billing.reconcile_signed_webhook | signed event + journal entry | billing review |
| vehicle pickup | fleet.complete_pretrip_inspection, fleet.human_release_review | eight release evidence items | independent human approval |
| support issue | support.open_case, support.assign_review | verified requester and ticket | scoped case handler |
| security alert | security.triage_incident | incident ID and evidence hash | security lead |
| retention elapsed | records.identify_retention, records.verify_legal_hold | category rule, case status | compliance and legal hold |
| disposal approved | records.approve_disposal, records.purge_and_certify | two independent approvers + receipts | legal hold clear and full audit |

## Agent directives
**Navigator agent:** display route purpose, allowed inputs, disabled steps and accessible notices. Cannot grant privileges.
**Document phrasing agent:** retrieve approved immutable template version and cite its clause source. No alteration to executed terms or invented statutory language.
**Compliance agent:** evaluate mandatory disclosures and escalate uncertainty to qualified human review. Cannot approve insurer coverage.
**Verification assistant:** flag missing ID, expired document or inconsistencies using minimum necessary metadata. Do not access external DPS/insurer databases without a real agreement and consent.
**Billing reconciliation agent:** explain mismatch, verify payment provider objects and queue human adjustments. Cannot initiate refunds or capture directly.
**Security agent:** check access anomalies, encryption failures, denied requests and legal holds. Can request disablement or review, but not remove audit logs.
**Deployment agent:** validate tests, metadata, environment policy and evidence. Cannot self-enable a restricted production flag.

## Technical rules
- Persist an outbox event in the DB transaction before enqueue.
- Namespace idempotency by tenant/operation and retain provider event IDs to block replay.
- Use private queue, scoped worker identity, TTL/leases, exponential backoff with jitter, max attempts and dead-letter handoff.
- Tasks carry IDs and hashes, not raw PII or card credentials.
- Reauthorize the human/provider evidence at execution time, not just when the event is created.
- Never interpret timeout/missing acknowledgment as success. Persist stage state and causality chain.
- No cron loop, batch job or automatically executed external task is present merely from this policy.

## Core state machine
DRAFT → SUBMITTED → AWAITING_IDENTITY → AWAITING_INSURANCE → AWAITING_CONTRACT → AWAITING_PAYMENT → AWAITING_HUMAN_APPROVAL → AUTHORIZED_FOR_RELEASE → ACTIVE → RETURNED → CLOSED.
Any high-risk transition requires verified evidence objects, staff AAL2 where applicable and explicit human approval. A rejected/expired/void envelope cannot be silently reactivated; issue a new revision and idempotency key.
