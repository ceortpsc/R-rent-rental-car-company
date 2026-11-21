# Import previous R-Rent requests and quotes

**Current boundary:** The live service remains the system of record. This branch adds reconciliation tooling. It does not include a live export, backfill messages, or promote imported items into an operational or financial state.

## Authoritative source

Inspected AppDeploy version 1794168769084, serving rtpscrentalcars.com. The parallel Vercel/Supabase repository contains a separate provisional application path, but no evidence establishes that it received these live requests. Do not merge it without separate ownership and export evidence.

| Live evidence | Migration treatment |
|---|---|
| r_rent_requests_v2 | One submitted rental request per original stable request ID. A submission is the rental request, not a second record. Preserve source status and timestamp; do not create a new booking. |
| r_rent_request_index_v2 per-user keys | References to requests, not distinct submissions. Use only to reconcile gaps or dangling pointers in the approved source inventory. |
| r_rent_request_events_v2 per-request keys | Each durable action=quote with the authoritative patch.quote is a separate historical quote. Preserve its event ID and parent request ID. Retain source revision/order and each amount component in approved source storage. Do not treat superseded prices as new offers. |
| Public rental search and browser drafts | Stateless estimates and browser-session-only drafts are not recoverable from this server. Record the exclusion; do not invent replacements. |
| Staff requests endpoint | Returns live customer fields and partial request summaries, not a complete migration export. Do not scrape it or save its raw output. |

The minimized historical ledger is not a replacement for separate reconciliation of users, contracts, vehicle custody, active rentals, deposits, refunds, or other provider-backed obligations. Keep customer contact information, credentials, payment data, contract contents, and free text out of this envelope, Git, logs and chat.

## Operator sequence

1. Confirm the production data owner, authoritative store and approved read-only export method. Create a scoped server-side projection (or operator-approved private export), enumerate every cursor, and record count, version, timestamp, watermark and checksum in approved encrypted storage. Export requests first, then their quote events. Record attribution and revision ordering precisely; root timestamps alone do not establish an event watermark. The importer validates the shape of quote parent IDs, not their existence on the live source. Check that relationship during reconciliation.
2. Validate the minimized export without apply. From rails-alpha, run the following with the JSONL stream redirected from approved local storage:

        RR_IMPORT_SOURCE=rrent-appdeploy-v2 bin/rails rrent:historical_import

   The tool accepts up to 1,000 newline-terminated rows per batch and reports row indices and fixed rejection codes instead of row contents. Do not put historical data in command-line arguments, tickets, chat, or public artifacts. Production apply is not enabled in this alpha.
3. Reconcile counts by source/type/status, amounts in cents by currency, quote-to-request links, duplicate/replay dispositions and final export watermarks. Resolve contradictory revisions or records missing required evidence. Running the same batch again must not create new entries or trigger messages.
4. At authorized cutover, fence old and new writers, pause delivery effects, drain in-flight operations, export and reconcile the final delta, and release only the reviewed revision. Follow PRODUCTION_CUTOVER.md for retention and rollback if new writes have started.

## Current submissions and responses

Persist the new request and durable workflow event before saying it was received. An estimate, browser submission attempt, imported row, and previously processed request must not enqueue acknowledgments. A later **issued quote** is a separate event, with approved amount, currency and expiry evidence. Use a stable source-event/purpose/channel key and report delivered only after authenticated provider evidence. Run the migration in no-send mode and do not use migration time as a new request timestamp. A provider, verified sender, scoped contact permissions and suppression callbacks are independent release requirements.
