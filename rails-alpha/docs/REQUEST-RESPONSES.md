# R-Rent request-response automation: staged policy

Current Rails alpha allows only synthetic booking inquiries and an on-screen receipt. There is no customer auto-send, provider connection or formally issued quote record. The new policy and templates are internal, read-only and deliberately not wired to outbound transports.

| Trigger | Intended response | Hard condition |
|---|---|---|
| Newly committed, canonical booking request | **Received**: reference and review notice; no quote/reservation/charge/release claims | Current live intake, after approved cutoff; same booking and event; not synthetic; fresh; authorized destination and purpose at delivery |
| Separately authorized, durable quote issuance | **Quote ready**: issued quote reference and approved access channel | Immutable issued quote with reviewer, recipient-binding, valid-through, itemization and version; not a browser estimate or booking-status change |
| Historic, synthetic, stale, canceled, unsupported or uncertain | Suppress, do not backfill | No recipient-facing action |

A future trusted worker should consume live events committed inside the booking transaction. Record an immutable rollout timestamp; suppress both bookings and events at or before it. Expire unprocessed receipt candidates after 24 hours instead of turning the backlog into historic mail. Persist a unique receipt key by booking/channel; formal quote responses need their own issued-quote/version/channel key. Record template version and status with the durable internal outbox. Do not store or expose recipient data in the key. Dual-control any future exception to no backfill.

Before a future delivery, independently verify provider, sender, recipient ownership/authorization, purpose-specific opt-in, withdrawals, suppression and retry behavior. Queue eligibility is not consent and current code always returns `external_send_allowed:false`, even for a qualifying candidate. Keep accepted, delivered, bounced and manually reviewed states distinct; reconcile ambiguous timeouts before replay. No historic addresses, real customer data, provider setup or sends occurred.

Test: `bundle exec rails test test/request_response_policy_test.rb`.

The existing workflow calls the internal planner inside the outbox transaction. The ledger deduplicates on the immutable request event and channel and stores no destination or rendered body. The alpha cannot set a production rollout cutoff, so this release plans no live deliveries. Quote delivery still needs a formal issuance event and vetted channel service.
