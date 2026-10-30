# R-Rent management authentication

Review date: October 23, 2026 (America/Chicago). Status: implemented in a review branch; **not enabled or independently verified in production**.

## Directory and boundaries

| Layer | Files | Responsibility |
|---|---|---|
| Public UI | `management.html`, `management.css`, `management.js` | Same-origin login, authenticator, account, team, approval, audit interfaces |
| Policy | `lib/rbac.js`, `lib/management-policy.js` | Existing thirteen-role catalog; explicit bounded management actions |
| Identity/session adapter | `lib/management-provider.js` | Supabase Auth validation, host-only HttpOnly cookies, refresh, database session binding |
| Server controller | `lib/management-handler.js` via `api/v1/health.js` | Origin/CSRF, body validation, database rate limits, permission checks, audit, provider email |
| Schema | `supabase/migrations/20261024014334_management_access.sql` | Private management tables, service-only RPCs, transactional approvals and revocation |
| Verification | `tests/management-api.test.js`, `tests/management-database.test.js`, `scripts/management-browser-check.mjs` | Provider-contract mocks and executable PostgreSQL tests using pinned PGlite |

The public rental pages, fleet, contract previews, original role-policy page, Cloudflare edge, and existing launch registry are preserved. `/operations` now links to `/management`; selecting a preview role still grants no access. The dedicated management API does not return provider access/refresh tokens to JavaScript. Its cookies are host-only (`__Host-`), Secure, HttpOnly, SameSite=Strict. No browser storage is used. All writes require an exact configured HTTPS origin, JSON, and `X-RRent-Action: 1`. Sessions expire after eight hours or twenty minutes without use. Refresh checks local revocation before calling the provider. Provider token validation and `auth.sessions` existence checks run before protected access.

This change does not migrate or modify the separate AppDeploy application at `r-rent-ross-vehicle-rentals-op555i`. Its source snapshot `1792773547878` contains a different fourteen-role marketplace catalog and an auth adapter reporting `NOT_EXPOSED_BY_AUTH_SDK` for MFA assurance. Existing platform sessions, memberships, provider invitations, and database records are not imported or treated as evidence for this GitHub/Vercel application.

## Starting authorizations

| Person | Starting role | Effective scope after onboarding |
|---|---|---|
| Condre Ross, owner-manager | `CORPORATE_OWNER` | Existing owner catalog plus IAM proposals, independently approved changes, suspension, management audit |
| Alzor Comeaux, designated manager | `RENTAL_MANAGER` | Existing rental-manager permissions and assigned views; own management account and session controls |
| Independent IAM reviewer | `SECURITY_ADMIN` | Separate named, verified person required for privilege approvals; not assumed or invented |

The existing matrix remains the authority: owner powers have no wildcard. A rental manager does not acquire security administration, owner impersonation, financial execution, insurer attestation, or vehicle-release powers. The original `access.assign` two-approver requirement remains in force. Only owner/security-administrator roles can propose or approve; a requester and the affected account cannot approve their own changes. Corporate-owner assignment and owner suspension are unavailable through this API. Recovery/bootstrap of owner access requires a separate operator review.

## Provider and database dependencies

At inspection, Vercel project `prj_tQ4ZCfu1JUazUadRuMOwOXq5rlKi` in team `team_MNVMTV4RF7C2VbLtpGSVArb8` had zero environment variables. The only connected Supabase project was inactive and was not identified as a dedicated R-Rent database. No schema or staff data was applied to it. No invitation email was sent. No user credentials, temporary passwords, or approval records were created.

Required deployment configuration:

- Dedicated approved Supabase project with the repository's reviewed migrations applied in their established order, including the management migration. Do not apply these to an unrelated or shared project.
- Server-only `SUPABASE_SERVICE_ROLE_KEY`; matching `SUPABASE_URL` and `SUPABASE_ANON_KEY`; exact canonical `RR_ALLOWED_ORIGIN`. Separate keys/project for previews.
- Supabase email/password and TOTP enabled; verified business SMTP; rate-limit/CAPTCHA policy appropriate to production. Disable public signups for this staff-only provider if customer accounts use a separate identity boundary.
- `RR_ENABLE_MANAGEMENT=false` and `RR_ENABLE_RBAC=false` until reviewed release evidence and the operator bootstrap below are complete.
- A named independent IAM reviewer and authenticated, verified owner/reviewer identities. Neither a matching email string nor an AppDeploy owner allowlist bootstraps these memberships.

The migration grants the backend service role only the Auth columns needed for session existence and confirmed-email checks. All new management tables live in the unexposed `rr_private` schema, have RLS enabled, and have no public/customer grants or policies. All public management RPCs are revoked from PUBLIC, anon, and authenticated. Functions use invoker security; no SECURITY DEFINER bypass is introduced. The backend re-checks membership, tenant, version, MFA, and approver separation inside each transaction. Membership locks protect administrative operations from concurrent revocation races.

## Provider email templates

Configure the **Invite user** email link using the provider's template variables:

```html
<a href="{{ .SiteURL }}/management#token_hash={{ .TokenHash }}&type=invite">Open your R-Rent staff invitation</a>
```

For existing-user email sign-in, include the provider's one-time code:

```html
<p>Your R-Rent sign-in code: {{ .Token }}</p>
```

Alternatively, its email link can use `/management#token_hash={{ .TokenHash }}&type=email`. Configure `SiteURL` to the exact reviewed HTTPS deployment. R-Rent removes the fragment before making a request, exchanges it with the provider via POST, and never returns tokens in its JSON response. Provider-generated links/tokens and TOTP secrets must never be copied into source, tickets, chat, analytics, or application logs. The TOTP setup secret is shown only to the current authenticated user and cleared on hiding, page backgrounding, successful verification, or sign-out.

