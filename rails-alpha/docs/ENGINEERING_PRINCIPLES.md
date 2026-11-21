# R-Rent Rails engineering principles

**Decision scope:** standalone Ruby on Rails 8.1 rebuild; SQLite for local development and gated synthetic review; persistent PostgreSQL staging and production are gated future steps. **Release posture:** private engineering/alpha only until separately evidenced and approved. **Production target, not a live claim:** `rtpsccarrentals.com`. This charter defines requirements and acceptance. It is not a release record. Use the source, committed migrations, test output and actual deployed evidence to identify delivered capabilities. Do not infer those from this document.

## 1. Non-negotiable boundaries

1. **Separate the rebuild from the prior platform.** Do not overwrite or deploy over the existing FastAPI artifact. Its operator handbook can inform comparison, but its route names, grants, feature flags, evidence and outputs are not Rails interfaces. No data copy or dual writes by default.
2. **One company per running instance.** Use separate environments, persistence and security approvals for each company. Nothing uses a user-supplied company identifier to retarget the database or widen access.
3. **Keep architecture honest.** Compute business readiness from internal evidence; never equate “ready for review” with real identity validation, settled funds, a signed legal agreement, current insurance coverage, or custody physically transferred.
4. **Do not send, charge, release or deploy.** This baseline cannot send email/SMS, call suppliers/insurers, collect/capture/refund, store cards, authorize physical handover/release, or modify live domains, DNS, provider permissions or a previous deployment. Human-approved policy and verified external capability are required for any later transition from simulation.
5. **Use synthetic records only.** No actual renters, employee credentials, contact details, IDs, legal agreements, payment cards, bank statements, active cases or personal images in fixtures, logs, screenshots or artifacts. Declare if a seeded record is a fixture.
6. **Default deny, fail closed.** Missing session, role, object ownership, record version, status, evidence, queue schema or instance configuration prevents action; do not substitute the most permissive fallback.

## 2. Decision register

These baseline architecture decisions are design commitments, not implementation attestations. Extend with a dated replacement ADR when facts change rather than silently editing history.

| ADR | Decision and alternatives | Tradeoff / trigger to revisit |
|---|---|---|
| RR-001 | Use one Rails 8.1 application with conventional controllers, views, models, explicit domain commands and an internal worker. Avoid microservices and cross-system shared writers for the initial release. | Smaller operational footprint; split only for measured scaling or compliance needs after boundaries and contracts stabilize. |
| RR-002 | Single-company per instance. Prefer independent DB, secrets, storage, worker and hostname; no shared tenant selector. | Increases deployment count, but bounds blast radius. Shared multi-tenancy requires a new threat model, explicit data design and independently verified isolation; not a toggle. |
| RR-003 | SQLite local alpha; PostgreSQL future staging; same business invariants must pass on both before promotion. | SQLite does not prove concurrent behavior on PostgreSQL. Preserve portable schema where practical; document any adapter-specific locking or constraint. |
| RR-004 | Administrator and queue-only workflow operator, individually authenticated. Separate sign-in/workspace surfaces where implemented; roles remain server-authorized even with two URLs. | Less broad functionality today; add Finance, Fleet, Branch and renter entitlements only through separate approvals/tests. |
| RR-005 | Transactional outbox in the business DB; workers operate with durable claim/retry and idempotent internal item creation. Do not use synchronous provider calls or callback-only queuing as the source of durability. | Strong replay/rollback semantics; requires lag telemetry, explicit recovery and database contention tests. |
| RR-006 | Internal reconciliation/review only. No money, credentials for payment providers, external message delivery or real vehicle release in baseline. | Avoids irreversible effects while office workflows are tested. Any provider, charge or custody feature requires a separate approved release. |
| RR-007 | Preserve committed history and audit. No silent overwrites; use compensating, attributed decisions. | More records and retention work; limit payload and view access instead of erasing events casually. |
| RR-008 | Build once per environment-compatible artifact, promote with evidence, no direct production changes from local. | Requires reproducible builds, preflight and rollback practice; differences must be documented. |

An ADR should identify owner, factual context, selected alternative, rejected options, security/data impact, rollout/reversal, linked tests, and decision date. Any change that introduces real money, PII collection, external services, shared tenancy or live deployment also requires an explicit scope decision.

## 3. Architecture and interfaces

```text
Browser -> Rails route/controller -> session + role + scoped-object policy
        -> business command -> transaction [business record + audit + outbox]
        -> explicit response/view

Scheduler / bounded runner -> claim due outbox row -> internal apply command
        -> transaction [deduplicated work item + result/audit + event state]
        -> sanitized metrics; no outbound adapters in baseline.
```

