# R-Rent notification architecture and operating guide

**Release:** standalone Rails 8.1 local synthetic alpha. **Channel:** in-app only. A notification is an informational copy of an internal event, not an approval, custody transfer, rental agreement, payment instruction, dispatch, or evidence of delivery to a human.

Do not interpret the target domain `rtpsccarrentals.com` as an active notification service. The alpha initializer permits only development/test and isolated local SQLite. There is no remote stage or production delivery in this package. See [verification evidence](VERIFICATION.md) for what was actually run and [engineering principles](ENGINEERING_PRINCIPLES.md) for overall release scope.

## 1. Event and delivery contract

The local source implements the routes in `config/routes.rb`, filtering in `app/controllers/notifications_controller.rb`, fixed copy and event mappings in `app/models/in_app_notification.rb`, and transactional writes in `app/services/workflow.rb`. Migration `20261121000300_add_in_app_notifications.rb` enforces one notice per event/audience and one read row per notice/viewer. Source inspection is not test or deployment evidence. Operation:

1. A business command commits its business state, audit event and workflow outbox row together. The request does not send a message.
2. The existing workflow worker drains pending events, writing the internal task and eligible notification records, then marks the event processed in the same transaction. A failure must roll back the task and notification writes together. A replay converges on the same records. Keep SQLite at one worker consumer.
3. Controllers select an authorized audience before query/render and again before marking a record read. Staff and customer views are separate. All visible copy comes from reviewed labels and safe status/event facts, not the raw event body or arbitrary customer input.
4. Staff read state is independent per staff identity. The anonymous-alpha customer session uses one logical read state for the exact booking receipt scope; it is not a verified customer account, nor a reusable access link. Reading does not complete the workflow task.
5. Existing processed events are not automatically backfilled. An empty inbox after an upgrade or before running the worker does not show loss of past data or demonstrate that the worker is running.

| Outbox event | In-app staff audience | In-app customer audience | Safe message intent |
|---|---|---|---|
| `booking.requested` | Administrator and workflow operator | Exact session-bound booking receipt | An inquiry was recorded for review. No booking, payment, agreement, or vehicle pickup was authorized. |
| `booking.status` | Administrator and workflow operator | Exact session-bound booking receipt | An internal inquiry status changed. Do not infer a confirmed reservation, release, or payment. |
| `maintenance.created` | Administrator and workflow operator | None | An internal maintenance review was added. No supplier was dispatched and no fleet status was changed by the notice. |
| `maintenance.status` | Administrator and workflow operator | None | An internal maintenance status changed. A notice cannot authorize use or release. |
| `payment.exception` | Administrator only | None | An internal exception needs review. No charge, refund, settlement, or collections action has occurred. |

The administrator-only payment classification applies to the notification row. The existing work queue has not been restricted by this change; it may still show a generic internal task category for a synthetic payment exception. Do not represent the inbox policy as application-wide isolation of that event. All events above are **in-app only**. Neither generating a notice nor marking it read opens an email/SMS path. Do not use customer contact information from the reservation form for any delivery. Do not ingest background email, SMS, supplier or insurer events as part of this alpha.

## 2. Role and route matrix

| Principal | Read list | Change read state | Not allowed |
|---|---|---|---|
| Unauthenticated visitor with no active receipt | None | None | Staff inbox, other bookings, and direct IDs. |
| Receipt session holder | `GET /receipt/notifications`, exact booking reference resolved from the signed Rails session, not a query field | `POST /receipt/notifications/:id/read` within that same scope | Staff notifications, other bookings, contact details, exports, payment/supplier messages. |
| `workflow_operator` | `GET /inbox`, staff-safe notification classes | `POST /inbox/:id/read` for authorized rows, own receipt only | Payment-exception notifications, private renter identifiers, other staff read states, bookings/fleet/payment administration. |
| `admin` | `GET /inbox`, staff-safe classes and admin-only exception class | `POST /inbox/:id/read` for authorized rows, own receipt only | Customer session impersonation, outbound sends or any physical/financial action by viewing a notice. |
| Worker | Pending workflow events within its instance | Creates staff/customer in-app records; cannot mark read for a person | Browser session, cross-instance reads, raw recipient addresses, external network dispatch. |

