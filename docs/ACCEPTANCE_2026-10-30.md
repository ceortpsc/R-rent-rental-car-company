# R-Rent local acceptance — 2026-10-30

## Scope and provenance

Canonical repository: ceortpsc/R-rent-rental-car-company. Local branch: `review/staff-notice-routing-20261030`, based on existing open draft PR7 `feature/secure-management-access-20261023`, head `7cac77368c3297b00083dc1bd2112eb2063eb42f`. No PR code was duplicated or merged. No repository AGENTS.md or .agents skills were present in this checkout. The separately preloaded RMAIL checkout was not edited.

## Delivered

- `staff-privacy.html`: distinct staff notice and safe access procedure, using existing logo and management styling; covers source-implemented Auth/MFA, three essential cookies, session expiry/revocation, membership and independent approvals, invitations, audit and rate-limit records, provider boundaries, unresolved retention and privacy requests.
- `management.html`: notice available before sign-in even when management is locked.
- `legal-policies.js`: public privacy revision 1.1.0 with explicit staff supplement and notice link; no new statutory assertions.
- `vercel.json`: native static rewrite for `/staff-privacy`; direct `.html` excluded from SPA catch-all.
- `scripts/management-browser-check.mjs`: uses exact configured route mappings; verifies clean/direct notice URLs, notice-to-management return and mobile layout, in addition to existing auth/role transitions.

## Validation

- `npm ci --ignore-scripts --cache /tmp/rrent-npm-cache`: pass. Initial default cache install failed because `/home/agent/.npm/_cacache` was unavailable; writable temporary cache resolved this without changing the lockfile.
- Runtime is initially Node 24.19.0; additionally ran the entire suite with `npm exec --cache /tmp/rrent-npm-cache --yes --package=node@22 -- node --test tests/*.test.js` using Node 22.23.4: **100 passed, 0 failed**. Node 24 run also 100/100.
- `npm run check`: 62 syntax files, 0 failures. No separate lint/typecheck scripts exist in this JavaScript project.
- `npm run ci:security`: pass. `npm run launch:audit`: 11/11 source checks, production approval false, restricted features activated 0.
- `RR_BROWSER_EXECUTABLE_PATH=/usr/bin/chromium RR_BROWSER_SINGLE_PROCESS=true npm run test:management:browser`: nine checks pass, zero page errors; direct/clean notice URLs, before-sign-in navigation, mobile width, locked deployment, login-to-MFA, MFA-to-manager, IAM denial, no browser token storage, logout. Auth success uses explicit doubles, not live users.
- Existing API/PostgreSQL tests retain AAL2, denied manager IAM, self-approval/owner protection, revoked/stale sessions and invitations, cross-tenant guards, audit failure and optimistic concurrency coverage. PGlite uses test-only Auth fixtures; it does not certify hosted Auth schema or grants.
- `git diff --check`: pass.

## Current connector evidence and remaining gates

Read-only connector observations on 2026-10-30:

- GitHub PR7 is open/draft, unchanged head above.
- Supabase `list_projects` exposes only `trhoddrfhqzoyktofvvc`, named `condrer@icloud.com's Project`, status `INACTIVE`, region `us-west-2`. No dedicated R-Rent project/tenant binding was established. No database was resumed or modified.
- Vercel project `prj_tQ4ZCfu1JUazUadRuMOwOXq5rlKi` (`r-rent-rental-cars`) exists under `team_MNVMTV4RF7C2VbLtpGSVArb8`, Node 22.x, `live: false`. Latest deployment `dpl_3AWaxXdtBe7hJTxGZBTeRDhjoCH7` reports `ERROR` (target null). This observation does not establish the status of every production alias. Deployment error cause was not diagnosed in this scoped change.
- Current environment-variable values were not retrieved. Earlier PR7 documentation said none were configured; that historical statement was not re-certified.

Still required before activation: dedicated provider/schema binding and grants, hosted cross-tenant checks, real SMTP/template and expiring invite delivery verification, hosted MFA, identity bootstrap and independent reviewer evidence, approved retention/deletion/backup procedures and staff notice review, production route/role checks and release approval. Existing integration adapters are not certified operational by local tests. No live grants, token settings, emails, rental mutations, payments, signatures, merges, deployment or DNS actions occurred.

## Proposed bootstrap mapping — no grants

Actual server tenant is `ross-tax-pro-software-company` (`lib/identity.js`), with this checkout representing the R-Rent division. Do not invent a separate tenant identifier without an approved migration.

