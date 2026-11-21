# Durable persistence for synthetic R-Rent staging

This Rails alpha still defaults to SQLite: development and test always use their local files; a gated staging process uses staging SQLite unless PostgreSQL is deliberately selected. SQLite on an ephemeral hosted filesystem is not durable across replacement. This update provides a PostgreSQL staging path; it does not provision a database, transfer records, change a domain or deploy anything. Production and external channels remain disabled.

## Approved target and runtime configuration

Use an independently authorized, already-created **R-Rent synthetic staging** database and dedicated database account. No access to prior deployments, customer/renter records, other entities, or production. Verify the exact provider workspace, app, project, region, network, database hostname/name, database role, billing and secrets owner before entering settings. Do not grant the app role superuser, createdb or createrole privileges. Review actual staging access, backups and provider retention separately.

| Setting | Required value / purpose |
|---|---|
| `RAILS_ENV` | `staging` (set by `bin/start-preview`) |
| `RR_SYNTHETIC_STAGING` | Exactly `1` |
| `RENDER_EXTERNAL_HOSTNAME` | Approved Render app hostname in the existing exact-host form; no custom domain change |
| `RR_REVIEW_SHA256` | Existing ingress review digest; keep in managed secrets |
| `SECRET_KEY_BASE` | Stable, dedicated 128 lowercase hexadecimal characters; must be provisioned explicitly for PostgreSQL, not generated at restart |
| `RR_PREVIEW_STAFF_BCRYPT` | Existing synthetic preview account provisioning secret; separate from ingress and signing credentials |
| `RR_STAGING_DB` | Exactly `postgresql` to opt in; unset or `sqlite` keeps default |
| `RR_STAGING_DATABASE_URL` | Secret URI `postgresql://USER:PASSWORD@HOST[:PORT]/DATABASE`; percent-encode reserved characters in the password. Do not place the value in shell history, logs, build arguments, issue trackers, or chat. |
| `RR_STAGING_DB_HOST` | Exact independently verified DNS host component (lowercase) |
| `RR_STAGING_DB_NAME` | Exact independently verified dedicated DB name (lowercase letters, digits, underscore, starts with a letter) |
| `RR_STAGING_DB_SSLMODE` | `require` by default; `verify-full` only with a trusted certificate that matches the configured host and compatible libpq/system CA support. |

Use the existing staging host, synthetic flag, review digest and signing key checks. Do not pass `DATABASE_URL`, `PRIMARY_DATABASE_URL` or libpq endpoint/environment overrides; the app refuses them. In the secret URI, a matching `sslmode=require` or `sslmode=verify-full` query is accepted; other options are rejected rather than passed through. The adapter connection uses TLS, disables GSS encryption negotiation in favor of TLS, and doesn't fall back to plaintext or SQLite. On Render, use the same-region private endpoint; [Render's connection docs](https://render.com/docs/postgresql-creating-connecting) document self-signed internal TLS and the use of `sslmode=require` to prevent plaintext fallback. That mode does **not** guarantee hostname/certificate validation; don't use it on an unreviewed/public path. For independently trusted endpoints use [libpq verify-full](https://www.postgresql.org/docs/16/libpq-connect.html), requiring the OS trust store to validate the host. Prefer keeping external database access disabled where a private path exists.

Leave `RR_ENABLE_LIVE_PAYMENTS`, `RR_ENABLE_RELEASE`, `RR_ENABLE_EXTERNAL_DISPATCH`, `RR_ENABLE_EMAIL`, `RR_ENABLE_SMS` and `RR_ENABLE_PUSH` absent (or explicitly `0`/`false`); any other nonempty value fails closed. Production boot remains denied. Do not use provider credential passwords in local fixtures, environment examples or exported files.

## Startup, backup and recovery

1. Back up the dedicated synthetic DB and confirm an isolated restoration method before schema changes. Use separate managed settings for initial migration vs steady-state runtime if the hosting plan requires it; the provided single-process-group entrypoint needs its role to migrate its own schema.
2. Run the reviewed image with `bin/start-preview`. In PostgreSQL mode it requires a stable signing key and runs `bin/rails db:migrate` against the **existing** target rather than `db:prepare` creating it. It then uses normal idempotent synthetic seeds/provisioning and starts the worker and web service. It must not copy historical SQLite/customer records, enable live features, or fall back on connection error.
3. Check review and staff gates, synthetic inventory, inquiry-to-notification workflow, worker health and /ready in the authorized environment. Record release digest, settings names without values, verified DB/SSL evidence and provider/owner signoff. Check DB state survives app replacement, and a committed event replays without extra records.
4. Roll back the app only after checking schema compatibility; pause affected writers/worker first and preserve records. Use a separate recovery target; never overwrite later commits with an old copy or quietly resume fresh SQLite as if it were the same store. A missing PostgreSQL secret, wrong host/name, failed migration or refused TLS blocks startup. Treat signing-key rotation as an explicit session reset, and keep separate stage/production trust and backups.
5. Check backup freshness, restore result, migration version, worker count and queue backlog. Do not paste DSNs or raw SQL/context into support reports. The image installs PostgreSQL client build libraries and CA certificates; it does not include a database service or a production provisioner.

## Evidence currently available

- `bin/check` passed against local SQLite: **23 tests, 364 assertions** with no failures, errors or skips; eager loading, loopback workflow, and staging-without-approval/production boot refusal passed.
- Isolated PostgreSQL **17.11** on loopback: Rails opened the PostgreSQL adapter with TLS verified via `pg_stat_ssl`, applied schema migrations, seeded two synthetic vehicles, and persisted a synthetic workflow event to one task and one inbox notice. Separate worker invocations processed **1 then 0** and a separate Rails process saw the committed state.
- A follow-up loopback run started two worker processes concurrently with 80 additional events. They processed 50 and 30, left no pending rows, and produced exactly 81 total tasks and 81 notices across both runs. Both committed sets remained visible after PostgreSQL process restart. The guard checks refused a malformed/mismatched DSN, local use of the staging opt-in, generic DB overrides, an unexpected SMS flag, and missing stable signing key.
- Docker image build was not exercised in this environment. This is not proof of actual provider credentials, Render reachability/private routing, hosted backup/restore, external transport, verify-full against the target provider certificate, production authority, or live user data. Re-run these checks against a separately authorized synthetic target before calling it staged and verified.