| Boundary | Rule |
|---|---|
| Public pages | Serve approved public information only. Never query private fleet custody, financial records, staff details or real renter information to render public copy. |
| Admin workspace | Only individually authenticated administrators; separate read and mutation actions. Work with fixture reservations, fleet/route labels, observations and queues only as implemented. An admin role is not authorization to spend, contact outsiders or direct physical custody. |
| Queue-only workflow operator | Only work assigned/internal queue records and explicitly permitted disposition actions. Direct link/API, server-rendered labels, nested associations, downloadable output and error payloads must not reveal PII, booking/vehicle details, payments, exports or admin settings. Lists and aggregates share the same policy. |
| Controllers | Parse/allowlist inputs, authenticate, load through authorization scope, authorize action, invoke command, render a deliberate outcome. Do not treat strong parameters as authorization or use a general state setter for mutations. |
| Domain commands | Check object membership, valid state, expected revision and explicit approvals inside the same transaction as writes. Use predictable failures (denied, missing, stale conflict, invalid, temporarily unavailable). Keep provider effects out of requests and callbacks. |
| Models and database | Own structural invariants, indexes and associations. Model validation UX is supplemental; the database enforces uniqueness, required data, valid references and finite states where practical. |
| Jobs | Read typed, versioned internal payloads; re-check preconditions before applying. Since a user may have lost access after queuing, distinguish original actor provenance from current service authority. Unknown versions go to review, not generic dispatch. |
| Views/API | Render only fields required by role; no hidden JSON, debug tabs or embed payloads containing protected columns. Use semantic labels, clear error text, focus recovery, and explicit disabled reasons. State-changing controls use POST/PATCH/DELETE with applicable CSRF protection; GET must not mutate. |

Use names reflecting what actually happens: **Record internal review**, **Assign queue item**, **Mark review complete**, **Retry eligible item**, **View audit event**. Avoid **Send**, **Charge**, **Refund**, **Release vehicle**, or **Approved pickup** if the underlying action is only a simulation or recording observation. Never reuse a UI status as a permissions check.

For exact implemented paths use the release checkout's route manifest, for example `bin/rails routes` against the intended revision, and verify request and system tests. Do not assume example path names from older documentation are valid.

## 4. Data model, integrity and concurrency

- **Separate state dimensions.** Reservation, vehicle availability, simulated custody, agreement readiness, money observation and incident/maintenance review are independent. A completed queue task advances only its allowed workflow state. Returning a vehicle for simulation does not make it roadworthy, activate a rental agreement or settle a balance.
- **Constrain the source of truth.** Use required columns, foreign keys, unique business identifiers within instance, and transactions around related changes. Record which actor changed what, why and when. Use integers in minor units plus currency for monetary observations; never floating-point arithmetic or cross-currency totals. Preserve source, observed time and whether a value was provided or verified. No missing input defaults to zero, verified, approved, or paid.
- **Version facts and transitions.** Use an expected revision (e.g., Rails optimistic locking if implemented) for edits and reject stale writes. Guard facts such as assignment and competing date ranges against actual concurrency, not a read-then-save validator. Treat reservation intervals as start-inclusive/end-exclusive, with separately defined changeover buffers and branch-local time zone. Store persisted timestamps in UTC, preserve branch zone for display, and test DST gap/overlap behavior.
- **Protect availability under concurrency.** The future confirmed-assignment command must enforce a same-vehicle overlap rule under atomic serialized/locked checks or a database-level constraint; document what is actually implemented. For local SQLite, exercise multi-connection contention and bounded retries rather than assuming a Ruby mutex covers other processes. For future PostgreSQL, independently test locking, transaction isolation, exclusion/range strategy if adopted and deadlock/retry handling. Concurrent losers should return a conflict, not create second reservations or change simulated financial state.
- **Replace, do not mutate evidence.** If new evidence supersedes an observation, store a new revision and link it. Never store photos, government IDs or raw payment data in general audit tables. The production retention/archival policy, deletion recovery, exceptions and preservation holds are separate approvals.
- **Control migrations.** Pin stack versions in the manifest and lockfile; review foreign key/index behavior on both adapters. Test empty schema creation and upgrade from earlier reviewed release. Prefer expanding first, backfilling safely/boundedly, switching reads and retiring old columns after rollback windows. Separate schema migration, fixture seeding and any later historical import. Never seed a real or persistent staging database from dev tooling; the explicitly isolated disposable preview alone uses synthetic fixtures.

