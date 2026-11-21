# R-Rent Enterprise | Ruby on Rails alpha

R-Rent's local inquiry and operations workflows rebuilt with Ruby on Rails **8.1.4.1**, server-rendered ERB, Active Record and a transactional SQLite outbox. This is a separate prototype, not a migration of the live app or customer database. It has one company per instance and accepts synthetic booking emails only. Production boot is disabled. The opt-in hosted review is synthetic-only, password-gated, and cannot take payments, send externally, or release vehicles.

In the R-Rent repository, run these commands from `rails-alpha/`.

## Run it locally

Tested with **Ruby 3.3.8**, Bundler **2.6.7**, and the checked-in Gemfile.lock on Linux. Use an actively maintained Ruby patch release that satisfies the Gemfile for new installations. Linux/macOS or WSL is recommended; native Windows was not tested. Install Ruby from a trusted distribution before running these commands.

```sh
bundle install
bin/rails db:prepare
bin/rails rrent:provision EMAIL=admin@example.com ROLE=admin
bin/rails rrent:provision EMAIL=queue@example.com ROLE=workflow_operator
bin/rails server -b 127.0.0.1 -p 3000
```

Provisioning prompts for a unique password without displaying or storing it in your shell history. Nothing uses your real staff or customers. Open http://127.0.0.1:3000. Start a rental inquiry with synthetic dates, name and an example.com/.org/.net email. Review the private receipt in the same browser session. In a second terminal from the project directory run:

```sh
bin/rails rrent:workflow_status
bin/rails rrent:worker
# or run ONE continuous worker with the local SQLite database:
CONTINUOUS=1 INTERVAL_SECONDS=5 bin/rails rrent:worker
```

Sign in as the queue operator at `/login` and open `/work-queue`. Marking the work item complete only updates the local audit and task status. It cannot approve or cancel rentals, access any customer record, or change money. Sign in as the administrator to work with rentals, maintenance, and fleet. To disable a test account run `bin/rails rrent:disable EMAIL=queue@example.com`. Password rotation expires the old session.

## Route / outcome register

| Screen or action | Route | Access and result |
|---|---|---|
| Home, fleet preview, programs | `GET /`, `GET /programs` | Public-facing local preview; not an offer or guarantee |
| Rental estimate and inquiry | `GET /bookings/new`, `POST /bookings` | CSRF-protected; pricing estimate creates no record; submit records an inquiry and queues internal review |
| Inquiry receipt | `GET /receipt` | Same browser session only; no PII, payment, or reservation confirmation |
| Sign in/out | `GET /login`, `POST /session`, `POST /logout` | Local staff accounts; rotation and revalidation; no public signup |
| Ops console and review | `GET /ops`, `POST /ops/bookings/:id/status` | Admin; requested → review → approved intake, or canceled; no overlapping approvals, no handover |
| Maintenance register | `GET /ops/maintenance/new`, `POST /ops/maintenance`, `POST /ops/maintenance/:id/status` | Admin; safety issue takes vehicle out of available fleet. Resolving maintenance does not return it to service |
| Synthetic fleet register | `GET/POST /ops/fleet`, `POST /ops/fleet/:id/status` | Admin; new records held for review, unresolved safety work blocks availability |
| Pre-trip inspection | `GET/POST /ops/bookings/:id/inspection` | Admin; one attestation for reviewed/approved inquiry, no image uploads or release |
| Reports | `GET /ops/reports`, `GET /ops/reports/bookings.csv` | Admin; row-capped, material audit, names and contact data omitted |
| Work queue | `GET /work-queue`, `POST /work-queue/:id/complete` | Admin and queue operator; opaque numeric task IDs only, audited and replay-safe completion |
| Notifications | `GET /inbox`, `GET /receipt/notifications` plus POST read actions | Staff per user and role, customer per receipt session; generated once per event and audience |
| Readiness | `GET /health`, `GET /ready` | Local service and DB connectivity only |

The outbox creates one internal review task from each booking intake, booking transition, maintenance intake, or maintenance transition. The fifth event type, payment exception, is tested as a synthetic service rule only; there is no live webhook or payment endpoint. The worker does not send email, collect a deposit, issue a contract, or approve handover. Use one worker for SQLite; the PostgreSQL locking design is not staged or load tested.

## Evidence and release boundaries

```sh
RAILS_ENV=test bin/rails db:prepare
bin/rails test
bundle exec ruby script/smoke_alpha.rb
bin/rails routes
bin/rails zeitwerk:check
# Or run the full local check, including the unconfigured-staging and production boot gates:
bin/check
```

- [Engineering principles handbook](docs/ENGINEERING_PRINCIPLES.md): architecture decisions, roles, worker guarantees, isolation, data policy, security, rollout, and rollback.
- [Verification and parity](docs/VERIFICATION.md): what runs now and what was not carried over or deployed.

The live AppDeploy app and domain are separate from this code. The Rails branch does not read existing rental data. This build is not for real rentals.

## Hosted synthetic review

`Dockerfile` from the `rails-alpha` Docker context checks the build. `bin/start-preview` loads only demo fixtures, boots one Rails process and one outbox worker, and exits on worker failure. Configure the following in the staging service, never Git:

- `RR_SYNTHETIC_STAGING=1` and the service's Render-assigned `RENDER_EXTERNAL_HOSTNAME`.
- `RR_REVIEW_SHA256`: SHA-256 digest of an independently generated high-entropy preview password (at least 192 random bits). The HTTP review user is `rrent-review`.
- `RR_PREVIEW_STAFF_BCRYPT`: bcrypt digest with cost 10–15 of a different randomly generated staff password, scoped to `review-admin@example.com`.
- A per-boot Rails signing key is generated if no independent 128-character hex `SECRET_KEY_BASE` is supplied. Do not reuse production secrets.
- No live feature flags, `DATABASE_URL`, real users, payment providers, or external dispatch. Do not attach a custom domain or enable production routing.

All app pages, assets and inboxes require the review gate. Public `/health` returns only the app environment and health status. Staff pages additionally require the synthetic staff login. Free preview storage is disposable on service restart or idle spin-down. The preview is not evidence of database migration, scale, disaster recovery, or production readiness.

[Notifications architecture and acceptance checklist](docs/NOTIFICATIONS.md)