Single company is selected server-side for each instance. No URL, message payload or custom header may retarget it. Notification row identifiers are routing keys only, not access tokens. Never insert private booking IDs, contacts, credentials or status details into a link/query. Separate scopes for list counts, list contents and read operations must use the same audience rules; a new list filter or badge cannot become a side channel. Unauthorized resources must not appear in list results or be distinguishable from nonexistent ones to an unentitled reader. All read mutations use CSRF-protected POST and are idempotent; repeated clicks may return the existing completion without duplicate receipt or actor attribution. Use no-store responses and non-indexing headers in addition to real authorization.

The views are **Staff inbox** and **Inquiry inbox**. Both provide **All notices**, **Unread only**, **Mark as read**, and **Older notices** when more than 40 authorized results exist. Pagination uses an opaque cursor looked up within the same visible audience; an unauthorized cursor or a missing/invalid receipt session returns not found. An unauthenticated staff request goes to sign-in. Use **Read** for a local user/session action, not for an email or SMS status. A seeded snapshot waiting on worker can show **No updates yet** without calling it a delivery failure. Never use **Sent**, **Delivered**, **Confirmed**, **Charged** or **Vehicle released** without independently supported facts and authorized features.

## 3. Current operating runbook

- **Start safely:** use the documented local synthetic setup. Verify development/test, project-owned SQLite and the right instance before running jobs. This alpha intentionally refuses a `DATABASE_URL` and refuses staging/production boot. Leave the guards in place; changing an environment name does not create secure staging.
- **Process internal events:** from this checkout, run `bin/rails rrent:worker` once from the intended local environment. Use one SQLite worker. `bin/rails rrent:workflow_status` reports the underlying workflow counts; don't interpret those numbers as notification delivery events. Repeated drain after success should process zero previously completed events.
- **Check authorized views:** sign in with distinct synthetic admin/operator accounts. Compare staff views; use a separate browser session with a synthetic booking receipt to validate the customer view. Keep session cookies/passwords out of screenshots and logs.
- **Investigate missing updates:** verify the expected event exists and is pending/processed; confirm kind, safe audience, current scope and correct instance/session. A processed pre-feature event has no backfill by default. If a worker exits, capture sanitized error class, inspect data only with authorized tools, correct using a reviewed path and rerun the same worker. Do not manually flip processed/read flags or clone rows to solve an apparent failure.
- **Respond to suspected data exposure:** stop the affected worker or route and avoid further reads that could widen exposure. Preserve access and workflow evidence without exporting message contents broadly. Use responsible owner and security escalation, identify affected audience and time range, and retest the authorization boundaries before resuming. No email/SMS notification of any issue from this app.
- **Back up/restore:** stop local writers and use a consistent SQLite backup method; keep synthetic files outside release packages. Restore to a separate environment and check exactly one task/notification per eligible event and the persistence of read state. No live or real records enter the local approval workflow.

Use the authoritative Rails route and test evidence for final names or flags. This guide intentionally prescribes no email/SMS enable flag, no transport secrets, and no anonymous receipt links for live use.

## 4. Future email/SMS: separate capability, separate approval

Email and SMS are unimplemented and disabled by absence in alpha. A future provider design can reuse a safe event, not the alpha recipient scheme. A production stage must first implement verified individual accounts or equivalent defensible recipient binding, and the authorized business owner must approve each channel, purpose, recipients, template families, quiet hours and any exception. A typed feature flag on its own must not create a route to send.

| Gate | Required outcome before any authorized external canary |
|---|---|
| Environment and configuration | Development/test use no-op transport or captured messages only. Private stage uses provider sandbox or exact company-approved test allowlist; real addresses/numbers rejected by application and network/tenant separation. Production starts globally off, and each company/channel/template remains off until explicitly approved. |
| Recipient and purpose | Resolve from authorized source immediately before attempt. Verify identity and current contact ownership; audit notice purpose and channel permission. Recheck suppression/withdrawal and the recipient/booking binding at send time. No client-controlled addresses or queued address reused after a profile correction. Don't send receipts with names, pickup locations, IDs or payment details; direct users to approved authenticated view. |
| Consent and compliance review | Approve purpose classifications and disclosures with qualified review. Do not mix promotions into transactional templates or assume an inquiry grants consent. Verify applicable federal/state rules, carrier registration/policies, opt-outs, permitted hours, and support escalation. Honor suppression before every send and disable any channel whose consent/opt-out verification is unavailable. |
| Provider authentication | Business-owned dedicated sender and least-scope credentials held in approved secret store. Independently verify email domain authentication and reply handling or SMS sender authorization. Callbacks require provider verification of raw signed request, appropriate timestamp/replay controls, event deduplication, and confirmed environment/account binding. Reject invalid/mismatched callbacks without changing state. |
| Data and templates | Approved, versioned templates with truthful status, origin and help contact. No unreviewed free-text interpolation, contracts, identity files, claims details or payment/bank/card data in messages, analytics, URLs, exports or logs. Use minimal placeholder data such as an opaque recipient-safe event label. |
| Delivery and replay | Distinguish staged, suppressed, queued, provider accepted, confirmed state per provider definition, failed, and unknown. A provider acceptance/status callback is not proof a human read it. Never create a second external delivery on timeout; query by provider-recognized reference, quarantine if ambiguous. |
| Human and operations | Independent reviewer signs off, limited allowlisted canary only where separately approved, metrics on duplication/opt-out/bounces, on-call escalation, kill-switch and rollback drill. No auto-email or SMS when a channel isn't configured and no silent fallback from one channel to the other. |