Rails references: [8.1 Active Record migrations](https://guides.rubyonrails.org/v8.1/active_record_migrations.html) and [querying and locking](https://guides.rubyonrails.org/v8.1/active_record_querying.html).

## 5. Roles, sign-in and data protection

| Principal | Allowed in initial design | Always denied in baseline |
|---|---|---|
| Unauthenticated | Approved public preview and sign-in only | Staff dashboards, queue metadata and private object existence |
| Administrator | Admin workspace and supported fixture/administrative review; scoped audit/jobs according to implementation | External charges/refunds, notifications, real release, production or cross-company access, handling live identity/payment records |
| Workflow operator | Queue-only login/workspace plus explicitly scoped assignment/disposition | Bookings, PII, exports, fleet/payment administration, privileged job controls, grants, users and admin pages/API |
| Worker identity | Read/claim typed outbox events, create internal queue tasks, record outcome | Browser sign-in, unrelated entity browsing, payment operations, network delivery |
| Deploy operator | Approved isolated environment operations if separately granted | Customer record access merely by operator role |

Security requirements: non-shared accounts; secure password hashing and reset design using approved platform facilities; no default credential usable outside intentionally local fixtures. Never commit credentials or render temporary authentication secrets. Add short-lived secure session cookies, session rotation after sign-in, expiry and privilege revocation controls; re-check current role on protected requests. Distinct sign-in URLs do not substitute for credential/role validation. Use constant/neutral login response, rate limits, appropriately protected password reset where supported, and force-admin MFA/step-up before any higher-trust stage. Redact params and filtered headers; moderation of security logs should use identifiers and outcomes, not form bodies.

Deny by instance, policy, action and resource, including nested routes. Scope collections server-side; never trust a client role, branch, approval, assignee or company claim. Keep unauthorized response bodies generic and never reveal existence of inaccessible records. Test direct URL/API access, crafted form parameters and headers, filename/download paths, stale sessions after deactivation, and queue records with hostile or private source content using synthetic test data. Sanitize output, permit only intended redirects, enforce CSRF for session mutations and differentiate expected errors from internal exceptions. Security reference: [Rails 8.1 Security Guide](https://guides.rubyonrails.org/v8.1/security.html).

## 6. Outbox and replay discipline

A domain write and the associated outbox row must commit together using the same database transaction. Audit records attributable to that write belong in the transaction as well. If any required write fails, all roll back. A job scheduled after commit may reduce latency but cannot be the only way to deliver a committed event. Persist a stable event ID, type, minimal payload, schema version, entity reference/revision, correlation ID, availability timestamp, state and attempt metadata. Keep potentially private evidence in its source record and out of the event.

Use a bounded internal worker run. Select eligible due rows with an atomic claim or compare-and-swap. Claim owner and lease expiry support worker restart; a worker with a stale lease must not confirm another worker's claim. Use a stable idempotency key scoped to instance + originating event/semantic action; enforce uniqueness on the resulting queue item. Commit the queue item and processed marker together where both are in the same database. If a worker crashes after commit, replay returns a committed result, not a new task. If it crashes before commit, the next valid attempt may complete it. A duplicate request with conflicting parameters is a conflict, not permission to attempt a new mutation.

Keep retries finite with bounded backoff, failure codes and a review/quarantine state. Unknown event schemas, missing target/current prerequisites and permanently invalid inputs should not spin. An authorized retry records the reason and identity; it reuses the event's business key and does not bypass checks. Discarding or marking failed events successful is not a retry. A display-only dashboard should show ready count, oldest age, retrying count, quarantined count and last worker activity without exposing private bodies. If required capabilities are not yet implemented, create a design/test ticket rather than claiming this charter supplies them.

No event name authorizes e-mail, card action, external claims, provider calls or physical handover. No code path should have a configured outbound provider in this baseline. Consider a network-deny test for the worker in addition to asserting no external calls. References: [Rails Active Job](https://guides.rubyonrails.org/v8.1/active_job_basics.html) and [Active Record callback semantics](https://guides.rubyonrails.org/v8.1/active_record_callbacks.html).

## 7. Reconciliation: observations only, no movement of money

Record internal expected, observed and reconciled values as distinct facts. An observation may include fixture amount/currency, source label, observed UTC time, intended reservation/transaction reference and review state. Missing, conflicting and not applicable remain distinct from zero and settled. Compare exact identity/reference, currency, direction, amount and effective date; a numerical match is not proof of ownership or settlement. Keep prior observations immutable when a supervisor corrects a match. Unknown differences go to a queue with a generic reason, not an auto-balance adjustment.

For the current baseline: no raw PAN/CVV, card-on-file, credentialed merchant adapter, checkout, collection, capture, refund, void, payout, deposit hold/release, penalty or settlement side effect. No consumer-facing claims of paid, charged or refunded from synthetic observations. An internal review and its receipt/log are not a provider receipt. Do not use payment-looking action labels that correspond to a simulated note. A future money capability needs approved provider/contracts, separate test and live credentials, legally reviewed disclosures, least authority, authorized actions, independent reconciliation, verified callback authenticity and replay tests, and a different approval record.

## 8. Repeatable ways to prove status

| Evidence label | Minimum artifact | What it does not establish |
|---|---|---|
| Specified | ADR, acceptance case or documented intended behavior | Any code or execution |
| Implemented | Reviewed commit and exact code/migration/route references | A passing test or runtime deployment |
| Tested locally | Build/version, exact commands, test fixtures and recorded output for this revision | PostgreSQL, network isolation, staging or real integrations |
| Tested privately in staging | Same app revision, actual staging adapter/settings, records of smoke/concurrency/restore and reviewers | Public production or a provider agreement |
| Independently verified | Separate reviewer reproduces the scoped check or matches external evidence to exact environment and feature | Other features or authority outside evidence scope |
| Approved for release | Named accountable decision plus full checklist, scope and rollback plan | That public traffic was actually cut over |
| Deployed and verified | Host/build/UTC and scoped, safe post-deploy checks for the authorized environment | Any real operation that was disabled or never tested |

Prior project docs and local screenshot evidence are context, never proof for this Rails revision. A command not run is **NOT RUN**, not **PASS**; a broken dependency is **BLOCKED**, not **TESTED**. Record exact git SHA/build digest, runtime and database versions, selected fixture version, command and result, test duration, environment, reviewer and known constraints. Synthetic evidence must not include simulated real-world confirmations.

Recommended build gates: static scan/dependency audit; normal path and error-path unit/service tests; request tests (auth/role/record); system tests for label/action-flow; uniqueness/concurrency/rollback tests using multiple database connections; replay and sensitive-data regression; backup and restore; later PostgreSQL equivalent. Use scripts actually present in checkout. Rails examples `bin/rails test`, `bin/rails test:system`, `bin/rails db:migrate:status`, and `bin/rails routes` are illustrative until run with local app configuration and supported dependencies.

## 9. Observability, on-call and separation at scale

- Structured logs: record app/commit, company instance label, environment, request/trace ID, action, actor pseudonymous ID or worker principal, outcome, bounded error code and UTC. No authentication secrets, IDs, raw payloads or private descriptors. Restrict operational log and backup access and define retention/disposal before staging. Separate audit records from debugging output.
- Metrics: auth denials/sign-in errors, status-specific errors, conflict rate, endpoint latency, worker lag/lease expiry/retry count, queue age, quarantine, backup age and reconciliation exceptions. Avoid renter or event IDs in metric labels. Set thresholds after baseline measurement, and drill routing and response rather than assuming alerts work.
- Runbook: isolate affected instance; pause ingress or the internal worker without hiding successfully committed records; preserve evidence; identify affected actions not guessed consequences; resolve contention or rerun with durable idempotency. Record restart reason, operator, correlated incident ticket and confirmation of no duplicate effects.
- Company expansion: duplicate configuration shape, never credentials or data. Use separate DB, worker, encryption/signing keys, root/admin identity, secrets, storage prefixes/credentials and backup namespace, scoped monitoring, deployment access and host routing. Verify negative access in both directions. Provider callback/credential scopes remain absent in this baseline; a later integration gets isolated endpoints/configuration. Document whether hosting infrastructure is shared even if data is isolated.
- Scale policies: collect workload mix, burst/daily profiles, worker and DB resource metrics and recovery times. Define capacity, latency, queue age and restore objectives with company owner. Widen one dimension at a time (users, branch, volume), not all at once. Treat a separate company as a separate release, no configuration reuse that can cause cross-company binding.

## 10. Stages, deployment and rollback

| Gate | GO requires | NO-GO examples |
|---|---|---|
| Local engineering | Repeatable lockfile/build, isolated SQLite, safe synthetic seeds, admin/operator boundaries, internal-only worker contract | Production network adapters or real data reachable; undocumented grant exposure |
| Private alpha | Synthetic-only user allowlist, repeatable workflow/replay test, evidence record and restore drill; no public indexing/reachability claim | Operator sees privileged data; duplicate jobs; no deterministic seed/recovery |
| Private beta target | PostgreSQL-backed parity verified on isolated stage, separate credentials, access/security/rollback reviews, support and escalation, readability/accessibility checks | SQLite-only evidence offered for Postgres; public preview serving private assets; scope of real data unresolved |
| Production candidate | Signed business/security/privacy review, explicit authority and host/DNS/TLS verification; approved capabilities real-tested by authorized owners; documented known limitations | Unverified auth/provider/privacy/restore; no explicit domain approval; baseline still simulation-only |
| Scale | Measured capacity and recovery, per-company isolation rehearsal and go/no-go; controlled rollout and escalation | Unmeasured limits, shared credentials, missing branch/company owner |

Deploy a reviewed immutable build into an independently configured stage and collect safe health, migration and worker checks before any further promotion. Do not modify live DNS merely because a target hostname is printed here. Keep business/worker pause switches and readiness independent. A liveness process responding is not structural readiness; if checked, report DB compatibility and worker safety separately. Never embed production credentials in app images or sample environment files.

Before migration or release, verify encrypted backup creation and an isolated restore with business rows, outbox, audit and schema version intact. Capture the old build, config, schema and pause plan. For a rollback, first stop or drain workers safely and preserve current commits; then restore a known-good application only if schema compatibility is proven. Prefer a reviewed forward repair if the old build cannot read the new schema. Never overlay current DB with an older backup without explicit authority and a reconciliation plan. Check queue replay, double assignment/write prevention, privileged role boundaries, and absence of external effects after recovery. Before a future hostname cutover, inventory DNS, preserve MX and validation records, use a supported certificate, and obtain appropriate approval for reversal as well. This document does not authorize cutover.

## 11. Enforceable acceptance checklist

Fill `PASS / FAIL / BLOCKED / NOT RUN` and evidence reference for each gate. Critical failures block promotion; they cannot be waived by relabeling the stage. When testing an unimplemented future control, mark `NOT RUN (later gate)`.

| ID | Gate | Observable condition |
|---|---|---|
| RR-A01 | Alpha | Fresh setup from reviewed files creates only fictional records and puts no secret, card or personal record in outputs; only local/authorized stage targets are reachable. |
| RR-A02 | Alpha | Admin route works for authorized admin; queue-only route works for authorized operator; operator receives generic denial when directly accessing admin, PII, booking, fleet, payment, download or export handlers. Server responds consistently across UI/API and after sign-out or revocation. |
| RR-A03 | Alpha | Role, company, entity and status manipulation in submitted input cannot create an unauthorized write; invalid state/version fails without audit/outbox claiming success. |
| RR-A04 | Alpha | Injected persistence failure rolls back domain mutation, audit and event; replay of successful command yields one logical result. |
| RR-A05 | Alpha | Duplicate deliveries, competing worker claims and restart after interruption create no duplicate internal tasks. Invalid/missing event data is bounded and visible; legitimate retry preserves original business key. |
| RR-A06 | Alpha | Static/config verification plus flow execution show no external send, money effect, real physical release or claims of live settlement. |
| RR-A07 | Alpha | Checkouts/returns, if present, are labelled internal/simulated. Neither task completion nor incident/inspection change falsely asserts physical handover. |
| RR-A08 | Alpha | Close/open, stale-state and not-found outcomes are comprehensible to keyboard/mobile users; queue views show only permitted fields. |
| RR-A09 | Alpha | Private synthetic DB backup is restored into an isolated environment and the restored behavior and expected outbox state are checked. |
| RR-B01 | Beta | Postgres checkout supports data integrity, concurrency/race and replay under representative multiple-process runs; explicit matrix shows known SQLite differences. |
| RR-B02 | Beta | Company A authenticated requests cannot open B admin/queue/assets, or use its credentials/data/backup. Assert separation using two independent instances. |
| RR-B03 | Beta | Audit/monitoring detects stale worker and processing error without exposing protected content; escalation and rollback rehearsed. |
| RR-P01 | Future production | Named owners sign exact capability scope, reviewed data policy/security, public host/TLS and tested recovery; no extrapolation from staged evidence. |
| RR-S01 | Future scale | Workload, service objectives, rollback and company-specific isolation are evidenced at expected volume, with defensible deferral or limits. |

**Decision record:** revision/digest ___ · environment/database ___ · tested controls ___ · linked observed evidence ___ · blockers ___ · review owners ___ · yes/no and UTC ___.

This Rails charter stands alone. Earlier FastAPI operating handbooks may supply business vocabulary, not assertions of routes, implementation, runtime or authorization.