## Operator bootstrap and designated-manager onboarding

1. Verify the dedicated project, schema, backup/recovery, service-only grants, issuer, email ownership, mail delivery/templates, MFA, tenant denial tests, and reviewed release artifact. Independent production penetration testing remains required.
2. An authorized database operator verifies the owner and a distinct security reviewer against `auth.users`. Insert their explicit `CORPORATE_OWNER` and `SECURITY_ADMIN` memberships for `ross-tax-pro-software-company`, initially inactive. No public email/domain rule is used. Retain the actual reviewer identity and evidence reference outside source.
3. The two reviewers sign off the initial access list and management-only release. The operator activates those two reviewed memberships and creates `rr_private.management_releases` with their distinct verified UUIDs, an actual evidence reference, and `active=true`. Record bootstrap events in the existing append-only `audit_events`. This is an out-of-band privileged operator step, not a public endpoint or a source seed. No approval should be inferred from this runbook.
4. Bind secrets privately, then enable only the management/RBAC gates in the reviewed environment. Keep every rental/payment/signing/release gate disabled.
5. Owner and security reviewer each authenticate and verify TOTP. The owner creates an `INVITE` request for Alzor Comeaux using the previously supplied designated-manager email and `RENTAL_MANAGER`. The reviewer inspects and approves it using their separate account. No manager account or invitation is presumed to exist.
6. A permitted administrator uses **Send provider invitation**. The application records a delivery claim before asking Supabase Auth to send; a verified existing account uses the provider's existing-user OTP flow. A provider acceptance response means a send request was accepted, not that the mailbox received it. Delivery and actual recipient acceptance must be tested separately.
7. Alzor verifies the invitation email, enrolls/verifies TOTP, and accepts the approved invitation. The database atomically binds only its approved role, marks it consumed, and appends an audit event. Expired, revoked, mismatched-email, suspended, cross-tenant, repeated, or stale invitations are denied.
8. Verify the manager's actual permitted views and denied administrator/other-tenant requests in production. Record independent evidence before classifying production management access as verified. The public launch registry remains uncertified; this change never auto-updates it.

Delivery claims time out after ten minutes so an operator can retry an uncertain provider send. A revoked/expired invitation cannot grant a role even if an earlier provider email arrives. An interrupted send may require retrying or revoking the app invitation and issuing a reviewed replacement. MFA factor removal and email changes deliberately have no self-service bypass; verified security recovery is required.

## API

One same-origin endpoint, `/api/v1/manage?action=...`, uses GET for `status`, `session`, `members`, `changes`, and `audit`; all other supported actions use POST with JSON and the action header. No client role/tenant assertion is accepted.

| Actions | Required state |
|---|---|
| `login`, `request-code`, `verify-code`, `confirm` | Management-only release approved; provider identity verification; active membership or sent approved invitation before session creation |
| `refresh`, `logout` | Bound opaque management session; local expiry/revocation rules; logout can clear/revoke an expired access-token session |
| `session`, `mfa-enroll`, `mfa-verify` | Valid bound session; MFA setup limited to own factors; existing factors cannot be replaced with first factor only |
| `accept-invitation`, `password` | Provider-verified AAL2; confirmed invited identity / active account; password changes revoke all management sessions |
| `members`, `changes` | AAL2 plus `rbac.read`; tenant-only, latest 100 records |
| `audit` | AAL2 plus `audit.read`; tenant-only management events, latest 100 |
| `propose`, `approve`, `send-invitation`, `revoke-invitation` | AAL2 plus `rbac.propose`; database enforces independent approval, version checks and invitation state |
| `suspend` | AAL2 plus `security.incident_manage`; no self/owner suspension; target version required; immediate management-session revocation |

Audit writes omit passwords, provider tokens, email codes, TOTP secrets, and raw request bodies. Successful privilege writes and their audit records commit together. Failed SQL actions roll back, then the server separately records a denial; audit failure blocks the response. Suspension and role changes revoke local management sessions. Provider logout is attempted, but local revocation remains authoritative for this management API. Other applications and existing bearer-token APIs retain their independent identity and evidence gates.

## Verification limits

Local tests exercise real PostgreSQL semantics through PGlite with minimal test-only Auth tables; provider calls are contract mocks. They do not prove a hosted Supabase project's grants, PostgREST exposure, actual SMTP delivery, hosted MFA, tenant isolation configuration, backups, or production access. The migration must be inspected with production advisors and tested against the actual hosted Auth schema before deployment. SQL test fixtures and evidence references are explicitly fictional and never production approvals.

Documentation checked: Supabase Auth REST OpenAPI (`supabase/auth/openapi.yaml`), email passwordless guide, TOTP MFA guide, and the current Supabase changelog. The announced November 10, 2026 TLS cipher removal requires current TLS clients; no deprecated cipher configuration is introduced. The Supabase CLI created a scaffold but its telemetry attempt was rejected by automatic approval review. No later Supabase CLI execution was used; source editing and local PostgreSQL testing completed separately.

Browser regression: install the pinned Playwright browser (`npx playwright install chromium`) and run `npm run test:management:browser`. A preinstalled Chromium can be selected with `RR_BROWSER_EXECUTABLE_PATH`; `RR_BROWSER_SINGLE_PROCESS=true` supports constrained local containers. These settings apply only to the local test script. No web-security disabling flag is used. The browser test uses explicit mocked management API responses for UI transitions; it is not a production identity verification.