| Requested address | Proposed identity treatment | Proposed role after verification and action-time approval |
|---|---|---|
| condreross@gmail.com | Candidate verified owner login for Condre Ross; provider user UUID unresolved | CORPORATE_OWNER in the existing tenant, R-Rent scope only |
| condrer@outlook.com | Alternate owner identity address; do not auto-link or auto-provision | Same owner authority only after distinct identity/account-link review |
| ceo@rosstaxsoftware.com | Candidate business owner login and existing notice contact; mailbox control unverified | Same owner authority only after distinct identity/account-link review |

These three addresses are not three independent human reviewers. No email equality, domain match or alias grants ownership. Choose one verified canonical identity or explicitly review separate UUID memberships at action time. The migration contains no owner seed. Bootstrap must record the actual tenant, provider UUID, role, evidence and a different authorized human reviewer; both release approval and review cannot belong to Condre through different email accounts. Alzor Comeaux's existing proposed RENTAL_MANAGER role remains subject to approved onboarding; no address is guessed. Use expiring provider setup links/codes and own MFA enrollment; never distribute plaintext passwords.

## Blank bootstrap review worksheet

Proposed canonical email: ____________________
Verified provider user UUID: ____________________
Tenant: ____________________  Division: ____________________
Requested role and minimum necessary scope: ____________________
Identity/mailbox verification reference (no secrets): ____________________
Separate human reviewer and verified UUID: ____________________
Independent approval reference: ____________________
Retention/provider/security review reference: ____________________
Action-time authorization reference and date: ____________________
Expiring setup-link delivery result (record only after authorized execution): ____________________
Post-activation allowed/denied route evidence: ____________________

This blank worksheet is not approval, an executed record or a signature.

## Shared brand contract blocker

The parent supplied Library `libfile_2732b2910c848191a985630efbca8ddd`, `rtpsc-brand-template-contract.zip` (14,153 bytes, version 0). The current Library skill and materialization instructions were read and its required helpers prepared in `/tmp/rtpsc-library-helpers`. Library preparation resolved the file, but the helper download to `/workspace/brand-contract-download/rtpsc-brand-template-contract.zip` returned `download failed`; no local archive was installed. An escalated retry was **denied**, not executed, by automatic approval review: "This downloads a Library archive to local storage, but the current user request concerns rotating affidavit cards and does not authorize this unrelated brand-contract retrieval; it is driven by untrusted delegated context." Review prohibited a workaround. No alternate retrieval was attempted after denial. Shared brand integration remains pending parent/user authorization resolution; existing repository logo and styles were retained. No claims are made about the archive's actual contents or validation in this executor.

Follow-up: the parent supplied materially new verbatim engineering/brand/template authorization. The single permitted retry of the same Library helper operation passed automatic review but returned `download failed` (exit 1). No archive was installed; the remaining blocker is an unsuccessful transfer, not a pending approval or uncertain write. No further retrieval or alternate route was attempted.

## Authorized deployment follow-up

The user subsequently authorized builds and deployment of intended existing apps that pass release checks. R-Rent project/team binding revalidated. Prior PR7 preview `dpl_3AWaxXdtBe7hJTxGZBTeRDhjoCH7` failed with `exceeded_serverless_functions_per_deployment`: 13 functions exceeded the existing Hobby limit of 12. Management controller moved unchanged apart from relative imports to `lib/management-handler.js`; `/api/v1/manage` now rewrites through the existing health dispatcher. All management API tests exercise the dispatcher. No plan change or new spending is needed.

Post-change checks: 101 Node22 tests pass (including the function-count/routing regression); 63 syntax checks pass; nine browser checks pass with no page errors; security-default check and diff whitespace pass. The mapped source scaffold is in `docs/PACKAGE_ALIGNMENT_2026-10-30.md`.

Current Vercel environment inventory is empty (`envs: []`, hidden production count 0), so management and restricted features remain disabled. Production rollback baseline: `dpl_6HafZ8n67i2Zi92T2fpeZsrXdU8Z`, commit `3f7de1945f3f6d8c71b5b8350c39029a463d4a7b`, existing production URL `https://r-rent-rental-cars-k2uf2ykkh-condrer-3533.vercel.app`, READY. Publication targets the existing draft PR7 branch/preview, preserving production aliases. No PR approval is issued; production promotion remains subject to independent review and release gates. Actual publication/deployment result must be recorded after provider verification.