External intent should use a separately restricted outbox keyed by company instance, business event ID, intended recipient binding, purpose, channel and approved template/version, with conflict detection. Keep the content out of general logs. Provider-specific automation is optional; if provider idempotency or status reconciliation is inadequate, manual review is the default for ambiguous attempts. Do not treat provider delivery receipt state as an internal task completion or proof of rental status.

Production incident: disable outbound routing while preserving the in-app store and permission checks; quarantine unsent rows without re-enqueueing; request only authorized provider evidence to distinguish accepted from unknown; revoke affected credentials through approved security workflow if applicable. Record events, UTC, reviewers, suppression or correction, and explicitly reapprove backlog eligibility before any restart. A global pause must take priority over automatic and manual attempts; exercise then recheck provider handoff around race conditions.

Reference points for a future review, not an implementation or legal opinion: [FTC guidance on email primary purpose and CAN-SPAM](https://www.ftc.gov/business-guidance/resources/can-spam-act-compliance-guide-business), [FCC consent revocation rulemaking](https://docs.fcc.gov/public/attachments/FCC-24-24A1.pdf) (check current applicability, related orders and effective dates), and [Rails 8.1 testing guidance](https://guides.rubyonrails.org/v8.1/testing.html). No carrier or vendor access is established by these citations.

## 5. Verification checklist and release record

Use PASS, FAIL, BLOCKED, or NOT RUN and cite output for the exact build. These are proposed evidence checks; the existence of this table does not mean they passed.

| ID | Scope | Assertion |
|---|---|---|
| N-01 | Local | No uncommitted business event appears in any inbox; worker writes task and required notices together. Force a transactional fault and verify clean rollback. |
| N-02 | Local | Show a synthetic booking update in scoped staff and receipt views after drain, plus maintenance staff-only and payment exception admin-only. Assert no kind/subject/payload leaks to the wrong reader. |
| N-03 | Local | Repeat event/drain, restart worker, and replay while still pending in a controlled test. Exactly one intended row per event/audience, one logical task, and no false external status. |
| N-04 | Local | Anonymous user cannot load or write staff inbox. Staff payment-exception URLs/IDs denied to operator. A booking A receipt cannot list/read booking B using copied IDs; new session cannot inherit A scope. |
| N-05 | Local | Mark read twice as one identity, then view as another staff identity. Only original actor's state changes. Receipt read controls cannot change staff state or task status. Check CSRF rejection for mutation. |
| N-06 | Local | HTML, links, response headers, flash, dashboard counts and logs carry only allowed metadata; event data never reflects contacts, untrusted text or real information. |
| N-07 | Local | Verify preserved processed history without retroactive notice creation; confirm operator workflow can still run with notices present and no transport configured. |
| N-08 | Local | Attempt unsupported environment boot and confirm refusal. With network denied, synthetic notice creation and read flows still work. |
| N-09 | Future private stage | Separately implement/verify PostgreSQL locking, worker process contention, rollback/restore and cross-company instance isolation. Private routing and permissions verified with separate identities; no real contacts. |
| N-10 | Future outbound | After separate approval, prove no-op/default-off and stage recipient allowlist; sandbox callback rejection, suppressed destination, stale consent, ambiguous timeout, replay, kill-switch and safe recovery. No actual external canary unless its recipient and purpose are approved. |

Release evidence fields: version/commit and environment ___; configuration and channel posture ___; synthetic fixture version ___; command/test IDs ___; observed results ___; blockers and omitted checks ___; reviewer ___; decision and UTC ___.
